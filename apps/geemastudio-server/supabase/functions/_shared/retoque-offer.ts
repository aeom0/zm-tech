/**
 * Envío de plantilla retoque_reenganche_zm + persistencia de oferta en sesión.
 * Usado por send-retouch-reengage (manual) y retouch-reminders (cron).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  RETOUCH_COOLDOWN_DAYS,
  RETOUCH_TEMPLATE_LANG,
  RETOUCH_TEMPLATE_NAME,
  formatDaysSincePhrase,
  intervalDaysForService,
  resolveRetouchServiceId,
  type RetouchServiceRow,
} from "./retouch-resolve.ts";
import {
  formatTemplateLogContent,
  logWaOutboundMessage,
} from "./wa-outbound-log.ts";
import { isWaBsuid, isWaSendableDest } from "./wa-recipient.mjs";
import { limaNowTimestamp } from "./lima-datetime.ts";
import {
  sendWhatsAppMessage,
  type TenantWabaCredentials,
} from "./tenant-waba.ts";

export type RetouchOfferSource = "cron" | "manual";

export interface SendRetouchOfferResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  phone?: string;
  serviceId?: string;
  serviceName?: string;
  messageId?: string;
  error?: string;
}

type Sb = SupabaseClient;

function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Normaliza a E.164 PE sin +: 51XXXXXXXXX */
export function normalizeWaPhonePe(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const d = digitsOnly(raw);
  if (d.startsWith("51") && d.length === 11) return d;
  if (d.length === 9) return `51${d}`;
  if (d.length >= 10 && d.length <= 13) return d;
  return null;
}

function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

async function sendTemplate(
  creds: TenantWabaCredentials,
  phone: string,
  firstName: string,
  serviceName: string,
  daysPhrase: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!isWaSendableDest(phone)) {
    return { ok: false, error: "invalid_wa_dest" };
  }

  const res = await sendWhatsAppMessage(creds, phone, {
    type: "template",
    template: {
      name: RETOUCH_TEMPLATE_NAME,
      language: { code: RETOUCH_TEMPLATE_LANG },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: firstName || "hola" },
            { type: "text", text: serviceName.slice(0, 60) || "servicio" },
            { type: "text", text: daysPhrase.slice(0, 40) || "un tiempo" },
          ],
        },
      ],
    },
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    return { ok: false, error: JSON.stringify(data.error ?? data) };
  }
  const messageId = (data.messages as { id: string }[] | undefined)?.[0]?.id;
  return { ok: true, messageId };
}

/**
 * Prepara oferta 1B y envía plantilla para un client_id.
 * Respeta cooldown, cita scheduled futura y intervalo por categoría.
 */
