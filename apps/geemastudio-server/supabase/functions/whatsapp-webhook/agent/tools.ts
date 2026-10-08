// tools.ts — Herramientas del agente Haiku 5.5
//
// El modelo ve horarios, duraciones, personal y restricciones (feriados,
// ausencias) y arma el carrito. El código valida todo: el modelo nunca decide
// precios, montos ni disponibilidad. El cierre (adelanto o cita directa) lo
// hace finalizeBookingAfterDatetimeSelection.

import type { SupabaseClient } from "../lib/supabase.ts";
import {
  addCartItems,
  type CartItem,
  clearCart,
  expandCartItemsToServiceIds,
  getSession,
  upsertSession,
} from "../lib/supabase.ts";
import type { AgentToolDef } from "./anthropic.ts";
import {
  compositionKey,
  overlapCapForCart,
  parsePackServiceIds,
  resolveCartItemPrice,
  type ServiceCatalog,
} from "../lib/services-catalog.ts";
import {
  dayOfWeekFromDateKey,
  getAdvancePaymentRate,
  getDateKeyLima,
  getHolidayOpenUntilHour,
  getSalonClosedMessage,
  isPeruHoliday,
  isSalonClosed,
} from "../lib/peru-holidays.ts";
import { isValidSalonSlot } from "../lib/constants.ts";
import {
  formatAvailableHours,
  limaDateKeyAndTimeToUtc,
} from "../handlers/booking-flow.ts";
import { hasSlotCapacityForServices } from "../handlers/agenda.ts";
import {
  finalizeRescheduleAppointment,
  getPendingAppointmentsForPhone,
  loadAppointmentCartItems,
  markDepositForfeitRiskIfLateChange,
  newBookingOverlapsExisting,
  type PendingAppointmentRow,
  shouldBlockAdditionalBooking,
} from "../handlers/pending-appointment.ts";
import {
  AWAITING_DEPOSIT_BOLETA,
  AWAITING_DEPOSIT_DATOS,
  finalizeBookingAfterDatetimeSelection,
  sendFixedDepositAdelantoStep,
} from "../handlers/payment.ts";
import {
  AWAITING_CLIENT_IDENTITY,
  parseClientIdentity,
  updateClientIdentity,
} from "../handlers/client-identity.ts";
import { notifyAdmins } from "../lib/notify.ts";
import { toLimaLocalTimestamp } from "../format.ts";
import { employeeRulesAllowSlot } from "../lib/employee-availability.ts";
import {
  DEFAULT_UBICACION_TEXT,
  SALON_NOT_AT_KENNEDY,
} from "../lib/salon-location.ts";
import {
  getConsideracionesPreviasWhatsApp,
  getPoliticasCitaWhatsApp,
} from "../lib/policies.ts";
import {
  getEduGuideImage,
  parseEduGuideActionParam,
} from "../lib/edu-guides.ts";
import { getConfigText } from "../lib/waba-config.ts";
import { escalateToStaff } from "../lib/staff-escalation.ts";
import type { WabaConfigMap } from "../lib/waba-config.ts";
import { sendMessage } from "../wa-api.ts";
import { getRequestTenantId } from "../lib/tenant.ts";

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
  /** Ya se envió algo a la clienta (fotos/guía): si el modelo falla después, no se cae al bot viejo. */
  sentToClient: boolean;
}

export interface AgentToolResult {
  content: string;
  isError?: boolean;
}

const idsSchema = {
  type: "array",
  items: { type: "string" },
  description: "IDs de servicios o packs del catálogo.",
};

