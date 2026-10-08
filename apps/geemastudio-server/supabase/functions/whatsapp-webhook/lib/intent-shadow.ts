/**
 * Modo sombra — clasificación de intención Haiku vs waterfall regex.
 * Solo logging: NO ejecuta handlers ni cambia el flujo real.
 *
 * Ver docs/waba/auditoria-intenciones-waba.md § Notas extra #2.
 */

import type { SupabaseClient } from "./supabase.ts";
import {
  clearAnthropicCreditExhaustedFlag,
  logAIUsage,
  reportAnthropicApiFailure,
} from "./haiku-usage.ts";
import {
  extractDateIntentFromText,
  isMostlyTimeChoice,
  matchesComplaintIntent,
  matchesSoftRescheduleIntent,
  parseBookingDatetimeFromMessage,
  sessionHasCart,
} from "../handlers/booking-flow.ts";
import { getPendingAppointmentsForPhone } from "../handlers/pending-appointment.ts";
import { parseDateOnlyKey } from "../parse-datetime-es.ts";
import { isQaWaPhone } from "./qa-phone.mjs";
import {
  isKnownCtwaCampaignCopy,
  isMetaAdsBoilerplateCta,
} from "./meta-ads-cta.ts";

/** Misma familia de valores que el piloto de 5 intents (audit § Notas extra). */
export type ShadowIntent =
  | "crear_cita"
  | "reclamo_garantia"
  | "reprogramar_cita_soft"
  | "confirmar_cita_texto_libre"
  | "otro";

const SHADOW_INTENTS = new Set<string>([
  "crear_cita",
  "reclamo_garantia",
  "reprogramar_cita_soft",
  "confirmar_cita_texto_libre",
  "otro",
]);

/**
 * Regex del bloque REMINDER_TEXT_CONFIRM en dispatcher.ts (~726–773;
 * exactConfirm ~734). Plan 08 Fase 1 lo dejó en el orquestador; no vive
 * en dispatch/closing-intents.ts. Duplicado a propósito: no refactorizar
 * el waterfall en este PR. Si cambia el de dispatcher, actualizar aquí.
 */
export const REMINDER_TEXT_CONFIRM_RE =
  /^(s[ií]|ok|dale|va|listo|confirmo|confirmar)([\s!,.💚💜✨👍]*)$/iu;

/**
 * Frases naturales de confirmación de asistencia (con saludo/texto alrededor),
 * ej. "Hola Vane, si asistiré" — caso Pilar Palacios, 06-ago. Añadido junto con
 * `phraseConfirm` en dispatcher.ts (~744–748); mismo texto de negación excluida.
 */
export const REMINDER_TEXT_CONFIRM_PHRASE_RE =
  /\b(asistir[ée]|voy a (ir|estar)|ah[ií] estar[ée]|confirmo(?:\s+mi\s+asistencia)?)\b/i;

/** Misma ventana 24h que `REMINDER_TEXT_CONFIRM_WINDOW_MS` en dispatch/closing-intents.ts. */
const SHADOW_REMINDER_CONFIRM_WINDOW_MS = 24 * 60 * 60_000;

/**
 * Espejo del guard prod `wasAppointmentReminderRecentlySent`, que tras el
 * Plan 08 Fase 1 se movió a dispatch/closing-intents.ts (~176). Duplicado
 * a propósito — no tocar closing-intents.ts en este fix.
 */
async function wasAppointmentReminderRecentlySentShadow(
  supabase: SupabaseClient,
  phone: string,
  windowMs: number = SHADOW_REMINDER_CONFIRM_WINDOW_MS,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await supabase
    .from("wa_messages")
    .select("id")
    .eq("phone", phone)
    .eq("direction", "out")
    .gte("created_at", since)
    .or(
      "content.ilike.%recordatorio_cita_zm%,content.ilike.%recordatorio_mismo_dia_zm%",
    )
    .limit(1);
  if (error) {
    console.error(
      "[intent-shadow] wasAppointmentReminderRecentlySentShadow:",
      error.message,
    );
    return false;
  }
  return (data?.length ?? 0) > 0;
}

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const SHADOW_MAX_TOKENS = 40;
const SHADOW_TIMEOUT_MS = 3500;

