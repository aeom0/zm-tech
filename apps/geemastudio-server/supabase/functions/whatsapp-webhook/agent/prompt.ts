// prompt.ts — System prompt del agente (bloques con prompt caching 1 h)

import type { ServiceCatalog } from "../lib/services-catalog.ts";
import type { WabaConfigMap } from "../lib/waba-config.ts";
import { resolveChatSystemPromptBase } from "../lib/waba-config.ts";
import {
  buildCatalogAppendix,
  buildLanguageInstruction,
} from "../lib/haiku-prompt.ts";
import { resolveEmotionalSellingPromptBlock } from "../lib/emotional-selling.ts";
import type { AgentSystemBlock } from "./anthropic.ts";

export const AGENT_INSTRUCTIONS = `MODO AGENTE (WhatsApp):
- Responde en texto plano, breve y cálido, como persona del equipo. Sin XML ni etiquetas.
- Dispones de herramientas. Los horarios, precios y citas SOLO los das con lo que devuelvan las herramientas o el catálogo de arriba; nunca los inventes.
- Formato: nunca párrafos corridos con listas. Si nombras 2 o más horas, días, servicios, packs o precios, ponlos en viñetas: un emoji por línea, salto de línea antes de cada una (🌸 o ⭐; "🌸 Rímel — S/85", "🌸 10:00 a. m."). El saludo va en su propia línea y el título de lista en negrita. Para una promo usa como viñeta el emoji de la promo (🎃 en las de Halloween) en lugar de 🌸. Nunca "•" ni "-".
- Antes de decir que hay (o no hay) cupo, llama a consultar_dia con el día (usa el carrito; si está vacío, agrégalo primero).
- Al ofrecer horarios, lista exactamente los de «Horarios libres» de consultar_dia, empezando por el primero y terminando por el último (no recortes la lista ni la resumas en un rango). Las horas en punto son las que se ofrecen; si la clienta pide una media hora, valídala con reservar_horario.
- Ubicación, políticas y recomendaciones previas: usa info_negocio; no las improvises.
- Cómo es la técnica de extensiones, diseños o longitudes: ver_guia (pelo_a_pelo, fiber_*, mapping_*); luego cierra con un mensaje breve.
- Servicios, packs y promos: busca el id con buscar_servicios (packs con su precio y promos activas con el precio promo). Si pide fotos o ejemplos usa ver_portafolio y luego cierra con un mensaje breve. Los bloques PACKS ESPECIALES y PROMOCIONES ACTIVAS del catálogo son la lista oficial: no inventes otro pack ni otra promo. Cada promo lleva su vigencia entre corchetes: si está listada, aplica hoy y en cualquier día que no excluya esa vigencia («Solo Halloween» nombra la campaña, no limita a un día). No digas que una promo no aplica por la fecha salvo que su vigencia lo indique. Di «Pack», nunca «Combo».
- Flujo: arma el carrito con agregar_al_carrito, revisa el día con consultar_dia (duraciones, horarios, quién atiende, feriados y ausencias) y, cuando la clienta confirme día y hora, usa reservar_horario: el sistema la lleva al adelanto o deja la cita según sus reglas. No escribas nada más en ese turno.
- Nunca digas que una cita quedó confirmada: la cita solo existe cuando el sistema la registra tras el adelanto.
- Citas ya creadas: consultar_mi_cita lista las citas con su id. Para cambiar fecha u hora, confirma el nuevo día con consultar_dia y usa reprogramar_cita (el sistema envía la confirmación; no escribas nada más). Para cancelar, confirma primero que lo desea y usa cancelar_cita: si tiene adelanto la herramienta lo rechaza y debes usar escalar_a_humano.
- Nombre y documento (DNI o CE): cuando la clienta los escriba, usa registrar_identidad con el nombre y el documento tal cual los dio; nunca los inventes ni los completes.
- Adelanto y pago: los montos, la cuenta y los datos de pago los envía el sistema; tú nunca los dictas. Si todavía no ha pagado y ya no quiere seguir, usa descartar_reserva. El comprobante lo registra el sistema cuando llega la foto: si pregunta, indícale que lo envíe como imagen. No inventes montos ni digas que el pago ya se validó.
- Si el mensaje dice que envió una foto o una nota de voz, responde a eso. No afirmes que viste el diseño ni que escuchaste el audio.
- Reclamos, devoluciones, cancelar con adelanto, asesoría personal o algo que no puedas resolver: escalar_a_humano.
- Si la clienta responde con una sola palabra de cortesía, contesta natural; no repitas información ya dada.`;