export const AGENT_TOOLS: AgentToolDef[] = [
  {
    name: "buscar_servicios",
    description:
      "Busca servicios y packs del catálogo por texto (nombre, efecto, categoría) y devuelve id, precio vigente y duración. " +
      "Úsala para obtener el id antes de agregar_al_carrito o cuando la clienta pregunte por un servicio.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        consulta: {
          type: ["string", "null"],
          description: "Texto a buscar, o null para listar por categoría.",
        },
        categoria_id: {
          type: ["string", "null"],
          description: "ID de categoría para filtrar, o null.",
        },
      },
      required: ["consulta", "categoria_id"],
      additionalProperties: false,
    },
  },
  {
    name: "ver_portafolio",
    description:
      "Envía a la clienta fotos reales de trabajos (portafolio) de un servicio o de lo que pidió. " +
      "Después escribe un cierre breve que ancle el siguiente paso.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        servicio_id: {
          type: ["string", "null"],
          description:
            "ID de servicio o categoría, o null para elegir según su pedido.",
        },
        pedido: {
          type: ["string", "null"],
          description: "Lo que pidió ver (efecto, fibra, estilo), o null.",
        },
      },
      required: ["servicio_id", "pedido"],
      additionalProperties: false,
    },
  },
  {
    name: "info_negocio",
    description:
      "Datos oficiales del salón: ubicación y estacionamiento, políticas de la cita (tardanza, cancelación, reprogramación, adelanto) " +
      "y recomendaciones previas para los servicios del carrito. Úsala en vez de improvisar estos datos.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        tema: {
          type: "string",
          enum: ["ubicacion", "politicas", "antes_de_la_cita"],
        },
      },
      required: ["tema"],
      additionalProperties: false,
    },
  },
  {
    name: "ver_guia",
    description:
      "Envía la guía visual de extensiones: pelo_a_pelo (qué es la técnica), fiber_* (ficha de la técnica y sus diseños), " +
      "mapping_* (mapa de longitudes). Úsala cuando pregunte cómo es la técnica, qué diseños hay o las longitudes.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        guia: {
          type: "string",
          enum: [
            "pelo_a_pelo",
            "fiber_clasicas",
            "fiber_rimel",
            "fiber_3d",
            "fiber_4d",
            "mapping_clasicas",
            "mapping_rimel",
            "mapping_mojado",
            "mapping_3d",
            "mapping_4d",
          ],
        },
      },
      required: ["guia"],
      additionalProperties: false,
    },
  },
  {
    name: "ver_carrito",
    description:
      "Muestra el carrito actual: ítems, precio de cada uno, duración y total.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "agregar_al_carrito",
    description:
      "Agrega servicios o packs al carrito (los precios los pone el sistema, incluida la promo vigente).",
    strict: true,
    input_schema: {
      type: "object",
      properties: { ids: idsSchema },
      required: ["ids"],
      additionalProperties: false,
    },
  },
  {
    name: "quitar_del_carrito",
    description: "Quita servicios o packs del carrito.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { ids: idsSchema },
      required: ["ids"],
      additionalProperties: false,
    },
  },
  {
    name: "consultar_dia",
    description:
      "Para el carrito actual y un día: si el salón abre (cierres, feriados con horario reducido, domingo con adelanto), " +
      "duración de cada servicio y del bloque, horarios libres con quién atiende cada servicio y ausencias del personal. " +
      "Úsala SIEMPRE antes de mencionar una hora; nunca inventes horarios.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        fecha: { type: "string", description: "Día YYYY-MM-DD (Lima)." },
      },
      required: ["fecha"],
      additionalProperties: false,
    },
  },
  {
    name: "consultar_equipo",
    description:
      "Lista el personal activo: qué servicios hace cada persona, horario de trabajo, ausencias y coberturas. " +
      "Opcional: fecha para ver quién falta o cubre ese día.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        fecha: {
          type: ["string", "null"],
          description: "Día YYYY-MM-DD o null para el panorama general.",
        },
      },
      required: ["fecha"],
      additionalProperties: false,
    },
  },
  {
    name: "reservar_horario",
    description:
      "Cuando la clienta confirmó día y hora: valida cupo y reglas del personal y lleva a la clienta al paso siguiente " +
      "(adelanto o cita directa, según sus reglas). Después de usarla NO escribas nada más.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        fecha: { type: "string", description: "Día YYYY-MM-DD (Lima)." },
        hora: { type: "string", description: "Hora HH:MM de 24 h (Lima)." },
        mensaje: {
          type: "string",
          description:
            "Texto corto y cálido que se envía antes del siguiente paso.",
        },
      },
      required: ["fecha", "hora", "mensaje"],
      additionalProperties: false,
    },
  },
  {
    name: "reprogramar_cita",
    description:
      "Cambia fecha y hora de una cita ya creada de la clienta (mismos servicios). Valida cupo, personal y feriados, y recalcula el precio según el día. " +
      "Úsala cuando la clienta confirmó el nuevo día y hora. Después NO escribas nada más: el sistema envía la confirmación.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        cita_id: {
          type: ["string", "null"],
          description:
            "ID de la cita (de consultar_mi_cita), o null si solo tiene una.",
        },
        fecha: { type: "string", description: "Nuevo día YYYY-MM-DD (Lima)." },
        hora: {
          type: "string",
          description: "Nueva hora HH:MM de 24 h (Lima).",
        },
      },
      required: ["cita_id", "fecha", "hora"],
      additionalProperties: false,
    },
  },
  {
    name: "cancelar_cita",
    description:
      "Cancela una cita ya creada SIN adelanto cuando la clienta lo pide de forma explícita. Si la cita tiene adelanto o comprobante, la herramienta lo rechaza y debes usar escalar_a_humano.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        cita_id: {
          type: ["string", "null"],
          description:
            "ID de la cita (de consultar_mi_cita), o null si solo tiene una.",
        },
      },
      required: ["cita_id"],
      additionalProperties: false,
    },
  },
  {
    name: "registrar_identidad",
    description:
      "Guarda en la ficha de la clienta su nombre completo y documento (DNI de 8 dígitos o CE). Úsala cuando los escriba (para la boleta del adelanto o para completar su ficha). " +
      "En el paso de boleta, el sistema envía solo los datos del adelanto.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        nombre: { type: "string", description: "Nombre y apellido." },
        documento: { type: "string", description: "DNI (8 dígitos) o CE." },
      },
      required: ["nombre", "documento"],
      additionalProperties: false,
    },
  },
  {
    name: "descartar_reserva",
    description:
      "Descarta la reserva en curso (carrito, día y hora elegidos) cuando la clienta ya no quiere seguir antes de pagar el adelanto. No toca citas ya creadas.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: "consultar_mi_cita",
    description:
      "Lista las citas pendientes de la clienta (id, fecha, servicios, precio). Úsala cuando pregunte por su cita.",
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
      "Pausa el bot y avisa al equipo para que tome el chat: reclamos, devoluciones, cancelar con adelanto, " +
      "asesoría personal o algo que no puedas resolver.",
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
];

