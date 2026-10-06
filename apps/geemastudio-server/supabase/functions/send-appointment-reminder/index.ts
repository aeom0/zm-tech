// send-appointment-reminder — Envía plantilla WABA `recordatorio_cita_zm` a un cliente.
// No tiene lógica de negocio: recibe los datos ya formateados y llama a la API de Meta.
// Deploy: SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) supabase functions deploy send-appointment-reminder --project-ref udelxwwnyivknslueerr --no-verify-jwt

import { createClient } from "@supabase/supabase-js";
import { formatAppointmentDateForClient } from "../_shared/lima-datetime.ts";
import {
  formatTemplateLogContent,
  logWaOutboundMessage,
} from "../_shared/wa-outbound-log.ts";
import { isWaSendableDest } from "../_shared/wa-recipient.mjs";
import { DEFAULT_TENANT_ID } from "../whatsapp-webhook/lib/tenant.ts";
import {
  getActiveWabaTenants,
  getTenantWabaCredentials,
  sendWhatsAppMessage,
  type TenantWabaCredentials,
} from "../_shared/tenant-waba.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const TEMPLATE_NAME = "recordatorio_cita_zm";

interface ReminderPayload {
  phone: string; // "51932535512" (con código de país, sin +)
  tenantId?: string;
  clientName: string; // Se extrae solo el primer nombre
  /** ISO UTC o appointments.date (hora Lima literal, sin tz). */
  appointmentDate: string;
  services: string; // "Extensiones Clásicas + Diseño de Cejas"
}

async function sendReminderTemplate(
  creds: TenantWabaCredentials,
  phone: string,
  firstName: string,
  dateFormatted: string,
  services: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!isWaSendableDest(phone)) {
    return { ok: false, error: "invalid_wa_dest" };
  }

  let res: Response;
  try {
    res = await sendWhatsAppMessage(creds, phone, {
      type: "template",
      template: {
        name: "recordatorio_cita_zm",
        language: { code: "es_PE" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: firstName },
              { type: "text", text: dateFormatted },
              { type: "text", text: services },
            ],
          },
        ],
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[send-appointment-reminder] Meta no respondió:", errMsg);
    return { ok: false, error: errMsg };
  }

  let raw = "";
  try {
    raw = await res.text();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[send-appointment-reminder] Body de Meta ilegible:", errMsg);
    return { ok: false, error: errMsg };
  }

  let data: { error?: unknown; messages?: { id: string }[] } = {};
  if (raw) {
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      console.error(
        "[send-appointment-reminder] JSON inválido:",
        raw.slice(0, 300),
      );
      return { ok: false, error: raw.slice(0, 300) };
    }
  }
  if (!res.ok || data.error) {
    const errMsg = JSON.stringify(data.error ?? data);
    console.error("[send-appointment-reminder] Error API Meta:", errMsg);
    return { ok: false, error: errMsg };
  }

  return { ok: true, messageId: data.messages?.[0]?.id };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: ReminderPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request: invalid JSON", { status: 400 });
  }

  const {
    phone,
    tenantId: tenantIdInput,
    clientName,
    appointmentDate,
    services,
  } = payload;

  if (!phone || !clientName || !appointmentDate || !services) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          "Faltan campos requeridos: phone, clientName, appointmentDate, services",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const tenantId = tenantIdInput?.trim() || DEFAULT_TENANT_ID;
  const activeTenants = await getActiveWabaTenants(supabase);
  const tenant = activeTenants.find((t) => t.tenantId === tenantId);
  if (!tenant) {
    return new Response(
      JSON.stringify({ success: false, error: "tenant_waba_inactive" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  const creds = await getTenantWabaCredentials(supabase, tenant);
  if (!creds) {
    return new Response(
      JSON.stringify({ success: false, error: "no_waba_credentials" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }

  const firstName = clientName.trim().split(/\s+/)[0];
  const dateFormatted = formatAppointmentDateForClient(appointmentDate);
  if (!dateFormatted) {
    console.error(
      "[send-appointment-reminder] appointmentDate inválido:",
      appointmentDate,
    );
    return new Response(
      JSON.stringify({ success: false, error: "appointmentDate inválido" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  console.log(
    `[send-appointment-reminder] Enviando a ${phone} (${firstName}) — ${dateFormatted} — ${services}`,
  );

  const result = await sendReminderTemplate(
    creds,
    phone,
    firstName,
    dateFormatted,
    services,
  );

  if (!result.ok) {
    return new Response(
      JSON.stringify({ success: false, error: result.error }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  await logWaOutboundMessage(supabase, {
    phone,
    tenantId: creds.tenantId,
    msgType: "template",
    content: formatTemplateLogContent(TEMPLATE_NAME, [
      firstName,
      dateFormatted,
      services,
    ]),
    wamid: result.messageId ?? null,
  });

  return new Response(
    JSON.stringify({ success: true, messageId: result.messageId }),
    { headers: { "Content-Type": "application/json" } },
  );
});
