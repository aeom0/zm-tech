/**
 * waba-account-events.ts — Webhooks Meta de cuenta/número (no mensajes).
 *
 * Campos: phone_number_name_update | phone_number_quality_update | account_update.
 * Solo valida + persiste en `waba_account_event_log` (auditoría display name /
 * calidad / cuenta). No mezcla lógica con el dispatcher.
 */

import type { SupabaseClient } from "../lib/supabase.ts";

const ACCOUNT_EVENT_FIELDS = new Set([
  "phone_number_name_update",
  "phone_number_quality_update",
  "account_update",
]);

export function isWabaAccountEventField(field: unknown): boolean {
  return typeof field === "string" && ACCOUNT_EVENT_FIELDS.has(field);
}

/**
 * Persiste el evento. Retorna true si se insertó.
 * Nunca lanza: falla → log consola.
 */
export async function handleWabaAccountEvent(
  supabase: SupabaseClient,
  opts: {
    tenantId: string;
    field: string;
    value: Record<string, unknown> | null | undefined;
    phoneNumberId?: string | null;
    wabaId?: string | null;
  },
): Promise<boolean> {
  try {
    if (!isWabaAccountEventField(opts.field)) return false;

    const value = opts.value && typeof opts.value === "object"
      ? opts.value
      : {};
    const meta = value.metadata as Record<string, unknown> | undefined;
    const fromMeta = typeof meta?.phone_number_id === "string"
      ? meta.phone_number_id
      : null;
    const fromValue = typeof value.phone_number_id === "string"
      ? value.phone_number_id
      : null;

    const { error } = await supabase.from("waba_account_event_log").insert({
      tenant_id: opts.tenantId || "zm-lash-nails",
      phone_number_id: opts.phoneNumberId || fromMeta || fromValue,
      waba_id: opts.wabaId ?? null,
      field: opts.field,
      payload: value,
    });

    if (error) {
      console.error(
        "[WABA] waba_account_event_log insert:",
        error.message,
        opts.field,
      );
      return false;
    }

    console.log(
      `[WABA] account event persisted field=${opts.field} phone_number_id=${
        opts.phoneNumberId || fromMeta || fromValue || "?"
      }`,
    );
    return true;
  } catch (e) {
    console.error("[WABA] handleWabaAccountEvent:", e);
    return false;
  }
}
