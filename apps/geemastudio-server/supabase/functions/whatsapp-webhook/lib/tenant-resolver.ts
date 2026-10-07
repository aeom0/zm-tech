// tenant-resolver.ts — phone_number_id → tenant_id (Plan 05 S3 / tenant_waba_numbers)

import type { SupabaseClient } from "./supabase.ts";
import { DEFAULT_TENANT_ID } from "./tenant.ts";
import { cachedLoad } from "./ttl-cache.ts";

const ROUTING_FLAG_KEY = "waba_tenant_routing_enabled";

/** El número del salón no cambia en el día. Mismo lapso que las reglas del tenant. */
export const TENANT_ROUTE_TTL_MS = 5 * 60 * 1000;

const routeCache = new Map<string, { value: string; at: number }>();
const routeInflight = new Map<string, Promise<string>>();

/** Extrae phone_number_id del payload Meta (metadata del change). */
export function extractPhoneNumberId(
  value: Record<string, unknown> | undefined,
): string | null {
  const meta = value?.metadata as Record<string, unknown> | undefined;
  const id = meta?.phone_number_id;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

async function readRoutingEnabled(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<"on" | "off" | "error"> {
  const { data, error } = await supabase
    .from("waba_config")
    .select("config_value")
    .eq("tenant_id", tenantId)
    .eq("config_key", ROUTING_FLAG_KEY)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.warn(`[WABA] isTenantRoutingEnabled(${tenantId}):`, error.message);
    return "error";
  }

  const enabled = (data?.config_value as Record<string, unknown> | undefined)
    ?.enabled;
  return enabled === true || enabled === "true" || enabled === 1 ? "on" : "off";
}

/**
 * Resuelve tenant del webhook. Con flag OFF en el tenant candidato → zm-lash-nails
 * (comportamiento legacy). Con flag ON → tenant_id de tenant_waba_numbers.
 * El resultado se reusa 5 min por número: cada status de Meta (enviado,
 * entregado, leído) pasaba por estas dos lecturas.
 */
export function resolveTenantFromPhoneNumberId(
  supabase: SupabaseClient,
  phoneNumberId: string | null,
): Promise<string> {
  if (!phoneNumberId) return Promise.resolve(DEFAULT_TENANT_ID);
  return cachedLoad(
    routeCache,
    routeInflight,
    phoneNumberId,
    TENANT_ROUTE_TTL_MS,
    () => resolveTenantFromDb(supabase, phoneNumberId),
  );
}

async function resolveTenantFromDb(
  supabase: SupabaseClient,
  phoneNumberId: string,
): Promise<{ value: string; store: boolean }> {
  const { data, error } = await supabase
    .from("tenant_waba_numbers")
    .select("tenant_id")
    .eq("phone_number_id", phoneNumberId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.warn("[WABA] resolveTenantFromPhoneNumberId:", error.message);
    return { value: DEFAULT_TENANT_ID, store: false };
  }

  const candidate = typeof data?.tenant_id === "string" && data.tenant_id.trim()
    ? data.tenant_id.trim()
    : DEFAULT_TENANT_ID;

  const routing = await readRoutingEnabled(supabase, candidate);
  if (routing === "error") {
    return { value: DEFAULT_TENANT_ID, store: false };
  }
  if (routing === "off") {
    return { value: DEFAULT_TENANT_ID, store: true };
  }

  console.log(
    `[WABA] tenant routing ON: phone_number_id=${phoneNumberId} → ${candidate}`,
  );
  return { value: candidate, store: true };
}
