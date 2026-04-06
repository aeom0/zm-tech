// auth.ts — Validación del webhook Meta (GET verify, POST body)

import type { SupabaseClient } from "./supabase.ts";
import { resolveTenantFromPhoneNumberId } from "./tenant-resolver.ts";

export interface VerifyResult {
  ok: true;
  challenge: string;
}

/**
 * GET verify: requiere query `phone_number_id` para resolver el tenant
 * y comparar `hub.verify_token` con `tenant_settings.waba_verify_token`.
 */
export async function validateGetVerify(
  req: Request,
  supabase: SupabaseClient,
): Promise<VerifyResult | null> {
  const url = new URL(req.url);
  const phoneNumberId = url.searchParams.get("phone_number_id");
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (
    mode !== "subscribe" ||
    !token ||
    !challenge ||
    !phoneNumberId
  ) {
    return null;
  }
  const tenant = await resolveTenantFromPhoneNumberId(supabase, phoneNumberId);
  if (!tenant || token !== tenant.waba_verify_token) return null;
  return { ok: true, challenge };
}

export async function parsePostBody(
  req: Request,
): Promise<Record<string, unknown> | null> {
  if (req.method !== "POST") return null;
  try {
    const body = await req.json();
    return body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function isWhatsAppPayload(body: Record<string, unknown>): boolean {
  return body.object === "whatsapp_business_account";
}

export function extractPhoneNumberId(
  body: Record<string, unknown>,
): string | null {
  const entry = (body.entry as unknown[])?.[0] as Record<string, unknown>;
  const change = (entry?.changes as unknown[])?.[0] as Record<string, unknown>;
  const value = change?.value as Record<string, unknown>;
  const meta = value?.metadata as Record<string, unknown>;
  const id = meta?.phone_number_id;
  return typeof id === "string" ? id : null;
}
