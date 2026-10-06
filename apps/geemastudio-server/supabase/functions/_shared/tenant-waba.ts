// Helper compartido: tenants WABA activos + credenciales por tenant (Vault) +
// envío WhatsApp. Sprint 4 (Plan 04 § Roadmap Sprints) — antes cada cron leía
// WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID de env global; ahora se
// resuelve por tenant desde Vault (secret `waba_token_<tenant_id>`) vía la
// función SQL `get_tenant_waba_token`.
import type { SupabaseClient } from "../whatsapp-webhook/lib/supabase.ts";
import { metaRecipientFields } from "./wa-recipient.mjs";

export interface ActiveWabaTenant {
  tenantId: string;
  phoneNumberId: string;
}

export interface TenantWabaCredentials {
  tenantId: string;
  accessToken: string;
  phoneNumberId: string;
}

/** Tenants con número WABA activo (`tenant_waba_numbers.is_active`) y tenant `status='active'`. */
export async function getActiveWabaTenants(
  supabase: SupabaseClient,
): Promise<ActiveWabaTenant[]> {
  const { data, error } = await supabase
    .from("tenant_waba_numbers")
    .select("tenant_id, phone_number_id, is_active, tenants!inner(status)")
    .eq("is_active", true)
    .eq("tenants.status", "active");

  if (error) {
    console.error(
      "[tenant-waba] getActiveWabaTenants falló:",
      error.message,
    );
    return [];
  }

  return (data ?? []).map((row) => ({
    tenantId: row.tenant_id as string,
    phoneNumberId: row.phone_number_id as string,
  }));
}

/**
 * Resuelve el token WhatsApp del tenant desde Vault. Si no hay secret
 * (tenant sin migrar todavía), retorna null — el caller debe skipear ese
 * tenant sin abortar el cron completo para los demás.
 */
export async function getTenantWabaCredentials(
  supabase: SupabaseClient,
  tenant: ActiveWabaTenant,
): Promise<TenantWabaCredentials | null> {
  const { data, error } = await supabase.rpc("get_tenant_waba_token", {
    p_tenant_id: tenant.tenantId,
  });

  if (error) {
    console.error(
      `[tenant-waba] get_tenant_waba_token falló para ${tenant.tenantId}:`,
      error.message,
    );
    return null;
  }

  if (!data) {
    console.warn(
      `[tenant-waba] sin token Vault para tenant ${tenant.tenantId} (waba_token_${tenant.tenantId}) — skip`,
    );
    return null;
  }

  let accessToken = String(data).trim();
  // Un secreto corto que no empieza por EAA no es un token de Graph. Con ese
  // valor Meta corta la conexión y el cron no puede leer el body (02-oct-2026).
  const envToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN")?.trim() ?? "";
  const envPhone = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")?.trim() ?? "";
  const vaultOk = accessToken.startsWith("EAA") && accessToken.length >= 80;
  if (!vaultOk) {
    const envOk = envToken.startsWith("EAA") && envToken.length >= 80;
    if (envOk && envPhone && envPhone === tenant.phoneNumberId) {
      console.warn(
        `[tenant-waba] token Vault de ${tenant.tenantId} no es de Meta (len ${accessToken.length}); uso WHATSAPP_ACCESS_TOKEN`,
      );
      accessToken = envToken;
    } else {
      console.error(
        `[tenant-waba] token Vault de ${tenant.tenantId} inválido (len ${accessToken.length})`,
      );
      return null;
    }
  }

  return {
    tenantId: tenant.tenantId,
    accessToken,
    phoneNumberId: tenant.phoneNumberId,
  };
}

/** POST genérico a la Graph API de WhatsApp Cloud con las credenciales del tenant. */
export function sendWhatsAppMessage(
  creds: Pick<TenantWabaCredentials, "accessToken" | "phoneNumberId">,
  to: string,
  payload: Record<string, unknown>,
): Promise<Response> {
  return fetch(
    `https://graph.facebook.com/v22.0/${creds.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        ...metaRecipientFields(to),
        ...payload,
      }),
    },
  );
}
