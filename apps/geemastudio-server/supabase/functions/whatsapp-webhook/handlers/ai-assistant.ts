// ai-assistant.ts — Capa de IA (Claude Haiku) para el bot WhatsApp de ZM Lash & Nails Beauty
// Solo actúa en sesiones "browsing" con texto libre no reconocido por el flujo determinístico.

import type { ServiceCatalog } from "../lib/services-catalog.ts";
import { shouldDeferHaikuAddToCart } from "../lib/haiku-cart-defer.ts";
import {
  getPhoneCountryAndNormalizedFromWa,
  getSession,
  type SupabaseClient,
} from "../lib/supabase.ts";
import {
  getPendingAppointmentsForPhone,
  formatPendingSummaryLines,
  matchesMiCitaIntent,
  shouldBlockAdditionalBooking,
  ADDITIONAL_BOOKING_BLOCK_MESSAGE,
} from "./pending-appointment.ts";
import {
  getHaikuRuntimeSettings,
  resolveChatSystemPromptBase,
  type HaikuTriggerKeywordLists,
  type WabaConfigMap,
} from "../lib/waba-config.ts";
import { HAIKU_RUNTIME_NUMERIC_DEFAULTS } from "../lib/haiku-cms-defaults.ts";
import {
  sessionHasCart,
  matchesServiceChangeIntent,
  extractDateIntentFromText,
  formatAvailableHours,
  matchesHorariosAvailabilityQuery,
  shouldSkipDatetimeResendAfterHaiku,
  getSessionSelectedDay,
} from "./booking-flow.ts";
import {
  formatCartSummaryFromLines,
  formatCatalogBulletNewlines,
  isBusinessHours,
  parseLimaLocalToDate,
} from "../format.ts";
import { MENU_MAIN_OPTIONS, SALUDOS } from "./dispatch/menu-ids.ts";
import { logWaError } from "../lib/error-log.ts";
import {
  FABRICATED_BOOKING_SAFE_REPLY,
  hasFabricatedBookingClaim,
} from "../lib/fabricated-booking-guard.ts";

/**
 * Fecha/día real de Lima + guardrail contra alucinaciones de calendario.
 * Bug LYM …5765 (10-sep-2026): sin esto, Haiku inventaba "hoy es domingo"
 * (era jueves) y luego "confirmaba" una cita a las 3PM en texto libre,
 * contradiciendo el flujo determinístico que ya había bloqueado esa fecha.
 * Va en el bloque dinámico (sin caché) para que sea siempre la fecha real.
 */
function getTodayLimaGuardrailBlock(): string {
  const parts = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return (
    `FECHA DE HOY (Lima): ${get("weekday")} ${get("day")} de ${get("month")}.\n` +
    "PROHIBIDO decir o inventar qué día de la semana es hoy o cualquier otra fecha " +
    "(aunque la clienta lo afirme o corrija) — usa SOLO la fecha de arriba. " +
    "PROHIBIDO confirmar una cita u horario como agendado en texto libre " +
    '("confirmo tu cita a las...", "te espero a las...", etc.) — eso solo lo hace ' +
    "el selector de fecha/hora con botones. Si la clienta pregunta por el día/fecha " +
    "o insiste en corregir el día, usa action:none y pídele elegir con el calendario."
  );
}
import {
  composeHaikuChatSystemBlocks,
  FINAL_FORMAT_REMINDER,
  type HaikuSystemBlock,
} from "../lib/haiku-prompt.ts";
import {
  clearAnthropicCreditExhaustedFlag,
  logAIUsage,
  reportAnthropicApiFailure,
} from "../lib/haiku-usage.ts";
import {
  matchesFilteredPromosIntent,
  matchesPurePromosNavigationIntent,
} from "../lib/promo-intent.ts";
import {
  getEvaluationWindowsTodayLabel,
  getShortServiceSuggestionsForDate,
} from "./agenda.ts";

// Re-exports para compatibilidad con dispatcher.ts y otros llamadores
export { isAIRateLimited } from "../lib/haiku-usage.ts";
export {
  generateWelcomeGreeting,
  getFallbackGreeting,
  getTimeSlot,
} from "../lib/haiku-greeting.ts";
export type { TimeSlot } from "../lib/haiku-greeting.ts";
export {
  buildCatalogAppendix,
  buildLanguageInstruction,
  composeHaikuChatSystem,
  FORMAT_INSTRUCTION,
  getLanguageForCountry,
} from "../lib/haiku-prompt.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export type AITriggerType =
  | "free_question"
  | "recommendation"
  | "booking_request"
  | "fallback"
  | "opt_out";

export interface AITriggerResult {
  type: AITriggerType;
  originalMessage: string;
}

export type AIActionType =
  | "show_menu"
  | "show_category"
  | "show_portfolio"
  | "show_edu_guide"
  | "show_packs"
  | "show_promos"
  | "show_services"
  | "book_last_service"
  | "add_to_cart"
  | "confirm_booking"
  | "escalate_staff";

export interface AIAction {
  type: AIActionType;
  /** Para show_category: category_id. Para show_portfolio: service UUID o cat-XXXX */
  /** Para add_to_cart: IDs de servicios separados por coma (ej: "uuid1,uuid2,uuid3") */
  param?: string;
}

/** Máx. burbujas WA por turno Haiku (estilo Vanessa). */
export const HAIKU_MAX_TEXT_BUBBLES = 4;
const HAIKU_BUBBLE_GAP_MS = 500;

export interface AIResponse {
  /** Primera burbuja (compat); igual a texts[0] ?? "". */
  text: string;
  /** Hasta HAIKU_MAX_TEXT_BUBBLES mensajes cortos separados. */
  texts: string[];
  action?: AIAction;
}

export interface AIContext {
  phoneNumber: string;
  contactName: string;
  catalog: ServiceCatalog;
  supabase: SupabaseClient;
  /** Código de país del número (ej. "PE" para Perú, "58" para Venezuela, "33" para Francia). Viene de `clients.phone_country`. */
  phoneCountry?: string | null;
}

// ---------------------------------------------------------------------------
// detectAITrigger
// ---------------------------------------------------------------------------

const INTERACTIVE_PREFIXES = [
  "cat-",
  "svc-",
  "pack_",
  "pitem_",
  "promo_",
  "subcat_",
  "date_",
  "time_",
  "portf_",
];
const CART_IDS = [
  "agregar_otro",
  "ver_seleccion",
  "agendar_ya",
  "vaciar_carrito",
  "volver_categorias",
];
/** Comprueba saludo como palabra completa — evita que "hola" matchee en "hidralips" o "hi" en "hidralips". */
function isSaludoWord(lower: string): boolean {
  return SALUDOS.some((s) => {
    if (lower === s) return true;
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`(?:^|\\s)${escaped}(?:\\s|[!?,.]|$)`).test(lower);
  });
}

// Intenciones que deben ir al flujo determinístico (nunca a IA)
const DETERMINISTIC_INTENTS: { keywords: string[]; exact?: boolean }[] = [
  // "servicio/servicios" solo bloquea cuando es intención de ver/listar, no preguntas informativas.
  // Frases como "¿el servicio de lifting es apto para...?" deben llegar a Haiku.
  {
    keywords: [
      "ver servicios",
      "ver el servicio",
      "mostrar servicios",
      "lista de servicios",
      "qué servicios tienen",
      "que servicios tienen",
      "cuáles servicios",
      "cuales servicios",
      "todos los servicios",
      "sus servicios",
    ],
  },
  // "horario" solo bloquea si es la palabra sola/menú — "¿a qué hora abren?" pasa a Haiku
  { keywords: ["ver horario", "ver horarios", "consultar horario"] },
  {
    keywords: [
      "agendar",
      "agenda",
      "reservar",
      "reserva",
      "quiero una cita",
      "hacer una cita",
      "necesito una cita",
      "nueva cita",
    ],
  },
];

/**
 * Clasifica si el mensaje debe ser atendido por IA.
 * Retorna null si el flujo determinístico debe manejarlo.
 *
 * @param lists - Desde `getHaikuTriggerKeywordsFromWaba(wabaConfig)` (BD + defaults en `haiku-cms-defaults`).
 */
export function detectAITrigger(
  message: string,
  lists: HaikuTriggerKeywordLists,
  hasCart = false,
): AITriggerResult | null {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  const recommendationKw = lists.recommendation;
  const freeQuestionKw = lists.free_question;
  const blockedKw = lists.blocked;

  // Mensajes muy cortos
  if (trimmed.length <= 3) return null;

  // Números solos
  if (/^\d+$/.test(trimmed)) return null;

  // Prefijos interactivos
  for (const prefix of INTERACTIVE_PREFIXES) {
    if (lower.startsWith(prefix)) return null;
  }

  // IDs de carrito/menú
  if (CART_IDS.includes(lower) || MENU_MAIN_OPTIONS.includes(lower))
    return null;

  // Saludos cortos (≤20 chars) — no activar Haiku para "hola", "buenos días", etc.
  // Mensajes más largos con saludo al inicio ("Hola, ¿cuánto cuesta el lifting?") sí van a Haiku.
  if (isSaludoWord(lower) && trimmed.length <= 20) return null;

  // Baja/opt-out: nunca enviar estas solicitudes a Haiku ni interpretarlas
  // como una pregunta libre. La pausa definitiva de campañas se gestiona en
  // el bloqueo operativo del número; aquí evitamos una respuesta de IA-talk.
  if (
    /^(stop|baja|unsubscribe|cancelar\s+(?:suscripci[oó]n|promociones?)|no\s+quiero\s+(?:más|mas)\s+(?:mensajes|promociones?))[\s!.]*$/i.test(
      trimmed,
    )
  ) {
    return { type: "opt_out", originalMessage: trimmed };
  }

  // Mi cita / reprogramar → flujo determinístico (no IA)
  if (matchesMiCitaIntent(lower)) return null;

  // Una solicitud de cita con fecha explícita puede aprovechar los huecos
  // reales para recomendar servicios cortos antes de pedir el servicio.
  if (
    !matchesHorariosAvailabilityQuery(lower) &&
    /\b(mañana|manana|pasado\s+mañana|pasado\s+manana)\b/i.test(lower) &&
    /\b(cita|agendar|agenda|reservar|reserva|horario|disponible|espacio)\b/i.test(
      lower,
    )
  ) {
    if (hasCart) return null;
    return { type: "booking_request", originalMessage: trimmed };
  }

  // Intenciones determinísticas (promos, servicios, agendar) → flujo del bot
  if (matchesPurePromosNavigationIntent(lower)) return null;
  for (const intent of DETERMINISTIC_INTENTS) {
    if (intent.keywords.some((k) => lower.includes(k))) return null;
  }

  // Panel: no usar IA si el mensaje contiene alguna palabra de la lista "bloqueada"
  if (blockedKw.length > 0 && blockedKw.some((k) => k && lower.includes(k))) {
    return null;
  }

  // Recomendaciones
  if (recommendationKw.some((k) => lower.includes(k))) {
    return { type: "recommendation", originalMessage: trimmed };
  }

  // Preguntas libres
  if (freeQuestionKw.some((k) => lower.includes(k))) {
    return { type: "free_question", originalMessage: trimmed };
  }

  // Cualquier otro texto libre
  return { type: "fallback", originalMessage: trimmed };
}

// ---------------------------------------------------------------------------
// getClientContext
// ---------------------------------------------------------------------------

/** Abono enviado y aún sin aprobar. `.eq` (no `.or`): un BSUID trae un punto. */
async function depositAwaitingReview(
  supabase: SupabaseClient,
  phoneNumber: string,
  verificationId: string | null,
): Promise<boolean> {
  if (verificationId) {
    const { data } = await supabase
      .from("appointment_verifications")
      .select("id")
      .eq("id", verificationId)
      .eq("status", "payment_submitted")
      .eq("kind", "deposit")
      .maybeSingle();
    if (data?.id) return true;
  }
  const { data: byPhone } = await supabase
    .from("appointment_verifications")
    .select("id")
    .eq("client_phone", phoneNumber)
    .eq("status", "payment_submitted")
    .eq("kind", "deposit")
    .limit(1)
    .maybeSingle();
  return !!byPhone?.id;
}

