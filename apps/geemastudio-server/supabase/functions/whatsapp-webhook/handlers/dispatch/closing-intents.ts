// closing-intents.ts — Tardanza, cierre natural, prompt pendiente (Plan 08)

import { parseLimaLocalToDate, timePartsLima } from "../../format.ts";
import { matchesLocationQuestion } from "../booking-flow.ts";
import { matchesParkingOrMovilidadQuestion } from "../../lib/salon-location.ts";
import { getRequestTenantId } from "../../lib/tenant.ts";
import type { SupabaseClient } from "../../lib/supabase.ts";

const TARDANZA_KEYWORDS = [
  "voy tarde",
  "llego tarde",
  "estoy tarde",
  "me retraso",
  "me retrase",
  "voy a llegar tarde",
  "llegaré tarde",
  "llegare tarde",
  "voy con retraso",
  "llego con retraso",
  "un poco tarde",
  "algo tarde",
  "llegaré un poco",
  "llegare un poco",
  "calculo llegar",
  "calculo que llego",
  "llego tipo",
  "llegar tipo",
  "llegaré tipo",
  "llegare tipo",
  "llego aprox",
  "llegar aprox",
  "normal llego",
  "llego normal",
  "llego a tiempo",
  "voy en camino",
  "estoy en camino",
  "recién voy a salir",
  "recien voy a salir",
  "recién salgo",
  "recien salgo",
  "estoy saliendo",
  "voy para allá",
  "voy para alla",
  "me atraso",
  "me atrasé",
  "me atrase",
];

/** 1 política de tardanza por episodio (Yelitza …1186: ×3 en 20 s). */
const TARDANZA_DEBOUNCE_MS = 5 * 60_000;
const TARDANZA_DEBOUNCE_KIND = "tardanza";

export function matchesTardanzaIntent(text: string): boolean {
  const msgLower = text.trim().toLowerCase();
  if (!msgLower) return false;
  if (matchesLocationQuestion(msgLower)) return false;
  if (matchesParkingOrMovilidadQuestion(msgLower)) return false;
  if (TARDANZA_KEYWORDS.some((k) => msgLower.includes(k))) return true;
  if (
    /\blleg(o|ar|aré|are)\b/.test(msgLower) &&
    /\d{1,2}/.test(msgLower) &&
    !/\bc[oó]mo\s+lleg/.test(msgLower) &&
    !/\bpara\s+lleg/.test(msgLower) &&
    !/\ba\s+qu[eé]\s+hora\b/.test(msgLower) &&
    !/\bqu[eé]\s+hora\s+lleg/.test(msgLower)
  ) {
    return true;
  }
  return false;
}

/**
 * Cierre natural del episodio ("Nos vemos!!😊", "Gracias!!").
 * No debe ir a Haiku→932 (Gabriela …4563 post-Confirmo mi cita).
 */
export function matchesNaturalClosingIntent(text: string): boolean {
  const raw = text.trim().toLowerCase();
  if (!raw) return false;
  const cleaned = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/[!?¡¿.]+/g, " ")
    .replace(/[\n\r,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length > 48) return false;
  if (/^nos vemos\b/.test(cleaned)) return true;
  if (/^(hasta luego|hasta pronto|chao|chau|bye)\b/.test(cleaned)) return true;
  if (/^(okis|oki|ok|oka|okiss|okey)(\s+gracias)?\s*$/.test(cleaned)) {
    return true;
  }
  if (
    /^(ok|oki|okis|oka|okiss|okey|dale|listo|super|perfecto|igualmente)?\s*gracias\s*$/
      .test(
        cleaned,
      )
  ) {
    return true;
  }
  if (/^(muchas|mil)\s+gracias\s*$/.test(cleaned)) return true;
  if (/^igualmente\s*$/.test(cleaned)) return true;
  return false;
}

/** Ventana: OUT con pregunta/lista pendiente bloquea el atajo «¡Nos vemos!». */
export const PENDING_PROMPT_CLOSING_WINDOW_MS = 15_000;

/**
 * ¿Este OUT deja una pregunta o lista abierta? (Loren …4648 — avalancha).
 * Lista interactiva o texto con "?" = prompt pendiente.
 */