export const SHADOW_SYSTEM_PROMPT =
  `Eres un clasificador de intención para el WhatsApp de un salón de belleza (ZM Lash & Nails, Perú).
Devuelve ÚNICAMENTE un JSON válido, sin markdown ni texto extra:
{"intent":"<valor>"}

Valores permitidos de intent (elige exactamente uno):
- "crear_cita": propone DÍA y/o HORA para una cita NUEVA (sin cita previa en contexto). Ej. "hoy a las 4pm pestañas", "para el martes". Sin día ni hora → no uses este valor.
- "reclamo_garantia": queja explícita por trabajo YA hecho que falló (se cayeron/bajaron, garantía, rehacer). NO es reclamo: describir uñas quebradizas para pedir tratamiento, cancelar, no-show, "no podré asistir".
- "reprogramar_cita_soft": cambiar fecha/hora de cita EXISTENTE ("podrá ser a las 5", "mejor el viernes", "más temprano"). Hora suelta cuando ya tiene cita → aquí, NO crear_cita.
- "confirmar_cita_texto_libre": afirma asistencia a cita ya agendada ("si asistiré", "ahí estaré", "sí confirmo" tras recordatorio). NO es confirmación: preguntar si tiene turno, pedir que staff confirme, avisar llegada ("ya llegué", "estoy a 2 minutos").
- "otro": saludo, copy anuncio, precio, menú, ubicación, servicio sin fecha, consultas de disponibilidad.

Reglas anti falso positivo (auditoría 28-ago):
- Pregunta "¿tienes turno?" / "me confirmas" → otro (no confirmar_cita).
- Llegada o tardanza ("ya llegué", "estoy a X minutos") → otro (no confirmar_cita).
- Hora suelta tipo "podrá ser a las 5 pm" tras menú Mi cita → reprogramar_cita_soft (no crear_cita).
- Queja vaga de condición para asesoría ("uñas quebradizas", "problemas con mis uñas") sin pedir garantía → otro (no reclamo_garantia).

Ejemplos positivos:
- "Hola, vi el 15% de descuento en manos y pies y quiero agendar mi cita" → otro
- "Hola, vi la promo de Mirada de Impacto y quiero agendar mi cita" → otro
- "Quiero extensión rímel" → otro
- "Hola buen día no podré asistir" → otro
- "Hoy podría ser?" → crear_cita
- "Hoy a las 4pm pestañas" → crear_cita
- "Quisiera para el día martes, según el horario que tengan" → crear_cita
- "Tendrán más temprano turno?" → reprogramar_cita_soft
- "Podrá ser a las 5 pm" → reprogramar_cita_soft
- "Hola Vane, si asistiré" → confirmar_cita_texto_libre

Ejemplos negativos (auditoría real):
- "Buenas tardes tienes turno hoy a las 4pm" → otro
- "Me confirmas xfavor gracias" → otro
- "Estoy a 2 minutos" → otro
- "Ya llegie" → otro
- "Todavía tengo problemas con mis uñas están quebradizas" → otro

No inventes otros valores. No expliques.`;

export type ShadowSkipReason = "qa_phone" | "ctwa_boilerplate" | "ctwa_prefill";

