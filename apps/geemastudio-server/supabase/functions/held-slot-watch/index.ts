// held-slot-watch — Al crearse una cita, avisa a los carritos que esperaban abono en esa hora.
// Auth: Bearer CRON_SECRET o service_role. verify_jwt = false (lo llama pg_net).

import { getSupabase } from "../whatsapp-webhook/lib/supabase.ts";
import { initMessageLogger } from "../whatsapp-webhook/lib/message-logger.ts";
import { runWithRequestTenantId } from "../whatsapp-webhook/lib/tenant.ts";
import { scanHeldSlotsForAppointment } from "../whatsapp-webhook/handlers/held-slot-lost.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Método no permitido" }, 405);
  }

  const cronSecret = Deno.env.get("CRON_SECRET")?.trim() ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const isCron = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
  const isServiceRole =
    Boolean(serviceKey) && authHeader === `Bearer ${serviceKey}`;
  if (!isCron && !isServiceRole) {
    return json({ success: false, error: "No autorizado" }, 401);
  }

  let appointmentId = "";
  try {
    const body = (await req.json()) as { appointment_id?: unknown };
    appointmentId =
      typeof body.appointment_id === "string" ? body.appointment_id.trim() : "";
  } catch {
    return json({ success: false, error: "JSON inválido" }, 400);
  }
  if (!appointmentId) {
    return json({ success: false, error: "Falta appointment_id" }, 400);
  }

  const supabase = getSupabase();
  initMessageLogger(supabase);

  const { data: appt, error } = await supabase
    .from("appointments")
    .select("tenant_id")
    .eq("id", appointmentId)
    .maybeSingle();
  if (error) {
    console.error("[held-slot-watch]", error.message);
    return json({ success: false, error: "No se pudo leer la cita" }, 500);
  }
  const tenantId =
    ((appt as { tenant_id?: string | null } | null)?.tenant_id ?? "").trim() ||
    "zm-lash-nails";

  try {
    const result = await runWithRequestTenantId(tenantId, () =>
      scanHeldSlotsForAppointment(supabase, appointmentId),
    );
    return json({ success: true, notified: result.notified });
  } catch (err) {
    console.error(
      "[held-slot-watch]",
      err instanceof Error ? err.message : err,
    );
    return json(
      { success: false, error: "No se pudo revisar los carritos" },
      500,
    );
  }
});
