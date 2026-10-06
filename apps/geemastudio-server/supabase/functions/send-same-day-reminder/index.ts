// send-same-day-reminder — Envía plantilla WABA `recordatorio_mismo_dia_zm`.
// Sin lógica de negocio: recibe datos ya formateados y llama a la API de Meta.
// Deploy: SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy send-same-day-reminder --project-ref udelxwwnyivknslueerr --no-verify-jwt

import { createClient } from "@supabase/supabase-js";
import { formatAppointmentTimeForClient } from "../_shared/lima-datetime.ts";
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
const TEMPLATE_NAME = "recordatorio_mismo_dia_zm";

interface SameDayReminderPayload {
  phone: string; // "51987654321"
  tenantId?: string;
  clientName: string; // se extrae solo el primer nombre
  /** ISO o appointments.date (hora Lima literal). */
  appointmentTime: string;
  services: string;
  /** Líneas de recomendaciones (sin header "Antes de tu cita"); Meta exige param no vacío. */
  recommendations: string;
}

/** Meta rechaza saltos de línea, tabs y más de 4 espacios seguidos en parámetros de plantilla. */
function sanitizeTemplateParam(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").replace(/ {2,}/g, " ").trim();
}

async function sendSameDayReminderTemplate(
  creds: TenantWabaCredentials,
  phone: string,
  firstName: string,
  timeFormatted: string,
  services: string,
  recommendations: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  if (!isWaSendableDest(phone)) {
    return { ok: false, error: "invalid_wa_dest" };
  }

  const safeName = sanitizeTemplateParam(firstName);
  const safeTime = sanitizeTemplateParam(timeFormatted);
  const safeServices = sanitizeTemplateParam(services);
  const safeRecs = sanitizeTemplateParam(recommendations);
  if (!safeName || !safeTime || !safeServices || !safeRecs) {
    return { ok: false, error: "parametro_vacio" };
  }

  let res: Response;
  try {
    res = await sendWhatsAppMessage(creds, phone, {
      type: "template",
      template: {
        name: "recordatorio_mismo_dia_zm",
        language: { code: "es_PE" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: safeName },
              { type: "text", text: safeServices },
              { type: "text", text: safeTime },
              { type: "text", text: safeRecs },
            ],
          },
        ],
      },
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[send-same-day-reminder] Meta no respondió:", errMsg);
    return { ok: false, error: errMsg };
  }

  let raw = "";
  try {
    raw = await res.text();
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[send-same-day-reminder] Body de Meta ilegible:", errMsg);
    return { ok: false, error: errMsg };
  }

  let data: { error?: unknown; messages?: { id: string }[] } = {};
  if (raw) {
    try {
      data = JSON.parse(raw) as typeof data;
    } catch {
      console.error("[send-same-day-reminder] JSON inválido:", raw.slice(0, 300));
      return { ok: false, error: raw.slice(0, 300) };
    }
  }
  if (!res.ok || data.error) {
    const errMsg = JSON.stringify(data.error ?? data);
    console.error("[send-same-day-reminder] Error API Meta:", errMsg);
    return { ok: false, error: errMsg };
  }

  const messageId = data.messages?.[0]?.id;
  return { ok: true, messageId };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: SameDayReminderPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad request: invalid JSON", { status: 400 });
  }

  const {
    phone,
    tenantId: tenantIdInput,
    clientName,
    appointmentTime,
    services,
    recommendations,
  } = payload;

  if (!phone || !clientName || !appointmentTime || !services) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          "Faltan campos requeridos: phone, clientName, appointmentTime, services",
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
  const timeFormatted = formatAppointmentTimeForClient(appointmentTime);
  if (!timeFormatted) {
    console.error(
      "[send-same-day-reminder] appointmentTime inválido:",
      appointmentTime,
    );
    return new Response(
      JSON.stringify({ success: false, error: "appointmentTime inválido" }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  // Meta no acepta body params vacíos; placeholder si no hay match de categoría
  const recs =
    (recommendations ?? "").trim() ||
    "Te esperamos. Si tienes dudas, escríbenos.";

  console.log(
    `[send-same-day-reminder] Enviando a ${phone} (${firstName}) — ${timeFormatted} — ${services}`,
  );

  const result = await sendSameDayReminderTemplate(
    creds,
    phone,
    firstName,
    timeFormatted,
    services,
    recs,
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
      services,
      timeFormatted,
    ]),
    wamid: result.messageId ?? null,
  });

  return new Response(
    JSON.stringify({ success: true, messageId: result.messageId }),
    { headers: { "Content-Type": "application/json" } },
  );
});
