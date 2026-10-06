// staff-resume.ts — Acciones del panel: reactivar bot / Haiku termina agenda

import { sendMessage } from "../wa-api.ts";
import {
  clearAnthropicCreditExhaustedFlag,
  logAIUsage,
  reportAnthropicApiFailure,
} from "../lib/haiku-usage.ts";
import { notifyAdmins } from "../lib/notify.ts";
import { loadCatalog } from "../lib/services-catalog.ts";
import {
  addToCart,
  getSession,
  upsertSession,
  type SupabaseClient,
} from "../lib/supabase.ts";
import { waConversationKey } from "../lib/wa-recipient.mjs";
import {
  resendDatetimeSelectors,
  sessionHasCart,
  tryCompleteBookingFromText,
} from "./booking-flow.ts";
import { WABA_PANEL_BASE } from "../lib/panel-url.ts";

const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const HAIKU_TIMEOUT_MS = 8000;
const HISTORY_LIMIT = 20;

export type StaffSessionAction =
  | "resume_bot"
  | "pause_bot"
  | "haiku_finish_booking";

export type StaffResumeResult = {
  ok: boolean;
  action: StaffSessionAction;
  detail: string;
  booked?: boolean;
  calendarSent?: boolean;
};

/** Quita `bot_paused_at` (staff retoma o Haiku vuelve a manejar el hilo). */
export async function resumeBotForPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<StaffResumeResult> {
  const key = waConversationKey(phone);
  const { error } = await supabase
    .from("whatsapp_sessions")
    .update({
      bot_paused_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("phone", key);
  if (error) {
    console.error("[staff-resume] resume_bot:", error.message);
    return { ok: false, action: "resume_bot", detail: error.message };
  }
  return {
    ok: true,
    action: "resume_bot",
    detail: "Bot reactivado",
  };
}

/** Marca `bot_paused_at` (staff toma el hilo manualmente, sin foto de diseño). */
export async function pauseBotForPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<StaffResumeResult> {
  const key = waConversationKey(phone);
  const { error } = await supabase
    .from("whatsapp_sessions")
    .update({
      bot_paused_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("phone", key);
  if (error) {
    console.error("[staff-resume] pause_bot:", error.message);
    return { ok: false, action: "pause_bot", detail: error.message };
  }
  return {
    ok: true,
    action: "pause_bot",
    detail: "Bot pausado",
  };
}

type HaikuFinishVerdict = {
  reply: string;
  service_id: string | null;
  datetime_text: string | null;
  send_calendar: boolean;
};

async function askHaikuFinishBooking(
  supabase: SupabaseClient,
  phone: string,
  transcript: string,
  catalogLines: string,
  cartSummary: string,
): Promise<HaikuFinishVerdict | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return null;

  const system =
    "Eres parte del equipo de ZM Lash & Nails Beauty. Staff terminó de cotizar " +
    "un diseño por WhatsApp y te pide cerrar el agendamiento. 'in' = clienta, " +
    "'out' = equipo/bot. Extrae servicio y fecha/hora si ya hay acuerdo claro. " +
    "NO inventes UUID ni horarios. Si la fecha/hora no está explícita, " +
    "send_calendar=true y datetime_text=null. Tono asesora profesional " +
    "(prohibido: babe, baby, amor, cielo, linda, hermosa, bella, guapa). " +
    "Español peruano. reply: máx 2 líneas para la clienta. " +
    `Catálogo (id|nombre|precio):\n${catalogLines}\n` +
    `Carrito actual: ${cartSummary}\n` +
    "Responde ÚNICAMENTE JSON válido:\n" +
    '{"reply":"texto","service_id":"uuid o null","datetime_text":"texto libre fecha/hora o null","send_calendar":boolean}';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HAIKU_TIMEOUT_MS);
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 350,
        system,
        messages: [{ role: "user", content: transcript.slice(0, 8000) }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(
        "[staff-resume] Haiku HTTP",
        response.status,
        errText.slice(0, 200),
      );
      void reportAnthropicApiFailure(supabase, {
        status: response.status,
        bodyText: errText,
        source: "staff_haiku_finish_booking",
        phoneNumber: phone,
      });
      return null;
    }

    const data = await response.json();
    void clearAnthropicCreditExhaustedFlag(supabase);
    void logAIUsage(
      supabase,
      "staff_haiku_finish_booking",
      Number(data?.usage?.input_tokens ?? 0),
      Number(data?.usage?.output_tokens ?? 0),
      phone,
    );

    const raw = String(data?.content?.[0]?.text ?? "").trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const reply =
      typeof parsed.reply === "string" ? parsed.reply.trim().slice(0, 500) : "";
    const serviceId =
      typeof parsed.service_id === "string" &&
      /^[0-9a-f-]{36}$/i.test(parsed.service_id.trim())
        ? parsed.service_id.trim()
        : null;
    const datetimeText =
      typeof parsed.datetime_text === "string" &&
      parsed.datetime_text.trim().length > 0
        ? parsed.datetime_text.trim().slice(0, 200)
        : null;
    const sendCalendar = parsed.send_calendar === true;
    return {
      reply:
        reply || "¿Seguimos con tu cita? Cuéntame qué día te queda bien 💜",
      service_id: serviceId,
      datetime_text: datetimeText,
      send_calendar: sendCalendar,
    };
  } catch (err) {
    clearTimeout(timer);
    console.error("[staff-resume] Haiku:", err);
    return null;
  }
}

/**
 * Unpause + Haiku lee hilo e intenta cerrar agenda (fail-soft → calendario).
 */
export async function haikuFinishBookingForPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<StaffResumeResult> {
  const key = waConversationKey(phone);

  await upsertSession(supabase, key, { bot_paused_at: null });

  const { data: history } = await supabase
    .from("wa_messages")
    .select("direction, content, created_at")
    .eq("phone", key)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const ordered = (
    (history ?? []) as Array<{
      direction: string;
      content: string | null;
    }>
  ).reverse();
  const transcript = ordered
    .map((m) => `[${m.direction}] ${(m.content ?? "").slice(0, 400)}`)
    .join("\n");

  let session = await getSession(supabase, key);
  const catalog = await loadCatalog(supabase);

  const services = [...catalog.servicesById.values()].slice(0, 80);
  const catalogLines = services
    .map(
      (s) => `${s.id}|${(s.name ?? "").slice(0, 40)}|S/${Number(s.price ?? 0)}`,
    )
    .join("\n");

  let cartSummary = "(vacío)";
  if (sessionHasCart(session)) {
    const items = session?.cartItems ?? [];
    if (items.length > 0) {
      cartSummary = items
        .map(
          (item: { item_type?: string; item_id?: string; price?: number }) =>
            `${item.item_type}:${item.item_id}@${item.price}`,
        )
        .join(", ");
    } else {
      cartSummary = (session?.serviceIds ?? []).join(",") || "(vacío)";
    }
  }

  const verdict = await askHaikuFinishBooking(
    supabase,
    key,
    transcript || "(sin historial)",
    catalogLines || "(sin catálogo)",
    cartSummary,
  );

  if (!verdict) {
    void notifyAdmins(
      supabase,
      "Haiku agenda falló",
      `No se pudo leer el hilo de …${key.slice(-4)}. Bot quedó activo; revisa el chat.`,
      {
        type: "waba_chat",
        phone: key,
        reason: "haiku_finish_failed",
        url: `${WABA_PANEL_BASE}?phone=${encodeURIComponent(key)}`,
      },
    );
    await sendMessage(
      key,
      "¿Seguimos con tu cita? Escribe el día y hora que prefieres o *menu* 💜",
    );
    return {
      ok: false,
      action: "haiku_finish_booking",
      detail: "Haiku no respondió; bot activo + mensaje fallback",
    };
  }

  if (
    verdict.service_id &&
    catalog.servicesById.has(verdict.service_id) &&
    !(session?.serviceIds ?? []).includes(verdict.service_id)
  ) {
    await addToCart(supabase, key, verdict.service_id);
    session = await getSession(supabase, key);
  }

  let booked = false;
  let calendarSent = false;

  if (verdict.datetime_text && sessionHasCart(session)) {
    const completed = await tryCompleteBookingFromText(
      supabase,
      key,
      verdict.datetime_text,
      session,
      catalog,
    );
    if (completed) {
      booked = true;
      // tryCompleteBooking puede haber enviado msgs; refuerzo reply solo si vacío
      return {
        ok: true,
        action: "haiku_finish_booking",
        detail: "Cita/flujo cerrado vía fecha parseada",
        booked: true,
      };
    }
  }

  await sendMessage(key, verdict.reply);

  if (
    (verdict.send_calendar || !verdict.datetime_text) &&
    sessionHasCart(session)
  ) {
    await upsertSession(supabase, key, { step: "awaiting_datetime" });
    session = await getSession(supabase, key);
    await resendDatetimeSelectors(key, supabase, session!, catalog);
    calendarSent = true;
  }

  return {
    ok: true,
    action: "haiku_finish_booking",
    detail: calendarSent
      ? "Reply + calendario enviado"
      : booked
        ? "Cita creada"
        : "Reply enviado",
    booked,
    calendarSent,
  };
}
