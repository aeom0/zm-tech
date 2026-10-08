// silence-watchdog — Red de seguridad proactiva contra silencios del bot WABA.
// Cron cada 5 min, sin restricción de horario (24/7, feriados incluidos): a
// diferencia de cart-nudge/browse-reengage/ads-bounce (nudges de marketing que
// sí respetan horario de envío 9–22 Lima), este watchdog responde una
// conversación que la clienta YA inició — no es un mensaje saliente nuevo, es
// terminar de atenderla. Detecta teléfonos cuyo último mensaje es inbound
// (clienta) sin ninguna respuesta posterior entre 5 y 12 min de antigüedad (no
// se solapa con cart-nudge ≥12 min ni con browse-reengage si ya reenganchó el
// episodio). Usa Haiku para leer el historial reciente y decidir si la clienta
// de verdad quedó sin atender o si la charla ya se cerró de forma natural (ej.
// "gracias", "listo"). Si Haiku no responde a tiempo o falla, se prioriza NO
// dejar a la clienta en silencio (fallback genérico).
//
// Si la sesión tiene carrito o step=awaiting_datetime, tras el texto se reenvía
// el selector de fecha/hora (misma lógica que cart-nudge). Haiku no debe prometer
// "días disponibles" sin carrito — en ese caso invita a escribir *agendar*.
//
// Anti-spam: Haiku recibe las últimas 8 respuestas del hilo (HISTORY_LIMIT) y
// decide needs_response=false si la charla ya se cerró sola — nunca se envía
// un mensaje "por rutina" sin leer el contexto real de la conversación.
//
// Motivación: incidente Fanny Vera (2026-07-10) — 19 min de silencio total tras
// una ráfaga de mensajes ("2:30 pm" / "Por favor" / "Cuál es la dirección?").
// wa_error_log (fix previo) solo captura excepciones no recuperadas; este
// watchdog cubre el caso de degradación silenciosa (ninguna excepción, pero
// tampoco respuesta) que wa_error_log no puede detectar.
//
// Fix 2026-08-02 (caso Lucía Landa): la restricción de horario original hacía
// que un inbound de madrugada/feriado nunca cayera en la ventana 5–12 min a
// tiempo, y luego quedaba huérfano — cart-nudge no aplica sin carrito y
// browse-reengage requiere que el bot haya sido el último en hablar. Se quitó
// la gate de horario para que el watchdog cubra ese hueco.

import { resendDatetimeSelectors } from "../whatsapp-webhook/handlers/booking-flow.ts";
import {
  clearAnthropicCreditExhaustedFlag,
  logAIUsage,
  reportAnthropicApiFailure,
} from "../whatsapp-webhook/lib/haiku-usage.ts";
import { initMessageLogger } from "../whatsapp-webhook/lib/message-logger.ts";
import { SALON_ADDRESS } from "../whatsapp-webhook/lib/salon-location.ts";
import { loadCatalog } from "../whatsapp-webhook/lib/services-catalog.ts";
import {
  getSession,
  getSupabase,
  type SupabaseClient,
} from "../whatsapp-webhook/lib/supabase.ts";
import { runWithRequestTenantId } from "../whatsapp-webhook/lib/tenant.ts";
import { loadSilentPhoneSet } from "../whatsapp-webhook/lib/waba-config.ts";
import {
  addressWithoutHello,
  loadClientNameForPhone,
} from "../whatsapp-webhook/lib/client-address.ts";
import {
  getActiveWabaTenants,
  getTenantWabaCredentials,
  sendWhatsAppMessage,
  type TenantWabaCredentials,
} from "../_shared/tenant-waba.ts";

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const MIN_SILENCE_MINUTES = 5;
const MAX_SILENCE_MINUTES = 12; // cart-nudge toma el relevo desde los 12 min
const HISTORY_LIMIT = 8;
const HAIKU_TIMEOUT_MS = 5000;
const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const FALLBACK_MESSAGE =
  "Notamos que tu último mensaje quedó sin respuesta, mil disculpas 💜 " +
  "¿En qué podemos ayudarte? Escribe *menu* para ver opciones o cuéntanos qué necesitas.";

