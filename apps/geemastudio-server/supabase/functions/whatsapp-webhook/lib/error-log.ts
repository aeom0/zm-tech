// error-log.ts — Persistencia de errores no recuperados del webhook (wa_error_log).
// Retención 7 días vía cron.schedule (ver scripts/db/add-wa-error-log.sql).
// Tras INSERT exitoso avisa a owner/dev (push FCM, debounce 10 min).
// Nunca debe tirar: si falla el INSERT/push, solo se loguea a consola.

import type { SupabaseClient } from "./supabase.ts";
import { notifyAdminsWaError } from "./notify.ts";

export async function logWaError(
  supabase: SupabaseClient,
  params: {
    phone?: string | null;
    step?: string | null;
    msgType?: string | null;
    error: unknown;
    context?: Record<string, unknown>;
    fallbackSent: boolean;
  },
): Promise<void> {
  try {
    const err = params.error;
    // Los errores de PostgREST son objetos planos ({ message, code, details, hint }),
    // no `Error`: String(err) daba "[object Object]" y ocultaba la causa real.
    const message =
      err instanceof Error
        ? err.message
        : err && typeof err === "object"
          ? JSON.stringify(err)
          : String(err);
    const stack = err instanceof Error ? (err.stack ?? null) : null;

    const { error: insertErr } = await supabase.from("wa_error_log").insert({
      phone: params.phone ?? null,
      step: params.step ?? null,
      msg_type: params.msgType ?? null,
      error_message: message.slice(0, 2000),
      error_stack: stack?.slice(0, 4000) ?? null,
      context: params.context ?? null,
      fallback_sent: params.fallbackSent,
    });

    if (insertErr) {
      console.error("[WABA] wa_error_log insert:", insertErr.message);
      return;
    }

    // Fire-and-forget: no bloquear el webhook por FCM.
    void notifyAdminsWaError(supabase, {
      phone: params.phone,
      errorMessage: message,
      fallbackSent: params.fallbackSent,
      context: params.context ?? null,
    });
  } catch (logErr) {
    console.error("[WABA] No se pudo registrar en wa_error_log:", logErr);
  }
}