export function isOutboundPendingPrompt(row: {
  msg_type?: string | null;
  content?: string | null;
}): boolean {
  if ((row.msg_type ?? "").toLowerCase() === "interactive") return true;
  const content = (row.content ?? "").trim();
  return content.includes("?");
}

/**
 * True si el bot dejó pregunta/lista en los últimos ~15 s.
 * Evita que "Gracias" suelto cierre con «¡Nos vemos!» encima de un prompt
 * recién enviado (análisis 13-ago [P1], Loren …4648).
 */
export async function hasRecentOutboundPendingPrompt(
  supabase: SupabaseClient,
  phone: string,
  windowMs: number = PENDING_PROMPT_CLOSING_WINDOW_MS,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await supabase
    .from("wa_messages")
    .select("msg_type, content")
    .eq("phone", phone)
    .eq("direction", "out")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) {
    console.error("[WABA] hasRecentOutboundPendingPrompt:", error.message);
    return false;
  }
  return (data ?? []).some((row) => isOutboundPendingPrompt(row));
}

async function wasTardanzaRecentlySent(
  supabase: SupabaseClient,
  phone: string,
  windowMs: number = TARDANZA_DEBOUNCE_MS,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await supabase
    .from("wa_messages")
    .select("id")
    .eq("phone", phone)
    .eq("direction", "out")
    .gte("created_at", since)
    .or(
      "content.ilike.%hasta 10 minutos%,content.ilike.%Políticas por tardanzas%",
    )
    .limit(1);
  if (error) {
    console.error("[WABA] wasTardanzaRecentlySent:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

const REMINDER_TEXT_CONFIRM_WINDOW_MS = 24 * 60 * 60_000;

export async function wasAppointmentReminderRecentlySent(
  supabase: SupabaseClient,
  phone: string,
  windowMs: number = REMINDER_TEXT_CONFIRM_WINDOW_MS,
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
    console.error("[WABA] wasAppointmentReminderRecentlySent:", error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/** Solo hora ("10:30 am") de `appointments.date` (hora Lima literal), para cierres cortos. */
export function formatHourOnlyLima(dateStr: string): string {
  const dt = parseLimaLocalToDate(dateStr);
  if (!dt) return "";
  const { hour, minute, dayPeriod } = timePartsLima(dt);
  const cleanDayPeriod = dayPeriod.replace(/\./g, "").replace(/\s+/g, "");
  return hour && minute ? `${hour}:${minute} ${cleanDayPeriod}` : "";
}

async function claimTardanzaSend(
  supabase: SupabaseClient,
  phone: string,
): Promise<boolean> {
  const { data, error } = await supabase.rpc("waba_claim_action_debounce", {
    p_phone: phone,
    p_kind: TARDANZA_DEBOUNCE_KIND,
    p_window_seconds: Math.floor(TARDANZA_DEBOUNCE_MS / 1000),
    p_tenant_id: getRequestTenantId(),
  });
  if (error) {
    console.error("[WABA] claimTardanzaSend RPC:", error.message);
    // Degradado: si el RPC atómico (PK phone+kind en wa_action_debounce)
    // falla, este chequeo por contenido en wa_messages NO es atómico —
    // dos webhooks concurrentes de "voy tarde" podrían pasar ambos antes
    // de que cualquiera persista su mensaje. Riesgo aceptado: solo aplica
    // mientras el RPC esté fallando (caso raro, ya degradado de por sí).
    return !(await wasTardanzaRecentlySent(supabase, phone));
  }
  return data === true;
}

export async function sendTardanzaPolicy(opts: {
  supabase: SupabaseClient;
  phone: string;
  text: string;
  imageUrl: string;
  sendMessage: (to: string, body: string) => Promise<unknown>;
  sendImage: (to: string, url: string, caption?: string) => Promise<unknown>;
}): Promise<"sent" | "debounced"> {
  if (!(await claimTardanzaSend(opts.supabase, opts.phone))) {
    return "debounced";
  }
  await opts.sendMessage(opts.phone, opts.text);
  await opts.sendImage(
    opts.phone,
    opts.imageUrl,
    "Políticas por tardanzas - ZM Lash & Nails Beauty",
  );
  return "sent";
}
