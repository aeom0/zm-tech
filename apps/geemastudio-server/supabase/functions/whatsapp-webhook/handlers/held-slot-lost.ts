// held-slot-lost.ts — Una cita nueva le quitó la hora a un carrito que aún no abonaba.
// Haiku explica por qué pedimos el adelanto y se ofrece el selector real.

import { sendMessage } from "../wa-api.ts";
import { formatDateSpanish } from "../format.ts";
import type { CartItem, SupabaseClient } from "../lib/supabase.ts";
import { expandCartItemsToServiceIds, upsertSession } from "../lib/supabase.ts";
import type { ServiceCatalog } from "../lib/services-catalog.ts";
import { loadCatalog, overlapCapForCart } from "../lib/services-catalog.ts";
import { clientFirstName } from "../lib/client-address.ts";
import { getDateKeyLima } from "../lib/peru-holidays.ts";
import { getRequestTenantId } from "../lib/tenant.ts";
import { notifyAdmins } from "../lib/notify.ts";
import {
  clearAnthropicCreditExhaustedFlag,
  logAIUsage,
  reportAnthropicApiFailure,
} from "../lib/haiku-usage.ts";
import {
  hasSlotCapacityForServices,
  sendDateSelector,
  sendTimeSelector,
} from "./agenda.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";
const HAIKU_TIMEOUT_MS = 12_000;
/** Tope de carritos en espera de abono por revisión; si se alcanza se deja rastro en el log. */
const HELD_SESSIONS_LIMIT = 200;

/** Pasos en los que la hora ya se prometió y el abono todavía no creó la cita. */
const HOLD_STEPS = [
  "awaiting_payment_screenshot",
  "awaiting_deposit_boleta",
  "awaiting_deposit_datos",
];

const VOSEO_RE =
  /\b(tenés|podés|querés|sabés|necesitás|fijate|decime|avisame|agendá|mirá|escribí|mandá)\b/i;

export interface HeldSlotLostOpts {
  phone: string;
  heldAt: Date;
  serviceIds: string[];
  durationMinutes: number;
  catalog: ServiceCatalog;
  cap: number;
  clientName?: string | null;
  /** Ella ya mandó la captura y el cupo se fue antes de crear la cita. */
  alreadyPaid?: boolean;
  screenshotUrl?: string | null;
  /** Evita dos avisos si el trigger y un reintento coinciden. */
  debounceKind?: string;
}

function phoneTail(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "").slice(-9);
}

function parseHeldInstant(raw: string): Date | null {
  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;
  const iso = raw.includes("T") ? raw : `${raw.trim().replace(" ", "T")}Z`;
  const fallback = new Date(iso);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function readCart(raw: unknown): CartItem[] {
  if (Array.isArray(raw)) return raw as CartItem[];
  if (typeof raw !== "string" || !raw.trim()) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as CartItem[]) : [];
  } catch {
    return [];
  }
}

function fallbackLostHoldText(opts: {
  firstName: string | null;
  whenLabel: string;
  alreadyPaid: boolean;
}): string {
  const hello = opts.firstName
    ? `Srta. ${opts.firstName}, disculpa.`
    : "Disculpa.";
  const paid = opts.alreadyPaid
    ? "\n\nSi ya enviaste el comprobante, no hagas otro pago. Lo revisamos con el horario que elijas."
    : "";
  return (
    `${hello}\n\n` +
    `El ${opts.whenLabel} ya no tiene cupo.\n\n` +
    `Pedimos el abono porque los cupos son limitados. Mientras el adelanto no se confirmaba, otra cita ocupó ese horario.` +
    paid +
    `\n\n¿Qué otro horario te queda bien?`
  );
}

function sanitizeHaikuText(raw: string, alreadyPaid: boolean): string | null {
  let text = raw.trim();
  text = text
    .replace(/^```[a-z]*\n?/i, "")
    .replace(/```$/i, "")
    .trim();
  text = text.replace(/<action[\s\S]*?<\/action>/gi, "").trim();
  text = text.replace(/<\/?text>/gi, "").trim();
  if (text.length < 40 || text.length > 700) return null;
  if (!/no tiene cupo/i.test(text)) return null;
  if (!text.includes("?")) return null;
  if (VOSEO_RE.test(text) || /te late/i.test(text)) return null;
  if (alreadyPaid && !/no hagas otro pago/i.test(text)) return null;
  return text;
}

