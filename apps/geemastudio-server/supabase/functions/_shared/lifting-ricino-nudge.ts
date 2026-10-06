/**
 * Tip cuidados aceite de ricino ~día 10 post-lifting (cuidado en casa, no servicio).
 * Plantilla Meta: lifting_cuidados_ricino_zm (MARKETING, PENDING Meta) — tip ~día 10.
 * No toca retouch_offer_sent_at (evita bloquear Botox @30d por cooldown).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  LIFTING_RICINO_MAX_DAYS,
  LIFTING_RICINO_MIN_DAYS,
  LIFTING_RICINO_TEMPLATE_LANG,
  LIFTING_RICINO_TEMPLATE_NAME,
  isLashBotoxServiceName,
  isLiftingServiceName,
  type RetouchServiceRow,
} from "./retouch-resolve.ts";
import {
  formatTemplateLogContent,
  logWaOutboundMessage,
} from "./wa-outbound-log.ts";
import { isWaBsuid, isWaSendableDest } from "./wa-recipient.mjs";
import { limaNowTimestamp } from "./lima-datetime.ts";
import { normalizeWaPhonePe } from "./retoque-offer.ts";
import {
  sendWhatsAppMessage,
  type TenantWabaCredentials,
} from "./tenant-waba.ts";

export interface SendLiftingRicinoNudgeResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  phone?: string;
  appointmentId?: string;
  messageId?: string;
  error?: string;
}

type Sb = SupabaseClient;

function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.floor((b - a) / (1000 * 60 * 60 * 24));
}

async function sendRicinoTemplate(
  creds: TenantWabaCredentials,
  phone: string,
  firstName: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!isWaSendableDest(phone)) {
    return { ok: false, error: "invalid_wa_dest" };
  }

  const res = await sendWhatsAppMessage(creds, phone, {
    type: "template",
    template: {
      name: LIFTING_RICINO_TEMPLATE_NAME,
      language: { code: LIFTING_RICINO_TEMPLATE_LANG },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: firstName || "hola" }],
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
 * Si la última completed del client es lifting (no botox) y está en ventana 10–14d,
 * envía tip ricino y marca appointments.lifting_ricino_nudge_sent_at.
 */
export async function sendLiftingRicinoNudgeForClient(
  supabase: Sb,
  clientId: string,
  tenantId: string,
  creds: TenantWabaCredentials,
): Promise<SendLiftingRicinoNudgeResult> {
  const now = new Date();

  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("id, name, phone, phone_country, phone_normalized, wa_user_id")
    .eq("id", clientId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (clientErr || !client) {
    return { ok: false, skipped: true, reason: "client_missing" };
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

  const { data: lastApt } = await supabase
    .from("appointments")
    .select("id, date, lifting_ricino_nudge_sent_at")
    .eq("client_id", clientId)
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!lastApt) {
    return { ok: false, skipped: true, reason: "no_completed", phone };
  }
  if (lastApt.lifting_ricino_nudge_sent_at) {
    return {
      ok: false,
      skipped: true,
      reason: "already_sent",
      phone,
      appointmentId: lastApt.id,
    };
  }

  const { data: lines } = await supabase
    .from("appointment_services")
    .select("service_id")
    .eq("appointment_id", lastApt.id)
    .eq("tenant_id", tenantId);

  const lastServiceId: string | null =
    (lines?.[0] as { service_id?: string } | undefined)?.service_id ?? null;
  if (!lastServiceId) {
    return { ok: false, skipped: true, reason: "no_service", phone };
  }

  const { data: svcRow } = await supabase
    .from("services")
    .select("id, name, category_id, price, is_active")
    .eq("id", lastServiceId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const lastSvc = svcRow as RetouchServiceRow | null;
  if (!lastSvc) {
    return { ok: false, skipped: true, reason: "service_missing", phone };
  }
  if (
    !isLiftingServiceName(lastSvc.name) ||
    isLashBotoxServiceName(lastSvc.name)
  ) {
    return { ok: false, skipped: true, reason: "not_lifting", phone };
  }

  const aptDate = new Date(String(lastApt.date).replace(" ", "T"));
  const daysSince = daysBetween(aptDate, now);
  if (
    daysSince < LIFTING_RICINO_MIN_DAYS ||
    daysSince > LIFTING_RICINO_MAX_DAYS
  ) {
    return {
      ok: false,
      skipped: true,
      reason: `out_of_window_${daysSince}`,
      phone,
      appointmentId: lastApt.id,
    };
  }

  const firstName =
    String(client.name ?? "")
      .trim()
      .split(/\s+/)[0] || "hola";

  const sent = await sendRicinoTemplate(creds, phone, firstName);
  if (!sent.ok) {
    return {
      ok: false,
      phone,
      appointmentId: lastApt.id,
      error: sent.error,
    };
  }

  await supabase
    .from("appointments")
    .update({ lifting_ricino_nudge_sent_at: now.toISOString() })
    .eq("id", lastApt.id)
    .eq("tenant_id", tenantId);

  await logWaOutboundMessage(supabase, {
    phone,
    tenantId,
    msgType: "template",
    content: formatTemplateLogContent(LIFTING_RICINO_TEMPLATE_NAME, [
      firstName,
      "cuidados ricino",
    ]),
    stepBefore: "browsing",
    wamid: sent.messageId ?? null,
  });

  return {
    ok: true,
    phone,
    appointmentId: lastApt.id,
    messageId: sent.messageId,
  };
}
