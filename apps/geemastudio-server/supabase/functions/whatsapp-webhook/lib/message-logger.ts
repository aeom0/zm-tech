/**
 * message-logger.ts — Singleton de logging de mensajes WA en wa_messages.
 *
 * Se inicializa una vez por request desde index.ts con la instancia de Supabase.
 * Cualquier módulo (wa-api.ts, menu.ts) puede importar `logOutMessage` para
 * registrar mensajes salientes sin necesitar recibir el logger por parámetro.
 */

import type { SupabaseClient } from "./supabase.ts";

let _supabase: SupabaseClient | null = null;

/** Inicializa el logger con la instancia de Supabase del request actual. */
export function initMessageLogger(supabase: SupabaseClient): void {
  _supabase = supabase;
}

/** Origen del saliente (columna `wa_messages.source`). */
export type WaOutSource = "bot" | "panel" | "nudge" | "staff_app" | "template";

/** Mantiene viva una escritura secundaria durante el ciclo de Edge Function. */
function keepBackgroundWriteAlive(promise: Promise<unknown>): void {
  const runtime = globalThis as unknown as {
    EdgeRuntime?: { waitUntil?: (promise: Promise<unknown>) => void };
  };
  if (typeof runtime.EdgeRuntime?.waitUntil === "function") {
    runtime.EdgeRuntime.waitUntil(promise);
  } else {
    void promise;
  }
}

/**
 * Registra un mensaje saliente. El caller debe await-earlo: si el insert
 * va en background, el webhook `statuses` de Meta llega antes y deja el
 * tick colgado en `sent` (Yelitza/Virginia 16-sep).
 */
export function logOutMessage(
  phone: string,
  content: string,
  msg_type: "text" | "interactive" | "image" = "text",
  imageUrl?: string,
  source: WaOutSource = "bot",
  wamid?: string | null,
): Promise<void> {
  if (!_supabase) return Promise.resolve();
  const write = Promise.resolve(
    _supabase.from("wa_messages").insert({
      phone,
      direction: "out",
      msg_type,
      content: content.slice(0, 2000),
      step_before: null,
      source,
      ...(imageUrl ? { image_url: imageUrl } : {}),
      ...(wamid ? { wamid } : {}),
      ...(wamid
        ? {
            delivery_status: "accepted",
            delivery_status_at: new Date().toISOString(),
          }
        : {}),
    }),
  )
    .then(async ({ error }) => {
      if (!error) return;
      console.error("[WABA] wa_messages outbound insert:", error.message);
      const { error: logError } = await _supabase!.from("wa_error_log").insert({
        phone,
        step: "outbound_log",
        msg_type,
        error_message: `wa_messages outbound insert: ${error.message}`.slice(
          0,
          2000,
        ),
        context: {
          operation: "logOutMessage",
          content: content.slice(0, 500),
          source,
          wamid: wamid ?? null,
        },
        fallback_sent: false,
      });
      if (logError) {
        console.error("[WABA] outbound log error:", logError.message);
      }
    })
    .catch((error: unknown) => {
      console.error("[WABA] outbound logger failure:", error);
    });
  keepBackgroundWriteAlive(write);
  return write;
}