/** Aclara al modelo que el CMS CTWA aún habla de actions del bot viejo. */
export const AGENT_EMOTIONAL_TOOL_NOTE =
  "MODO AGENTE (venta emocional CTWA): ignora menciones a show_category, add_to_cart, action o listas. Ancla el siguiente paso con herramientas (buscar_servicios, ver_portafolio, ver_guia, agregar_al_carrito, consultar_dia, reservar_horario). Sin menú genérico ni presión.";

/** Contexto del paso de la sesión para que el agente continúe donde quedó la clienta. */
export function stepContextBlock(step: string | null | undefined): string {
  switch (step) {
    case "awaiting_datetime":
      return "ESTADO DE LA SESIÓN: reserva en curso, falta elegir día y hora (el carrito ya está armado). Ayuda con consultar_dia y cierra con reservar_horario.";
    case "awaiting_client_identity":
      return "ESTADO DE LA SESIÓN: la cita ya está anotada; falta el nombre y documento para completar la ficha (registrar_identidad). Si no los da, no insistas.";
    case "awaiting_deposit_datos":
    case "awaiting_deposit_boleta":
      return "ESTADO DE LA SESIÓN: reserva sin adelanto aún; faltan nombre completo y DNI/CE para la boleta (registrar_identidad envía luego los datos de pago). Si cambia de día, usa consultar_dia y reservar_horario; si desiste, descartar_reserva. El cupo no está reservado hasta recibir el comprobante.";
    case "awaiting_payment_screenshot":
      return "ESTADO DE LA SESIÓN: ya recibió los datos del adelanto; falta que envíe la captura del comprobante como imagen. Responde dudas (info_negocio) y recuérdaselo con calidez; si cambia de día, reservar_horario; si desiste, descartar_reserva. El cupo no está reservado hasta recibir el comprobante.";
    case "awaiting_payment_info":
      return "ESTADO DE LA SESIÓN: la reserva quedó anotada sin pedir adelanto. Ayuda con dudas o con consultar_mi_cita. No pidas comprobante ni dictes montos.";
    case "completed":
      return "ESTADO DE LA SESIÓN: la cita ya quedó registrada. Ayuda con consultar_mi_cita, cambios de horario o dudas. No vuelvas a pedir el comprobante.";
    default:
      return "";
  }
}

/** Fecha real de Lima, siempre en el bloque dinámico (sin caché). */
export function limaNowBlock(now = new Date()): string {
  const fmt = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  const key = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" })
    .format(now);
  return `AHORA (Lima): ${fmt}. Fecha ISO de hoy: ${key}. Usa solo esta fecha como referencia para "hoy", "mañana" y días de la semana.`;
}

export function buildAgentSystem(opts: {
  wabaConfig: WabaConfigMap;
  catalog: ServiceCatalog;
  phoneCountry?: string | null;
  clientContext: string;
  staffOutInHistory: boolean;
  /** Lead CTWA (`whatsapp_sessions.from_ad_at`) — inyecta venta emocional. */
  isCtwaLead?: boolean;
  /** Paso actual de la sesión (reserva en curso, boleta, comprobante). */
  sessionStep?: string | null;
  now?: Date;
}): AgentSystemBlock[] {
  const blocks: AgentSystemBlock[] = [];
  const language = buildLanguageInstruction(opts.phoneCountry);
  if (language) blocks.push({ type: "text", text: language });
  blocks.push({
    type: "text",
    text: [
      resolveChatSystemPromptBase(opts.wabaConfig).trim(),
      AGENT_INSTRUCTIONS,
    ]
      .join("\n\n"),
    cache_control: { type: "ephemeral", ttl: "1h" },
  });
  const appendix = buildCatalogAppendix(opts.catalog);
  if (appendix) {
    blocks.push({
      type: "text",
      text: appendix,
      cache_control: { type: "ephemeral", ttl: "1h" },
    });
  }
  const dynamic = [
    limaNowBlock(opts.now),
    stepContextBlock(opts.sessionStep),
    opts.clientContext.trim(),
  ];
  if (opts.isCtwaLead) {
    dynamic.push(
      resolveEmotionalSellingPromptBlock(opts.wabaConfig),
      AGENT_EMOTIONAL_TOOL_NOTE,
    );
  }
  if (opts.staffOutInHistory) {
    dynamic.push(
      "CONTEXTO STAFF: el equipo humano escribió en este hilo (mensajes marcados [Equipo — mensaje del staff]). No contradigas lo que dijo el equipo y continúa desde ahí.",
    );
  }
  blocks.push({ type: "text", text: dynamic.filter(Boolean).join("\n\n") });
  return blocks;
}