function normalizeShadowText(text: string): string {
  return text.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

/**
 * Copy pre-llenado CTWA: "Hola, vi {promo} y quiero agendar mi cita".
 * Más laxo que isKnownCtwaCampaignCopy (cubre Mirada de Impacto y variantes).
 */
export function isCtwaPrefillAgendarCopy(text: string): boolean {
  const n = normalizeShadowText(text);
  if (!n) return false;
  return /^hola\b/.test(n) && /\bvi\b/.test(n) && /quiero\s+agendar/.test(n);
}

export function messageHasDateOrTimeIntent(text: string): boolean {
  return (
    extractDateIntentFromText(text) != null || parseDateOnlyKey(text) != null
  );
}

/**
 * No gastar tokens Haiku: teléfonos QA, boilerplate Meta, copy de creativo
 * sin día/hora. Si el copy CTWA trae fecha ("…agendar el viernes"), no skipear.
 */
export function shouldSkipIntentShadow(opts: {
  phone: string;
  messageText: string;
}): ShadowSkipReason | null {
  if (isQaWaPhone(opts.phone)) return "qa_phone";
  const text = opts.messageText.trim();
  if (!text) return null;
  if (isMetaAdsBoilerplateCta(text)) return "ctwa_boilerplate";
  if (messageHasDateOrTimeIntent(text)) return null;
  if (isKnownCtwaCampaignCopy(text) || isCtwaPrefillAgendarCopy(text)) {
    return "ctwa_prefill";
  }
  return null;
}

export type ShadowSessionSlice = {
  cartItems?: unknown[];
  serviceIds?: string[];
  step?: string | null;
  reschedule_appointment_id?: string | null;
  selected_day?: string | null;
  selected_date?: string | null;
} | null;

/**
 * Predice si tryCompleteBookingFromText devolvería true (sin ejecutar side effects).
 * Replica gates + parse de booking-flow.ts — no INSERT ni sendMessage.
 */
export function wouldTryCompleteBookingFromText(
  messageText: string,
  session: ShadowSessionSlice,
): boolean {
  if (!messageText.trim() || !sessionHasCart(session)) return false;
  if (
    session?.step &&
    session.step !== "browsing" &&
    session.step !== "awaiting_datetime"
  ) {
    return false;
  }
  if (session?.reschedule_appointment_id) return false;

  const dateIntent = extractDateIntentFromText(messageText);
  const dateOnlyKey = dateIntent && !dateIntent.hasTime
    ? dateIntent.dateKey
    : parseDateOnlyKey(messageText);
  if (dateOnlyKey && !isMostlyTimeChoice(messageText)) return true;

  const bookingDate = parseBookingDatetimeFromMessage(
    messageText,
    (session ?? {}) as Record<string, unknown>,
  );
  return bookingDate != null;
}

/**
 * Mapea el waterfall actual a uno de 5 intents (solo clasificación).
 *
 * Prioridad del espejo: confirm → reclamo → soft → crear → otro.
 *
 * Divergencia conocida vs dispatcher real:
 *   real = confirm → … → soft (solo si NO hay carrito) → reclamo → crear
 *   espejo = reclamo antes que soft.
 * Si un mensaje matcheara a la vez keywords de reclamo y soft sin carrito,
 * el bot real etiquetaría soft y este espejo reclamo. Las keyword lists son
 * casi disjuntas (se cayó/reclamo vs mejor/prefiero/cambiar) → overlap raro.
 * Si en shadow_log aparecen filas raras reclamo_garantia vs reprogramar_cita_soft,
 * revisar aquí antes de asumir fallo de Haiku.
 *
 * También replica el gate de `trySoftRescheduleFromText` (booking-flow.ts):
 * solo etiqueta reprogramar_cita_soft si existe exactamente 1 cita `scheduled`
 * pendiente para ese teléfono — si no, cae a los siguientes checks (crear_cita/otro).
 * Sin este gate, una clienta agendando por PRIMERA VEZ que escribe una hora suelta
 * quedaba mal etiquetada reprogramar_cita_soft (caso Milagros Alcántara, 15-ago).
 */
export async function computeRegexShadowIntent(
  supabase: SupabaseClient,
  phoneNumber: string,
  messageText: string,
  session: ShadowSessionSlice,
): Promise<ShadowIntent> {
  const text = messageText.trim();
  if (!text) return "otro";

  const step = session?.step ?? null;
  const stepOk = !step || step === "browsing" || step === "awaiting_datetime";

  // REMINDER_TEXT_CONFIRM: regex exacta + frase natural, step browsing
  // (como dispatcher.ts ~749–752: exactConfirm || phraseConfirm).
  // Fiel a prod: solo etiqueta confirmar si hay cita scheduled pendiente Y
  // recordatorio reciente — si no, cae al resto del espejo (otro/crear/…).
  // Sin este gate, «Si» ante CTA de catálogo inflaba desacuerdos sombra
  // (María Elena …6497, research 10-sep).
  if (!step || step === "browsing") {
    const exactConfirm = REMINDER_TEXT_CONFIRM_RE.test(text);
    const phraseConfirm = !/\bno\b/i.test(text) &&
      REMINDER_TEXT_CONFIRM_PHRASE_RE.test(text);
    if (exactConfirm || phraseConfirm) {
      const pending = await getPendingAppointmentsForPhone(
        supabase,
        phoneNumber,
      );
      if (
        pending.length > 0 &&
        (await wasAppointmentReminderRecentlySentShadow(supabase, phoneNumber))
      ) {
        return "confirmar_cita_texto_libre";
      }
      // Match de texto pero sin guards prod → no etiquetar confirmar; seguir.
    }
  }

  if (stepOk && matchesComplaintIntent(text)) {
    return "reclamo_garantia";
  }

  // Soft-reschedule: el intent gate; trySoftRescheduleFromText además evita
  // carrito mid-agendado — reflejamos ese guard para no etiquetar crear_cita como soft.
  if (matchesSoftRescheduleIntent(text)) {
    const midBooking = sessionHasCart(session) &&
      (step === "browsing" || step === "awaiting_datetime" || !step);
    if (!midBooking) {
      const pending = await getPendingAppointmentsForPhone(
        supabase,
        phoneNumber,
      );
      if (pending.length === 1) {
        return "reprogramar_cita_soft";
      }
      // Sin cita real que reprogramar: cae a los siguientes checks
      // (crear_cita / otro), igual que en producción real.
    }
  }

  if (wouldTryCompleteBookingFromText(text, session)) {
    return "crear_cita";
  }

  return "otro";
}

function parseHaikuIntentJson(raw: string): ShadowIntent | null {
  const trimmed = raw.trim();
  let jsonStr = trimmed;
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence?.[1]) jsonStr = fence[1].trim();
  const brace = jsonStr.match(/\{[\s\S]*\}/);
  if (brace) jsonStr = brace[0];
  try {
    const parsed = JSON.parse(jsonStr) as { intent?: unknown };
    const intent = typeof parsed.intent === "string" ? parsed.intent : null;
    if (intent && SHADOW_INTENTS.has(intent)) return intent as ShadowIntent;
  } catch {
    /* ignore */
  }
  return null;
}

