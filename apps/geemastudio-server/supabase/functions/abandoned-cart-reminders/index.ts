// abandoned-cart-reminders — Recordatorios de carrito abandonado (nudge1 + nudge2).
// Cron cada 30 minutos: */30 * * * *
// Deploy: SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) supabase functions deploy abandoned-cart-reminders --project-ref udelxwwnyivknslueerr --no-verify-jwt

import { createClient } from "@supabase/supabase-js";
import { metaRecipientFields } from "../_shared/wa-recipient.mjs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;

const LIMA_UTC_OFFSET_HOURS = 5; // Lima = UTC-5
// Función legacy de un solo número WABA (env): la lista de bajas es la del tenant ZM.
const LEGACY_TENANT_ID = "zm-lash-nails";

interface SessionRow {
  phone: string;
  cart_service_ids: string | null;
  cart_items: string | null;
  step: string | null;
  updated_at: string;
  nudge1_sent_at: string | null;
  nudge2_sent_at: string | null;
}

interface ClientRow {
  name: string;
}

type SessionAction = "nudge1_sent" | "nudge2_sent" | "skipped" | "failed";
type SessionReason =
  | "2h_threshold"
  | "20h_threshold_9am_window"
  | "no_threshold_met"
  | "send_error";

interface SessionDetail {
  phone: string; // últimos 6 dígitos: "...535512"
  clientName: string;
  action: SessionAction;
  reason: SessionReason;
}

/** Envía un mensaje de texto libre vía WhatsApp Business API. */
async function sendTextMessage(
  to: string,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  const payload = {
    messaging_product: "whatsapp",
    ...metaRecipientFields(to),
    type: "text",
    text: { body },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v20.0/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );
    const data = await res.json();
    if (!res.ok || data.error) {
      const errMsg = JSON.stringify(data.error ?? data);
      console.error(
        `[abandoned-cart-reminders] Error API Meta para ${to}:`,
        errMsg,
      );
      return { ok: false, error: errMsg };
    }
    return { ok: true };
  } catch (err) {
    console.error(
      `[abandoned-cart-reminders] Excepción enviando a ${to}:`,
      err,
    );
    return { ok: false, error: String(err) };
  }
}

/** Obtiene el primer nombre del cliente desde la tabla clients. Fallback: "amiga". */
async function getFirstName(
  supabase: ReturnType<typeof createClient>,
  phone: string,
): Promise<string> {
  try {
    const normalized = phone.replace(/\D/g, "").slice(-9);
    const { data } = await supabase
      .from("clients")
      .select("name")
      .ilike("phone", `%${normalized}`)
      .limit(1)
      .maybeSingle();

    const client = data as ClientRow | null;
    if (!client?.name) return "amiga";

    const firstName = client.name.trim().split(/\s+/)[0];
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  } catch {
    return "amiga";
  }
}

/** True si la hora actual en Lima está en el rango [startHour, endHour). */
function isLimaHourBetween(startHour: number, endHour: number): boolean {
  const nowUtc = new Date();
  const limaHour = (nowUtc.getUTCHours() - LIMA_UTC_OFFSET_HOURS + 24) % 24;
  return limaHour >= startHour && limaHour < endHour;
}

/** True si cart_service_ids o cart_items tiene al menos un ítem válido. */
function hasCartItems(session: SessionRow): boolean {
  const raw = session.cart_items ?? session.cart_service_ids;
  if (!raw || raw === "null" || raw === "[]") return false;
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) && arr.length > 0;
  } catch {
    return false;
  }
}

