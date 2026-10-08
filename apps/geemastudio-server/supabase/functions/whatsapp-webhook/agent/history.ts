// history.ts — Historial de chat para el agente (wa_messages → mensajes Messages API)

import type { SupabaseClient } from "../lib/supabase.ts";
import type { AgentMessage } from "./anthropic.ts";
import { templateLogToHistoryText } from "../lib/template-history.ts";

const HISTORY_LIMIT = 12;
const HISTORY_WINDOW_MS = 6 * 60 * 60 * 1000;
const EPISODE_GAP_MS = 2 * 60 * 60 * 1000;
const STAFF_OUT_SOURCES = new Set(["panel", "staff_app"]);

type Row = {
  direction: string;
  msg_type: string;
  content: string | null;
  created_at: string | null;
  source?: string | null;
};

/** Filas (más nuevas primero) → mensajes en orden cronológico, sin el turno actual. */
export function buildAgentHistory(
  rowsNewestFirst: Row[],
  currentText: string,
): { messages: AgentMessage[]; staffOutInHistory: boolean } {
  const rows: Row[] = [];
  const chrono = [...rowsNewestFirst].reverse();
  for (let i = 0; i < chrono.length; i++) {
    if (i > 0) {
      const prev = Date.parse(String(chrono[i - 1].created_at ?? ""));
      const cur = Date.parse(String(chrono[i].created_at ?? ""));
      if (
        Number.isFinite(prev) && Number.isFinite(cur) &&
        cur - prev > EPISODE_GAP_MS
      ) {
        rows.length = 0;
      }
    }
    rows.push(chrono[i]);
  }
  // El último inbound es el mensaje actual (ya registrado por el logger).
  const last = rows[rows.length - 1];
  if (last && last.direction === "in") rows.pop();

  let staffOutInHistory = false;
  const messages: AgentMessage[] = [];
  for (const row of rows) {
    const role = row.direction === "in" ? "user" : "assistant";
    let content = String(row.content ?? "").trim();
    if (row.msg_type === "template") {
      content = templateLogToHistoryText(content);
    }
    if (!content) continue;
    if (
      role === "assistant" &&
      STAFF_OUT_SOURCES.has(String(row.source ?? "").toLowerCase())
    ) {
      staffOutInHistory = true;
      if (!/^\[equipo/i.test(content)) {
        content = `[Equipo — mensaje del staff]: ${content}`;
      }
    }
    messages.push({ role, content });
  }
  // La API exige que el primer mensaje sea del usuario.
  while (messages.length > 0 && messages[0].role !== "user") messages.shift();
  messages.push({ role: "user", content: currentText });
  return { messages, staffOutInHistory };
}

export async function loadAgentHistory(
  supabase: SupabaseClient,
  phoneNumber: string,
  currentText: string,
) {
  const { data } = await supabase
    .from("wa_messages")
    .select("direction, msg_type, content, created_at, source")
    .eq("phone", phoneNumber)
    .in("msg_type", ["text", "template"])
    .gte("created_at", new Date(Date.now() - HISTORY_WINDOW_MS).toISOString())
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  return buildAgentHistory((data ?? []) as Row[], currentText);
}