export async function sendRetouchOfferForClient(
  supabase: Sb,
  clientId: string,
  source: RetouchOfferSource,
  tenantId: string,
  creds: TenantWabaCredentials,
  opts?: { bypassCooldown?: boolean; bypassInterval?: boolean },
): Promise<SendRetouchOfferResult> {
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, name, phone, phone_country, phone_normalized, wa_user_id")
    .eq("id", clientId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (clientErr || !client) {
    return { ok: false, reason: "client_not_found", skipped: true };
  }

  const phone =
    normalizeWaPhonePe(
      client.phone_country === "PE" && client.phone_normalized
        ? `51${client.phone_normalized}`
        : client.phone,
    ) ??
    normalizeWaPhonePe(client.phone) ??
    (typeof client.wa_user_id === "string" && isWaBsuid(client.wa_user_id)
      ? client.wa_user_id
      : null);

  if (!phone) {
    return { ok: false, skipped: true, reason: "no_phone" };
  }

  // Baja de marketing (STOP): fail-closed, si no se puede leer la lista no se envía.
  const { data: optOutRow, error: optOutErr } = await supabase
    .from("waba_config")
    .select("config_value")
    .eq("tenant_id", tenantId)
    .eq("config_key", "marketing_opt_out")
    .eq("is_active", true)
    .maybeSingle();
  if (optOutErr) {
    return { ok: false, skipped: true, reason: "opt_out_check_failed", phone };
  }
  const optOutPhones = (optOutRow?.config_value as { phones?: unknown } | null)
    ?.phones;
  if (Array.isArray(optOutPhones) && optOutPhones.includes(phone)) {
    return { ok: false, skipped: true, reason: "marketing_opt_out", phone };
  }

  const now = new Date();

  // Cita futura scheduled → no molestar. `date` es hora Lima literal: comparar
  // con Lima, no con UTC (margen 2 h para citas en curso).
  const { data: upcoming } = await supabase
    .from("appointments")
    .select("id")
    .eq("client_id", clientId)
    .eq("tenant_id", tenantId)
    .eq("status", "scheduled")
    .gte("date", limaNowTimestamp(2))
    .limit(1);

  if (upcoming && upcoming.length > 0) {
    return { ok: false, skipped: true, reason: "has_scheduled", phone };
  }

  // Cooldown por sesión
  const { data: session } = await supabase
    .from("whatsapp_sessions")
    .select("retouch_offer_sent_at")
    .eq("phone", phone)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (!opts?.bypassCooldown && session?.retouch_offer_sent_at) {
    const sentAt = new Date(session.retouch_offer_sent_at);
    const cooldownMs = RETOUCH_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
    if (now.getTime() - sentAt.getTime() < cooldownMs) {
      return { ok: false, skipped: true, reason: "cooldown", phone };
    }
  }

  // Última cita completed
  const { data: lastApt } = await supabase
    .from("appointments")
    .select("id, date, service_id, service_ids")
    .eq("client_id", clientId)
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastApt) {
    return { ok: false, skipped: true, reason: "no_completed", phone };
  }

  const { data: lines } = await supabase
    .from("appointment_services")
    .select("service_id")
    .eq("appointment_id", lastApt.id)
    .eq("tenant_id", tenantId);

  let lastServiceId: string | null =
    (lines?.[0] as { service_id?: string } | undefined)?.service_id ?? null;
  if (!lastServiceId) {
    const ids = lastApt.service_ids as string[] | null;
    lastServiceId =
      (Array.isArray(ids) && ids[0]) ||
      (lastApt.service_id as string | null) ||
      null;
  }
  if (!lastServiceId) {
    return { ok: false, skipped: true, reason: "no_service", phone };
  }

  const { data: servicesRaw } = await supabase
    .from("services")
    .select("id, name, category_id, price, is_active")
    .eq("tenant_id", tenantId);

  const catalog = (servicesRaw ?? []) as RetouchServiceRow[];
  const lastSvc = catalog.find((s) => s.id === lastServiceId);
  if (!lastSvc) {
    return { ok: false, skipped: true, reason: "service_missing", phone };
  }

  const aptDate = new Date(String(lastApt.date).replace(" ", "T"));
  const daysSince = daysBetween(aptDate, now);
  const interval = intervalDaysForService(lastSvc);
  if (!opts?.bypassInterval && daysSince < interval) {
    return {
      ok: false,
      skipped: true,
      reason: `too_soon_${daysSince}_lt_${interval}`,
      phone,
    };
  }

  const offerId = resolveRetouchServiceId(lastSvc, catalog);
  const offerSvc = catalog.find((s) => s.id === offerId) ?? lastSvc;
  if (offerSvc.is_active === false) {
    return { ok: false, skipped: true, reason: "service_inactive", phone };
  }
  const firstName =
    String(client.name ?? "")
      .trim()
      .split(/\s+/)[0] || "hola";
  const daysPhrase = formatDaysSincePhrase(daysSince);

  const sent = await sendTemplate(
    creds,
    phone,
    firstName,
    offerSvc.name,
    daysPhrase,
  );
  if (!sent.ok) {
    return {
      ok: false,
      phone,
      serviceId: offerId,
      serviceName: offerSvc.name,
      error: sent.error,
    };
  }

  await supabase.from("whatsapp_sessions").upsert(
    {
      phone,
      tenant_id: tenantId,
      cart_items: "[]",
      cart_service_ids: "[]",
      employee_assignments: "{}",
      step: "browsing",
      selected_day: null,
      parsed_datetime: null,
      retouch_offer_service_id: offerId,
      retouch_offer_source: source,
      retouch_offer_sent_at: now.toISOString(),
      retouch_offer_last_appointment_id: lastApt.id,
      updated_at: now.toISOString(),
    },
    { onConflict: "tenant_id,phone" },
  );

  // Log outbound — await obligatorio (void se pierde al cerrar la función)
  await logWaOutboundMessage(supabase, {
    phone,
    tenantId,
    msgType: "template",
    content: formatTemplateLogContent(RETOUCH_TEMPLATE_NAME, [
      firstName,
      offerSvc.name,
      daysPhrase,
    ]),
    stepBefore: "browsing",
    wamid: sent.messageId ?? null,
  });

  return {
    ok: true,
    phone,
    serviceId: offerId,
    serviceName: offerSvc.name,
    messageId: sent.messageId,
  };
}