async function composeLostHoldText(
  supabase: SupabaseClient,
  phone: string,
  whenLabel: string,
  firstName: string | null,
  alreadyPaid: boolean,
): Promise<string> {
  const fallback = fallbackLostHoldText({ firstName, whenLabel, alreadyPaid });
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return fallback;

  const paidLine = alreadyPaid
    ? "Ella ya envió el comprobante del abono. Incluye la frase exacta «no hagas otro pago» y di que lo revisamos con el horario nuevo."
    : "Todavía no vimos el comprobante del abono.";

  const system =
    "Eres la asistente de ZM Lash and Nails Beauty en Lima. Escribes un solo mensaje de WhatsApp. " +
    "Español neutro, tuteo (puedes, tienes, dime). Prohibido el voseo y «te late». " +
    "Sin XML, sin listas de horarios y sin inventar una hora de reemplazo.";

  const user =
    `Explica con calma, sin culpar, que el horario prometido ya no tiene cupo.\n` +
    `- Tratamiento: ${firstName ? `Srta. ${firstName}` : "sin nombre, no inventes uno"}\n` +
    `- Horario que se perdió (úsala tal cual): ${whenLabel}\n` +
    `- ${paidLine}\n` +
    `El mensaje debe incluir la frase exacta «no tiene cupo». ` +
    `Explica que pedimos el abono porque los cupos son limitados y que, mientras el adelanto no se confirmaba, otra cita ocupó ese horario. ` +
    `Termina con una pregunta para que elija otro horario de la lista que llega después. Máximo 500 caracteres.`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HAIKU_TIMEOUT_MS);
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
        max_tokens: 400,
        system,
        messages: [{ role: "user", content: user }],
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      await reportAnthropicApiFailure(supabase, {
        status: response.status,
        bodyText: errText,
        source: "held_slot_lost",
        phoneNumber: phone,
      });
      return fallback;
    }
    const data = await response.json();
    const usage = data?.usage ?? {};
    await logAIUsage(
      supabase,
      "held_slot_lost",
      Number(usage.input_tokens) || 0,
      Number(usage.output_tokens) || 0,
      phone,
    );
    await clearAnthropicCreditExhaustedFlag(supabase);
    const text = sanitizeHaikuText(
      String(data?.content?.[0]?.text ?? ""),
      alreadyPaid,
    );
    return text ?? fallback;
  } catch (err) {
    console.error(
      "[held-slot-lost] Haiku:",
      err instanceof Error ? err.message : err,
    );
    return fallback;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function claimDebounce(
  supabase: SupabaseClient,
  phone: string,
  kind: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("waba_claim_action_debounce", {
    p_phone: phone,
    p_kind: kind,
    p_window_seconds: 3600,
    p_tenant_id: getRequestTenantId(),
  });
  if (error) {
    console.warn("[held-slot-lost] debounce:", error.message);
    return true;
  }
  return data === true;
}

/**
 * Suelta la hora prometida, explica con Haiku y muestra el selector de ese día.
 * No asigna otra hora: el cupo real lo arma `sendTimeSelector`.
 */
export async function notifyHeldSlotLost(
  supabase: SupabaseClient,
  opts: HeldSlotLostOpts,
): Promise<boolean> {
  if (opts.debounceKind) {
    const claimed = await claimDebounce(
      supabase,
      opts.phone,
      opts.debounceKind,
    );
    if (!claimed) {
      console.log(
        "[held-slot-lost] ya avisada:",
        opts.phone.slice(-4),
        opts.debounceKind,
      );
      return false;
    }
  }

  const dateKey = getDateKeyLima(opts.heldAt);
  const whenLabel = formatDateSpanish(opts.heldAt);
  const firstName = clientFirstName(opts.clientName);
  const text = await composeLostHoldText(
    supabase,
    opts.phone,
    whenLabel,
    firstName,
    opts.alreadyPaid === true,
  );

  await upsertSession(supabase, opts.phone, {
    step: "awaiting_datetime",
    parsed_datetime: null,
    awaiting_screenshot: false,
    selected_day: dateKey,
  });

  await sendMessage(opts.phone, text);

  if (opts.alreadyPaid) {
    const who = firstName ?? `…${opts.phone.slice(-4)}`;
    await notifyAdmins(
      supabase,
      "Abono sin cupo",
      `${who} envió el adelanto y ${whenLabel} ya no tiene cupo. Hay que revisar el comprobante con el horario nuevo.`,
      {
        type: "held_slot_lost",
        phone: opts.phone,
        ...(opts.screenshotUrl ? { screenshot_url: opts.screenshotUrl } : {}),
      },
    );
  }

  const sentTimes = await sendTimeSelector(
    opts.phone,
    supabase,
    dateKey,
    [],
    opts.durationMinutes,
    opts.cap,
    1,
    opts.catalog,
    opts.serviceIds,
  );
  if (!sentTimes) {
    await sendDateSelector(
      opts.phone,
      supabase,
      [],
      opts.durationMinutes,
      opts.cap,
      1,
      opts.catalog,
      opts.serviceIds,
    );
  }
  return true;
}

async function durationMinutesFor(
  supabase: SupabaseClient,
  serviceIds: string[],
  cache: Map<string, number>,
): Promise<number> {
  if (serviceIds.length === 0) return 0;
  const missing = [...new Set(serviceIds)].filter((id) => !cache.has(id));
  if (missing.length > 0) {
    const { data, error } = await supabase
      .from("services")
      .select("id, duration")
      .in("id", missing);
    if (error) {
      console.error("[held-slot-lost] durations:", error.message);
      return serviceIds.length * 60;
    }
    for (const row of data ?? []) {
      const id = String((row as { id: string }).id);
      const duration = Number((row as { duration?: number | null }).duration);
      cache.set(id, Number.isFinite(duration) && duration > 0 ? duration : 60);
    }
  }
  return serviceIds.reduce((sum, id) => sum + (cache.get(id) ?? 60), 0);
}

async function lookupClientName(
  supabase: SupabaseClient,
  tenantId: string,
  phone: string,
): Promise<string | null> {
  const digits = phone.replace(/\D/g, "");
  const local = digits.slice(-9);
  if (local.length < 9) return null;
  const { data, error } = await supabase
    .from("clients")
    .select("name")
    .eq("tenant_id", tenantId)
    .or(`phone.eq.${digits},phone_normalized.eq.${local}`)
    .limit(1);
  if (error) {
    console.warn("[held-slot-lost] clienta:", error.message);
    return null;
  }
  const name = (data?.[0] as { name?: string | null } | undefined)?.name;
  return name?.trim() || null;
}

/**
 * Tras un INSERT de cita: busca carritos con hora prometida que este cupo acaba de cerrar.
 * Solo avisa si el slot estaba libre antes de esta cita y ya no lo está.
 */
export async function scanHeldSlotsForAppointment(
  supabase: SupabaseClient,
  appointmentId: string,
): Promise<{ notified: string[] }> {
  const { data: appt, error } = await supabase
    .from("appointments")
    .select("id, status, tenant_id, client_phone, whatsapp_phone")
    .eq("id", appointmentId)
    .maybeSingle();
  if (error || !appt) {
    console.error(
      "[held-slot-lost] cita:",
      error?.message ?? "no encontrada",
      appointmentId,
    );
    return { notified: [] };
  }
  if ((appt as { status?: string }).status !== "scheduled") {
    return { notified: [] };
  }

  const tenantId =
    ((appt as { tenant_id?: string | null }).tenant_id ?? "").trim() ||
    getRequestTenantId();
  const ownTails = new Set(
    [
      phoneTail((appt as { client_phone?: string | null }).client_phone),
      phoneTail((appt as { whatsapp_phone?: string | null }).whatsapp_phone),
    ].filter((tail) => tail.length >= 9),
  );

  const { data: sessions, error: sessErr } = await supabase
    .from("whatsapp_sessions")
    .select("phone, step, cart_items, parsed_datetime, bot_paused_at")
    .eq("tenant_id", tenantId)
    .in("step", HOLD_STEPS)
    .not("parsed_datetime", "is", null)
    .limit(HELD_SESSIONS_LIMIT);
  if (sessErr) {
    console.error("[held-slot-lost] sesiones:", sessErr.message);
    return { notified: [] };
  }

  if ((sessions?.length ?? 0) >= HELD_SESSIONS_LIMIT) {
    console.warn(
      "[held-slot-lost] tope de sesiones alcanzado, puede quedar un carrito sin revisar:",
      HELD_SESSIONS_LIMIT,
    );
  }

  const catalog = await loadCatalog(supabase, tenantId);
  const notified: string[] = [];
  const durationCache = new Map<string, number>();

  for (const row of sessions ?? []) {
    const phone = String((row as { phone?: string }).phone ?? "");
    if (!phone) continue;
    if ((row as { bot_paused_at?: string | null }).bot_paused_at) continue;
    const tail = phoneTail(phone);
    if (tail.length >= 9 && ownTails.has(tail)) continue;

    const heldRaw = (row as { parsed_datetime?: string | null })
      .parsed_datetime;
    if (!heldRaw) continue;
    const heldAt = parseHeldInstant(String(heldRaw));
    if (!heldAt || heldAt.getTime() <= Date.now()) continue;

    const cart = readCart((row as { cart_items?: unknown }).cart_items);
    const serviceIds = await expandCartItemsToServiceIds(supabase, cart);
    if (serviceIds.length === 0) continue;
    const durationMinutes = await durationMinutesFor(
      supabase,
      serviceIds,
      durationCache,
    );
    if (durationMinutes <= 0) continue;
    const cap = overlapCapForCart(serviceIds, catalog);

    const stillFree = await hasSlotCapacityForServices(
      supabase,
      catalog,
      heldAt,
      durationMinutes,
      serviceIds,
      cap,
    );
    if (stillFree) continue;
    const wasFree = await hasSlotCapacityForServices(
      supabase,
      catalog,
      heldAt,
      durationMinutes,
      serviceIds,
      cap,
      appointmentId,
    );
    if (!wasFree) continue;

    try {
      const clientName = await lookupClientName(supabase, tenantId, phone);
      const sent = await notifyHeldSlotLost(supabase, {
        phone,
        heldAt,
        serviceIds,
        durationMinutes,
        catalog,
        cap,
        clientName,
        debounceKind: `held_slot:${appointmentId}`,
      });
      if (sent) notified.push(phone.slice(-4));
    } catch (err) {
      console.error(
        "[held-slot-lost] aviso:",
        phone.slice(-4),
        err instanceof Error ? err.message : err,
      );
    }
  }

  return { notified };
}
