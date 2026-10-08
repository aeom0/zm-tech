// tools.ts — Herramientas del agente Haiku 5.5 (Fase 1: lectura + traspaso)
//
// El modelo nunca decide precios, montos ni disponibilidad: lo calcula el código.

import type { SupabaseClient } from "../lib/supabase.ts";
import type { AgentToolDef } from "./anthropic.ts";
import {
  compositionKey,
  overlapCapForCart,
  parsePackServiceIds,
  type ServiceCatalog,
} from "../lib/services-catalog.ts";
import { getDateKeyLima, isSalonClosed } from "../lib/peru-holidays.ts";
import { formatAvailableHours } from "../handlers/booking-flow.ts";
import { getPendingAppointmentsForPhone } from "../handlers/pending-appointment.ts";
import { escalateToStaff } from "../lib/staff-escalation.ts";
import { executeAIAction } from "../handlers/ai-assistant.ts";
import type { WabaConfigMap } from "../lib/waba-config.ts";
import { sendMessage } from "../wa-api.ts";

export interface AgentToolContext {
  supabase: SupabaseClient;
  phoneNumber: string;
  contactName: string;
  catalog: ServiceCatalog;
  phoneCountry?: string | null;
  wabaConfig: WabaConfigMap;
  /** Texto efectivo de la clienta en este turno. */
  messageText: string;
  /** Se marca cuando una tool ya respondió/derivó: el agente no envía más texto. */
  turnHandled: boolean;
}

export interface AgentToolResult {
  content: string;
  isError?: boolean;
}

export const AGENT_TOOLS: AgentToolDef[] = [
  {
    name: "consultar_horarios",
    description:
      "Devuelve los horarios con cupo libre de un día para los servicios o packs indicados. " +
      "Úsala SIEMPRE antes de mencionar una hora disponible; nunca inventes horarios.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        fecha: {
          type: "string",
          description: "Día en formato YYYY-MM-DD (Lima).",
        },
        servicio_ids: {
          type: "array",
          items: { type: "string" },
          description: "IDs de servicios o packs del catálogo.",
        },
      },
      required: ["fecha", "servicio_ids"],
      additionalProperties: false,
    },
  },
  {
    name: "consultar_mi_cita",
    description:
      "Lista las citas pendientes de la clienta (fecha, servicios, precio). " +
      "Úsala cuando pregunte por su cita, hora o monto.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "escalar_a_humano",
    description:
      "Pausa el bot y avisa al equipo para que tome el chat. Úsala en reclamos, " +
      "devoluciones, cancelar con adelanto, asesoría personal o cuando no puedas resolver.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        motivo: { type: "string", description: "Resumen breve del motivo." },
      },
      required: ["motivo"],
      additionalProperties: false,
    },
  },
  {
    name: "pasar_a_agendar",
    description:
      "Cuando la clienta ya eligió qué servicio o pack quiere reservar: lo agrega al carrito " +
      "y abre el selector de fecha y hora. Después de usarla NO escribas nada más.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        servicio_ids: {
          type: "array",
          items: { type: "string" },
          description: "IDs de servicios o packs elegidos.",
        },
        mensaje: {
          type: "string",
          description: "Texto corto que se envía justo antes del selector.",
        },
      },
      required: ["servicio_ids", "mensaje"],
      additionalProperties: false,
    },
  },
];

function toIdArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
}

/** Minutos de agenda y servicios expandidos para ids de servicio o pack. */
export function resolveBookingItems(
  ids: string[],
  catalog: ServiceCatalog,
): { duration: number; serviceIds: string[]; unknown: string[] } {
  let duration = 0;
  const serviceIds: string[] = [];
  const unknown: string[] = [];
  for (const id of ids) {
    const svc = catalog.servicesById.get(id);
    if (svc) {
      duration += svc.duration;
      serviceIds.push(id);
      continue;
    }
    const pack = catalog.packsById.get(id);
    if (pack) {
      const inner = parsePackServiceIds(pack);
      serviceIds.push(...inner);
      const slot = pack.slot_minutes ??
        catalog.packSlotMinutes?.get(compositionKey(inner));
      duration += slot && slot > 0 ? slot : inner.reduce(
        (sum, sid) => sum + (catalog.servicesById.get(sid)?.duration ?? 0),
        0,
      );
      continue;
    }
    unknown.push(id);
  }
  return { duration, serviceIds, unknown };
}

