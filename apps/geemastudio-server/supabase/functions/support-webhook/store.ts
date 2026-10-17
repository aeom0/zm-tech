// store.ts — support_messages y support_tickets (service role; RLS cerrada).
//
// Dedupe por wamid UNIQUE y ráfagas por "último mensaje gana": cada webhook
// espera unos segundos y solo responde si su mensaje sigue siendo el último
// entrante del teléfono. No se reutiliza inbound-gate.ts de whatsapp-webhook:
// está atado a wa_messages, wa_action_debounce y al tenant del salón.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AgentMessage } from "../_shared/agent/anthropic.ts";

export const SUPPORT_PRODUCT = "geemastudio";
const HISTORY_LIMIT = 30;
const HISTORY_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Un escalamiento repetido en esta ventana actualiza el ticket abierto. */
const TICKET_DEDUPE_MS = 30 * 60 * 1000;

export function getSupportSupabase(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export interface SupportMessageRow {
  id: number;
  direction: "in" | "out";
  body: string;
  created_at: string;
}

/** Inserta el entrante. Devuelve su id, o null si el wamid ya existía. */
export async function insertInbound(
  supabase: SupabaseClient,
  opts: { phone: string; wamid: string | null; msgType: string; body: string },
): Promise<number | null> {
  const { data, error } = await supabase
    .from("support_messages")
    .insert({
      product: SUPPORT_PRODUCT,
      phone: opts.phone,
      direction: "in",
      msg_type: opts.msgType,
      body: opts.body,
      wamid: opts.wamid,
    })
    .select("id")
    .single();
  if (error) {
    if (error.code === "23505") return null;
    throw new Error(`support_messages insert: ${error.message}`);
  }
  return Number(data.id);
}

/** True si llegó otro entrante del mismo teléfono después de `inboundId`. */
export async function hasNewerInbound(
  supabase: SupabaseClient,
  phone: string,
  inboundId: number,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("support_messages")
    .select("id")
    .eq("product", SUPPORT_PRODUCT)
    .eq("phone", phone)
    .eq("direction", "in")
    .gt("id", inboundId)
    .limit(1);
  if (error) {
    console.warn("[SUPPORT] hasNewerInbound:", error.message);
    return false;
  }
  return (data ?? []).length > 0;
}

export async function loadHistory(
  supabase: SupabaseClient,
  phone: string,
): Promise<SupportMessageRow[]> {
  const since = new Date(Date.now() - HISTORY_MAX_AGE_MS).toISOString();
  const { data, error } = await supabase
    .from("support_messages")
    .select("id, direction, body, created_at")
    .eq("product", SUPPORT_PRODUCT)
    .eq("phone", phone)
    .gte("created_at", since)
    .order("id", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (error) throw new Error(`support_messages history: ${error.message}`);
  return ((data ?? []) as SupportMessageRow[]).reverse();
}

/**
 * Historial → mensajes de la API: une entrantes/salientes consecutivos en un
 * solo turno y arranca siempre en un turno del usuario.
 */
export function historyToMessages(rows: SupportMessageRow[]): AgentMessage[] {
  const out: { role: "user" | "assistant"; parts: string[] }[] = [];
  for (const row of rows) {
    const role = row.direction === "in" ? "user" : "assistant";
    const text = row.body.trim();
    if (!text) continue;
    if (out.length === 0 && role === "assistant") continue;
    const last = out[out.length - 1];
    if (last && last.role === role) last.parts.push(text);
    else out.push({ role, parts: [text] });
  }
  return out.map((m) => ({ role: m.role, content: m.parts.join("\n") }));
}

export async function logOutbound(
  supabase: SupabaseClient,
  opts: {
    phone: string;
    body: string;
    wamid: string | null;
    inputTokens?: number;
    outputTokens?: number;
  },
): Promise<void> {
  const { error } = await supabase.from("support_messages").insert({
    product: SUPPORT_PRODUCT,
    phone: opts.phone,
    direction: "out",
    body: opts.body,
    wamid: opts.wamid,
    input_tokens: opts.inputTokens ?? null,
    output_tokens: opts.outputTokens ?? null,
  });
  if (error) console.warn("[SUPPORT] logOutbound:", error.message);
}

/** Respuestas enviadas al teléfono en la última hora (tope anti-abuso). */
export async function countRecentReplies(
  supabase: SupabaseClient,
  phone: string,
): Promise<number> {
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("support_messages")
    .select("id", { count: "exact", head: true })
    .eq("product", SUPPORT_PRODUCT)
    .eq("phone", phone)
    .eq("direction", "out")
    .gte("created_at", since);
  if (error) return 0; // fail-open
  return count ?? 0;
}

/**
 * Crea el ticket o, si el mismo teléfono escaló hace poco y sigue abierto,
 * actualiza ese (evita duplicados por ráfagas o reintentos).
 */
export async function upsertTicket(
  supabase: SupabaseClient,
  opts: {
    phone: string;
    contactName: string | null;
    summary: string;
    diagnosis: Record<string, unknown>;
  },
): Promise<{ id: number; reused: boolean }> {
  const since = new Date(Date.now() - TICKET_DEDUPE_MS).toISOString();
  const { data: open } = await supabase
    .from("support_tickets")
    .select("id")
    .eq("product", SUPPORT_PRODUCT)
    .eq("contact_phone", opts.phone)
    .neq("status", "resolved")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (open) {
    const { error } = await supabase
      .from("support_tickets")
      .update({ summary: opts.summary, diagnosis: opts.diagnosis })
      .eq("id", open.id);
    if (error) throw new Error(`support_tickets update: ${error.message}`);
    return { id: Number(open.id), reused: true };
  }
  const { data, error } = await supabase
    .from("support_tickets")
    .insert({
      product: SUPPORT_PRODUCT,
      contact_phone: opts.phone,
      contact_name: opts.contactName,
      summary: opts.summary,
      diagnosis: opts.diagnosis,
    })
    .select("id")
    .single();
  if (error) throw new Error(`support_tickets insert: ${error.message}`);
  return { id: Number(data.id), reused: false };
}