export async function getClientContext(
  supabase: SupabaseClient,
  phoneNumber: string,
): Promise<string> {
  try {
    const { country, normalized } =
      getPhoneCountryAndNormalizedFromWa(phoneNumber);
    const digitsOnly = phoneNumber.replace(/\D/g, "");
    let { data: client } = await supabase
      .from("clients")
      .select("id, name")
      .eq("phone_country", country)
      .eq("phone_normalized", normalized)
      .maybeSingle();

    if (!client) {
      const r2 = await supabase
        .from("clients")
        .select("id, name")
        .eq("phone", digitsOnly)
        .maybeSingle();
      client = r2.data;
    }

    const pending = await getPendingAppointmentsForPhone(supabase, phoneNumber);
    const { data: waSession } = await supabase
      .from("whatsapp_sessions")
      .select(
        "cart_items, cart_service_ids, step, selected_day, reschedule_appointment_id, verification_id",
      )
      .eq("phone", phoneNumber)
      .maybeSingle();

    const sessionStep =
      typeof waSession?.step === "string" ? waSession.step : "";
    const awaitingDatetime = sessionStep === "awaiting_datetime";
    const rescheduleId =
      typeof waSession?.reschedule_appointment_id === "string"
        ? waSession.reschedule_appointment_id
        : null;
    const isRescheduling = !!rescheduleId && awaitingDatetime;

    let pendingBlock =
      pending.length > 0
        ? isRescheduling
          ? `\nREPROGRAMANDO cita activa:\n${formatPendingSummaryLines(pending)}\n` +
            `Si pide CAMBIAR el servicio (ej. "ya no quiero Builder, solo esmalte/manicure"), ` +
            `usa add_to_cart con el NUEVO servicio del catálogo (reemplaza el carrito; no duplica cita). ` +
            `NO inventes hora confirmada — sigue eligiendo día/hora con los botones.`
          : `\nCITA PROGRAMADA (reserva activa en este número):\n${formatPendingSummaryLines(pending)}\n` +
            `NO uses add_to_cart ni abras otro agendado. Si pide otra cita, otra persona u otro horario, indica que escriba al 📱 932 535 512. Para cambiar fecha/hora: *Mi cita* o que escriba la hora (ej. *10 am*) — el sistema la aplica; PROHIBIDO decir que ya cambiaste la cita.`
        : `\nSIN CITA PROGRAMADA: este número no tiene ninguna reserva activa.\n` +
          `PROHIBIDO confirmar una cita, decir "te esperamos", "¿a qué hora llegas?", "nos vemos" o dar por hecho que va a venir. ` +
          `Si dice que ya viene, que está en camino o que tiene cita, avísale con amabilidad que no encontramos su reserva y ofrécele agendar (*agendar*) o escribir al 📱 932 535 512.`;

    const verificationId =
      typeof waSession?.verification_id === "string"
        ? waSession.verification_id
        : null;
    if (await depositAwaitingReview(supabase, phoneNumber, verificationId)) {
      pendingBlock +=
        `\nPAGO EN REVISIÓN: el comprobante del abono ya llegó y sigue sin aprobar. ` +
        (isBusinessHours()
          ? `Estamos en horario: el equipo lo valida en breve.`
          : `Estamos fuera de horario: se valida a primera hora del próximo día hábil.`) +
        ` La cita sigue reservada. Si saluda o pregunta ("hola", "hola?", "ya?", "sí", "no"), dile eso con calma. action:none. Sin menú ni add_to_cart.`;
    }

    // Construir bloque de carrito con nombres reales de servicios/packs
    let cartBlock = "";
    try {
      const cartItems = waSession?.cart_items
        ? JSON.parse(String(waSession.cart_items))
        : [];
      const cartIds = waSession?.cart_service_ids
        ? JSON.parse(String(waSession.cart_service_ids))
        : [];

      if (Array.isArray(cartItems) && cartItems.length > 0) {
        const svcIds = cartItems
          .filter((i: { item_type: string }) => i.item_type === "service")
          .map((i: { item_id: string }) => i.item_id);
        const packIds = cartItems
          .filter((i: { item_type: string }) => i.item_type === "pack")
          .map((i: { item_id: string }) => i.item_id);
        const names: string[] = [];
        if (svcIds.length > 0) {
          const { data: svcs } = await supabase
            .from("services")
            .select("id, name, price")
            .in("id", svcIds);
          for (const item of cartItems.filter(
            (i: { item_type: string }) => i.item_type === "service",
          )) {
            const svc = (svcs ?? []).find(
              (s: { id: string }) => s.id === item.item_id,
            );
            if (svc)
              names.push(
                `${svc.name} (S/${parseFloat(String(item.price)).toFixed(0)})`,
              );
          }
        }
        if (packIds.length > 0) {
          const { data: packs } = await supabase
            .from("packs")
            .select("id, title, short_name")
            .in("id", packIds);
          for (const item of cartItems.filter(
            (i: { item_type: string }) => i.item_type === "pack",
          )) {
            const pack = (packs ?? []).find(
              (p: { id: string }) => p.id === item.item_id,
            );
            if (pack)
              names.push(
                `${pack.short_name ?? pack.title} (S/${parseFloat(String(item.price)).toFixed(0)})`,
              );
          }
        }
        if (names.length > 0) {
          if (pending.length > 0 && !isRescheduling) {
            cartBlock = `\nCARRITO ACTIVO (${names.length} ítem${names.length > 1 ? "s" : ""}) pero ya hay CITA PROGRAMADA — NO uses add_to_cart ni abras otro agendado.`;
          } else if (awaitingDatetime) {
            cartBlock =
              `\nAGENDANDO (paso fecha/hora) — carrito:\n${names.map((n) => `- ${n}`).join("\n")}\n` +
              `PROHIBIDO decir "reservado", "agendado", "cita confirmada" o inventar hora.\n` +
              `Si pide el MISMO servicio otra vez: action:none e invita a elegir día/hora.\n` +
              `Si pide CAMBIAR / reemplazar el servicio ("ya no quiero X, solo Y"): usa add_to_cart con el NUEVO ID (el sistema reemplaza el carrito).\n` +
              `Si la pregunta NO tiene que ver con elegir fecha/hora (ej. duda sobre otro producto/servicio): respóndela y cierra con UNA frase corta invitando a seguir con día/hora u otro servicio (ej. "¿Seguimos con tu cita o quieres agregar algo más?") — no repitas los botones, ya los tiene arriba.`;
          } else {
            cartBlock =
              `\nCARRITO ACTIVO (${names.length} ítem${names.length > 1 ? "s" : ""}):\n${names.map((n) => `- ${n}`).join("\n")}\n` +
              `NO uses show_menu. Si ya eligió estos servicios, NO uses add_to_cart otra vez — invita a confirmar fecha. ` +
              `add_to_cart SOLO si pide AGREGAR un servicio distinto al carrito.`;
          }
        }
      } else if (Array.isArray(cartIds) && cartIds.length > 0) {
        cartBlock =
          pending.length > 0 && !isRescheduling
            ? "\nCARRITO ACTIVO pero ya hay CITA PROGRAMADA — NO uses add_to_cart."
            : awaitingDatetime
              ? "\nAGENDANDO fecha/hora con carrito. Si cambia de servicio → add_to_cart del nuevo. NO digas que ya está reservado."
              : "\nCARRITO ACTIVO: la clienta ya tiene servicios seleccionados. NO uses show_menu. Invita a agendar (sin re-agregar al carrito).";
      }
    } catch {
      // silencioso
    }

    if (!client) {
      if (pending.length > 0) {
        return `CLIENTA: sin ficha completa en BD.${pendingBlock}${cartBlock}`;
      }
      return `CLIENTA: Primera visita (cliente nueva)${pendingBlock}${cartBlock}`;
    }

    const { data: appts } = await supabase
      .from("appointments")
      .select("date, price, services(name)")
      .eq("client_id", client.id)
      .eq("status", "completed")
      .order("date", { ascending: false })
      .limit(5);

    if (!appts || appts.length === 0) {
      return (
        "CLIENTA: Sin visitas previas completadas en sistema." +
        pendingBlock +
        cartBlock
      );
    }

    const lastDt = parseLimaLocalToDate(String(appts[0].date));
    const lastDate = lastDt
      ? lastDt.toLocaleDateString("es-PE", {
          timeZone: "America/Lima",
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : String(appts[0].date);

    const serviceNames = appts
      .flatMap(
        (a: { services: { name: string } | { name: string }[] | null }) => {
          if (!a.services) return [];
          return Array.isArray(a.services)
            ? a.services.map((s) => s.name)
            : [a.services.name];
        },
      )
      .filter(Boolean)
      .slice(0, 5);

    const uniqueNames = [...new Set(serviceNames)];

    return [
      "HISTORIAL DE LA CLIENTA:",
      `- Es clienta recurrente (${appts.length} visita${appts.length !== 1 ? "s" : ""} previas)`,
      `- Última visita: ${lastDate}`,
      uniqueNames.length > 0
        ? `- Servicios anteriores: ${uniqueNames.join(", ")}`
        : "",
      pendingBlock,
      cartBlock,
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// parseAIResponse + callAnthropicAPI
// ---------------------------------------------------------------------------

/**
 * Red de seguridad determinística: si Haiku ignoró la regla de "1 viñeta
 * 🌸/⭐ por línea" y pegó una lista de precios en texto corrido (visto en
 * vivo, Gimena 17-sep-2026), fuerza el salto de línea antes de cada viñeta.
 * Solo dispara con 2+ viñetas y 2+ precios "S/" — evita falsos positivos
 * sobre el uso normal de 1 emoji suelto por burbuja.
 */
function forceBulletLineBreaks(text: string): string {
  const bulletCount = (text.match(/[🌸⭐]/gu) ?? []).length;
  const priceCount = (text.match(/S\/\d/g) ?? []).length;
  if (bulletCount < 2 || priceCount < 2) return text;
  return text.replace(
    /[ \t]*([🌸⭐])/gu,
    (_match, emoji: string, offset: number, str: string) => {
      const before = str.slice(0, offset);
      if (before.length === 0 || before.endsWith("\n")) return emoji;
      return `\n${emoji}`;
    },
  );
}

/**
 * Red de seguridad determinística: staff prohíbe "combo" (no vendemos comida,
 * es "pack") pero Haiku a veces lo usa igual pese a la regla del prompt
 * (visto en vivo, Alberto VE …4665, 17-sep-2026). Reemplaza por "pack"/"packs"
 * preservando mayúscula inicial.
 */
function forceCombosAsPacks(text: string): string {
  return text.replace(/\bcombos?\b/gi, (match) => {
    const plural = /s$/i.test(match);
    const capitalized = /^[A-Z]/.test(match);
    const base = plural ? "packs" : "pack";
    return capitalized ? base[0]!.toUpperCase() + base.slice(1) : base;
  });
}

/** Quita tags XML residuales para que nunca lleguen al chat de WhatsApp. */
function sanitizeHaikuText(raw: string): string {
  return forceCombosAsPacks(
    forceBulletLineBreaks(
      raw
        .replace(/<action>[\s\S]*?<\/action>/gi, "")
        .replace(/<\/?text>/gi, "")
        .replace(/<\/?action>/gi, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n"),
    ),
  ).trim();
}

export function parseAIResponse(raw: string): AIResponse {
  const actionMatch = raw.match(/<action>([\s\S]*?)<\/action>/);
  const textBlocks = [...raw.matchAll(/<text>([\s\S]*?)<\/text>/gi)]
    .map((m) => sanitizeHaikuText(m[1] ?? ""))
    .filter(Boolean)
    .slice(0, HAIKU_MAX_TEXT_BUBBLES);

  // Preferir <text>…</text>; si Haiku omite wrappers, un solo bloque limpio
  const texts =
    textBlocks.length > 0
      ? textBlocks
      : (() => {
          const fallback = sanitizeHaikuText(raw);
          return fallback ? [fallback] : [];
        })();
  const text = texts[0] ?? "";

  const withAction = (action?: AIAction): AIResponse => ({
    text,
    texts,
    action,
  });

  if (!actionMatch || actionMatch[1].trim() === "none") {
    return withAction();
  }

  const actionRaw = actionMatch[1].trim();

  if (actionRaw.startsWith("show_category:")) {
    const param = actionRaw.split(":")[1]?.trim();
    return withAction({ type: "show_category", param });
  }

  if (actionRaw.startsWith("show_portfolio:")) {
    const param = actionRaw.slice("show_portfolio:".length).trim();
    return withAction({ type: "show_portfolio", param });
  }

  if (actionRaw === "show_portfolio") {
    return withAction({ type: "show_portfolio" });
  }

  if (actionRaw.startsWith("show_edu_guide:")) {
    const param = actionRaw.slice("show_edu_guide:".length).trim();
    return withAction({ type: "show_edu_guide", param });
  }

  if (actionRaw === "show_edu_guide") {
    return withAction({ type: "show_edu_guide", param: "pelo_a_pelo" });
  }

  if (actionRaw.startsWith("add_to_cart:")) {
    const param = actionRaw.slice("add_to_cart:".length).trim();
    return withAction({ type: "add_to_cart", param });
  }

  if (actionRaw === "escalate_staff" || actionRaw.startsWith("escalate_staff:")) {
    const param = actionRaw.split(":")[1]?.trim() || "money";
    return withAction({ type: "escalate_staff", param });
  }

  const validActions: AIActionType[] = [
    "show_menu",
    "show_packs",
    "show_promos",
    "show_services",
    "book_last_service",
    "confirm_booking",
  ];
  const actionType = validActions.find((a) => a === actionRaw);
  if (actionType) {
    return withAction({ type: actionType });
  }

  return withAction();
}

// Tope de "Srta. {nombre}" por episodio — repetirlo en cada burbuja/turno de
// Haiku sonaba a corrección constante (feedback Alberto, 04-ago-2026). Se
// permite en la apertura y una vez más; de ahí en adelante, tono directo sin
// tratamiento repetido.
const SRTA_MAX_PER_EPISODE = 2;

/** Yelitza …1186: Haiku a veces devuelve 2–3 cierres redundantes en un turno. */
function looksLikeClosingBubble(text: string): boolean {
  const t = text.toLowerCase();
  return /te esperamos|nos vemos|de nada|cualquier duda/.test(t);
}

async function sendHaikuTextBubbles(
  sendMessage: (phone: string, text: string) => Promise<unknown>,
  phoneNumber: string,
  texts: string[],
  opts?: {
    contactName?: string | null;
    alreadyGreeted?: boolean;
    srtaUsedCount?: number;
    /** Si hay supabase, dumps de dirección se omiten si ya salieron en wa_messages. */
    supabase?: SupabaseClient;
  },
): Promise<void> {
  const { applyAddressStyle } = await import("../lib/client-address.ts");
  const { isMostlySalonLocationDump } = await import(
    "../lib/salon-location.ts"
  );
  const { wasLocationRecentlySent } = await import("../lib/inbound-gate.ts");
  const raw = texts
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, HAIKU_MAX_TEXT_BUBBLES);
  // Danae …6318: no re-pegar Calle Artesanos si el branch determinístico (u otro
  // OUT) ya lo escribió. Usamos lectura post-hecho — NO tryClaim aquí: el guard
  // CTWA/dispatcher ya puede haber reclamado location_reply antes de invocar
  // Haiku; un 2.º claim fallaría y borraría la única respuesta de dirección.
  let skipLocationDumps = false;
  if (opts?.supabase && raw.some((b) => isMostlySalonLocationDump(b))) {
    skipLocationDumps = await wasLocationRecentlySent(
      opts.supabase,
      phoneNumber,
    );
  }
  const bubbles: string[] = [];
  for (const bubble of raw) {
    if (skipLocationDumps && isMostlySalonLocationDump(bubble)) {
      console.log(
        "[AI] skip Haiku location dump (ya salió en OUT):",
        phoneNumber.slice(-4),
      );
      continue;
    }
    bubbles.push(bubble);
  }
  if (bubbles.length >= 2 && bubbles.every((b) => looksLikeClosingBubble(b))) {
    bubbles.splice(1);
  }
  let srtaUsedCount = opts?.srtaUsedCount ?? 0;
  for (let i = 0; i < bubbles.length; i++) {
    if (i > 0) {
      await new Promise((r) => setTimeout(r, HAIKU_BUBBLE_GAP_MS));
    }
    const styled = formatCatalogBulletNewlines(
      applyAddressStyle(bubbles[i]!, opts?.contactName, {
        // Tras la 1.ª burbuja del turno, o si el hilo ya saludó, no más ¡Hola!
        alreadyGreeted: Boolean(opts?.alreadyGreeted) || i > 0,
        srtaAllowed: srtaUsedCount < SRTA_MAX_PER_EPISODE,
      }),
    );
    if (/\bSrta\./i.test(styled)) srtaUsedCount++;
    await sendMessage(phoneNumber, styled);
  }
}

// Guarda de código: Haiku no debe declarar cita confirmada sin respaldo.
// Patrones en lib/fabricated-booking-guard.ts (caso …4665 + review PR #134).

export async function callAnthropicAPI(
  systemPrompt: string | HaikuSystemBlock[],
  userMessage: string,
  opts?: {
    max_tokens?: number;
    timeout_ms?: number;
    history?: { role: "user" | "assistant"; content: string }[];
    /** Si se pasa, reporta crédito agotado / errores HTTP a BD + push. */
    supabase?: SupabaseClient;
    phoneNumber?: string;
    source?: string;
  },
): Promise<{
  text: string;
  texts: string[];
  inputTokens: number;
  outputTokens: number;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  action?: AIAction;
} | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("[AI] ANTHROPIC_API_KEY no configurada");
    return null;
  }

  const max_tokens =
    opts?.max_tokens ?? HAIKU_RUNTIME_NUMERIC_DEFAULTS.max_tokens;
  const timeout_ms =
    opts?.timeout_ms ?? HAIKU_RUNTIME_NUMERIC_DEFAULTS.timeout_ms;
  const source = opts?.source ?? "callAnthropicAPI";

  // Construir mensajes: historial previo + mensaje actual
  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...(opts?.history ?? []),
    { role: "user", content: userMessage },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout_ms);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens,
        system: systemPrompt,
        messages,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        "[AI] Anthropic API error:",
        response.status,
        errText.slice(0, 200),
      );
      if (opts?.supabase) {
        void reportAnthropicApiFailure(opts.supabase, {
          status: response.status,
          bodyText: errText,
          source,
          phoneNumber: opts.phoneNumber,
        });
      }
      return null;
    }

    const data = await response.json();
    if (opts?.supabase) {
      void clearAnthropicCreditExhaustedFlag(opts.supabase);
    }
    const rawText = (data?.content?.[0]?.text as string | undefined)?.trim();
    if (!rawText) return null;
    const parsed = parseAIResponse(rawText);
    // Guarda de código (no solo prompt) — caso real 17-sep (…4665): el carrito se
    // había vaciado por cart-nudge nudge2 y Haiku igual redactó "¡Listo! Tu cita
    // quedó confirmada..." sin que exista fila real en `appointments`. El prompt ya
    // prohibía esto (REGLA CRÍTICA — NO INVENTAR CITA CONFIRMADA) pero no es 100%
    // confiable para un intent crítico de dinero/reservas — bloquear también en código.
    const fabricatedBooking = hasFabricatedBookingClaim(
      parsed.text,
      parsed.texts,
    );
    if (fabricatedBooking) {
      console.error(
        "[AI] Bloqueado: Haiku declaró una cita confirmada sin respaldo real",
        {
          source,
          phoneSuffix: opts?.phoneNumber?.slice(-4),
          rawText: rawText.slice(0, 300),
        },
      );
      if (opts?.supabase) {
        void logWaError(opts.supabase, {
          phone: opts.phoneNumber,
          error: "Haiku declaró una cita confirmada sin respaldo real",
          context: { source, rawText: rawText.slice(0, 500) },
          fallbackSent: true,
        });
      }
      // Si Haiku ya pidió confirm_booking, conservar la action: el texto
      // fabricado se sustituye, pero el cierre determinístico sí debe correr.
      const keepConfirm =
        parsed.action?.type === "confirm_booking" ? parsed.action : undefined;
      return {
        text: FABRICATED_BOOKING_SAFE_REPLY,
        texts: [FABRICATED_BOOKING_SAFE_REPLY],
        action: keepConfirm,
        inputTokens: (data?.usage?.input_tokens as number) ?? 0,
        outputTokens: (data?.usage?.output_tokens as number) ?? 0,
        cacheCreationInputTokens:
          (data?.usage?.cache_creation_input_tokens as number) ?? 0,
        cacheReadInputTokens:
          (data?.usage?.cache_read_input_tokens as number) ?? 0,
      };
    }
    return {
      text: parsed.text,
      texts: parsed.texts,
      action: parsed.action,
      inputTokens: (data?.usage?.input_tokens as number) ?? 0,
      outputTokens: (data?.usage?.output_tokens as number) ?? 0,
      cacheCreationInputTokens:
        (data?.usage?.cache_creation_input_tokens as number) ?? 0,
      cacheReadInputTokens:
        (data?.usage?.cache_read_input_tokens as number) ?? 0,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError") {
      console.warn(
        "[AI] Timeout: Anthropic API no respondió en",
        timeout_ms,
        "ms",
      );
    } else {
      console.error("[AI] Error llamando Anthropic:", err);
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// executeAIAction — ejecuta la acción de navegación que Haiku indicó
// ---------------------------------------------------------------------------

/**
 * True si tras el texto que disparó Haiku llegó un tap de lista interactiva
 * (carrera coalesce / latencia API → lista duplicada).
 */
async function clientChoseListWhileHaikuThought(
  supabase: SupabaseClient,
  phoneNumber: string,
  originalMessage: string,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("wa_messages")
      .select("msg_type, content, created_at")
      .eq("phone", phoneNumber)
      .eq("direction", "in")
      .order("created_at", { ascending: false })
      .limit(10);
    if (error || !data?.length) return false;

    const needle = originalMessage.trim().slice(0, 48).toLowerCase();
    const triggerRow = data.find((m) => {
      if (m.msg_type !== "text") return false;
      const c = String(m.content ?? "").toLowerCase();
      return needle.length > 0 && c.includes(needle);
    });
    if (!triggerRow?.created_at) return false;
    const t0 = new Date(triggerRow.created_at as string).getTime();
    return data.some(
      (m) =>
        m.msg_type === "interactive" &&
        new Date(m.created_at as string).getTime() > t0,
    );
  } catch {
    return false;
  }
}

async function executeAIAction(
  action: AIAction,
  ctx: AIContext,
  wabaConfig?: WabaConfigMap,
  originalMessage?: string,
  aiResponseText?: string,
): Promise<void> {
  const { phoneNumber, catalog, supabase } = ctx;
  const { getSession } = await import("../lib/supabase.ts");

  const sessionForCtwa = wabaConfig
    ? await getSession(supabase, phoneNumber)
    : null;
  const isCtwaLead = Boolean(sessionForCtwa?.from_ad_at);

  const {
    sendMenuWithPromos,
    sendCategoriesList,
    sendServicesList,
    sendPromosListFromCatalog,
    sendUnasSubcategoriesList,
    sendExtensionesSubcategoriesList,
    catalogPacksToForList,
    sendCartOptions,
  } = await import("./menu.ts");
  const { sendMessage } = await import("../wa-api.ts");

  try {
    switch (action.type) {
      case "show_menu": {
        const session = await getSession(supabase, phoneNumber);
        if (sessionHasCart(session)) {
          const cartItems = session?.cartItems ?? [];
          const lines: {
            name: string;
            quantity: number;
            unitPrice: number;
          }[] = [];
          for (const it of cartItems) {
            if (it.item_type === "service") {
              const svc = catalog.servicesById.get(it.item_id);
              lines.push({
                name: svc?.name ?? it.item_id,
                quantity: it.quantity,
                unitPrice: it.price,
              });
            } else {
              const pack = catalog.packsById.get(it.item_id);
              lines.push({
                name: pack?.short_name ?? pack?.title ?? it.item_id,
                quantity: it.quantity,
                unitPrice: it.price,
              });
            }
          }
          const summary = formatCartSummaryFromLines(lines);
          await sendMessage(
            phoneNumber,
            "Ya tienes servicios en tu selección 🛒 ¿Seguimos con el agendado?",
          );
          await sendCartOptions(phoneNumber, summary, true);
        } else {
          await sendMenuWithPromos(phoneNumber, supabase);
        }
        break;
      }

      case "show_packs":
        await sendMessage(
          phoneNumber,
          "💅 Nuestros *packs* están dentro de cada categoría.\nElige la que te interese 👇",
        );
        await sendCategoriesList(phoneNumber, catalog.categories);
        break;

      case "show_promos":
        await sendPromosListFromCatalog(phoneNumber, catalog.promotions);
        break;

      case "show_services":
        if (!aiResponseText?.trim()) {
          await sendMessage(
            phoneNumber,
            "Cuéntame un poco más — ¿qué servicio o pack te gustaría ver? 💜",
          );
        }
        await sendCategoriesList(phoneNumber, catalog.categories);
        break;

      case "show_portfolio": {
        const { resolveAndSendPortfolio } = await import("../lib/portfolio.ts");
        const session = await getSession(supabase, phoneNumber);
        const cartIds = (session?.serviceIds ?? []).filter(Boolean);
        await resolveAndSendPortfolio({
          supabase,
          phoneNumber,
          param: action.param,
          messageText: originalMessage ?? "",
          cartServiceIds: cartIds,
          catalogServices: catalog.services.map((s) => ({
            id: s.id,
            name: s.name,
            short_name: s.short_name ?? null,
            category_id: s.category_id ?? null,
          })),
          categories: catalog.categories.map((c) => ({
            id: c.id,
            name: c.name,
          })),
          portfolioIndex: catalog.portfolioIndex ?? [],
        });
        break;
      }

      case "show_edu_guide": {
        if (!wabaConfig) break;
        const {
          parseEduGuideActionParam,
          getEduGuideImage,
          pickEduGuideToSend,
        } = await import("../lib/edu-guides.ts");
        const session = await getSession(supabase, phoneNumber);
        const cartNames = (session?.serviceIds ?? [])
          .map((id: string) => catalog.servicesById.get(id)?.name ?? "")
          .filter(Boolean);
        const kind =
          parseEduGuideActionParam(action.param ?? "") ??
          pickEduGuideToSend(originalMessage ?? "", cartNames) ??
          "pelo_a_pelo";
        const guide = getEduGuideImage(wabaConfig, kind);
        if (guide) {
          const { sendImage } = await import("../wa-api.ts");
          await sendImage(phoneNumber, guide.url, guide.caption);
        }
        break;
      }

      case "show_category": {
        const catId = action.param;
        // Alberto …0417, 17-sep-2026: confirmó un pack real del catálogo
        // ("Me gusta el pack") y Haiku respondió con show_category sin
        // catId/sin texto — la clienta caía en el menú genérico de
        // categorías sin ninguna explicación. Si Haiku no mandó texto propio
        // (aiResponseText vacío), avisamos en vez de mostrar la lista en silencio.
        const noHaikuText = !aiResponseText?.trim();
        if (!catId) {
          if (noHaikuText) {
            await sendMessage(
              phoneNumber,
              "Cuéntame un poco más — ¿qué servicio o pack te gustaría ver? 💜",
            );
          }
          await sendCategoriesList(phoneNumber, catalog.categories);
          break;
        }
        const cat = catalog.categories.find((c) => c.id === catId);
        const svcs = catalog.servicesByCategory.get(catId) ?? [];
        const packs = catalog.packsByCategory.get(catId) ?? [];
        const packsForList = catalogPacksToForList(packs);
        if (!cat || (svcs.length === 0 && packs.length === 0)) {
          if (noHaikuText) {
            await sendMessage(
              phoneNumber,
              "Cuéntame un poco más — ¿qué servicio o pack te gustaría ver? 💜",
            );
          }
          await sendCategoriesList(phoneNumber, catalog.categories);
          break;
        }

        // Plan 04 — anti-patrón Bu: efecto/servicio ya concreto → collage + CTA, sin lista del rubro
        const portfolioIdx = catalog.portfolioIndex ?? [];
        const matchText = `${originalMessage ?? ""}\n${aiResponseText ?? ""}`;
        if (
          wabaConfig &&
          (catId === "cat-extensiones" || catId === "cat-lifting")
        ) {
          const {
            hasSpecificLashEffectIntent,
            hasGenericLashRubroPriceIntent,
            pickCollageKindForService,
            pickExtensionesCollageKindFromText,
            getCampaignCollageUrl,
          } = await import("../lib/campaign-collage.ts");

          // Precio genérico pestañas/extensiones → collage visual antes de la lista
          if (
            catId === "cat-extensiones" &&
            hasGenericLashRubroPriceIntent(originalMessage ?? "")
          ) {
            const kind = pickExtensionesCollageKindFromText(matchText);
            const collage = getCampaignCollageUrl(wabaConfig, kind);
            if (collage) {
              const { sendImage } = await import("../wa-api.ts");
              await sendImage(phoneNumber, collage.url, collage.caption);
            }
          }

          if (portfolioIdx.length > 0) {
            const {
              findBestPortfolioMatchForText,
              wasPriceAnswerPhotoRecentlySent,
              buildPriceAnswerPhotoCaption,
            } = await import("../lib/portfolio.ts");
            const specific =
              hasSpecificLashEffectIntent(originalMessage ?? "") ||
              hasSpecificLashEffectIntent(aiResponseText ?? "");
            const match = findBestPortfolioMatchForText(
              matchText,
              portfolioIdx,
              catId,
            );
            // Si Haiku no puso ningún "S/" (caso JNKM), no cortes la lista —
            // el collage+CTA sin montos deja a la clienta sin cotización.
            const haikuHasPrice = /S\s*\/\s*\d/i.test(aiResponseText ?? "");
            const { haikuAlreadyAskedToConfirm, findQuotedOfferIdsInText } =
              await import("../lib/pending-price-cta.ts");
            // Si Haiku cotizó un pack/promo (ej. Pack 2 Lifting Halloween), el
            // CTA "¿Le agendo *Lifting de Pestañas*?" lo contradice y un "sí"
            // agendaría el servicio suelto a S/50 en vez del pack a S/90.
            const quotesPack = findQuotedOfferIdsInText(
              aiResponseText ?? "",
              catalog,
            ).some((id) => catalog.packsById.has(id));
            if (
              specific &&
              match &&
              haikuHasPrice &&
              !quotesPack &&
              !haikuAlreadyAskedToConfirm(aiResponseText ?? "")
            ) {
              const kind = pickCollageKindForService(
                match.serviceId,
                catalog,
                matchText,
              );
              const collage = kind
                ? getCampaignCollageUrl(wabaConfig, kind)
                : null;
              const { sendImage } = await import("../wa-api.ts");
              const alreadySent = await wasPriceAnswerPhotoRecentlySent(
                supabase,
                phoneNumber,
                match.serviceName,
              );
              if (!alreadySent) {
                if (collage) {
                  const ctaCaption = `${collage.caption}\n¿Le agendo *${match.serviceName}*? 💜`;
                  await sendImage(phoneNumber, collage.url, ctaCaption);
                } else {
                  await sendImage(
                    phoneNumber,
                    match.url,
                    buildPriceAnswerPhotoCaption(match.serviceName, catId, {
                      isCtwa: isCtwaLead && catId === "cat-extensiones",
                      wabaConfig,
                    }),
                  );
                }
              }
              const { upsertSession: upsertCta } = await import(
                "../lib/supabase.ts"
              );
              await upsertCta(supabase, phoneNumber, {
                pending_price_cta_service_id: match.serviceId,
                pending_price_cta_at: new Date().toISOString(),
              });
              break;
            }
          }
        }

        type SvcRow = {
          id: string;
          name: string;
          short_name?: string | null;
          price: string;
          duration: number;
          subcategory: string | null;
        };
        if (catId === "cat-unas") {
          await sendUnasSubcategoriesList(
            phoneNumber,
            svcs as SvcRow[],
            packsForList,
          );
        } else if (catId === "cat-extensiones") {
          await sendExtensionesSubcategoriesList(
            phoneNumber,
            svcs as SvcRow[],
            packsForList,
          );
        } else {
          await sendServicesList(
            phoneNumber,
            cat.name,
            svcs,
            false,
            packsForList,
          );
        }

        // Envío proactivo: si Haiku acaba de cotizar un servicio con foto real
        if (portfolioIdx.length > 0 && aiResponseText) {
          const { haikuAlreadyAskedToConfirm } = await import(
            "../lib/pending-price-cta.ts"
          );
          if (haikuAlreadyAskedToConfirm(aiResponseText)) {
            break;
          }
          const {
            findBestPortfolioMatchForText,
            buildPriceAnswerPhotoCaption,
            wasPriceAnswerPhotoRecentlySent,
          } = await import("../lib/portfolio.ts");
          const match = findBestPortfolioMatchForText(
            aiResponseText,
            portfolioIdx,
            catId,
          );
          if (match) {
            const alreadySent = await wasPriceAnswerPhotoRecentlySent(
              supabase,
              phoneNumber,
              match.serviceName,
            );
            if (!alreadySent) {
              const { sendImage } = await import("../wa-api.ts");
              await sendImage(
                phoneNumber,
                match.url,
                buildPriceAnswerPhotoCaption(match.serviceName, catId, {
                  isCtwa: isCtwaLead && catId === "cat-extensiones",
                  wabaConfig,
                }),
              );
              const { upsertSession: upsertCta } = await import(
                "../lib/supabase.ts"
              );
              await upsertCta(supabase, phoneNumber, {
                pending_price_cta_service_id: match.serviceId,
                pending_price_cta_at: new Date().toISOString(),
              });
            }
          }
        }
        break;
      }

      case "add_to_cart": {
        if (!action.param) break;
        const {
          addToCart,
          addCartItems,
          upsertSession: upsertSess,
          getSession,
          cartItemsToDisplayLabel,
        } = await import("../lib/supabase.ts");
        const { resolveCartItemPrice } = await import(
          "../lib/services-catalog.ts"
        );
        const { sendMessage: sm } = await import("../wa-api.ts");
        const { sendDateSelector } = await import("./agenda.ts");
        const { getEmployeeCategories } = await import("../lib/constants.ts");
        const { resendDatetimeSelectors } = await import("./booking-flow.ts");

        const ids = action.param
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);
        const validSvcs = ids
          .map((id) => catalog.servicesById.get(id))
          .filter(Boolean) as {
          id: string;
          name: string;
          price: string;
          duration: number;
          category_id?: string;
        }[];
        const validPacks = ids
          .map((id) => catalog.packsById.get(id))
          .filter(Boolean) as {
          id: string;
          title: string;
          short_name: string | null;
          pack_price: string;
          category_id?: string;
        }[];

        if (validSvcs.length === 0 && validPacks.length === 0) {
          // Haiku mandó un add_to_cart cuyo id no matchea el catálogo (uuid
          // truncado/inventado). Primero intentamos recuperar el id real desde
          // una oferta reciente cotizada en el chat (findRecentQuotedOfferIds).
          const { findRecentQuotedOfferIds } = await import(
            "../lib/pending-price-cta.ts"
          );
          const recoveredIds = await findRecentQuotedOfferIds(
            supabase,
            phoneNumber,
            catalog,
          );
          for (const recoveredId of recoveredIds) {
            const recoveredPack = catalog.packsById.get(recoveredId);
            const recoveredSvc = catalog.servicesById.get(recoveredId);
            if (recoveredPack) {
              validPacks.push(recoveredPack as (typeof validPacks)[0]);
            } else if (recoveredSvc) {
              validSvcs.push(recoveredSvc as (typeof validSvcs)[0]);
            }
          }
          if (validSvcs.length === 0 && validPacks.length === 0) {
            // Tampoco se pudo recuperar de una oferta reciente. Antes esto
            // mudaba a la clienta al menú de categorías sin explicación
            // (Gimena, 17-sep-2026: confirmó un pack y terminó en "Selecciona
            // una categoría"). Avisamos y mantenemos el contexto en vez de
            // saltar a un flujo distinto en silencio.
            await sm(
              phoneNumber,
              "Disculpa, no encontré exactamente esa opción en el catálogo 🙏 ¿me confirmas el nombre del servicio o pack que quieres?",
            );
            break;
          }
        }

        const sessNow = await getSession(supabase, phoneNumber);
        if (
          await shouldBlockAdditionalBooking(supabase, phoneNumber, {
            rescheduleAppointmentId: sessNow?.reschedule_appointment_id ?? null,
          })
        ) {
          await sm(phoneNumber, ADDITIONAL_BOOKING_BLOCK_MESSAGE);
          break;
        }
        // Alberto …0417, 18-sep: carrito+día/hora ya cerrados y esperando
        // nombre/DNI/adelanto — un add_to_cart aquí pisaría el total ya
        // mostrado en el resumen de boleta sin que nadie lo note. Aún no
        // existe fila en `appointments` (shouldBlockAdditionalBooking no lo
        // detecta), así que se bloquea explícitamente por step.
        if (
          sessNow?.step === "awaiting_deposit_boleta" ||
          sessNow?.step === "awaiting_deposit_datos" ||
          sessNow?.step === "awaiting_payment_screenshot"
        ) {
          await sm(
            phoneNumber,
            "Anotado 💜 Primero cerremos esta cita (mándame nombre y DNI) y ese servicio lo coordinamos aparte con el equipo.",
          );
          break;
        }

        const { isTwoPersonSameServiceIds: isDuoPackIds } = await import(
          "../lib/duo-pack.ts"
        );
        const { parsePackServiceIds: parseDuoPackIds } = await import(
          "../lib/services-catalog.ts"
        );
        const duoPack = validPacks.find((p) => {
          const fullPack = catalog.packsById.get(p.id);
          return fullPack
            ? isDuoPackIds(parseDuoPackIds(fullPack))
            : false;
        });
        if (duoPack) {
          const full = catalog.packsById.get(duoPack.id) ?? duoPack;
          const { startTwoPersonPackBooking } = await import("./party-booking.ts");
          const { parseBookingDatetimeFromMessage } = await import("./booking-flow.ts");
          const when = parseBookingDatetimeFromMessage(
            originalMessage ?? "",
            (sessNow ?? {}) as Record<string, unknown>,
          );
          await startTwoPersonPackBooking(supabase, phoneNumber, full, {
            chosenDate: when,
          });
          break;
        }

        const priceForService = (svc: { id: string; price: string }) =>
          resolveCartItemPrice(
            catalog,
            "service",
            svc.id,
            parseFloat(svc.price) || 0,
          );
        const priceForPack = (pack: { id: string; pack_price: string }) =>
          resolveCartItemPrice(
            catalog,
            "pack",
            pack.id,
            parseFloat(String(pack.pack_price)) || 0,
          );

        // Evitar duplicar carrito (Treysy: "Está quiero" → 2× pack + pedicure)
        const existingIds = new Set(sessNow?.serviceIds ?? []);
        const newIds = [
          ...validSvcs.map((s) => s.id),
          ...validPacks.map((p) => p.id),
        ];
        const allAlreadyInCart =
          existingIds.size > 0 && newIds.every((id) => existingIds.has(id));
        const inDatetime =
          sessNow?.step === "awaiting_datetime" && existingIds.size > 0;
        const msgLow = (originalMessage ?? "").toLowerCase();
        const asksPrice =
          /\b(cu[aá]nto|precios?|costo|cuesta|total|vale|sale)\b/i.test(msgLow);
        const wantsExtraService =
          /\b(agregar|añadir|anadir|suma|sumar|además|ademas|otro servicio|también quiero|tambien quiero)\b/.test(
            msgLow,
          );
        const wantsReplaceService = matchesServiceChangeIntent(
          originalMessage ?? "",
        );
        const namesNewService =
          newIds.some((id) => !existingIds.has(id)) && newIds.length > 0;

        // UNANSWERED_PRICE: "cuánto es" mid-carrito → resumen con S/, no solo "Ya tienes eso"
        if (asksPrice) {
          const cart = sessNow?.cartItems ?? [];
          if (cart.length > 0 && (allAlreadyInCart || inDatetime)) {
            const label = await cartItemsToDisplayLabel(supabase, cart);
            const total = cart.reduce(
              (a: number, i: { price: number; quantity: number }) =>
                a + (Number(i.price) || 0) * (i.quantity || 1),
              0,
            );
            await sm(
              phoneNumber,
              `Tu selección:\n🌸 ${label.replace(/ \+ /g, "\n🌸 ")}\n\n*Total: S/ ${total.toFixed(0)}*\n\n📅 ¿Qué día y hora te quedan bien?`,
            );
            await resendDatetimeSelectors(
              phoneNumber,
              supabase,
              sessNow!,
              catalog,
            );
            break;
          }
          // Precio de algo fuera del carrito: el texto de Haiku ya cotizó; no cortar ni duplicar
          if (!allAlreadyInCart) break;
        }

        // Patricia …5300: "ya no quiero Builder, solo esmalte" mid-reprogramación
        if (
          inDatetime &&
          !wantsExtraService &&
          (wantsReplaceService || namesNewService) &&
          !allAlreadyInCart
        ) {
          const { replaceCartKeepingSchedule } = await import(
            "../lib/supabase.ts"
          );
          const replacement = [
            ...validSvcs.map((svc) => ({
              item_type: "service" as const,
              item_id: svc.id,
              quantity: 1,
              price: priceForService(svc),
            })),
            ...validPacks.map((pack) => ({
              item_type: "pack" as const,
              item_id: pack.id,
              quantity: 1,
              price: priceForPack(pack),
            })),
          ];
          await replaceCartKeepingSchedule(supabase, phoneNumber, replacement);
          const names = [
            ...validSvcs.map((s) => s.name),
            ...validPacks.map((p) => p.short_name || p.title),
          ].join(", ");
          const total = replacement.reduce((a, i) => a + i.price, 0);
          await sm(
            phoneNumber,
            `✅ Cambié tu selección a: *${names}* (S/ ${total.toFixed(0)})\n\n📅 Sigue eligiendo día u hora 👇`,
          );
          const fresh = await getSession(supabase, phoneNumber);
          await resendDatetimeSelectors(
            phoneNumber,
            supabase,
            fresh ?? sessNow!,
            catalog,
          );
          break;
        }

        if (allAlreadyInCart || (inDatetime && !wantsExtraService)) {
          const skipDate = shouldSkipDatetimeResendAfterHaiku(
            originalMessage ?? "",
          );
          await sm(
            phoneNumber,
            skipDate
              ? "Ya tienes eso en tu selección 💜 Cuando quieras, elige el día con los botones de abajo o escribe *agregar* para sumar otro servicio."
              : "Ya tienes eso en tu selección 💜 ¿Qué día y hora te quedan bien?",
          );
          if (!skipDate) {
            await resendDatetimeSelectors(
              phoneNumber,
              supabase,
              sessNow!,
              catalog,
            );
          }
          break;
        }

        if (inDatetime && wantsExtraService) {
          const toAddSvcs = validSvcs.filter((s) => !existingIds.has(s.id));
          const toAddPacks = validPacks.filter((p) => !existingIds.has(p.id));
          if (toAddSvcs.length === 0 && toAddPacks.length === 0) {
            await sm(
              phoneNumber,
              "Eso ya está en tu selección 💜 Elige día u hora 👇",
            );
            await resendDatetimeSelectors(
              phoneNumber,
              supabase,
              sessNow!,
              catalog,
            );
            break;
          }
          for (const svc of toAddSvcs) {
            await addToCart(
              supabase,
              phoneNumber,
              svc.id,
              priceForService(svc),
            );
          }
          if (toAddPacks.length > 0) {
            await addCartItems(
              supabase,
              phoneNumber,
              toAddPacks.map((pack) => ({
                item_type: "pack" as const,
                item_id: pack.id,
                quantity: 1,
                price: priceForPack(pack),
              })),
            );
          }
          const names = [
            ...toAddSvcs.map((s) => s.name),
            ...toAddPacks.map((p) => p.short_name || p.title),
          ].join(", ");
          await sm(
            phoneNumber,
            `✅ Agregué también: ${names}\n\n📅 Sigue eligiendo día u hora con los botones 👇`,
          );
          const fresh = await getSession(supabase, phoneNumber);
          await resendDatetimeSelectors(
            phoneNumber,
            supabase,
            fresh ?? sessNow!,
            catalog,
          );
          break;
        }

        for (const svc of validSvcs) {
          await addToCart(supabase, phoneNumber, svc.id, priceForService(svc));
        }
        if (validPacks.length > 0) {
          await addCartItems(
            supabase,
            phoneNumber,
            validPacks.map((pack) => ({
              item_type: "pack" as const,
              item_id: pack.id,
              quantity: 1,
              price: priceForPack(pack),
            })),
          );
        }

        const { openBookingCalendarForCart } = await import(
          "./booking-flow.ts"
        );
        const freshAfterAdd = await getSession(supabase, phoneNumber);
        const names = [
          ...validSvcs.map((s) => s.name),
          ...validPacks.map((p) => p.short_name || p.title),
        ].join(", ");
        const opened = await openBookingCalendarForCart(
          supabase,
          phoneNumber,
          freshAfterAdd,
          catalog,
          {
            messageText: originalMessage ?? "",
            summaryPrefix: `✅ Listo — agregué: ${names}`,
          },
        );
        if (opened) break;

        await upsertSess(supabase, phoneNumber, {
          step: "awaiting_datetime",
          employee_assignments: JSON.stringify({}),
        });

        const possibleEmpIds = new Set<string>();
        for (const svc of validSvcs) {
          const catId = (svc as { category_id?: string }).category_id ?? "";
          const allowed = getEmployeeCategories()[catId];
          if (allowed) allowed.forEach((id: string) => possibleEmpIds.add(id));
        }
        for (const pack of validPacks) {
          const catId = pack.category_id ?? "";
          const allowed = getEmployeeCategories()[catId];
          if (allowed) allowed.forEach((id: string) => possibleEmpIds.add(id));
        }
        if (possibleEmpIds.size === 0) {
          const { data: allEmps } = await supabase
            .from("employees")
            .select("id")
            .eq("is_active", true);
          (allEmps ?? []).forEach((e: { id: string }) =>
            possibleEmpIds.add(e.id),
          );
        }

        const totalDuration =
          validSvcs.reduce((a, s) => a + (s.duration ?? 60), 0) || 60;
        const { parsePackServiceIds, overlapCapForCart } = await import(
          "../lib/services-catalog.ts"
        );
        const idsForCap = [
          ...validSvcs.map((s) => s.id),
          ...validPacks.flatMap((p) =>
            parsePackServiceIds(p as { service_ids?: unknown }),
          ),
        ];
        const cap = overlapCapForCart(idsForCap, catalog);
        await sm(
          phoneNumber,
          `✅ Listo — agregué: ${names}\n\n📅 *¿Qué día prefieres?*`,
        );
        await sendDateSelector(
          phoneNumber,
          supabase,
          [...possibleEmpIds],
          totalDuration,
          cap,
          1,
          catalog,
          idsForCap,
        );
        break;
      }

      case "book_last_service": {
        const { getLastCompletedService, addToCart, upsertSession } =
          await import("../lib/supabase.ts");
        const { sendDateSelector } = await import("./agenda.ts");
        const { getEmployeeCategories } = await import("../lib/constants.ts");

        const lastSvcName = await getLastCompletedService(
          supabase,
          phoneNumber,
        );
        if (!lastSvcName) {
          await sendMenuWithPromos(phoneNumber, supabase);
          break;
        }
        // Buscar el servicio en el catálogo por nombre (getLastCompletedService retorna nombre)
        const svc = [...catalog.servicesById.values()].find(
          (s) => s.name === lastSvcName,
        );
        if (!svc) {
          await sendMenuWithPromos(phoneNumber, supabase);
          break;
        }
        const price = parseFloat(String(svc.price)) || 0;
        await addToCart(supabase, phoneNumber, svc.id, price);
        await upsertSession(supabase, phoneNumber, {
          step: "awaiting_datetime",
        });

        const possibleEmpIds = new Set<string>();
        const catId2 = (svc as { category_id?: string }).category_id ?? "";
        const allowed = getEmployeeCategories()[catId2];
        if (allowed) allowed.forEach((id: string) => possibleEmpIds.add(id));
        if (possibleEmpIds.size === 0) {
          const { data: allEmps } = await supabase
            .from("employees")
            .select("id")
            .eq("is_active", true);
          (allEmps ?? []).forEach((e: { id: string }) =>
            possibleEmpIds.add(e.id),
          );
        }

        await sendMessage(
          phoneNumber,
          `✅ *${svc.name}* agregado — S/ ${price.toFixed(0)}\n\n📅 ¿Qué día te viene bien?`,
        );
        const { overlapCapForCart } = await import(
          "../lib/services-catalog.ts"
        );
        const capLast = overlapCapForCart([svc.id], catalog);
        await sendDateSelector(
          phoneNumber,
          supabase,
          [...possibleEmpIds],
          svc.duration,
          capLast,
          1,
          catalog,
          [svc.id],
        );
        break;
      }

      case "confirm_booking": {
        // Haiku NUNCA redacta la confirmación — pide al flujo determinístico
        // que cierre la cita real (misma función que usa el gate P0 del
        // dispatcher). Caso real 17-sep (…4665): Haiku dijo "¡Listo! Tu cita
        // quedó confirmada" sin fila real en `appointments` porque el carrito
        // ya se había vaciado por cart-nudge (nudge2). Si no hay carrito/fecha
        // parseable, tryCompleteBookingFromText retorna false y avisamos la
        // verdad en vez de inventar un cierre.
        const { tryCompleteBookingFromText } = await import(
          "./booking-flow.ts"
        );
        let session = await getSession(supabase, phoneNumber);
        // Nancy Alvites …9158 (4-oct, campaña Halloween): Haiku cotizó "Rímel
        // S/50", la clienta dijo "Sí, mañana 10 am" y Haiku emitió
        // confirm_booking SIN add_to_cart previo → carrito vacío → "tu selección
        // se venció" + menú. Haiku decide la intención; aquí solo reparamos el
        // estado: si no hay carrito, recuperamos la oferta que él mismo cotizó
        // (con precio promo) y seguimos con el cierre determinístico.
        if (!session?.serviceIds?.length) {
          const { recoverCartFromQuotedOffer } = await import(
            "../lib/pending-price-cta.ts"
          );
          // 6 h: la clienta puede responder horas después de la cotización
          // (rescate manual desde el panel, Nancy …9158).
          if (
            await recoverCartFromQuotedOffer(
              supabase,
              phoneNumber,
              catalog,
              originalMessage ?? "",
            )
          ) {
            session = await getSession(supabase, phoneNumber);
          }
        }
        const textToClose = originalMessage?.trim() ?? "";
        const closed = textToClose
          ? await tryCompleteBookingFromText(
              supabase,
              phoneNumber,
              textToClose,
              session ?? null,
              catalog,
            )
          : false;
        if (!closed && session?.serviceIds?.length) {
          // Carrito válido pero sin día/hora parseable en el texto: seguir con
          // el selector en vez de mandarla a "agendar" desde cero.
          const { resendDatetimeSelectors } = await import(
            "./booking-flow.ts"
          );
          await sendMessage(
            phoneNumber,
            "Perfecto 💜 Elige el día y la hora para dejar tu cita lista 👇",
          );
          await resendDatetimeSelectors(
            phoneNumber,
            supabase,
            session,
            catalog,
          );
        } else if (!closed) {
          await sendMessage(
            phoneNumber,
            "Tu selección anterior se venció 💜 ¿Retomamos? Escríbeme *agendar* y seguimos con los servicios que te interesan.",
          );
        }
        break;
      }

      case "escalate_staff": {
        // Dinero sobre una reserva pagada (devolución/cancelar con adelanto): Haiku ya
        // contestó con la política; aquí solo pausamos el bot y avisamos al staff.
        const { escalateToStaff } = await import("../lib/staff-escalation.ts");
        await escalateToStaff(supabase, {
          phone: phoneNumber,
          clientName: ctx.contactName,
          reason: action.param || "money",
          preview: originalMessage,
        });
        break;
      }

      default:
        break;
    }
  } catch (err) {
    console.error("[AI] executeAIAction falló:", action.type, err);
  }
}