export async function runAgentTool(
  name: string,
  input: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  try {
    switch (name) {
      case "consultar_horarios": {
        const fecha = String(input.fecha ?? "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
          return { content: "fecha inválida, usa YYYY-MM-DD", isError: true };
        }
        if (fecha < getDateKeyLima(new Date())) {
          return { content: "esa fecha ya pasó", isError: true };
        }
        const ids = toIdArray(input.servicio_ids);
        const { duration, serviceIds, unknown } = resolveBookingItems(
          ids,
          ctx.catalog,
        );
        if (ids.length === 0 || unknown.length > 0 || duration <= 0) {
          return {
            content: `ids no válidos del catálogo: ${
              unknown.join(", ") || "(vacío)"
            }`,
            isError: true,
          };
        }
        if (isSalonClosed(fecha)) {
          return { content: `${fecha}: el salón está cerrado ese día` };
        }
        const cap = overlapCapForCart(serviceIds, ctx.catalog);
        const hours = await formatAvailableHours(
          ctx.supabase,
          fecha,
          duration,
          undefined,
          cap,
          ctx.catalog,
          serviceIds,
        );
        return { content: `${fecha}: horarios libres: ${hours}` };
      }
      case "consultar_mi_cita": {
        const rows = await getPendingAppointmentsForPhone(
          ctx.supabase,
          ctx.phoneNumber,
        );
        if (rows.length === 0) {
          return { content: "No tiene citas pendientes registradas." };
        }
        return {
          content: rows
            .map((r) =>
              `- ${r.date} · ${r.serviceLabels.join(" + ") || "servicio"} · S/${
                parseFloat(r.price).toFixed(0)
              } · ${r.duration} min`
            )
            .join("\n"),
        };
      }
      case "escalar_a_humano": {
        const motivo = String(input.motivo ?? "").slice(0, 200);
        const escalated = await escalateToStaff(ctx.supabase, {
          phone: ctx.phoneNumber,
          clientName: ctx.contactName,
          reason: "agent_handoff",
          preview: motivo || ctx.messageText,
        });
        return {
          content: escalated
            ? "Equipo avisado y bot en pausa. Dile a la clienta que una persona del equipo la atenderá pronto."
            : "El chat ya estaba en manos del equipo.",
        };
      }
      case "pasar_a_agendar": {
        const ids = toIdArray(input.servicio_ids);
        const { unknown } = resolveBookingItems(ids, ctx.catalog);
        if (ids.length === 0 || unknown.length > 0) {
          return {
            content: `ids no válidos del catálogo: ${
              unknown.join(", ") || "(vacío)"
            }`,
            isError: true,
          };
        }
        const mensaje = String(input.mensaje ?? "").trim();
        if (mensaje) await sendMessage(ctx.phoneNumber, mensaje);
        await executeAIAction(
          { type: "add_to_cart", param: ids.join(",") },
          {
            phoneNumber: ctx.phoneNumber,
            contactName: ctx.contactName,
            catalog: ctx.catalog,
            supabase: ctx.supabase,
            phoneCountry: ctx.phoneCountry,
          },
          ctx.wabaConfig,
          ctx.messageText,
        );
        ctx.turnHandled = true;
        return { content: "Selector de agenda enviado. No escribas nada más." };
      }
      default:
        return { content: `tool desconocida: ${name}`, isError: true };
    }
  } catch (err) {
    console.error(`[AGENT] tool ${name}:`, err);
    return { content: "error interno de la herramienta", isError: true };
  }
}
