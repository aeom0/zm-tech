// same-day-appointment-reminder — Cron cada 15 min.
// Citas scheduled sin same_day_reminder_sent_at cuya hora Lima ya entró en el
// horizonte de 3 h (y hasta 2 min después de empezar, por el desfase del tick).
// Si Meta corta la conexión, el siguiente tick reintenta: el flag solo se marca
// cuando el envío responde ok. Caso Angelly/Carolina 02-oct-2026.
// Llama a send-same-day-reminder con recomendaciones por categoría.
// Deploy: SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy same-day-appointment-reminder --project-ref udelxwwnyivknslueerr --no-verify-jwt
// Cron: */15 * * * * (ver scripts/db/add-same-day-reminder.sql)

import { createClient } from "@supabase/supabase-js";
import { getConsideracionesPreviasWhatsApp } from "../whatsapp-webhook/lib/policies.ts";
import { isWaBsuid, isWaSendableDest } from "../_shared/wa-recipient.mjs";
import { limaNowAsUtcShiftedDate } from "../_shared/lima-datetime.ts";
import { runWithRequestTenantId } from "../whatsapp-webhook/lib/tenant.ts";
import { getActiveWabaTenants } from "../_shared/tenant-waba.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const SEND_URL = `${SUPABASE_URL}/functions/v1/send-same-day-reminder`;

const HORIZON_HOURS = 3;
const HORIZON_SLACK_MINUTES = 15;
/** El tick puede caer segundos después de la hora; sin esto la cita queda fuera. */
const LOOKBACK_MINUTES = 2;

/** Destino Cloud API: E.164 o BSUID (PE.…). */
function resolveWaDest(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (isWaBsuid(s)) return s;

  const digits = s.replace(/\D/g, "");
  if (!digits) return null;

  if (digits.startsWith("51") && digits.length === 11) return digits;
  if (digits.startsWith("58") && digits.length >= 12) return digits;
  if (digits.startsWith("1") && digits.length === 11) return digits;

  const twoDigitCc = ["54", "56", "57", "52", "55", "34", "33", "44", "49"];
  for (const cc of twoDigitCc) {
    if (digits.startsWith(cc) && digits.length > cc.length + 6) return digits;
  }

  // Móvil Perú sin prefijo 51 (9 dígitos, empieza en 9) — chequear ANTES del
  // fallback genérico isWaSendableDest de abajo, que aceptaría "986397385"
  // tal cual por caer en su rango laxo de 8-15 dígitos y rompería el hilo
  // WABA de la clienta con un phone key distinto al resto de sus mensajes
  // (caso Yeri Urbina, 04-ago-2026 — client_phone en appointments guardado
  // sin el 51 mientras clients.phone sí lo tenía).
  if (digits.length === 9 && digits.startsWith("9")) return `51${digits}`;

  if (isWaSendableDest(s)) return digits;

  return digits.length >= 10 && isWaSendableDest(digits) ? digits : null;
}

/**
 * Ventana Lima [now-2min, now+3h+15min) como literales timestamp WITHOUT time zone.
 * appointments.date es hora Lima literal — no usar ISO con `Z` (ver appointment-reminders).
 * El horizonte sigue siendo ~3 h; lo que ya pasó esa marca y no se envió se reintenta
 * en cada tick hasta que la cita empieza.
 */
function getSameDayWindowLima(): { start: string; end: string } {
  const nowLima = limaNowAsUtcShiftedDate();
  const start = new Date(nowLima.getTime() - LOOKBACK_MINUTES * 60 * 1000);
  const end = new Date(
    nowLima.getTime() + (HORIZON_HOURS * 60 + HORIZON_SLACK_MINUTES) * 60 * 1000,
  );
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  return { start: fmt(start), end: fmt(end) };
}

/** Quita el header "Antes de tu cita" — la plantilla ya lo incluye antes de {{4}}. */
function recommendationsForTemplate(categoryIds: string[]): string {
  const full = getConsideracionesPreviasWhatsApp(categoryIds);
  if (!full.trim()) return "";
  return full.replace(/^📌\s*\*?Antes de tu cita:?\*?\s*/i, "").trim();
}

interface AppointmentRow {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_id: string | null;
  date: string;
  service_id: string | null;
}

interface ServiceRow {
  id: string;
  name: string;
  category_id: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { start, end } = getSameDayWindowLima();

  console.log(`[same-day-appointment-reminder] Ventana Lima ${start} … ${end}`);

  const activeTenants = await getActiveWabaTenants(supabase);
  let totalSent = 0;
  let totalFailed = 0;
  let totalRows = 0;

  for (const tenant of activeTenants) {
    await runWithRequestTenantId(tenant.tenantId, () =>
      processTenantSameDay(tenant.tenantId),
    );
  }

