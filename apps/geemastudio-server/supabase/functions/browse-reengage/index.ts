// browse-reengage — Reenganche Haiku cuando el último msg es OUT (bot ya
// respondió), sesión browsing sin selección, silencio ≥30 min.
// Cron cada 15 min. Colchón 24 h para diferir noche → 9 AM Lima.
// Horario de ENVÍO: 9–22 Lima (como cart-nudge / ads-bounce).
// Anti-spam (2026-07-19): 1 nudge por episodio (= desde el último inbound);
// no se re-califica tras OUT del bot; no solapa ads-bounce/watchdog del mismo episodio.
// Deploy: SUPABASE_ACCESS_TOKEN=$(cat ~/.supabase/access-token) npx supabase@latest functions deploy browse-reengage --project-ref udelxwwnyivknslueerr --no-verify-jwt

import {
  askHaikuReengage,
  type ReengageMessageRow,
} from "../whatsapp-webhook/lib/reengage-haiku.ts";
import { getSupabase } from "../whatsapp-webhook/lib/supabase.ts";
import { loadSilentPhoneSet } from "../whatsapp-webhook/lib/waba-config.ts";
import {
  addressWithoutHello,
  loadClientNameForPhone,
} from "../whatsapp-webhook/lib/client-address.ts";
import { extractMetaWamid } from "../whatsapp-webhook/lib/reply-context.ts";
import { getPendingAppointmentsForPhone } from "../whatsapp-webhook/handlers/pending-appointment.ts";
import { runWithRequestTenantId } from "../whatsapp-webhook/lib/tenant.ts";
import {
  getActiveWabaTenants,
  getTenantWabaCredentials,
  sendWhatsAppMessage,
  type TenantWabaCredentials,
} from "../_shared/tenant-waba.ts";

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const LIMA_UTC_OFFSET = 5;

/** Elegible tras 30 min sin actividad (último OUT). */
const NUDGE_MIN = 30;
/**
 * Colchón (no la ventana ideal 30–60): permite diferir noche → 9 AM
 * sin perder el lead.
 */
const CANDIDATE_MAX_MINUTES = 24 * 60;
const HISTORY_LIMIT = 8;

const FALLBACK_MESSAGE =
  "¿Sigues por aquí? 💜 Cuéntanos qué te gustaría (pestañas, cejas, uñas…) y te ayudamos.";

interface IdleBrowseRow {
  phone: string;
  last_out_at: string;
  session_step: string | null;
  browse_reengage_sent_at: string | null;
}

function isWithinReengancheHours(): boolean {
  const utcNow = new Date();
  const limaHour = (utcNow.getUTCHours() - LIMA_UTC_OFFSET + 24) % 24;
  return limaHour >= 9 && limaHour < 22;
}