function toIdArray(v: unknown): string[] {
  return Array.isArray(v)
    ? [...new Set(v.map((x) => String(x).trim()).filter(Boolean))]
    : [];
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

function itemName(catalog: ServiceCatalog, it: CartItem): string {
  if (it.item_type === "pack") {
    const p = catalog.packsById.get(it.item_id);
    return p?.short_name || p?.title || it.item_id;
  }
  const s = catalog.servicesById.get(it.item_id);
  return s?.short_name || s?.name || it.item_id;
}

/** Pasos en los que todavía no existe la cita (el flujo de reserva sigue abierto). */
export function isPreAppointmentStep(step: string | null | undefined): boolean {
  return step === "awaiting_datetime" || step === AWAITING_DEPOSIT_DATOS ||
    step === AWAITING_DEPOSIT_BOLETA || step === "awaiting_payment_screenshot";
}

/** Cita pendiente de esta clienta por id (o la única si no se indica). */
async function resolveOwnAppointment(
  ctx: AgentToolContext,
  citaId: unknown,
): Promise<
  { ok: true; row: PendingAppointmentRow } | { ok: false; content: string }
> {
  const rows = await getPendingAppointmentsForPhone(
    ctx.supabase,
    ctx.phoneNumber,
  );
  if (rows.length === 0) {
    return { ok: false, content: "No tiene citas pendientes registradas." };
  }
  const id = typeof citaId === "string" && citaId ? citaId : null;
  if (id) {
    const row = rows.find((r) => r.id === id);
    return row ? { ok: true, row } : {
      ok: false,
      content: "Esa cita no es de la clienta o ya no está activa.",
    };
  }
  if (rows.length === 1) return { ok: true, row: rows[0] };
  return {
    ok: false,
    content: `Tiene varias citas; pregunta cuál y pasa cita_id:\n${
      rows.map((r) => `- [${r.id}] ${r.date}`).join("\n")
    }`,
  };
}

/**
 * Valida día/hora contra feriados, horario del salón, cupo y reglas del personal.
 * `excludeAppointmentId` ignora la propia cita al reprogramar.
 */
async function checkSlot(
  ctx: AgentToolContext,
  o: {
    fecha: string;
    hora: string;
    serviceIds: string[];
    duration: number;
    excludeAppointmentId?: string | null;
  },
): Promise<
  { ok: true; when: Date; fecha: string } | { ok: false; content: string }
> {
  const { fecha, hora, serviceIds, duration } = o;
  const m = hora.match(/^(\d{1,2}):(\d{2})$/);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !m) {
    return { ok: false, content: "fecha u hora inválida (YYYY-MM-DD / HH:MM)" };
  }
  const [h, min] = [Number(m[1]), Number(m[2])];
  if (isSalonClosed(fecha)) {
    return { ok: false, content: getSalonClosedMessage(fecha) };
  }
  const when = limaDateKeyAndTimeToUtc(fecha, h, min);
  if (!when || when.getTime() <= Date.now()) {
    return { ok: false, content: "ese horario ya pasó o no es válido" };
  }
  const cap = overlapCapForCart(serviceIds, ctx.catalog);
  const freeHours = () =>
    formatAvailableHours(
      ctx.supabase,
      fecha,
      duration,
      o.excludeAppointmentId ?? undefined,
      cap,
      ctx.catalog,
      serviceIds,
    );
  if (!isValidSalonSlot(h, min, dayOfWeekFromDateKey(fecha), fecha)) {
    return {
      ok: false,
      content:
        `Fuera del horario del salón. Horarios con cupo ese día: ${await freeHours()}`,
    };
  }
  const hhmmKey = `${String(h).padStart(2, "0")}:${
    String(min).padStart(2, "0")
  }`;
  const ok = await hasSlotCapacityForServices(
    ctx.supabase,
    ctx.catalog,
    when,
    duration,
    serviceIds,
    cap,
    o.excludeAppointmentId ?? undefined,
  ) &&
    await employeeRulesAllowSlot(ctx.supabase, fecha, hhmmKey, serviceIds);
  if (!ok) {
    return {
      ok: false,
      content:
        `Sin cupo a las ${hhmmKey}. Horarios con cupo ese día: ${await freeHours()}`,
    };
  }
  return { ok: true, when, fecha };
}

async function cartSummary(ctx: AgentToolContext): Promise<string> {
  const session = await getSession(ctx.supabase, ctx.phoneNumber);
  const items = (session?.cartItems ?? []) as CartItem[];
  const real = items.filter((i) => i.item_id);
  if (real.length === 0) return "El carrito está vacío.";
  const { duration } = resolveBookingItems(
    real.map((i) => i.item_id),
    ctx.catalog,
  );
  const total = real.reduce(
    (s, i) => s + (i.price || 0) * (i.quantity || 1),
    0,
  );
  const lines = real.map((i) => {
    const one = resolveBookingItems([i.item_id], ctx.catalog).duration;
    return `- ${itemName(ctx.catalog, i)} [${i.item_id}] · S/${
      (i.price || 0).toFixed(0)
    } · ${one} min`;
  });
  return `${lines.join("\n")}\nTotal: S/${
    total.toFixed(0)
  } · bloque en agenda: ${duration} min`;
}