/** Enmascara el teléfono: muestra solo los últimos 6 dígitos. */
function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `...${digits.slice(-6)}`;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const now = new Date();

  // Ventana: sesiones activas en las últimas 23h, con al menos 1h de inactividad
  const windowStart = new Date(
    now.getTime() - 23 * 60 * 60 * 1000,
  ).toISOString();
  const windowEnd = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();

  console.log(
    `[abandoned-cart-reminders] Corriendo a ${now.toISOString()} — ventana ${windowStart} → ${windowEnd}`,
  );

  const { data: sessions, error: sessionsError } = await supabase
    .from("whatsapp_sessions")
    .select(
      "phone, cart_service_ids, cart_items, step, updated_at, nudge1_sent_at, nudge2_sent_at",
    )
    .eq("step", "browsing")
    .eq("tenant_id", LEGACY_TENANT_ID)
    .gte("updated_at", windowStart)
    .lte("updated_at", windowEnd);

  if (sessionsError) {
    console.error(
      "[abandoned-cart-reminders] Error consultando sesiones:",
      sessionsError,
    );
    return new Response(
      JSON.stringify({
        error: "Error consultando sesiones",
        detail: sessionsError.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  // Baja de marketing (STOP): fail-closed, si no se puede leer la lista no se envía.
  const { data: optOutConfig, error: optOutError } = await supabase
    .from("waba_config")
    .select("config_value")
    .eq("tenant_id", LEGACY_TENANT_ID)
    .eq("config_key", "marketing_opt_out")
    .eq("is_active", true)
    .maybeSingle();
  if (optOutError) {
    console.error(
      "[abandoned-cart-reminders] Error leyendo marketing_opt_out:",
      optOutError,
    );
    return new Response(
      JSON.stringify({ error: "No se pudo verificar la lista de bajas" }),
      { status: 503, headers: { "Content-Type": "application/json" } },
    );
  }
  const optOutRaw = (optOutConfig?.config_value as { phones?: unknown } | null)
    ?.phones;
  const optOutPhones = new Set(
    Array.isArray(optOutRaw)
      ? optOutRaw.filter((v): v is string => typeof v === "string")
      : [],
  );

  const allSessions = ((sessions ?? []) as SessionRow[])
    .filter(hasCartItems)
    .filter((s) => !optOutPhones.has(s.phone));
  console.log(
    `[abandoned-cart-reminders] ${allSessions.length} sesión(es) con carrito activo`,
  );

  if (allSessions.length === 0) {
    return new Response(
      JSON.stringify({
        nudge1_sent: 0,
        nudge2_sent: 0,
        failed: 0,
        total_processed: 0,
        sessions: [],
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  let nudge1Sent = 0;
  let nudge2Sent = 0;
  let failed = 0;
  const sessionDetails: SessionDetail[] = [];

  const nudge1Threshold = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const nudge2Threshold = new Date(now.getTime() - 20 * 60 * 60 * 1000);

  for (const session of allSessions) {
    const updatedAt = new Date(session.updated_at);

    // ── Nudge 1: sin recordatorio previo, inactiva > 2h ─────────────────────
    if (!session.nudge1_sent_at && updatedAt < nudge1Threshold) {
      const firstName = await getFirstName(supabase, session.phone);
      const msg =
        `¡Hola ${firstName}! 👋 Vimos que estabas mirando nuestras promos y te quedaste con ganas 💜\n\n` +
        `Tu selección sigue guardada. ¿Continuamos y te agendamos? Solo escribe *agendar* cuando estés lista 🗓️\n\n` +
        `O si tienes dudas sobre precios o disponibilidad, escríbeme con confianza 😊`;

      console.log(
        `[abandoned-cart-reminders] Enviando nudge1 a ${session.phone} (${firstName})`,
      );
      const result = await sendTextMessage(session.phone, msg);

      if (result.ok) {
        const { error: updateError } = await supabase
          .from("whatsapp_sessions")
          .update({ nudge1_sent_at: now.toISOString() })
          .eq("phone", session.phone);

        if (updateError) {
          console.warn(
            `[abandoned-cart-reminders] No se pudo actualizar nudge1_sent_at para ${session.phone}:`,
            updateError.message,
          );
        }
        // Guardar en wa_messages para que aparezca en el panel web
        await supabase.from("wa_messages").insert({
          phone: session.phone,
          direction: "out",
          msg_type: "text",
          content: msg,
          step_before: "browsing",
        });
        nudge1Sent++;
        sessionDetails.push({
          phone: maskPhone(session.phone),
          clientName: firstName,
          action: "nudge1_sent",
          reason: "2h_threshold",
        });
      } else {
        failed++;
        sessionDetails.push({
          phone: maskPhone(session.phone),
          clientName: firstName,
          action: "failed",
          reason: "send_error",
        });
      }
      continue; // No evaluar nudge2 en la misma ejecución
    }

    // ── Nudge 2: nudge1 ya enviado, sin nudge2, inactiva > 20h, entre 9-10 AM Lima ──
    if (
      session.nudge1_sent_at &&
      !session.nudge2_sent_at &&
      updatedAt < nudge2Threshold &&
      isLimaHourBetween(9, 10)
    ) {
      const firstName = await getFirstName(supabase, session.phone);
      const msg =
        `Hola ${firstName} 🌸 Queremos que estrenes unas uñas o pestañas increíbles hoy 💅\n\n` +
        `¿Te agendamos? Escribe *agendar* y en minutos tienes tu cita lista 💜\n\n` +
        `¡Te esperamos en ZM Lash & Nails! ✨`;

      console.log(
        `[abandoned-cart-reminders] Enviando nudge2 a ${session.phone} (${firstName})`,
      );
      const result = await sendTextMessage(session.phone, msg);

      if (result.ok) {
        const { error: updateError } = await supabase
          .from("whatsapp_sessions")
          .update({ nudge2_sent_at: now.toISOString() })
          .eq("phone", session.phone);

        if (updateError) {
          console.warn(
            `[abandoned-cart-reminders] No se pudo actualizar nudge2_sent_at para ${session.phone}:`,
            updateError.message,
          );
        }
        // Guardar en wa_messages para que aparezca en el panel web
        await supabase.from("wa_messages").insert({
          phone: session.phone,
          direction: "out",
          msg_type: "text",
          content: msg,
          step_before: "browsing",
        });
        nudge2Sent++;
        sessionDetails.push({
          phone: maskPhone(session.phone),
          clientName: firstName,
          action: "nudge2_sent",
          reason: "20h_threshold_9am_window",
        });
      } else {
        failed++;
        sessionDetails.push({
          phone: maskPhone(session.phone),
          clientName: firstName,
          action: "failed",
          reason: "send_error",
        });
      }
      continue;
    }

    // ── Sesión no cumple ningún umbral aún ───────────────────────────────────
    const firstName = await getFirstName(supabase, session.phone);
    sessionDetails.push({
      phone: maskPhone(session.phone),
      clientName: firstName,
      action: "skipped",
      reason: "no_threshold_met",
    });
  }

  const summary = {
    nudge1_sent: nudge1Sent,
    nudge2_sent: nudge2Sent,
    failed,
    total_processed: allSessions.length,
    sessions: sessionDetails,
  };
  console.log("[abandoned-cart-reminders] Resumen:", JSON.stringify(summary));

  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});
