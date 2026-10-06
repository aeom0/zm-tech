// appointment-reminders — Cron diario 9 AM Lima (14:00 UTC).
// Busca citas de mañana (hora Lima) sin recordatorio enviado y llama a send-appointment-reminder.
// Deploy: SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) supabase functions deploy appointment-reminders --project-ref udelxwwnyivknslueerr --no-verify-jwt
// Cron: 0 14 * * * (14:00 UTC = 9:00 AM Lima)

import { createClient } from "@supabase/supabase-js";
import { isWaBsuid, isWaSendableDest } from "../_shared/wa-recipient.mjs";
import { limaNowAsUtcShiftedDate } from "../_shared/lima-datetime.ts";
import { runWithRequestTenantId } from "../whatsapp-webhook/lib/tenant.ts";
import { getActiveWabaTenants } from "../_shared/tenant-waba.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// URL interna de la función send-appointment-reminder dentro del mismo proyecto
const SEND_REMINDER_URL = `${SUPABASE_URL}/functions/v1/send-appointment-reminder`;

/**
 * Destino Cloud API: E.164 o BSUID (PE.…).
 * Citas BSUID guardan client_phone=null y usan clients.wa_user_id.
 */
function resolveWaDest(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (isWaBsuid(s)) return s;

  const digits = s.replace(/\D/g, "");
  if (!digits) return null;

  // Ya incluye código de país (Perú 51 + 9 dígitos, VE 58 + …, etc.)
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

interface AppointmentRow {
  id: string;
  client_name: string;
  client_phone: string | null;
  client_id: string | null;
  date: string; // timestamp without time zone (hora Lima literal)
  service_id: string | null;
}

interface ServiceRow {
  id: string;
  name: string;
}

/**
 * Rango "mañana en Lima" como literales timestamp WITHOUT time zone.
 * appointments.date guarda hora Lima literal (sin TZ). Comparar con ISO `…Z`
 * hacía que PostgREST/Postgres reinterpretara la ventana y el cron a veces
 * devolvía 0 citas (Adiaris 14-sep, Edith/Angela 03-sep).
 */
function getTomorrowRangeLima(): { start: string; end: string; day: string } {
  const lima = limaNowAsUtcShiftedDate();
  const y = lima.getUTCFullYear();
  const m = lima.getUTCMonth();
  const d = lima.getUTCDate();

  const pad = (n: number) => String(n).padStart(2, "0");
  const fmtDay = (yy: number, mm: number, dd: number) =>
    `${yy}-${pad(mm + 1)}-${pad(dd)}`;

  // Mañana y pasado mañana vía Date.UTC para rollover de mes
  const tomorrow = new Date(Date.UTC(y, m, d + 1));
  const dayAfter = new Date(Date.UTC(y, m, d + 2));
  const day = fmtDay(
    tomorrow.getUTCFullYear(),
    tomorrow.getUTCMonth(),
    tomorrow.getUTCDate(),
  );
  const next = fmtDay(
    dayAfter.getUTCFullYear(),
    dayAfter.getUTCMonth(),
    dayAfter.getUTCDate(),
  );

  return {
    day,
    start: `${day} 00:00:00`,
    end: `${next} 00:00:00`,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Validar Bearer token si está presente (cron de Supabase lo envía)
  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader) {
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    // Permitir service_role key o JWT válido — simplemente aceptamos si hay algún token
    if (!token) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { start, end, day } = getTomorrowRangeLima();

  console.log(
    `[appointment-reminders] Buscando citas ${day} entre ${start} y ${end} (Lima literal)`,
  );

  const activeTenants = await getActiveWabaTenants(supabase);
  let totalSent = 0;
  let totalFailed = 0;
  let totalRows = 0;

  for (const tenant of activeTenants) {
    await runWithRequestTenantId(tenant.tenantId, () =>
      processTenantReminders(tenant.tenantId),
    );
  }

  async function processTenantReminders(tenantId: string): Promise<void> {
    // Query 1: citas de mañana sin recordatorio (teléfono E.164 o BSUID vía client_id)
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("id, client_name, client_phone, client_id, date, service_id")
      .eq("tenant_id", tenantId)
      .eq("status", "scheduled")
      .gte("date", start)
      .lt("date", end)
      .is("reminder_sent_at", null);

    if (apptError) {
      console.error(
        `[appointment-reminders] Error consultando citas (${tenantId}):`,
        apptError,
      );
      return;
    }

    const rows = (appointments ?? []) as AppointmentRow[];
    totalRows += rows.length;
    console.log(
      `[appointment-reminders] ${tenantId}: ${rows.length} cita(s) encontrada(s)`,
    );

    if (rows.length === 0) {
      // Diagnóstico: ¿hay citas ese día con otro status / ya recordadas?
      interface DiagRow {
        id: string;
        status: string;
        reminder_sent_at: string | null;
        date: string;
      }
      const { data: diag } = await supabase
        .from("appointments")
        .select("id, status, reminder_sent_at, date")
        .eq("tenant_id", tenantId)
        .gte("date", start)
        .lt("date", end)
        .limit(20);
      console.warn(
        `[appointment-reminders] 0 pendientes (${tenantId}); diagnóstico rango:`,
        JSON.stringify(
          ((diag ?? []) as DiagRow[]).map((r) => ({
            id: r.id.slice(0, 8),
            status: r.status,
            rem: r.reminder_sent_at != null,
            date: r.date,
          })),
        ),
      );
      return;
    }

    // BSUID: client_phone es null → resolver clients.wa_user_id
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

    // Query 2: obtener nombres de servicios únicos
    const serviceIds = [
      ...new Set(rows.map((r) => r.service_id).filter(Boolean)),
    ] as string[];
    const servicesMap = new Map<string, string>();

    if (serviceIds.length > 0) {
      const { data: services, error: svcError } = await supabase
        .from("services")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .in("id", serviceIds);

      if (svcError) {
        console.warn(
          `[appointment-reminders] Error cargando servicios (${tenantId}):`,
          svcError.message,
        );
      } else {
        for (const svc of (services ?? []) as ServiceRow[]) {
          servicesMap.set(svc.id, svc.name);
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
          `[appointment-reminders] Cita ${appt.id} sin destino WA válido (${appt.client_phone}), saltando`,
        );
        totalFailed++;
        continue;
      }

      const serviceName =
        (appt.service_id && servicesMap.get(appt.service_id)) ||
        "tu servicio";

      try {
        const res = await fetch(SEND_REMINDER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            phone,
            tenantId,
            clientName: appt.client_name,
            appointmentDate: appt.date,
            services: serviceName,
          }),
        });

        let data: { success?: boolean; error?: string } = {};
        try {
          const raw = await res.text();
          data = raw ? (JSON.parse(raw) as typeof data) : {};
        } catch (parseErr) {
          console.error(
            `[appointment-reminders] Respuesta ilegible para ${phone} (${appt.id}):`,
            parseErr,
          );
          totalFailed++;
          continue;
        }

        if (!res.ok || !data.success) {
          console.error(
            `[appointment-reminders] Fallo al enviar a ${phone} (${appt.id}):`,
            data.error ?? res.status,
          );
          totalFailed++;
          continue;
        }

        // Marcar como enviado
        const { error: updateError } = await supabase
          .from("appointments")
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq("id", appt.id)
          .eq("tenant_id", tenantId);

        if (updateError) {
          console.error(
            `[appointment-reminders] Error actualizando reminder_sent_at para ${appt.id}:`,
            updateError.message,
          );
          // No contamos como fallo: el mensaje sí se envió
        }

        console.log(
          `[appointment-reminders] ✓ Recordatorio enviado a ${phone} (${appt.id})`,
        );
        totalSent++;
      } catch (err) {
        console.error(
          `[appointment-reminders] Error inesperado para cita ${appt.id}:`,
          err,
        );
        totalFailed++;
      }
    }
  }

  const summary = { sent: totalSent, failed: totalFailed, total: totalRows };
  console.log("[appointment-reminders] Resumen:", summary);

  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});