async function sendTextWA(
  creds: TenantWabaCredentials,
  to: string,
  message: string,
): Promise<{ ok: boolean; wamid: string | null }> {
  const res = await sendWhatsAppMessage(creds, to, {
    type: "text",
    text: { body: message },
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[browse-reengage] WA error para ${to}:`, err.slice(0, 200));
    return { ok: false, wamid: null };
  }
  const data = await res.json().catch(() => null);
  return { ok: true, wamid: extractMetaWamid(data) };
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const isCron = Boolean(CRON_SECRET) && authHeader === `Bearer ${CRON_SECRET}`;
  const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  if (!isCron && !isServiceRole) {
    return new Response("Unauthorized", { status: 401 });
  }

  const qaBypassHours = isCron &&
    req.headers.get("X-QA-Bypass-Hours") === "true";

  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  if (!qaBypassHours && !isWithinReengancheHours()) {
    console.log(
      "[browse-reengage] fuera de horario reenganche (9am-10pm Lima), skip",
    );
    return new Response(
      JSON.stringify({
        skipped: true,
        reason: "fuera de horario reenganche (9am-10pm Lima)",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  const activeTenants = await getActiveWabaTenants(supabase);
  let reviewed = 0;
  let sent = 0;
  let skippedClosed = 0;
  let totalCandidates = 0;
  const errors: string[] = [];

  for (const tenant of activeTenants) {
    const creds = await getTenantWabaCredentials(supabase, tenant);
    if (!creds) continue;

    await runWithRequestTenantId(tenant.tenantId, async () => {
      let blockedPhones: Set<string>;
      try {
        blockedPhones = await loadSilentPhoneSet(supabase);
      } catch (err) {
        console.error(
          `[browse-reengage] loadSilentPhoneSet falló (${tenant.tenantId}), abortando corrida (fail-closed):`,
          err instanceof Error ? err.message : err,
        );
        errors.push(`${tenant.tenantId}: silent phone check failed`);
        return;
      }

      const { data: candidates, error: candidatesError } = await supabase.rpc(
        "waba_find_idle_browse_phones",
        {
          p_tenant_id: tenant.tenantId,
          min_minutes: NUDGE_MIN,
          max_minutes: CANDIDATE_MAX_MINUTES,
        },
      );

      if (candidatesError) {
        console.error(
          `[browse-reengage] Error RPC (${tenant.tenantId}):`,
          candidatesError.message,
        );
        errors.push(`${tenant.tenantId}: ${candidatesError.message}`);
        return;
      }

      const rows = ((candidates ?? []) as IdleBrowseRow[]).filter(
        (r) => !blockedPhones.has(r.phone),
      );
      totalCandidates += rows.length;

      for (const row of rows) {
        reviewed++;
        try {
          // Mónica …0370: tras "Confirmo mi cita" la sesión sigue en browsing sin
          // selección → el cron reenganchaba con "¿Sigues por aquí?". Skip duro si
          // hay cita scheduled (Haiku soft no basta; bias shouldSend ?? true).
          const pendingAppts = await getPendingAppointmentsForPhone(
            supabase,
            row.phone,
          );
          if (pendingAppts.length > 0) {
            console.log(
              `[browse-reengage] skip cita scheduled: ${row.phone.slice(-4)}`,
            );
            await supabase
              .from("whatsapp_sessions")
              .update({ browse_reengage_sent_at: nowIso })
              .eq("phone", row.phone)
              .eq("tenant_id", tenant.tenantId);
            skippedClosed++;
            continue;
          }

          const { data: history } = await supabase
            .from("wa_messages")
            .select("direction, content, created_at, source")
            .eq("phone", row.phone)
            .eq("tenant_id", tenant.tenantId)
            .order("created_at", { ascending: false })
            .limit(HISTORY_LIMIT);

          // Merillyn: último OUT panel/staff → no Haiku ni nudge (defensa in-loop)
          const lastOutRow = (history ?? []).find(
            (m: { direction?: string }) => m.direction === "out",
          ) as { source?: string | null } | undefined;
          if (
            lastOutRow?.source === "panel" ||
            lastOutRow?.source === "staff_app"
          ) {
            console.log(
              `[browse-reengage] skip staff OUT reciente: ${
                row.phone.slice(-4)
              }`,
            );
            await supabase
              .from("whatsapp_sessions")
              .update({ browse_reengage_sent_at: nowIso })
              .eq("phone", row.phone)
              .eq("tenant_id", tenant.tenantId);
            skippedClosed++;
            continue;
          }

          const orderedHistory = ((history ?? []) as ReengageMessageRow[])
            .reverse();
          const verdict = await askHaikuReengage(
            supabase,
            row.phone,
            orderedHistory,
            { source: "browse_reengage" },
          );

          // Bias: si Haiku falla, sí reenganchar (no perder lead)
          let shouldSend = verdict?.shouldSend ?? true;
          let message = verdict?.shouldSend && verdict.message.trim()
            ? verdict.message.trim()
            : FALLBACK_MESSAGE;

          if (verdict && !verdict.shouldSend) {
            shouldSend = false;
            skippedClosed++;
          }

          // Embudo a medias: solo listas interactivas estáticas (prefijo `[lista]` en
          // wa_messages). No usar palabras sueltas (agendar/servicio/elige/menu):
          // aparecen en cierres cordiales de Haiku y forzaban reenganche tras una
          // despedida clara (Patricia …9451, 30-jul: "cuando quieras agendar").
          const lastOut = [...orderedHistory]
            .reverse()
            .find((m) => m.direction === "out");
          const midFunnel = /\[lista\]/i.test(lastOut?.content ?? "");
          if (!shouldSend && midFunnel) {
            shouldSend = true;
            skippedClosed = Math.max(0, skippedClosed - 1);
            message = FALLBACK_MESSAGE;
          }

          if (shouldSend) {
            // Defensa: no prometer calendario
            if (
              /d[ií]as?\s+disponibles|te\s+dejo\s+los\s+d[ií]as|calendario/i
                .test(
                  message,
                )
            ) {
              message = FALLBACK_MESSAGE;
            }

            // Re-leer sesión antes de enviar (carrera con ads-bounce/watchdog/cart-nudge a las 09:00)
            const { data: freshSession } = await supabase
              .from("whatsapp_sessions")
              .select(
                "from_ad_at, ads_bounce_nudge_sent_at, browse_reengage_sent_at, watchdog_sent_at, nudge1_sent_at, nudge2_sent_at",
              )
              .eq("phone", row.phone)
              .eq("tenant_id", tenant.tenantId)
              .maybeSingle();
            const { data: lastInRow } = await supabase
              .from("wa_messages")
              .select("created_at")
              .eq("phone", row.phone)
              .eq("tenant_id", tenant.tenantId)
              .eq("direction", "in")
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            const lastInAt = lastInRow?.created_at
              ? new Date(lastInRow.created_at).getTime()
              : 0;
            const fromAdAt = freshSession?.from_ad_at
              ? new Date(freshSession.from_ad_at).getTime()
              : 0;
            const adsAt = freshSession?.ads_bounce_nudge_sent_at
              ? new Date(freshSession.ads_bounce_nudge_sent_at).getTime()
              : 0;
            const watchAt = freshSession?.watchdog_sent_at
              ? new Date(freshSession.watchdog_sent_at).getTime()
              : 0;
            const browseAt = freshSession?.browse_reengage_sent_at
              ? new Date(freshSession.browse_reengage_sent_at).getTime()
              : 0;
            const cartNudge1At = freshSession?.nudge1_sent_at
              ? new Date(freshSession.nudge1_sent_at).getTime()
              : 0;
            const cartNudge2At = freshSession?.nudge2_sent_at
              ? new Date(freshSession.nudge2_sent_at).getTime()
              : 0;
            // CTWA bounce: deja el reenganche a ads-bounce
            if (fromAdAt > 0 && fromAdAt >= lastInAt) {
              console.log(
                `[browse-reengage] skip CTWA → ads-bounce: ${
                  row.phone.slice(-4)
                }`,
              );
              await supabase
                .from("whatsapp_sessions")
                .update({ browse_reengage_sent_at: nowIso })
                .eq("phone", row.phone)
                .eq("tenant_id", tenant.tenantId);
              continue;
            }
            // Otro reenganche ya habló en este episodio (incl. cart-nudge — …1321)
            if (
              (adsAt > 0 && adsAt >= lastInAt) ||
              (watchAt > 0 && watchAt >= lastInAt) ||
              (browseAt > 0 && browseAt >= lastInAt) ||
              (cartNudge1At > 0 && cartNudge1At >= lastInAt) ||
              (cartNudge2At > 0 && cartNudge2At >= lastInAt)
            ) {
              console.log(
                `[browse-reengage] skip ya reenganchada: ${
                  row.phone.slice(-4)
                }`,
              );
              await supabase
                .from("whatsapp_sessions")
                .update({ browse_reengage_sent_at: nowIso })
                .eq("phone", row.phone)
                .eq("tenant_id", tenant.tenantId);
              continue;
            }

            const clientName = await loadClientNameForPhone(
              supabase,
              row.phone,
            );
            const styledMessage = addressWithoutHello(clientName, message);
            const sentResult = await sendTextWA(
              creds,
              row.phone,
              styledMessage,
            );
            if (sentResult.ok) {
              sent++;
              const { data: inserted } = await supabase
                .from("wa_messages")
                .insert({
                  phone: row.phone,
                  tenant_id: tenant.tenantId,
                  direction: "out",
                  msg_type: "text",
                  content: styledMessage,
                  step_before: row.session_step ?? "browsing",
                  source: "nudge",
                  wamid: sentResult.wamid,
                  delivery_status: sentResult.wamid ? "sent" : null,
                })
                .select("created_at")
                .single();

              // Usar el created_at real del mensaje recién insertado (no un
              // timestamp capturado antes del insert) — si no, queda MENOR que
              // m.created_at en waba_find_idle_browse_phones y el propio nudge
              // vuelve a candidatearse a los 30 min, generando un loop de spam.
              await supabase
                .from("whatsapp_sessions")
                .update({
                  browse_reengage_sent_at: inserted?.created_at ??
                    new Date().toISOString(),
                })
                .eq("phone", row.phone)
                .eq("tenant_id", tenant.tenantId);
              continue;
            } else {
              errors.push(`${row.phone}: WA send failed`);
              continue;
            }
          }

          // Marcar episodio siempre (enviado o skip cerrado) para no re-evaluar
          await supabase
            .from("whatsapp_sessions")
            .update({ browse_reengage_sent_at: nowIso })
            .eq("phone", row.phone)
            .eq("tenant_id", tenant.tenantId);
        } catch (err) {
          errors.push(`${row.phone}: ${err}`);
        }
      }
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      reviewed,
      sent,
      skippedClosed,
      candidates: totalCandidates,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: nowIso,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