async function loadCartIds(ctx: AgentToolContext) {
  const session = await getSession(ctx.supabase, ctx.phoneNumber);
  const items = (session?.cartItems ?? []).filter((i: CartItem) => i.item_id);
  const { duration, serviceIds } = resolveBookingItems(
    items.map((i: CartItem) => i.item_id),
    ctx.catalog,
  );
  return { items: items as CartItem[], duration, serviceIds };
}

const hhmm = (ts: string) => ts.slice(11, 16);

async function employeeNames(
  supabase: SupabaseClient,
): Promise<Map<string, string>> {
  const { data } = await supabase
    .from("employees")
    .select("id, name")
    .eq("tenant_id", getRequestTenantId());
  return new Map(
    ((data ?? []) as { id: string; name: string }[]).map((e) => [e.id, e.name]),
  );
}

export async function dayFacts(
  ctx: AgentToolContext,
  fecha: string,
): Promise<string[]> {
  const out: string[] = [];
  if (isPeruHoliday(fecha)) {
    out.push(
      `Feriado: la última hora de inicio de cita es ${
        getHolidayOpenUntilHour(fecha)
      }:00.`,
    );
  }
  const rate = getAdvancePaymentRate(fecha);
  if (rate != null) {
    out.push(
      `Este día exige adelanto del ${
        Math.round(rate * 100)
      }% para reservar (el sistema lo cobra en el paso siguiente).`,
    );
  }
  const tenant = getRequestTenantId();
  const [off, cov] = await Promise.all([
    ctx.supabase
      .from("employee_time_off")
      .select("employee_id, kind, date_from, date_to, start_time, end_time")
      .eq("tenant_id", tenant)
      .lte("date_from", fecha),
    ctx.supabase
      .from("employee_coverages")
      .select("covered_employee_id, covering_employee_id, date_from, date_to")
      .eq("tenant_id", tenant)
      .lte("date_from", fecha)
      .gte("date_to", fecha),
  ]);
  const names = await employeeNames(ctx.supabase);
  const nm = (id: string) => names.get(id) ?? id;
  type Off = {
    employee_id: string;
    kind: string;
    date_from: string;
    date_to: string | null;
    start_time: string | null;
    end_time: string | null;
  };
  for (const t of (off.data ?? []) as Off[]) {
    if (t.date_to && t.date_to < fecha) continue;
    const partial = t.start_time && t.end_time
      ? ` de ${t.start_time.slice(0, 5)} a ${t.end_time.slice(0, 5)}`
      : " todo el día";
    out.push(`Ausencia: ${nm(t.employee_id)}${partial} (${t.kind}).`);
  }
  for (
    const c of (cov.data ?? []) as {
      covered_employee_id: string;
      covering_employee_id: string;
    }[]
  ) {
    out.push(
      `Cobertura: ${nm(c.covering_employee_id)} cubre a ${
        nm(c.covered_employee_id)
      }.`,
    );
  }
  return out;
}

const norm = (t: string) =>
  t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

const PROMO_QUERY_WORDS = new Set([
  "promo",
  "promos",
  "promocion",
  "promociones",
  "descuento",
  "descuentos",
  "oferta",
  "ofertas",
]);

const PACK_QUERY_WORDS = new Set(["pack", "packs"]);

/** Búsqueda de catálogo para el modelo: todas las palabras deben aparecer. */
export function searchCatalog(
  catalog: ServiceCatalog,
  consulta: string | null,
  categoriaId: string | null,
): string[] {
  const words = norm(consulta ?? "").split(/\s+/).filter((w) => w.length > 1);
  const matchWords = words.filter((w) =>
    !PROMO_QUERY_WORDS.has(w) && !PACK_QUERY_WORDS.has(w)
  );
  const asksPromos = words.some((w) => PROMO_QUERY_WORDS.has(w));
  const asksPacks = words.some((w) => PACK_QUERY_WORDS.has(w));
  const onlyPromos = asksPromos && !asksPacks && matchWords.length === 0;
  const onlyPacks = asksPacks && !asksPromos && matchWords.length === 0;
  const catName = (id: string | null) =>
    catalog.categories.find((c) => c.id === id)?.name ?? "";
  const lines: string[] = [];
  const matches = (hay: string) =>
    matchWords.every((w) => norm(hay).includes(w));
  const promoLines: string[] = [];
  for (const promo of catalog.promotions) {
    if (promo.is_active === false) continue;
    const itemBits = (promo.items ?? []).map((it) => {
      const pack = it.item_type === "pack"
        ? catalog.packsById.get(it.item_id)
        : undefined;
      const svc = it.item_type === "service"
        ? catalog.servicesById.get(it.item_id)
        : undefined;
      const name = it.item_type === "pack"
        ? (pack?.short_name ?? pack?.title ?? "pack")
        : (svc?.name ?? "servicio");
      const disc = parseFloat(String(it.discounted_price)) || 0;
      return `${name} [${it.item_id}] S/${disc.toFixed(0)}`;
    });
    const hay = `${promo.title} ${promo.description ?? ""} ${
      promo.badge ?? ""
    } ${itemBits.join(" ")}`;
    if (categoriaId) {
      const inCat = (promo.items ?? []).some((it) => {
        const cat = it.item_type === "pack"
          ? catalog.packsById.get(it.item_id)?.category_id
          : catalog.servicesById.get(it.item_id)?.category_id;
        return cat === categoriaId;
      });
      if (!inCat) continue;
    }
    if (matchWords.length > 0 && !matches(hay)) continue;
    if (!asksPromos && matchWords.length === 0 && words.length > 0) continue;
    const days = promo.valid_days ? ` · días ${promo.valid_days}` : "";
    promoLines.push(
      `- promo ${promo.title}${
        promo.badge ? ` (${promo.badge})` : ""
      }${days}: ${itemBits.join("; ") || (promo.description ?? "").trim()}`,
    );
  }
  for (const sv of catalog.services) {
    if (onlyPromos || onlyPacks) break;
    if (sv.is_active === false) continue;
    if (categoriaId && sv.category_id !== categoriaId) continue;
    const hay = `${sv.name} ${sv.short_name ?? ""} ${sv.subcategory ?? ""} ${
      catName(sv.category_id)
    }`;
    if (!matches(hay)) continue;
    const price = resolveCartItemPrice(
      catalog,
      "service",
      sv.id,
      parseFloat(sv.price) || 0,
    );
    lines.push(
      `- servicio [${sv.id}] ${sv.name} · S/${
        price.toFixed(0)
      } · ${sv.duration} min · ${catName(sv.category_id)}`,
    );
  }
  for (const pk of catalog.packs) {
    if (onlyPromos) break;
    if (pk.is_active === false) continue;
    if (categoriaId && pk.category_id !== categoriaId) continue;
    const included = parsePackServiceIds(pk)
      .map((id) => catalog.servicesById.get(id)?.name ?? "")
      .join(" ");
    const hay = `${pk.title} ${pk.short_name ?? ""} ${
      catName(pk.category_id)
    } ${included}`;
    if (!onlyPacks && !matches(hay)) continue;
    const price = resolveCartItemPrice(
      catalog,
      "pack",
      pk.id,
      parseFloat(String(pk.pack_price)) || 0,
    );
    const { duration } = resolveBookingItems([pk.id], catalog);
    lines.push(
      `- pack [${pk.id}] ${pk.title} · S/${
        price.toFixed(0)
      } · ${duration} min · ${catName(pk.category_id)}`,
    );
  }
  return [...promoLines, ...lines].slice(0, 15);
}