  async function processTenantSameDay(tenantId: string): Promise<void> {
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("id, client_name, client_phone, client_id, date, service_id")
      .eq("tenant_id", tenantId)
      .eq("status", "scheduled")
      .gte("date", start)
      .lt("date", end)
      .is("same_day_reminder_sent_at", null);

    if (apptError) {
      console.error(
        `[same-day-appointment-reminder] Error consultando citas (${tenantId}):`,
        apptError,
      );
      return;
    }

    const rows = (appointments ?? []) as AppointmentRow[];
    totalRows += rows.length;
    console.log(
      `[same-day-appointment-reminder] ${tenantId}: ${rows.length} cita(s) en ventana`,
    );

    if (rows.length === 0) return;

    const missingPhoneClientIds = [
      ...new Set(
        rows
          .filter((r) => !resolveWaDest(r.client_phone) && r.client_id)
          .map((r) => r.client_id as string),
      ),
    ];
    const waUserIdByClient = new Map<string, string>();
    if (missingPhoneClientIds.length > 0) {
      const { data: bsuidClients } = await supabase
        .from("clients")
        .select("id, wa_user_id")
        .eq("tenant_id", tenantId)
        .in("id", missingPhoneClientIds)
        .not("wa_user_id", "is", null);
      for (const c of bsuidClients ?? []) {
        if (typeof c.wa_user_id === "string" && isWaBsuid(c.wa_user_id)) {
          waUserIdByClient.set(c.id as string, c.wa_user_id);
        }
      }
    }

    const apptIds = rows.map((r) => r.id);

    // Líneas multi-servicio (appointment_services) + fallback service_id legacy
    const { data: apptSvcRows } = await supabase
      .from("appointment_services")
      .select("appointment_id, service_id")
      .eq("tenant_id", tenantId)
      .in("appointment_id", apptIds);

    const serviceIdsByAppt = new Map<string, string[]>();
    for (const row of apptSvcRows ?? []) {
      const aid = row.appointment_id as string;
      const sid = row.service_id as string;
      if (!sid) continue;
      const list = serviceIdsByAppt.get(aid) ?? [];
      list.push(sid);
      serviceIdsByAppt.set(aid, list);
    }
    for (const appt of rows) {
      if (!serviceIdsByAppt.has(appt.id) && appt.service_id) {
        serviceIdsByAppt.set(appt.id, [appt.service_id]);
      }
    }

    const allServiceIds = [...new Set([...serviceIdsByAppt.values()].flat())];
    const servicesMap = new Map<string, ServiceRow>();

    if (allServiceIds.length > 0) {
      const { data: services, error: svcError } = await supabase
        .from("services")
        .select("id, name, category_id")
        .eq("tenant_id", tenantId)
        .in("id", allServiceIds);

      if (svcError) {
        console.warn(
          `[same-day-appointment-reminder] Error cargando servicios (${tenantId}):`,
          svcError.message,
        );
      } else {
        for (const svc of (services ?? []) as ServiceRow[]) {
          servicesMap.set(svc.id, svc);
        }
      }
    }

    for (const appt of rows) {
      const phone =
        resolveWaDest(appt.client_phone) ??
        (appt.client_id
          ? (waUserIdByClient.get(appt.client_id) ?? null)
          : null);
      if (!phone) {
        console.warn(
          `[same-day-appointment-reminder] Cita ${appt.id} sin destino WA válido (${appt.client_phone}), saltando`,
        );
        totalFailed++;
        continue;
      }

      const svcIds = serviceIdsByAppt.get(appt.id) ?? [];
      const names = svcIds
        .map((id) => servicesMap.get(id)?.name)
        .filter((n): n is string => Boolean(n));
      const serviceName = names.length > 0 ? names.join(" + ") : "tu servicio";

      const categoryIds = [
        ...new Set(
          svcIds
            .map((id) => servicesMap.get(id)?.category_id)
            .filter((c): c is string => Boolean(c)),
        ),
      ];
      const recommendations = recommendationsForTemplate(categoryIds);

      try {
        const res = await fetch(SEND_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            phone,
            tenantId,
            clientName: appt.client_name,
            appointmentTime: appt.date,
            services: serviceName,
            recommendations,
          }),
        });

        let data: { success?: boolean; error?: string } = {};
        try {
          const raw = await res.text();
          data = raw ? (JSON.parse(raw) as typeof data) : {};
        } catch (parseErr) {
          console.error(
            `[same-day-appointment-reminder] Respuesta ilegible para ${phone} (${appt.id}):`,
            parseErr,
          );
          totalFailed++;
          continue;
        }

        if (!res.ok || !data.success) {
          console.error(
            `[same-day-appointment-reminder] Fallo al enviar a ${phone} (${appt.id}):`,
            data.error ?? res.status,
          );
          totalFailed++;
          continue;
        }

        const { error: updateError } = await supabase
          .from("appointments")
          .update({ same_day_reminder_sent_at: new Date().toISOString() })
          .eq("id", appt.id)
          .eq("tenant_id", tenantId);

        if (updateError) {
          console.error(
            `[same-day-appointment-reminder] Error marcando enviado ${appt.id}:`,
            updateError.message,
          );
        }

        console.log(
          `[same-day-appointment-reminder] ✓ Enviado a ${phone} (${appt.id})`,
        );
        totalSent++;
      } catch (err) {
        console.error(
          `[same-day-appointment-reminder] Error inesperado ${appt.id}:`,
          err,
        );
        totalFailed++;
      }
    }
  }

  const summary = { sent: totalSent, failed: totalFailed, total: totalRows };
  console.log("[same-day-appointment-reminder] Resumen:", summary);

  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});