const AGENDAR_HINT =
  " Si quieres agendar, escribe *agendar* y te paso el calendario 🗓️";

/** Detecta copy que promete lista de días sin enviarla. */
const PROMISES_CALENDAR_RE =
  /d[ií]as?\s+disponibles|te\s+dejo\s+los\s+d[ií]as|calendario|elige(?:r)?\s+(?:el\s+)?d[ií]a|qu[eé]\s+d[ií]a\s+te/i;

interface SilentPhoneRow {
  phone: string;
  last_inbound_at: string;
  session_step: string | null;
  watchdog_sent_at: string | null;
}

interface WaMessageRow {
  direction: "in" | "out";
  content: string | null;
  created_at: string;
}

interface SessionContext {
  step: string | null;
  hasCart: boolean;
}

const DEPOSIT_OR_PAYMENT_STEPS = new Set([
  "awaiting_deposit_boleta",
  "awaiting_deposit_datos",
  "awaiting_payment_screenshot",
  "awaiting_payment_info",
  "awaiting_client_identity",
]);

function isDepositOrPaymentStep(step: string | null): boolean {
  return DEPOSIT_OR_PAYMENT_STEPS.has(step ?? "");
}

async function sendTextWA(
  creds: TenantWabaCredentials,
  to: string,
  message: string,
): Promise<boolean> {
  const res = await sendWhatsAppMessage(creds, to, {
    type: "text",
    text: { body: message },
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[silence-watchdog] WA error para ${to}:`, err.slice(0, 200));
    return false;
  }
  return true;
}

function sessionHasCart(
  session: Awaited<ReturnType<typeof getSession>>,
): boolean {
  if (!session) return false;
  return (
    (session.cartItems?.length ?? 0) > 0 ||
    (session.serviceIds?.length ?? 0) > 0
  );
}

/** Consulta Haiku con el historial reciente y decide si hace falta responder. */
async function askHaikuIfNeedsResponse(
  supabase: SupabaseClient,
  phone: string,
  history: WaMessageRow[],
  ctx: SessionContext,
): Promise<{ needsResponse: boolean; message: string } | null> {
  if (!ANTHROPIC_API_KEY) return null;

  const transcript = history
    .map((m) => `[${m.direction}] ${(m.content ?? "").slice(0, 300)}`)
    .join("\n");

  const calendarRule = isDepositOrPaymentStep(ctx.step)
    ? "La clienta está en datos de boleta o pago. NUNCA ofrezcas calendario, " +
      "días ni horas. Si hace falta responder, pide nombre+DNI/CE en un solo " +
      "mensaje o espera al equipo. No digas que la cita ya está reservada."
    : ctx.hasCart
    ? "La clienta TIENE servicios en carrito (o está eligiendo fecha). " +
      "Puedes invitarla a elegir día: el sistema adjuntará la lista interactiva de días. " +
      'Ej: "¿Te animas a agendar? Te dejo los días disponibles 👇"'
    : "La clienta NO tiene carrito activo. NUNCA digas que le dejas días, calendario " +
      "ni lista de horarios (no se enviará ninguna lista). Si conviene agendar, " +
      "invítala a escribir *agendar* o a decir qué servicio quiere.";

  const systemPrompt =
    "Eres parte del equipo de ZM Lash & Nails Beauty (salón de belleza en Perú) " +
    "revisando una conversación de WhatsApp que quedó sin respuesta del equipo " +
    "hace varios minutos. 'in' es la clienta, 'out' es el equipo/bot. Decide si " +
    "la clienta sigue esperando una respuesta útil (needs_response=true) o si la " +
    "charla ya se cerró de forma natural — ej. dijo gracias/listo/chau, o ya " +
    "tiene toda la información que pidió (needs_response=false). Si " +
    "needs_response=true, redacta un mensaje breve (máx 2 líneas), cálido, en " +
    "español peruano, tono asesora profesional (NO apodos: babe, baby, amor, " +
    "cielo, linda, hermosa, bella, guapa, nena, bebé, cariño, reina). PROHIBIDO " +
    "¡Hola!/Hola (ya hubo saludo). Usa Srta. {nombre} si lo conoces. Que " +
    "retome el hilo de forma natural (no genérico) y ofrezca ayuda concreta. " +
    "DATOS REALES del salón (úsalos tal cual si la clienta preguntó; NUNCA inventes dirección, distrito, horarios ni precios): dirección: " +
    SALON_ADDRESS + ". " +
    `Contexto sesión: step=${
      ctx.step ?? "browsing"
    }, has_cart=${ctx.hasCart}. ` +
    calendarRule +
    " Responde ÚNICAMENTE con JSON válido, sin texto " +
    'adicional: {"needs_response": boolean, "message": "texto o cadena vacía"}';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HAIKU_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 200,
        system: systemPrompt,
        messages: [{ role: "user", content: transcript }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[silence-watchdog] Anthropic API error:", response.status);
      void reportAnthropicApiFailure(supabase, {
        status: response.status,
        bodyText: errText,
        source: "silence_watchdog",
        phoneNumber: phone,
      });
      return null;
    }

    const data = await response.json();
    void clearAnthropicCreditExhaustedFlag(supabase);
    void logAIUsage(
      supabase,
      "silence_watchdog",
      (data?.usage?.input_tokens as number) ?? 0,
      (data?.usage?.output_tokens as number) ?? 0,
      phone,
    );

    const rawText = (data?.content?.[0]?.text as string | undefined)?.trim();
    if (!rawText) return null;

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    if (typeof parsed.needs_response !== "boolean") return null;

    return {
      needsResponse: parsed.needs_response,
      message: typeof parsed.message === "string" ? parsed.message : "",
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError") {
      console.warn("[silence-watchdog] Timeout Haiku");
    } else {
      console.error("[silence-watchdog] Error llamando Anthropic:", err);
    }
    return null;
  }
}

/** Ajusta copy si promete calendario sin carrito; decide si adjuntar lista. */
function finalizeWatchdogMessage(
  raw: string,
  ctx: SessionContext,
): { message: string; attachCalendar: boolean } {
  let message = raw.trim() || FALLBACK_MESSAGE;
  const canAttach = !isDepositOrPaymentStep(ctx.step) &&
    (ctx.hasCart || ctx.step === "awaiting_datetime");

  if (canAttach) {
    return { message, attachCalendar: true };
  }

  if (PROMISES_CALENDAR_RE.test(message)) {
    // Quitar promesa vacía y ofrecer *agendar* (no en boleta/pago)
    message = message
      .replace(/\s*Te dejo los d[ií]as disponibles[^.]*\.?/gi, "")
      .replace(/\s*te dejo el calendario[^.]*\.?/gi, "")
      .trim();
    if (!isDepositOrPaymentStep(ctx.step) && !/\*agendar\*/i.test(message)) {
      message = (message || FALLBACK_MESSAGE) + AGENDAR_HINT;
    }
  }

  return { message, attachCalendar: false };
}

async function resendCalendarIfPossible(
  supabase: SupabaseClient,
  phone: string,
  catalog: Awaited<ReturnType<typeof loadCatalog>>,
): Promise<boolean> {
  const session = await getSession(supabase, phone);
  if (!sessionHasCart(session)) return false;
  if (isDepositOrPaymentStep(session?.step ?? null)) return false;
  await resendDatetimeSelectors(phone, supabase, session!, catalog);
  return true;
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const isCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
  const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  if (!isCron && !isServiceRole) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = getSupabase();
  initMessageLogger(supabase);
  const nowIso = new Date().toISOString();

  const activeTenants = await getActiveWabaTenants(supabase);
  let reviewed = 0;
  let responded = 0;
  let calendarsSent = 0;
  const errors: string[] = [];

  for (const tenant of activeTenants) {
    const creds = await getTenantWabaCredentials(supabase, tenant);
    if (!creds) continue;

    await runWithRequestTenantId(tenant.tenantId, async () => {
      const catalog = await loadCatalog(supabase);
      const blockedPhones = await loadSilentPhoneSet(supabase);

      const { data: candidates, error: candidatesError } = await supabase.rpc(
        "waba_find_silent_phones",
        {
          p_tenant_id: tenant.tenantId,
          min_minutes: MIN_SILENCE_MINUTES,
          max_minutes: MAX_SILENCE_MINUTES,
        },
      );

      if (candidatesError) {
        console.error(
          `[silence-watchdog] Error consultando candidatos (${tenant.tenantId}):`,
          candidatesError.message,
        );
        errors.push(`${tenant.tenantId}: ${candidatesError.message}`);
        return;
      }

      const rows = ((candidates ?? []) as SilentPhoneRow[]).filter(
        (r) => !blockedPhones.has(r.phone),
      );

      for (const row of rows) {
        reviewed++;
        try {
          const session = await getSession(supabase, row.phone);
          const ctx: SessionContext = {
            step: session?.step ?? row.session_step ?? "browsing",
            hasCart: sessionHasCart(session),
          };

          const { data: history } = await supabase
            .from("wa_messages")
            .select("direction, content, created_at")
            .eq("phone", row.phone)
            .eq("tenant_id", tenant.tenantId)
            .order("created_at", { ascending: false })
            .limit(HISTORY_LIMIT);

          const orderedHistory = ((history ?? []) as WaMessageRow[]).reverse();

          const verdict = await askHaikuIfNeedsResponse(
            supabase,
            row.phone,
            orderedHistory,
            ctx,
          );
          let needsResponse = verdict?.needsResponse ?? true; // bias: responder ante duda
          let rawMessage = verdict?.needsResponse && verdict.message.trim()
            ? verdict.message.trim()
            : FALLBACK_MESSAGE;

          // En medio de agendar: aunque Haiku diga "charla cerrada", reenganchar
          // con calendario (caso Yesenia: "Instagram verdad" + carrito vacío ya no,
          // pero awaiting_datetime + carrito sí).
          const midBooking = ctx.hasCart || ctx.step === "awaiting_datetime";
          if (midBooking && !needsResponse) {
            needsResponse = true;
            rawMessage =
              "¿Seguimos con tu cita? 💜 Te dejo los días disponibles 👇";
          } else if (
            midBooking &&
            needsResponse &&
            !PROMISES_CALENDAR_RE.test(rawMessage)
          ) {
            // Asegurar CTA de calendario si hay carrito
            if (!/agendar|d[ií]a|cita/i.test(rawMessage)) {
              rawMessage = rawMessage.trim() +
                " ¿Seguimos con tu cita? Te dejo los días 👇";
            }
          }

          if (needsResponse) {
            const { message, attachCalendar } = finalizeWatchdogMessage(
              rawMessage,
              ctx,
            );
            const clientName = await loadClientNameForPhone(
              supabase,
              row.phone,
            );
            const styled = addressWithoutHello(clientName, message);
            const sent = await sendTextWA(creds, row.phone, styled);
            if (sent) {
              responded++;
              await supabase.from("wa_messages").insert({
                phone: row.phone,
                tenant_id: tenant.tenantId,
                direction: "out",
                msg_type: "text",
                content: styled,
                step_before: ctx.step ?? "browsing",
                source: "nudge",
              });

              if (attachCalendar) {
                const ok = await resendCalendarIfPossible(
                  supabase,
                  row.phone,
                  catalog,
                );
                if (ok) calendarsSent++;
                else {
                  console.warn(
                    `[silence-watchdog] No se pudo adjuntar calendario: ${
                      row.phone.slice(-4)
                    }`,
                  );
                }
              }
            }
          }

          // Marcar el episodio como revisado siempre, haya o no respondido, para
          // no re-evaluar el mismo silencio en cada tick de 5 min.
          await supabase
            .from("whatsapp_sessions")
            .update({ watchdog_sent_at: nowIso })
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
      responded,
      calendarsSent,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: nowIso,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