export async function runAgentTool(
  name: string,
  input: Record<string, unknown>,
  ctx: AgentToolContext,
): Promise<AgentToolResult> {
  try {
    switch (name) {
      case "buscar_servicios": {
        const consulta = typeof input.consulta === "string"
          ? input.consulta
          : null;
        const cat = typeof input.categoria_id === "string" && input.categoria_id
          ? input.categoria_id
          : null;
        const lines = searchCatalog(ctx.catalog, consulta, cat);
        if (lines.length === 0) {
          const cats = ctx.catalog.categories.map((c) => `[${c.id}] ${c.name}`)
            .join(", ");
          return { content: `Sin resultados. Categorías: ${cats}` };
        }
        return { content: lines.join("\n") };
      }

      case "ver_portafolio": {
        const { resolveAndSendPortfolio } = await import("../lib/portfolio.ts");
        const session = await getSession(ctx.supabase, ctx.phoneNumber);
        const pedido = typeof input.pedido === "string" ? input.pedido : "";
        await resolveAndSendPortfolio({
          supabase: ctx.supabase,
          phoneNumber: ctx.phoneNumber,
          param: typeof input.servicio_id === "string"
            ? input.servicio_id
            : null,
          messageText: pedido || ctx.messageText,
          cartServiceIds: (session?.serviceIds ?? []).filter(Boolean),
          catalogServices: ctx.catalog.services.map((sv) => ({
            id: sv.id,
            name: sv.name,
            short_name: sv.short_name ?? null,
            category_id: sv.category_id ?? null,
          })),
          categories: ctx.catalog.categories.map((c) => ({
            id: c.id,
            name: c.name,
          })),
          portfolioIndex: ctx.catalog.portfolioIndex ?? [],
        });
        ctx.sentToClient = true;
        return {
          content:
            "Fotos enviadas (o enlace al Instagram si no hay). Cierra con un mensaje breve que ancle el siguiente paso.",
        };
      }

      case "info_negocio": {
        const tema = String(input.tema ?? "");
        if (tema === "ubicacion") {
          return {
            content: `${
              getConfigText(
                ctx.wabaConfig,
                "ubicacion_text",
                DEFAULT_UBICACION_TEXT,
              )
            }\n\nSi pregunta por Parque Kennedy: ${SALON_NOT_AT_KENNEDY}`,
          };
        }
        if (tema === "politicas") {
          return { content: getPoliticasCitaWhatsApp() };
        }
        if (tema === "antes_de_la_cita") {
          const session = await getSession(ctx.supabase, ctx.phoneNumber);
          const cats = new Set<string>();
          for (const it of (session?.cartItems ?? []) as CartItem[]) {
            const cat = it.item_type === "pack"
              ? ctx.catalog.packsById.get(it.item_id)?.category_id
              : ctx.catalog.servicesById.get(it.item_id)?.category_id;
            if (cat) cats.add(cat);
          }
          return {
            content: getConsideracionesPreviasWhatsApp([...cats]) ||
              "Sin recomendaciones previas para lo que hay en el carrito.",
          };
        }
        return { content: "tema inválido", isError: true };
      }

      case "ver_guia": {
        const kind = parseEduGuideActionParam(String(input.guia ?? ""));
        const guide = kind ? getEduGuideImage(ctx.wabaConfig, kind) : null;
        if (!guide) {
          return {
            content:
              "Esa guía no está disponible; explícalo con tus palabras o usa ver_portafolio.",
            isError: true,
          };
        }
        const { sendImage } = await import("../wa-api.ts");
        await sendImage(ctx.phoneNumber, guide.url, guide.caption);
        ctx.sentToClient = true;
        return {
          content:
            "Guía enviada con su pie de foto. Cierra con un mensaje breve que ancle el siguiente paso.",
        };
      }

      case "ver_carrito":
        return { content: await cartSummary(ctx) };

      case "agregar_al_carrito": {
        const ids = toIdArray(input.ids);
        const { unknown } = resolveBookingItems(ids, ctx.catalog);
        if (ids.length === 0 || unknown.length > 0) {
          return {
            content: `ids no válidos del catálogo: ${
              unknown.join(", ") || "(vacío)"
            }`,
            isError: true,
          };
        }
        const session = await getSession(ctx.supabase, ctx.phoneNumber);
        if (
          await shouldBlockAdditionalBooking(ctx.supabase, ctx.phoneNumber, {
            rescheduleAppointmentId: session?.reschedule_appointment_id ?? null,
          })
        ) {
          return {
            content:
              "La clienta ya tiene una cita pendiente: un servicio adicional lo coordina el equipo (usa escalar_a_humano si insiste).",
            isError: true,
          };
        }
        const items: CartItem[] = ids.map((id) => {
          const isPack = ctx.catalog.packsById.has(id);
          const base = isPack
            ? parseFloat(String(ctx.catalog.packsById.get(id)!.pack_price))
            : parseFloat(ctx.catalog.servicesById.get(id)!.price);
          return {
            item_type: isPack ? "pack" : "service",
            item_id: id,
            quantity: 1,
            price: resolveCartItemPrice(
              ctx.catalog,
              isPack ? "pack" : "service",
              id,
              base || 0,
            ),
          };
        });
        await addCartItems(ctx.supabase, ctx.phoneNumber, items);
        return { content: await cartSummary(ctx) };
      }

      case "quitar_del_carrito": {
        const ids = new Set(toIdArray(input.ids));
        const session = await getSession(ctx.supabase, ctx.phoneNumber);
        const next = ((session?.cartItems ?? []) as CartItem[]).filter((i) =>
          i.item_id && !ids.has(i.item_id)
        );
        const serviceIds = resolveBookingItems(
          next.map((i) => i.item_id),
          ctx.catalog,
        ).serviceIds;
        await upsertSession(ctx.supabase, ctx.phoneNumber, {
          cart_items: JSON.stringify(next),
          cart_service_ids: JSON.stringify(serviceIds),
        });
        return { content: await cartSummary(ctx) };
      }

      case "consultar_dia": {
        const fecha = String(input.fecha ?? "");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
          return { content: "fecha inválida, usa YYYY-MM-DD", isError: true };
        }
        if (fecha < getDateKeyLima(new Date())) {
          return { content: "esa fecha ya pasó", isError: true };
        }
        if (isSalonClosed(fecha)) {
          return { content: `${fecha}: ${getSalonClosedMessage(fecha)}` };
        }
        const { items, duration, serviceIds } = await loadCartIds(ctx);
        if (items.length === 0) {
          return {
            content:
              "El carrito está vacío: primero agrega el servicio con agregar_al_carrito.",
            isError: true,
          };
        }
        const facts = await dayFacts(ctx, fecha);
        const cap = overlapCapForCart(serviceIds, ctx.catalog);
        const free = await formatAvailableHours(
          ctx.supabase,
          fecha,
          duration,
          undefined,
          cap,
          ctx.catalog,
          serviceIds,
        );
        // Quién atiende cada servicio en cada horario libre (motor de personal).
        let staff = "";
        try {
          const { data } = await ctx.supabase.rpc("get_available_slots", {
            p_tenant_id: getRequestTenantId(),
            p_service_ids: serviceIds,
            p_from: fecha,
            p_to: fecha,
            p_step_minutes: 30,
            p_now: null,
            p_exclude_appointment_id: null,
          });
          const rows = (data ?? []) as {
            slot_start: string;
            assignments: {
              service_id: string;
              employee_id: string;
              starts_at: string;
              duration: number;
            }[];
          }[];
          if (rows.length > 0) {
            const names = await employeeNames(ctx.supabase);
            staff = rows
              .map((r) =>
                `${hhmm(r.slot_start)}: ` +
                r.assignments
                  .map((a) =>
                    `${
                      ctx.catalog.servicesById.get(a.service_id)?.name ??
                        a.service_id
                    } ` +
                    `${hhmm(a.starts_at)}+${a.duration}min con ${
                      names.get(a.employee_id) ?? a.employee_id
                    }`
                  )
                  .join("; ")
              )
              .join("\n");
          }
        } catch (err) {
          console.warn("[AGENT] get_available_slots:", err);
        }
        return {
          content: [
            `Día ${fecha}.`,
            ...facts,
            `Carrito (${duration} min en agenda):\n${await cartSummary(ctx)}`,
            `Horarios libres (autoridad: sistema): ${free}`,
            staff
              ? `Asignación de personal por horario (cada 30 min):\n${staff}`
              : "Sin reglas de personal configuradas: el sistema asigna a quien corresponda al cerrar.",
          ].join("\n\n"),
        };
      }

      case "consultar_equipo": {
        const fecha = typeof input.fecha === "string" && input.fecha
          ? input.fecha
          : null;
        const tenant = getRequestTenantId();
        const [emps, svcs, hours] = await Promise.all([
          ctx.supabase
            .from("employees")
            .select("id, name, is_active, does_all_services")
            .eq("tenant_id", tenant),
          ctx.supabase
            .from("employee_services")
            .select("employee_id, service_id")
            .eq("tenant_id", tenant),
          ctx.supabase
            .from("employee_work_hours")
            .select("employee_id, weekday, start_time, end_time")
            .eq("tenant_id", tenant),
        ]);
        type Emp = {
          id: string;
          name: string;
          is_active: boolean;
          does_all_services: boolean;
        };
        const byEmp = new Map<string, string[]>();
        for (
          const r of (svcs.data ?? []) as {
            employee_id: string;
            service_id: string;
          }[]
        ) {
          const list = byEmp.get(r.employee_id) ?? [];
          list.push(
            ctx.catalog.servicesById.get(r.service_id)?.name ?? r.service_id,
          );
          byEmp.set(r.employee_id, list);
        }
        const days = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
        const hoursBy = new Map<string, string[]>();
        for (
          const h of (hours.data ?? []) as {
            employee_id: string;
            weekday: number;
            start_time: string;
            end_time: string;
          }[]
        ) {
          const l = hoursBy.get(h.employee_id) ?? [];
          l.push(
            `${days[h.weekday]} ${h.start_time.slice(0, 5)}-${
              h.end_time.slice(0, 5)
            }`,
          );
          hoursBy.set(h.employee_id, l);
        }
        const lines = ((emps.data ?? []) as Emp[])
          .filter((e) => e.is_active)
          .map((e) =>
            `- ${e.name}: ${
              e.does_all_services
                ? "todos los servicios"
                : (byEmp.get(e.id) ?? []).join(", ") ||
                  "sin servicios asignados"
            }` +
            (hoursBy.has(e.id)
              ? ` · horario: ${hoursBy.get(e.id)!.join(", ")}`
              : "")
          );
        const facts = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)
          ? await dayFacts(ctx, fecha)
          : [];
        return {
          content: [
            lines.length ? lines.join("\n") : "Sin personal configurado.",
            ...facts,
          ].join("\n\n"),
        };
      }

      case "reservar_horario": {
        const { items, duration, serviceIds } = await loadCartIds(ctx);
        if (items.length === 0) {
          return { content: "El carrito está vacío.", isError: true };
        }
        const slot = await checkSlot(ctx, {
          fecha: String(input.fecha ?? ""),
          hora: String(input.hora ?? ""),
          serviceIds,
          duration,
        });
        if (!slot.ok) return { content: slot.content, isError: true };
        const { when, fecha } = slot;
        const session = await getSession(ctx.supabase, ctx.phoneNumber);
        if (
          await shouldBlockAdditionalBooking(ctx.supabase, ctx.phoneNumber, {
            rescheduleAppointmentId: session?.reschedule_appointment_id ?? null,
          })
        ) {
          return {
            content:
              "La clienta ya tiene una cita pendiente; usa escalar_a_humano.",
            isError: true,
          };
        }
        if (
          await newBookingOverlapsExisting(
            ctx.supabase,
            ctx.phoneNumber,
            when,
            duration,
          )
        ) {
          return {
            content:
              "Ese horario se cruza con otra cita pendiente de la clienta.",
            isError: true,
          };
        }
        const mensaje = String(input.mensaje ?? "").trim();
        if (mensaje) await sendMessage(ctx.phoneNumber, mensaje);
        await finalizeBookingAfterDatetimeSelection(
          ctx.supabase,
          ctx.phoneNumber,
          when,
          fecha,
        );
        ctx.turnHandled = true;
        return {
          content:
            "Paso siguiente enviado (adelanto o resumen). No escribas nada más.",
        };
      }

      case "reprogramar_cita": {
        const found = await resolveOwnAppointment(ctx, input.cita_id);
        if (!found.ok) return { content: found.content, isError: true };
        const loaded = await loadAppointmentCartItems(
          ctx.supabase,
          found.row.id,
        );
        if (!loaded.ok) {
          return {
            content:
              "No se pudieron leer los servicios de la cita; usa escalar_a_humano.",
            isError: true,
          };
        }
        const cartIds = loaded.items.map((i) => i.item_id);
        const { duration, serviceIds } = resolveBookingItems(
          cartIds,
          ctx.catalog,
        );
        const slot = await checkSlot(ctx, {
          fecha: String(input.fecha ?? ""),
          hora: String(input.hora ?? ""),
          serviceIds,
          duration,
          excludeAppointmentId: found.row.id,
        });
        if (!slot.ok) return { content: slot.content, isError: true };
        if (
          await newBookingOverlapsExisting(
            ctx.supabase,
            ctx.phoneNumber,
            slot.when,
            duration,
            found.row.id,
          )
        ) {
          return {
            content:
              "Ese horario se cruza con otra cita pendiente de la clienta.",
            isError: true,
          };
        }
        // finalizeRescheduleAppointment lee el carrito de la sesión: se fija el de la cita.
        await upsertSession(ctx.supabase, ctx.phoneNumber, {
          cart_items: JSON.stringify(loaded.items),
          cart_service_ids: JSON.stringify(
            await expandCartItemsToServiceIds(ctx.supabase, loaded.items),
          ),
          reschedule_appointment_id: found.row.id,
        });
        await finalizeRescheduleAppointment(
          ctx.supabase,
          ctx.phoneNumber,
          found.row.id,
          slot.when,
          ctx.catalog,
        );
        ctx.turnHandled = true;
        return {
          content:
            "Reprogramación procesada y confirmación enviada. No escribas nada más.",
        };
      }

      case "cancelar_cita": {
        const found = await resolveOwnAppointment(ctx, input.cita_id);
        if (!found.ok) return { content: found.content, isError: true };
        const { data: ver } = await ctx.supabase
          .from("appointment_verifications")
          .select("id")
          .eq("appointment_id", found.row.id)
          .in("status", ["payment_submitted", "approved"])
          .limit(1);
        const { data: appt } = await ctx.supabase
          .from("appointments")
          .select("deposit_amount")
          .eq("id", found.row.id)
          .maybeSingle();
        const depositAmount = parseFloat(
          String(
            (appt as { deposit_amount?: string } | null)?.deposit_amount ?? 0,
          ),
        ) || 0;
        if ((ver?.length ?? 0) > 0 || depositAmount > 0) {
          await markDepositForfeitRiskIfLateChange(ctx.supabase, found.row.id);
          return {
            content:
              "La cita tiene adelanto: cancelar y devolver lo decide una persona del equipo. Usa escalar_a_humano con el motivo.",
            isError: true,
          };
        }
        const { error } = await ctx.supabase
          .from("appointments")
          .update({
            status: "cancelled",
            cancel_reason: "client_request",
            cancel_note: "Cancelada por la clienta vía WhatsApp (agente)",
            cancelled_at: toLimaLocalTimestamp(new Date()),
          })
          .eq("id", found.row.id)
          .eq("status", "scheduled");
        if (error) {
          console.error("[AGENT] cancelar_cita:", error.message);
          return {
            content: "No se pudo cancelar; usa escalar_a_humano.",
            isError: true,
          };
        }
        await notifyAdmins(
          ctx.supabase,
          "Cita cancelada (WABA)",
          `${ctx.phoneNumber} — ${
            found.row.serviceLabels.join(" + ")
          } — ${found.row.date}`,
          {
            screen: "Agenda",
            appointmentId: found.row.id,
            phone: ctx.phoneNumber,
          },
        );
        return {
          content:
            "Cita cancelada (no tenía adelanto). Confírmalo con calidez y ofrece reagendar cuando quiera.",
        };
      }

      case "registrar_identidad": {
        const nombre = String(input.nombre ?? "").trim();
        const documento = String(input.documento ?? "").trim();
        const identity = parseClientIdentity(`${nombre} ${documento}`, {
          senderPhone: ctx.phoneNumber,
        });
        if (!identity) {
          return {
            content:
              "Nombre completo (nombre y apellido) o documento (DNI de 8 dígitos / CE) no válidos. Pídeselos de nuevo.",
            isError: true,
          };
        }
        const result = await updateClientIdentity(
          ctx.supabase,
          ctx.phoneNumber,
          identity,
        );
        if (!result.ok) {
          return {
            content: result.reason === "dni_taken"
              ? "Ese documento ya está registrado en otra ficha; pídele que lo verifique o usa escalar_a_humano."
              : "No se pudo guardar la ficha; reintenta o usa escalar_a_humano.",
            isError: true,
          };
        }
        const session = await getSession(ctx.supabase, ctx.phoneNumber);
        if (session?.step === AWAITING_DEPOSIT_BOLETA) {
          // Los datos de pago salen del código (monto fijo de la config).
          await sendFixedDepositAdelantoStep(ctx.supabase, ctx.phoneNumber);
          ctx.turnHandled = true;
          return {
            content:
              "Ficha guardada y datos del adelanto enviados. No escribas nada más.",
          };
        }
        if (session?.step === AWAITING_CLIENT_IDENTITY) {
          await upsertSession(ctx.supabase, ctx.phoneNumber, {
            step: "browsing",
          });
        }
        return {
          content:
            "Ficha guardada. Agradece brevemente y continúa donde quedaron.",
        };
      }

      case "descartar_reserva": {
        // Reserva en curso (antes del comprobante): no hay cita creada todavía.
        const session = await getSession(ctx.supabase, ctx.phoneNumber);
        if (!isPreAppointmentStep(session?.step)) {
          return {
            content:
              "No hay una reserva en curso que descartar (para una cita ya creada usa cancelar_cita).",
            isError: true,
          };
        }
        await clearCart(ctx.supabase, ctx.phoneNumber);
        return {
          content:
            "Reserva en curso descartada y carrito vacío. Confírmalo y ofrece retomar cuando quiera.",
        };
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
              `- [${r.id}] ${r.date} · ${
                r.serviceLabels.join(" + ") || "servicio"
              } · S/${parseFloat(r.price).toFixed(0)} · ${r.duration} min`
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

      default:
        return { content: `tool desconocida: ${name}`, isError: true };
    }
  } catch (err) {
    console.error(`[AGENT] tool ${name}:`, err);
    return { content: "error interno de la herramienta", isError: true };
  }
}
