// pause-auto-resume.ts — La pausa del bot (staff takeover, escalar_a_humano)
// se levanta sola cuando el equipo ya cerró el tema: la cita se marcó como
// completada después de la pausa, o pasaron 4 h sin que el equipo escriba.
// Se evalúa cuando la clienta vuelve a escribir (no envía nada por sí sola).
// La pausa por reclamo (Libro de Reclamaciones) solo la quita el equipo.
// Casos Nélida …6566 y Yovanita …4999, 14-oct-2026.

import type { SupabaseClient } from "./supabase.ts";
import { getRequestTenantId } from "./tenant.ts";
import { waConversationKey } from "./wa-recipient.mjs";

export const PAUSE_QUIET_RESUME_MS = 4 * 60 * 60 * 1000;
const STAFF_OUT_SOURCES = ["panel", "staff_app"];
const RECLAMO_MARKER = "Libro de Reclamaciones";

export type PauseResumeFacts = {
  pausedAtMs: number;
  /** Último mensaje del equipo (panel/app) desde la pausa. */
  lastStaffOutMs: number | null;
  /** Última vez que una cita de la clienta pasó a completed desde la pausa. */
  completedAtMs: number | null;
  /** La pausa vino de un reclamo. */
  reclamo: boolean;
  nowMs: number;
};

export type PauseResumeReason = "cita_completada" | "sin_equipo_4h" | null;

export function pauseResumeReason(f: PauseResumeFacts): PauseResumeReason {
  if (f.reclamo) return null;
  if (
    f.completedAtMs !== null &&
    (f.lastStaffOutMs === null || f.lastStaffOutMs <= f.completedAtMs)
  ) {
    return "cita_completada";
  }
  const quietSince = Math.max(f.pausedAtMs, f.lastStaffOutMs ?? 0);
  if (f.nowMs - quietSince >= PAUSE_QUIET_RESUME_MS) return "sin_equipo_4h";
  return null;
}

function maxMs(rows: { at?: unknown; created_at?: unknown }[] | null) {
  let best: number | null = null;
  for (const r of rows ?? []) {
    const ms = Date.parse(String(r.at ?? r.created_at ?? ""));
    if (Number.isFinite(ms) && (best === null || ms > best)) best = ms;
  }
  return best;
}

/** Levanta la pausa si corresponde. Devuelve el motivo o null si sigue pausado. */
export async function maybeAutoResumeBotPause(
  supabase: SupabaseClient,
  phone: string,
  nowMs = Date.now(),
): Promise<PauseResumeReason> {
  const key = waConversationKey(phone);
  const tenantId = getRequestTenantId();
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("bot_paused_at")
    .eq("tenant_id", tenantId)
    .eq("phone", key)
    .maybeSingle();
  const pausedAtIso = sess?.bot_paused_at as string | null | undefined;
  if (!pausedAtIso) return null;
  const pausedAtMs = Date.parse(pausedAtIso);
  if (!Number.isFinite(pausedAtMs)) return null;

  const sinceIso = new Date(pausedAtMs - 60 * 1000).toISOString();
  const { data: outs } = await supabase
    .from("wa_messages")
    .select("created_at, source, content")
    .eq("tenant_id", tenantId)
    .eq("phone", key)
    .eq("direction", "out")
    .gte("created_at", sinceIso);
  const outRows = (outs ?? []) as {
    created_at: string;
    source: string | null;
    content: string | null;
  }[];
  const reclamo = outRows.some((r) =>
    (r.content ?? "").includes(RECLAMO_MARKER)
  );
  const lastStaffOutMs = maxMs(
    outRows.filter((r) =>
      STAFF_OUT_SOURCES.includes(String(r.source ?? "").toLowerCase())
    ),
  );

  const digits = phone.replace(/\D/g, "");
  const last9 = digits.length >= 9 ? digits.slice(-9) : digits;
  let completedAtMs: number | null = null;
  if (last9) {
    const { data: appts } = await supabase
      .from("appointments")
      .select("id")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .ilike("client_phone", `%${last9}%`)
      .gte(
        "date",
        new Date(pausedAtMs - 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      );
    const ids = (appts ?? []).map((a: { id: string }) => a.id);
    if (ids.length > 0) {
      // completed_at no se llena desde el panel: el momento sale de la auditoría.
      const { data: audits } = await supabase
        .from("appointment_audit")
        .select("at")
        .in("appointment_id", ids)
        .contains("changed_fields", ["status"])
        .eq("new_row->>status", "completed")
        .gte("at", pausedAtIso);
      completedAtMs = maxMs(audits as { at: string }[] | null);
    }
  }

  const reason = pauseResumeReason({
    pausedAtMs,
    lastStaffOutMs,
    completedAtMs,
    reclamo,
    nowMs,
  });
  if (!reason) return null;

  const { error } = await supabase
    .from("whatsapp_sessions")
    .update({ bot_paused_at: null })
    .eq("tenant_id", tenantId)
    .eq("phone", key)
    .eq("bot_paused_at", pausedAtIso);
  if (error) {
    console.error("[pause-auto-resume] update:", error.message);
    return null;
  }
  console.log(`[pause-auto-resume] ${reason}: …${phone.slice(-4)}`);
  return reason;
}