// ---------------------------------------------------------------------------
// handleAIMessage — función principal exportada
// ---------------------------------------------------------------------------

export async function handleAIMessage(
  ctx: AIContext,
  trigger: AITriggerResult,
  wabaConfig: WabaConfigMap,
): Promise<boolean> {
  const { phoneNumber, catalog, supabase, phoneCountry, contactName } = ctx;

  try {
    if (trigger.type === "opt_out") {
      // Baja de marketing: promos y reenganches la respetan (lista aparte de
      // blocked_phone_numbers: el bot sigue respondiendo si ella escribe).
      try {
        const { addMarketingOptOutPhone } = await import(
          "../lib/waba-config.ts"
        );
        await addMarketingOptOutPhone(supabase, phoneNumber);
      } catch (err) {
        console.error("[AI] opt_out: no se pudo registrar la baja:", err);
      }
      const { sendMessage } = await import("../wa-api.ts");
      await sendMessage(
        phoneNumber,
        "Entendido. Tomamos nota de su solicitud. Si desea volver a escribirnos para agendar, aquí estamos.",
      );
      return true;
    }

    const [clientContext, evaluationWindowsLabel, recentMessages, priorOut] =
      await Promise.all([
        getClientContext(supabase, phoneNumber),
        getEvaluationWindowsTodayLabel(supabase),
        // Últimos 12 textos del episodio (incluye OUT del panel tras takeover).
        // Sin filtro de antigüedad, un hueco de semanas/meses mete contexto viejo
        // (ej. "2 personas" de mayo respondiendo a "Aún no" en julio).
        supabase
          .from("wa_messages")
          .select("direction, msg_type, content, created_at, source")
          .eq("phone", phoneNumber)
          .eq("msg_type", "text")
          .gte(
            "created_at",
            new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          )
          .order("created_at", { ascending: false })
          .limit(12),
        // Cualquier OUT reciente (imagen CTWA, lista, texto) = ya hubo saludo/apertura
        supabase
          .from("wa_messages")
          .select("id")
          .eq("phone", phoneNumber)
          .eq("direction", "out")
          .gte(
            "created_at",
            new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          )
          .limit(1),
      ]);

    // Construir historial: mensajes anteriores al actual, en orden cronológico.
    // Cortar si hay gap >2h entre mensajes consecutivos (nuevo episodio).
    const rawHistory = (recentMessages.data ?? []).reverse();
    const historyRows: typeof rawHistory = [];
    for (let i = 0; i < rawHistory.length; i++) {
      const row = rawHistory[i];
      if (i > 0) {
        const prevTs = Date.parse(String(rawHistory[i - 1].created_at ?? ""));
        const curTs = Date.parse(String(row.created_at ?? ""));
        if (
          Number.isFinite(prevTs) &&
          Number.isFinite(curTs) &&
          curTs - prevTs > 2 * 60 * 60 * 1000
        ) {
          // Gap largo: descartar lo anterior al gap (contexto stale)
          historyRows.length = 0;
        }
      }
      historyRows.push(row);
    }
    // Quitar el último (es el mensaje actual)
    historyRows.pop();
    const STAFF_OUT_SOURCES = new Set(["panel", "staff_app"]);
    let staffOutInHistory = false;
    const history: { role: "user" | "assistant"; content: string }[] = [];
    for (const row of historyRows) {
      const role = row.direction === "in" ? "user" : "assistant";
      // Los mensajes del bot pueden tener formato <text>...</text> — extraer solo el texto
      let content = String(row.content ?? "").trim();
      const textMatch = content.match(/<text>([\s\S]*?)<\/text>/);
      if (textMatch) content = textMatch[1].trim();
      if (!content) continue;
      // Tras takeover: OUT del panel/app deben verse como equipo (no como Haiku).
      const src = String(
        (row as { source?: string | null }).source ?? "",
      ).toLowerCase();
      if (role === "assistant" && STAFF_OUT_SOURCES.has(src)) {
        staffOutInHistory = true;
        if (!/^\[equipo/i.test(content)) {
          content = `[Equipo ZM — mensaje del staff]: ${content}`;
        }
      }
      history.push({ role, content });
    }

    const base = resolveChatSystemPromptBase(wabaConfig);
    const rt = getHaikuRuntimeSettings(wabaConfig);
    const aiSession = await getSession(supabase, phoneNumber);
    // Prompt caching: breakpoint 1 (estático) + 2 (catálogo), TTL 1h.
    // clientContext / opciones cortas van fuera del caché (varían por llamada).
    const staticAndCatalogBlocks = composeHaikuChatSystemBlocks(
      base,
      catalog,
      phoneCountry,
    );

    let dynamicBlockText = clientContext.trim();
    dynamicBlockText = dynamicBlockText
      ? `${getTodayLimaGuardrailBlock()}\n\n${dynamicBlockText}`
      : getTodayLimaGuardrailBlock();
    if (evaluationWindowsLabel) {
      dynamicBlockText = `${dynamicBlockText}\n\n${evaluationWindowsLabel}`;
    }
    if (staffOutInHistory) {
      const staffNote =
        "CONTEXTO STAFF: el equipo humano escribió en este hilo (mensajes " +
        "marcados [Equipo ZM — mensaje del staff]). NO contradigas lo que dijo " +
        "el equipo (políticas, bebés/niños, precios, domicilio, etc.). Continúa " +
        "desde ahí con tono coherente; no repitas el mismo aviso salvo que la " +
        "clienta lo pida de nuevo.";
      dynamicBlockText = dynamicBlockText
        ? `${staffNote}\n\n${dynamicBlockText}`
        : staffNote;
    }
    if (
      aiSession?.step === "awaiting_deposit_boleta" ||
      aiSession?.step === "awaiting_deposit_datos" ||
      aiSession?.step === "awaiting_payment_screenshot"
    ) {
      // Alberto VE …0417, 18-sep: el carrito y el día/hora de ESTA cita ya
      // quedaron cerrados (solo falta nombre/DNI o el comprobante). Haiku
      // respondía "le agrego el pack X, S/90" como si ya hubiera pasado,
      // pero el sistema bloquea ese add_to_cart aparte — la clienta veía
      // una confirmación falsa seguida de una corrección contradictoria.
      // Mirta …8754 (30-sep): «YA quedaron cerrados» sonaba a cita hecha y
      // Haiku despedía con «De nada, nos vemos» en un ok. La cita no existe
      // hasta el comprobante. Haiku-primero: se le dice el paso, no se corta
      // el turno con un copy fijo.
      const cartLockedNote =
        aiSession.step === "awaiting_payment_screenshot"
          ? "CONTEXTO: esta cita TODAVÍA NO existe en la agenda. Falta la captura del adelanto. " +
            "action:none. Si dice ok, gracias o similar, NO te despidas y NO digas «nos vemos» ni «de nada»: " +
            "recuérdale que mande el print de Yape o Plin para reservar el cupo. " +
            "NO uses add_to_cart ni digas que ya agregaste otro servicio."
          : "CONTEXTO: esta cita TODAVÍA NO existe en la agenda. El servicio y la hora ya están elegidos; " +
            "solo falta el nombre y el DNI/CE para la boleta, y después el adelanto. " +
            "action:none. Si dice ok, gracias o similar, NO es despedida: NO digas «nos vemos» ni «de nada». " +
            "Recuérdale el dato que falta. Si pregunta un precio, confírmalo y dile que otro servicio " +
            "se coordina aparte una vez cerrada esta cita. NO uses add_to_cart.";
      dynamicBlockText = dynamicBlockText
        ? `${cartLockedNote}\n\n${dynamicBlockText}`
        : cartLockedNote;
    }
    if (aiSession?.from_ad_at) {
      const { resolveEmotionalSellingPromptBlock } = await import(
        "../lib/emotional-selling.ts"
      );
      const emotionalBlock = resolveEmotionalSellingPromptBlock(wabaConfig);
      dynamicBlockText = dynamicBlockText
        ? `${emotionalBlock}\n\n${dynamicBlockText}`
        : emotionalBlock;
    }
    const bookingDate = extractDateIntentFromText(
      trigger.originalMessage,
    )?.dateKey;
    const currentSession =
      trigger.type === "booking_request" ? aiSession : null;
    if (
      trigger.type === "booking_request" &&
      bookingDate &&
      !sessionHasCart(currentSession)
    ) {
      const shortServices = await getShortServiceSuggestionsForDate(
        supabase,
        catalog,
        bookingDate,
      );
      if (shortServices.length > 0) {
        const options = shortServices
          .map(
            (service) =>
              `- [${service.id}] ${service.name} — S/${parseFloat(service.price).toFixed(0)} (cita ~${service.duration} min en salón)`,
          )
          .join("\n");
        const shortOpts =
          `OPCIONES CORTAS DISPONIBLES PARA ${bookingDate}:\n${options}\n` +
          "Si la clienta aún no escogió servicio, ofrece estas opciones (máximo cuatro) y pregunta cuál prefiere. " +
          "No confirmes horario todavía y usa action:none hasta que confirme un servicio.";
        dynamicBlockText = dynamicBlockText
          ? `${dynamicBlockText}\n\n${shortOpts}`
          : shortOpts;
      }
    }
    // "No hay más horarios?"/"algún cupo disponible?" sin día explícito, ya
    // en awaiting_datetime con selector mostrado: usar selected_day como
    // fallback en vez de dejar a Haiku responder a ciegas (caso Gimena
    // …5978, 17-sep-2026 — el bot deflectaba sin decir los cupos reales).
    // También cubre preguntas de seguimiento tipo "¿ya pudo revisar?" — sin
    // esto Haiku respondía de memoria del historial (que podía traer un "no
    // hay cupo" ya desactualizado) en vez de re-chequear (Alberto VE …4665,
    // 17-sep-2026).
    const horariosOnlyNoDay =
      !bookingDate &&
      (/\b(horarios?|disponib\w*|cupos?)\b/i.test(trigger.originalMessage) ||
        /\b(ya\s+(pudo|pudiste|puede)\s+revisar|pudo\s+revisar|alguna\s+novedad|hay\s+novedad)\b/i.test(
          trigger.originalMessage,
        )) &&
      aiSession?.step === "awaiting_datetime";
    const horariosBookingDate =
      bookingDate ??
      (horariosOnlyNoDay
        ? getSessionSelectedDay(aiSession as Record<string, unknown> | null)
        : null);
    if (
      (matchesHorariosAvailabilityQuery(trigger.originalMessage) ||
        horariosOnlyNoDay) &&
      horariosBookingDate
    ) {
      const { overlapCapForCart } = await import("../lib/services-catalog.ts");
      const ids = (aiSession?.serviceIds ?? []) as string[];
      const dur =
        ids.reduce(
          (sum, id) => sum + (catalog.servicesById.get(id)?.duration ?? 0),
          0,
        ) || 90;
      const cap = overlapCapForCart(ids, catalog);
      const hours = await formatAvailableHours(
        supabase,
        horariosBookingDate,
        dur,
        undefined,
        cap,
        catalog,
        ids,
      );
      // Sticky del día consultado + mantener awaiting_datetime para que la
      // hora suelta siguiente ("12:30") cierre la cita (Alberto VE …0417,
      // 17-sep-2026: CUPOS respondía viernes pero selected_day quedaba null
      // y/o step pasaba a browsing → Haiku fabricaba "cita confirmada").
      {
        const { upsertSession: stickyDay } = await import("../lib/supabase.ts");
        await stickyDay(supabase, phoneNumber, {
          selected_day: horariosBookingDate,
          step: "awaiting_datetime",
        });
        console.log(
          "[AI] CUPOS sticky selected_day:",
          horariosBookingDate,
          phoneNumber.slice(-4),
          "dur=",
          dur,
          "cap=",
          cap,
          "cart=",
          sessionHasCart(aiSession),
        );
      }
      const cupos =
        `CUPOS REALES PARA ${horariosBookingDate}: ${hours}\n` +
        "Cita solo esas horas. NO afirmes cupo si dice «ninguno libre». action:none. NO add_to_cart. " +
        "FORMATO: UNA burbuja corta con las horas en punto separadas por coma (10 AM, 11 AM, 12 PM). " +
        "No armes una viñeta por cada media hora. Si ella escribe una media (5:30) dentro del horario, no la rechaces: el sistema la valida.";
      dynamicBlockText = dynamicBlockText
        ? `${dynamicBlockText}\n\n${cupos}`
        : cupos;
    }

    // Recordatorio de formato/precios SIEMPRE al final (sin cache) — recupera
    // recencia tras mover FORMAT_INSTRUCTION al breakpoint 1 estático.
    dynamicBlockText = dynamicBlockText
      ? `${dynamicBlockText}\n\n${FINAL_FORMAT_REMINDER}`
      : FINAL_FORMAT_REMINDER;

    const systemBlocks: HaikuSystemBlock[] = [
      ...staticAndCatalogBlocks,
      { type: "text", text: dynamicBlockText },
    ];

    const result = await callAnthropicAPI(
      systemBlocks,
      trigger.originalMessage,
      {
        max_tokens: rt.max_tokens,
        timeout_ms: rt.timeout_ms,
        history: history.length > 0 ? history : undefined,
        supabase,
        phoneNumber,
        source: `webhook:${trigger.type}`,
      },
    );
    if (!result) return false;

    // Si mientras Haiku pensaba la clienta tocaba una lista (Aver?! + tap),
    // no empujar otra lista que pisa su navegación (Treysy).
    const navigatedAway = await clientChoseListWhileHaikuThought(
      supabase,
      phoneNumber,
      trigger.originalMessage,
    );

    const { sendMessage } = await import("../wa-api.ts");
    let bubbles =
      result.texts?.length > 0
        ? result.texts
        : result.text.trim()
          ? [result.text]
          : [];

    // Guardia de política: el adelanto no es reembolsable. Si Haiku insinúa
    // devolución/reembolso/trámite, se reemplaza por el texto fijo.
    {
      const {
        containsRefundPromise,
        buildRefundFallbackMessage,
        buildRefundPolicyOnlyMessage,
        buildSalonFaultMessage,
      } = await import("../lib/staff-escalation.ts");
      if (bubbles.some((b) => containsRefundPromise(b))) {
        console.warn("[AI] respuesta con lenguaje de devolución reemplazada");
        bubbles = [
          result.action?.type === "escalate_staff"
            ? result.action.param === "salon_fault"
              ? buildSalonFaultMessage(ctx.contactName)
              : buildRefundFallbackMessage(ctx.contactName)
            : buildRefundPolicyOnlyMessage(ctx.contactName),
        ];
      }
    }

    // Guías educativas (pelo a pelo / mapping): 1 imagen si el inbound lo pide
    // y Haiku no pidió ya show_edu_guide (evita duplicar).
    if (wabaConfig && result.action?.type !== "show_edu_guide") {
      try {
        const { pickEduGuideToSend, getEduGuideImage } = await import(
          "../lib/edu-guides.ts"
        );
        const cartNames = (currentSession?.serviceIds ?? [])
          .map((id: string) => catalog.servicesById.get(id)?.name ?? "")
          .filter(Boolean);
        const eduKind = pickEduGuideToSend(trigger.originalMessage, cartNames);
        if (eduKind) {
          const guide = getEduGuideImage(wabaConfig, eduKind);
          if (guide) {
            const { sendImage } = await import("../wa-api.ts");
            await sendImage(phoneNumber, guide.url, guide.caption);
          }
        }
      } catch (err) {
        console.error("[AI] edu guide proactive:", err);
      }
    }

    // Haiku-primero (Mila …9883, 4-oct): Haiku cotizó el pack y cerró con
    // «¿Deseas agendar este pack? Solo dime qué día…», pero en el mismo turno
    // mandó add_to_cart → el bot soltaba «✅ Listo — agregué…» + la lista de
    // fechas encima de la pregunta. Regla de oro: pregunta ANTES del carrito.
    // Si ella ya confirmó en este mensaje («sí», «agéndame», «mañana a las 4»),
    // el add_to_cart sigue y el calendario usa ese día/hora. Si no, se difiere
    // y el pending CTA espera el siguiente turno.
    if (
      result.action?.type === "add_to_cart" &&
      shouldDeferHaikuAddToCart(
        result.texts?.length ? result.texts.join("\n") : (result.text ?? ""),
        trigger.originalMessage ?? "",
      )
    ) {
      console.log(
        "[AI] add_to_cart diferido: Haiku preguntó y espera respuesta escrita",
      );
      result.action = undefined;
    }

    // add_to_cart: executeAIAction manda su propio ack + calendario; no duplicar
    // la última burbuja de Haiku si es solo CTA de agendar — sí enviamos las de precio.
    const alreadyGreeted =
      (priorOut.data?.length ?? 0) > 0 ||
      history.some((h) => h.role === "assistant");
    const srtaUsedCount = history.filter(
      (h) => h.role === "assistant" && /\bSrta\./i.test(h.content),
    ).length;
    const bubbleOpts = {
      contactName,
      alreadyGreeted,
      srtaUsedCount,
      supabase,
    };
    // Alberto …0417, 18-sep: con carrito/día ya cerrados, el prompt le pide a
    // Haiku no confirmar el add_to_cart, pero a veces igual lo hace (y el
    // sistema bloqueaba solo la escritura en BD, no esta burbuja) — la
    // clienta veía "agregamos X a tu carrito" seguido de la corrección del
    // guard. Se suprime aquí la burbuja de Haiku cuando el add_to_cart va a
    // ser bloqueado de todas formas, para no mandar la confirmación falsa.
    const cartLockedStep =
      aiSession?.step === "awaiting_deposit_boleta" ||
      aiSession?.step === "awaiting_deposit_datos" ||
      aiSession?.step === "awaiting_payment_screenshot";
    if (result.action?.type === "add_to_cart" && cartLockedStep) {
      console.log(
        "[AI] Burbuja add_to_cart suprimida: carrito bloqueado por step",
        aiSession?.step,
      );
    } else if (result.action?.type === "add_to_cart") {
      if (bubbles.length > 0) {
        await sendHaikuTextBubbles(
          sendMessage,
          phoneNumber,
          bubbles,
          bubbleOpts,
        );
      }
    } else if (bubbles.length > 0) {
      await sendHaikuTextBubbles(sendMessage, phoneNumber, bubbles, bubbleOpts);
    }

    {
      const { findTwoPersonPack, startTwoPersonPackBooking, getPartyFromSession, resumeCompanionAskIfNeeded } =
        await import("./party-booking.ts");
      const { getSession: readPartySess } = await import("../lib/supabase.ts");
      const askedInBubbles = bubbles.some((b) => /qui[eé]n te acompa/i.test(b));
      const sessParty = await readPartySess(supabase, phoneNumber);
      const partyNow = getPartyFromSession(sessParty);
      if (askedInBubbles && !partyNow?.pack_id) {
        const pack = findTwoPersonPack(catalog);
        if (pack) {
          await startTwoPersonPackBooking(supabase, phoneNumber, pack, {
            silent: true,
          });
        }
      } else if (
        !askedInBubbles &&
        partyNow?.collecting === "guest_name" &&
        !partyNow.members.some((m) => m.role === "guest" && m.name)
      ) {
        await resumeCompanionAskIfNeeded(supabase, phoneNumber, catalog);
      }
    }

    if (result.action) {
      const suppressNavForTypes: AITriggerType[] = [
        "free_question",
        "fallback",
        "booking_request",
      ];
      const suppressedActions: AIActionType[] = ["show_menu", "show_services"];
      const listActions: AIActionType[] = [
        "show_category",
        "show_menu",
        "show_services",
        "show_packs",
        "show_promos",
      ];
      const msgLower = trigger.originalMessage.toLowerCase();
      if (
        result.action.type === "show_promos" &&
        matchesFilteredPromosIntent(msgLower)
      ) {
        console.log(
          "[AI] show_promos suprimido — promos filtradas:",
          trigger.originalMessage.slice(0, 60),
        );
      } else if (navigatedAway && listActions.includes(result.action.type)) {
        console.log(
          "[AI] Lista omitida — clienta navegó con lista mientras Haiku respondía:",
          result.action.type,
        );
      } else if (
        suppressNavForTypes.includes(trigger.type) &&
        result.action.type !== "add_to_cart" &&
        suppressedActions.includes(result.action.type)
      ) {
        console.log(
          "[AI] Acción suprimida para",
          trigger.type,
          ":",
          result.action.type,
        );
      } else if (
        result.action.type === "add_to_cart" &&
        matchesHorariosAvailabilityQuery(trigger.originalMessage)
      ) {
        console.log("[AI] add_to_cart suprimido: pregunta de disponibilidad");
      } else if (
        trigger.type === "booking_request" &&
        result.action.type === "add_to_cart" &&
        !sessionHasCart(currentSession)
      ) {
        console.log(
          "[AI] add_to_cart suprimido: solicitud inicial de cita sin servicio",
        );
      } else {
        await executeAIAction(
          result.action,
          ctx,
          wabaConfig,
          trigger.originalMessage,
          result.texts?.length ? result.texts.join("\n") : result.text,
        );
      }
    } else if (wabaConfig) {
      // Plan 04 + SOFI 28-ago: action none + Haiku cotizó S/ de efecto concreto
      // → pending_price_cta aunque el inbound sea solo "Cuánto está" (efecto
      // viene en la respuesta Haiku / historial del turno, no en originalMessage).
      const {
        hasSpecificLashEffectIntent,
        pickCollageKindForService,
        getCampaignCollageUrl,
      } = await import("../lib/campaign-collage.ts");
      const { findServiceQuotedInHaikuText, isBarePriceFollowUp } =
        await import("../lib/pending-price-cta.ts");
      const haikuText = result.texts?.length
        ? result.texts.join("\n")
        : (result.text ?? "");
      const haikuHasPrice = /S\s*\/\s*\d/i.test(haikuText);
      const effectInThread =
        hasSpecificLashEffectIntent(trigger.originalMessage) ||
        hasSpecificLashEffectIntent(haikuText) ||
        isBarePriceFollowUp(trigger.originalMessage);
      let serviceCtaSet = false;
      // Haiku cotizó un pack (p. ej. «2 Lifting» S/90): ni foto/CTA de servicio
      // suelto ni pending_price_cta de servicio — un «sí» debe agregar el pack,
      // no pack + servicio (S/140). El CTA del pack se fija más abajo.
      const { findQuotedOfferIdsInText: findQuotedIds } = await import(
        "../lib/pending-price-cta.ts"
      );
      const haikuQuotesPack = findQuotedIds(haikuText, catalog).some((id) =>
        catalog.packsById.has(id),
      );
      if (haikuHasPrice && !haikuQuotesPack) {
        const { haikuAlreadyAskedToConfirm } = await import(
          "../lib/pending-price-cta.ts"
        );
        const skipPhoto = haikuAlreadyAskedToConfirm(haikuText);
        const matchText = `${trigger.originalMessage}\n${haikuText}`;
        const portfolioIdx = catalog.portfolioIndex ?? [];
        let serviceId: string | null = null;
        let serviceName: string | null = null;

        // SOFI 28-ago (CTWA lash ads): efecto de pestañas concreto en el hilo →
        // preferir cat-extensiones/cat-lifting + collage de campaña si aplica.
        if (effectInThread && portfolioIdx.length > 0) {
          const {
            findBestPortfolioMatchForText,
            wasPriceAnswerPhotoRecentlySent,
            buildPriceAnswerPhotoCaption,
          } = await import("../lib/portfolio.ts");
          let matchCatId: "cat-extensiones" | "cat-lifting" = "cat-extensiones";
          let match = findBestPortfolioMatchForText(
            matchText,
            portfolioIdx,
            "cat-extensiones",
          );
          if (!match) {
            match = findBestPortfolioMatchForText(
              matchText,
              portfolioIdx,
              "cat-lifting",
            );
            matchCatId = "cat-lifting";
          }
          if (match) {
            serviceId = match.serviceId;
            serviceName = match.serviceName;
            const kind = pickCollageKindForService(
              match.serviceId,
              catalog,
              matchText,
            );
            const collage = kind
              ? getCampaignCollageUrl(wabaConfig, kind)
              : null;
            const { sendImage } = await import("../wa-api.ts");
            if (!skipPhoto) {
              const alreadySent = await wasPriceAnswerPhotoRecentlySent(
                supabase,
                phoneNumber,
                match.serviceName,
              );
              if (!alreadySent) {
                if (collage) {
                  await sendImage(
                    phoneNumber,
                    collage.url,
                    `${collage.caption}\n¿Le agendo *${match.serviceName}*? 💜`,
                  );
                } else {
                  await sendImage(
                    phoneNumber,
                    match.url,
                    buildPriceAnswerPhotoCaption(
                      match.serviceName,
                      matchCatId,
                      {
                        isCtwa:
                          Boolean(aiSession?.from_ad_at) &&
                          matchCatId === "cat-extensiones",
                        wabaConfig,
                      },
                    ),
                  );
                }
              }
            }
          }
        }

        // Jacqueline/Sofía "cuánto cuesta el rubber" …0983, 19-sep: cotización de
        // precio de CUALQUIER servicio (no solo efectos de pestañas) con foto real
        // en portafolio → foto proactiva + CTA. `categoryId: null` = sin filtro,
        // busca en todas las categorías (uñas, cejas, microblading, etc.).
        if (!serviceId && portfolioIdx.length > 0 && !skipPhoto) {
          const {
            findBestPortfolioMatchForText,
            wasPriceAnswerPhotoRecentlySent,
            buildPriceAnswerPhotoCaption,
          } = await import("../lib/portfolio.ts");
          const match = findBestPortfolioMatchForText(
            matchText,
            portfolioIdx,
            null,
          );
          if (match) {
            serviceId = match.serviceId;
            serviceName = match.serviceName;
            const alreadySent = await wasPriceAnswerPhotoRecentlySent(
              supabase,
              phoneNumber,
              match.serviceName,
            );
            if (!alreadySent) {
              const { sendImage } = await import("../wa-api.ts");
              await sendImage(
                phoneNumber,
                match.url,
                buildPriceAnswerPhotoCaption(
                  match.serviceName,
                  match.categoryId,
                  { wabaConfig },
                ),
              );
            }
          }
        }

        if (!serviceId) {
          const quoted = findServiceQuotedInHaikuText(haikuText, catalog);
          if (quoted) {
            serviceId = quoted.id;
            serviceName = quoted.name;
          }
        }

        if (serviceId) {
          serviceCtaSet = true;
          const { upsertSession: upsertCta } = await import(
            "../lib/supabase.ts"
          );
          await upsertCta(supabase, phoneNumber, {
            pending_price_cta_service_id: serviceId,
            pending_price_cta_at: new Date().toISOString(),
          });
          console.log(
            `[AI] pending_price_cta set (action none): ${serviceName ?? serviceId}`,
          );
        }
      }
      const { findPackQuotedInHaikuText } = await import(
        "../lib/pending-price-cta.ts"
      );
      const packQuoted = findPackQuotedInHaikuText(
        (result.texts?.length ? result.texts.join("\n") : result.text) ?? "",
        catalog,
      );
      if (packQuoted && !serviceCtaSet) {
        const { upsertSession: upsertPackCta } = await import(
          "../lib/supabase.ts"
        );
        await upsertPackCta(supabase, phoneNumber, {
          pending_price_cta_service_id: packQuoted.id,
          pending_price_cta_at: new Date().toISOString(),
        });
        console.log(
          `[AI] pending_price_cta pack (action none): ${packQuoted.name}`,
        );
      }

      // Jacqueline …2438, 19-sep: Haiku ofrece portafolio condicional
      // ("¿quieres ver ejemplos?") con action:none — un "Sii" corto después
      // debe abrir el portafolio (tryAcceptPendingPortfolioCta), no el menú.
      const { matchesPortfolioOfferPhrase } = await import(
        "../lib/portfolio.ts"
      );
      if (matchesPortfolioOfferPhrase(haikuText)) {
        const { upsertSession: upsertPortfolioCta } = await import(
          "../lib/supabase.ts"
        );
        await upsertPortfolioCta(supabase, phoneNumber, {
          pending_portfolio_cta_at: new Date().toISOString(),
        });
        console.log("[AI] pending_portfolio_cta set (action none)");
      }
    }

    // Log fire-and-forget
    void logAIUsage(
      supabase,
      trigger.type,
      result.inputTokens,
      result.outputTokens,
      phoneNumber,
      {
        cacheCreationInputTokens: result.cacheCreationInputTokens,
        cacheReadInputTokens: result.cacheReadInputTokens,
      },
    );

    console.log(
      "[AI] Respondió con IA:",
      trigger.type,
      "acción:",
      result.action?.type ?? "none",
      "país:",
      phoneCountry ?? "desconocido",
      "—",
      trigger.originalMessage.slice(0, 50),
    );
    return true;
  } catch (err) {
    console.error("[AI] handleAIMessage falló:", err);
    return false;
  }
}