export type HaikuShadowResult = {
  intent: ShadowIntent | null;
  latencyMs: number;
  tokensIn: number;
  tokensOut: number;
};

/** Llamada Haiku dedicada: solo clasificación JSON, sin tools ni catálogo. */
export async function classifyIntentWithHaiku(
  messageText: string,
  opts?: { supabase?: SupabaseClient; phoneNumber?: string },
): Promise<HaikuShadowResult> {
  const empty: HaikuShadowResult = {
    intent: null,
    latencyMs: 0,
    tokensIn: 0,
    tokensOut: 0,
  };
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey || !messageText.trim()) return empty;

  const t0 = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SHADOW_TIMEOUT_MS);

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
        max_tokens: SHADOW_MAX_TOKENS,
        system: SHADOW_SYSTEM_PROMPT,
        messages: [{ role: "user", content: messageText.slice(0, 500) }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - t0;

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        "[intent-shadow] Anthropic error:",
        response.status,
        errText.slice(0, 160),
      );
      if (opts?.supabase) {
        void reportAnthropicApiFailure(opts.supabase, {
          status: response.status,
          bodyText: errText,
          source: "intent_shadow",
          phoneNumber: opts.phoneNumber,
        });
      }
      return { ...empty, latencyMs };
    }

    const data = await response.json();
    const tokensIn = (data?.usage?.input_tokens as number) ?? 0;
    const tokensOut = (data?.usage?.output_tokens as number) ?? 0;
    if (opts?.supabase) {
      void clearAnthropicCreditExhaustedFlag(opts.supabase);
      void logAIUsage(
        opts.supabase,
        "intent_shadow",
        tokensIn,
        tokensOut,
        opts.phoneNumber,
      );
    }
    const rawText = (data?.content?.[0]?.text as string | undefined) ?? "";
    return {
      intent: parseHaikuIntentJson(rawText),
      latencyMs,
      tokensIn,
      tokensOut,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Date.now() - t0;
    if ((err as Error).name === "AbortError") {
      console.warn("[intent-shadow] Haiku timeout", SHADOW_TIMEOUT_MS, "ms");
    } else {
      console.error(
        "[intent-shadow] Haiku fail:",
        (err as Error)?.message ?? err,
      );
    }
    return { ...empty, latencyMs };
  }
}

export type IntentShadowLogOpts = {
  supabase: SupabaseClient;
  phone: string;
  wamid: string | null;
  step: string | null;
  hasCart: boolean;
  messageText: string;
  session: ShadowSessionSlice;
};

/**
 * Clasifica regex + Haiku e inserta fila. Nunca lanza hacia el caller de negocio:
 * fallos (tabla ausente, API, red) se tragan en silencio.
 */
export async function runIntentShadowLog(
  opts: IntentShadowLogOpts,
): Promise<void> {
  try {
    const skip = shouldSkipIntentShadow({
      phone: opts.phone,
      messageText: opts.messageText,
    });
    if (skip) {
      console.log(`[intent-shadow] skip ${skip}`);
      return;
    }

    const regexIntent = await computeRegexShadowIntent(
      opts.supabase,
      opts.phone,
      opts.messageText,
      opts.session,
    );
    const haiku = await classifyIntentWithHaiku(opts.messageText, {
      supabase: opts.supabase,
      phoneNumber: opts.phone,
    });

    const { error } = await opts.supabase
      .from("waba_intent_shadow_log")
      .insert({
        phone: opts.phone,
        wamid: opts.wamid,
        step: opts.step,
        has_cart: opts.hasCart,
        regex_intent: regexIntent,
        haiku_intent: haiku.intent,
        haiku_latency_ms: haiku.latencyMs || null,
        haiku_tokens_in: haiku.tokensIn || null,
        haiku_tokens_out: haiku.tokensOut || null,
      });

    if (error) {
      // Tabla aún no migrada, RLS, etc. — no romper el bot
      console.warn(
        "[intent-shadow] insert skip:",
        error.message?.slice(0, 120),
      );
    }
  } catch (err) {
    console.warn(
      "[intent-shadow] swallow:",
      (err as Error)?.message?.slice(0, 120) ?? err,
    );
  }
}
