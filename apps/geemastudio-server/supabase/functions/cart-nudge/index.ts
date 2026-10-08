// cart-nudge — Recordatorio de carrito abandonado.
// Cron cada 30 min. Busca sesiones con carrito activo sin actividad reciente
// y envía nudges dentro de la ventana de 24h (texto libre, sin plantilla).
// Nudge 1: ≥12 min sin actividad (ideal ~12–35; colchón 24h si se difiere de noche).
// Nudge 2: ≥90 min tras nudge1 (colchón 24h) + vacía carrito.
// Si step=awaiting_datetime, nudge 1 reenvía el selector de fecha/hora.
// Horario de ENVÍO: 9–22 Lima todos los días (como ads-bounce) — no el del salón.

import { resendDatetimeSelectors } from "../whatsapp-webhook/handlers/booking-flow.ts";
import { initMessageLogger } from "../whatsapp-webhook/lib/message-logger.ts";
import { loadCatalog } from "../whatsapp-webhook/lib/services-catalog.ts";
import {
  getSession,
  getSupabase,
  type SupabaseClient,
} from "../whatsapp-webhook/lib/supabase.ts";
import {
  loadSilentPhoneSet,
  loadWabaConfig,
} from "../whatsapp-webhook/lib/waba-config.ts";
import {
  addressWithoutHello,
  loadClientNameForPhone,
} from "../whatsapp-webhook/lib/client-address.ts";
import { expandCartItemsToServiceIds } from "../whatsapp-webhook/lib/supabase.ts";
import {
  buildAlmostCloseNudge1Text,
  buildEmotionalNudge2Text,
  isCtwaEmotionalEligible,
  primaryRubroFromServiceIds,
  primaryServiceLabel,
  resolveAlmostCloseImage,
} from "../whatsapp-webhook/lib/emotional-selling.ts";
import { runWithRequestTenantId } from "../whatsapp-webhook/lib/tenant.ts";
import {
  getActiveWabaTenants,
  getTenantWabaCredentials,
  sendWhatsAppMessage,
  type TenantWabaCredentials,
} from "../_shared/tenant-waba.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const LIMA_UTC_OFFSET = 5; // UTC-5

/** Elegible para nudge1 tras 12 min de inactividad. */
const NUDGE1_MIN = 12;
/** Elegible para nudge2 tras 90 min desde nudge1. */
const NUDGE2_MIN = 90;
/**
 * Colchón (no la ventana ideal): permite diferir noche/madrugada → 9 AM
 * sin perder el carrito (mismo patrón que ads-bounce).
 */
const CANDIDATE_MAX_MINUTES = 24 * 60;

interface Session {
  phone: string;
  cart_items: string;
  cart_service_ids: string;
  step: string | null;
  updated_at: string;
  from_ad_at?: string | null;
  nudge1_sent_at: string | null;
  nudge2_sent_at: string | null;
  browse_reengage_sent_at?: string | null;
  ads_bounce_nudge_sent_at?: string | null;
  watchdog_sent_at?: string | null;
  selected_day?: string | null;
}

type NudgeVariant = "emotional" | "generic";

async function sendTextWA(
  creds: TenantWabaCredentials,
  to: string,
  message: string,
  stepBefore?: string | null,
  nudgeVariant?: NudgeVariant,
): Promise<void> {
  const res = await sendWhatsAppMessage(creds, to, {
    type: "text",
    text: { body: message },
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[cart-nudge] WA error para ${to}:`, err.slice(0, 200));
    return;
  }
  await supabaseRequest("wa_messages", "POST", {
    phone: to,
    tenant_id: creds.tenantId,
    direction: "out",
    msg_type: "text",
    content: message,
    step_before: stepBefore ?? "browsing",
    source: "nudge",
    nudge_variant: nudgeVariant ?? null,
  });
}

async function sendImageWA(
  creds: TenantWabaCredentials,
  to: string,
  imageUrl: string,
  caption: string,
  stepBefore?: string | null,
  nudgeVariant?: NudgeVariant,
): Promise<void> {
  const res = await sendWhatsAppMessage(creds, to, {
    type: "image",
    image: { link: imageUrl, caption },
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`[cart-nudge] WA image error para ${to}:`, err.slice(0, 200));
    return;
  }
  await supabaseRequest("wa_messages", "POST", {
    phone: to,
    tenant_id: creds.tenantId,
    direction: "out",
    msg_type: "image",
    content: caption || "[imagen]",
    image_url: imageUrl,
    step_before: stepBefore ?? "browsing",
    source: "nudge",
    nudge_variant: nudgeVariant ?? null,
  });
}

function resolveSessionServiceIds(
  supabase: SupabaseClient,
  session: Session,
): Promise<string[]> {
  // Nota: expandCartItemsToServiceIds puede pegarle a `packs` en BD por sesión
  // candidata (nudge1 y nudge2, cada 30 min) — ver PR #81. Si el cron empieza
  // a demorar con más tráfico, cachear por sesión dentro del loop.
  try {
    const items = JSON.parse(session.cart_items ?? "[]");
    if (Array.isArray(items) && items.length > 0) {
      return expandCartItemsToServiceIds(supabase, items);
    }
  } catch {
    /* ignore */
  }
  try {
    const ids = JSON.parse(session.cart_service_ids ?? "[]");
    if (Array.isArray(ids)) {
      return Promise.resolve(
        ids.filter((id): id is string => typeof id === "string"),
      );
    }
  } catch {
    /* ignore */
  }
  return Promise.resolve([]);
}

/** Reenvía selector fecha u hora (misma lógica que dispatcher en awaiting_datetime). */
async function resendCalendarForPhone(
  supabase: SupabaseClient,
  phone: string,
  catalog: Awaited<ReturnType<typeof loadCatalog>>,
): Promise<boolean> {
  const session = await getSession(supabase, phone);
  if (!session?.serviceIds?.length && !(session?.cartItems?.length ?? 0)) {
    return false;
  }
  await resendDatetimeSelectors(phone, supabase, session, catalog);
  return true;
}

async function supabaseRequest(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: method === "PATCH" ? "return=minimal" : "return=representation",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (method === "PATCH") return null;
  return res.json();
}

/** "un servicio listo" / "2 servicios listos" (concordancia; Carmen …6325, 24-sep-2026). */
function listosWord(cartDesc: string): string {
  return cartDesc === "un servicio" ? "listo" : "listos";
}

function getCartDescription(
  cartItemsRaw: string,
  cartServiceIdsRaw: string,
): string {
  try {
    const items = JSON.parse(cartItemsRaw);
    if (Array.isArray(items) && items.length > 0) {
      return items.length === 1 ? "un servicio" : `${items.length} servicios`;
    }
  } catch {
    /* ignore */
  }
  try {
    const ids = JSON.parse(cartServiceIdsRaw);
    if (Array.isArray(ids) && ids.length > 0) {
      return ids.length === 1 ? "un servicio" : `${ids.length} servicios`;
    }
  } catch {
    /* ignore */
  }
  return "tus servicios";
}

/**
 * Horario propio del reenganche carrito: 9:00–22:00 Lima, todos los días.
 * Independiente del horario de atención del salón (como ads-bounce).
 */
function isWithinReengancheHours(): boolean {
  const utcNow = new Date();
  const limaHour = (utcNow.getUTCHours() - LIMA_UTC_OFFSET + 24) % 24;
  return limaHour >= 9 && limaHour < 22;
}

function hasActiveCart(session: Session): boolean {
  try {
    const items = JSON.parse(session.cart_items ?? "[]");
    const ids = JSON.parse(session.cart_service_ids ?? "[]");
    return (
      (Array.isArray(items) && items.length > 0) ||
      (Array.isArray(ids) && ids.length > 0)
    );
  } catch {
    return false;
  }
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

  const now = new Date();
  const nowIso = now.toISOString();

  if (!qaBypassHours && !isWithinReengancheHours()) {
    console.log(
      "[cart-nudge] fuera de horario reenganche (9am-10pm Lima), skip",
    );
    return new Response(
      JSON.stringify({
        skipped: true,
        reason: "fuera de horario reenganche (9am-10pm Lima)",
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  const supabase = getSupabase();
  initMessageLogger(supabase);

  const activeTenants = await getActiveWabaTenants(supabase);
  let nudge1Count = 0;
  let nudge2Count = 0;
  let totalCandidates = 0;
  const errors: string[] = [];

  for (const tenant of activeTenants) {
    const creds = await getTenantWabaCredentials(supabase, tenant);
    if (!creds) continue;

    await runWithRequestTenantId(
      tenant.tenantId,
      () => processTenantCartNudge(tenant.tenantId, creds),
    );
  }

  async function processTenantCartNudge(
    tenantId: string,
    creds: TenantWabaCredentials,
  ): Promise<void> {
    let blockedPhones: Set<string>;
    try {
      blockedPhones = await loadSilentPhoneSet(supabase);
    } catch (err) {
      console.error(
        `[cart-nudge] loadSilentPhoneSet falló (${tenantId}), abortando corrida (fail-closed):`,
        err instanceof Error ? err.message : err,
      );
      errors.push(`${tenantId}: silent phone check failed`);
      return;
    }

    const sessionsRaw = (await supabaseRequest(
      `whatsapp_sessions?select=phone,cart_items,cart_service_ids,step,updated_at,from_ad_at,nudge1_sent_at,nudge2_sent_at,browse_reengage_sent_at,ads_bounce_nudge_sent_at,watchdog_sent_at,selected_day` +
        `&tenant_id=eq.${encodeURIComponent(tenantId)}` +
        `&nudge2_sent_at=is.null` +
        `&or=(cart_items.neq.%5B%5D,cart_service_ids.neq.%5B%5D)`,
    )) as Session[];

    if (!Array.isArray(sessionsRaw)) {
      console.error(`[cart-nudge] query de sesiones falló (${tenantId})`);
      errors.push(`${tenantId}: query failed`);
      return;
    }

    const candidates = sessionsRaw.filter((session) => {
      if (blockedPhones.has(session.phone)) return false;
      if (!hasActiveCart(session)) return false;
      const minutesInactive =
        (now.getTime() - new Date(session.updated_at).getTime()) / 60000;
      if (minutesInactive < NUDGE1_MIN) return false;
      if (minutesInactive > CANDIDATE_MAX_MINUTES) return false;
      return true;
    });
    totalCandidates += candidates.length;

    const [catalog, wabaConfig] = await Promise.all([
      loadCatalog(supabase),
      loadWabaConfig(supabase),
    ]);

    for (const session of candidates) {
      const phone = session.phone;
      const updatedAt = new Date(session.updated_at);
      const minutesInactive = (now.getTime() - updatedAt.getTime()) / 60000;
      const cartDesc = getCartDescription(
        session.cart_items,
        session.cart_service_ids,
      );

      try {
        // Guard cruzado: otro reenganche ya habló en este episodio (sin inbound nuevo)
        const { data: lastInRow } = await supabase
          .from("wa_messages")
          .select("created_at")
          .eq("phone", phone)
          .eq("tenant_id", tenantId)
          .eq("direction", "in")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const lastInAt = lastInRow?.created_at
          ? new Date(lastInRow.created_at).getTime()
          : 0;
        const browseAt = session.browse_reengage_sent_at
          ? new Date(session.browse_reengage_sent_at).getTime()
          : 0;
        const adsAt = session.ads_bounce_nudge_sent_at
          ? new Date(session.ads_bounce_nudge_sent_at).getTime()
          : 0;
        const watchAt = session.watchdog_sent_at
          ? new Date(session.watchdog_sent_at).getTime()
          : 0;
        if (
          (browseAt > 0 && browseAt >= lastInAt) ||
          (adsAt > 0 && adsAt >= lastInAt) ||
          (watchAt > 0 && watchAt >= lastInAt)
        ) {
          console.log(`[cart-nudge] skip ya reenganchada: ${phone.slice(-4)}`);
          continue;
        }

        // ── Nudge 2: ≥90 min desde nudge1 (colchón 24h si se difirió de noche) ──
        if (session.nudge1_sent_at && !session.nudge2_sent_at) {
          const minutesSinceNudge1 =
            (now.getTime() - new Date(session.nudge1_sent_at).getTime()) /
            60000;
          if (
            minutesSinceNudge1 >= NUDGE2_MIN &&
            minutesSinceNudge1 <= CANDIDATE_MAX_MINUTES
          ) {
            const clientName = await loadClientNameForPhone(supabase, phone);
            const serviceIds = await resolveSessionServiceIds(
              supabase,
              session,
            );
            const emotionalNudge2 = isCtwaEmotionalEligible(
              session.from_ad_at,
              serviceIds,
              catalog,
            );
            const rawMsg2 = emotionalNudge2
              ? buildEmotionalNudge2Text(wabaConfig, cartDesc)
              : `Vemos que dejaste ${cartDesc} ${
                listosWord(cartDesc)
              } para agendar en ZM Lash & Nails Beauty 💜\n\n` +
                `Si ya no deseas continuar, no hay problema 😊 Pero si quieres tu cita, solo escribe *agendar* y te ayudamos en segundos.\n\n` +
                `_Tu selección se liberará pronto._ ✨`;
            const msg2 = addressWithoutHello(clientName, rawMsg2);
            await sendTextWA(
              creds,
              phone,
              msg2,
              undefined,
              emotionalNudge2 ? "emotional" : "generic",
            );
            await supabaseRequest(
              `whatsapp_sessions?phone=eq.${
                encodeURIComponent(phone)
              }&tenant_id=eq.${encodeURIComponent(tenantId)}`,
              "PATCH",
              {
                cart_items: "[]",
                cart_service_ids: "[]",
                nudge2_sent_at: nowIso,
                step: "browsing",
              },
            );
            nudge2Count++;
            continue;
          }
        }

        // ── Nudge 1: ≥12 min sin actividad (colchón 24h si se difirió) ─────────
        if (
          !session.nudge1_sent_at &&
          minutesInactive >= NUDGE1_MIN &&
          minutesInactive <= CANDIDATE_MAX_MINUTES
        ) {
          const enCalendario = session.step === "awaiting_datetime";
          // Si ya eligió el día (solo falta hora), no invitarla a "elegir el día"
          // de nuevo — Doris …8088 recibió esa copy con el día ya elegido,
          // reenviando en realidad el selector de hora (12-sep-2026).
          const dayAlreadyPicked = Boolean(session.selected_day);
          const clientName = await loadClientNameForPhone(supabase, phone);
          const serviceIds = await resolveSessionServiceIds(supabase, session);
          const rubro = primaryRubroFromServiceIds(serviceIds, catalog);
          const emotionalAlmostClose = enCalendario &&
            rubro != null &&
            isCtwaEmotionalEligible(session.from_ad_at, serviceIds, catalog);
          const serviceName = primaryServiceLabel(serviceIds, catalog);
          const rawMsg = emotionalAlmostClose && rubro
            ? buildAlmostCloseNudge1Text(
              wabaConfig,
              phone,
              rubro,
              serviceName,
              dayAlreadyPicked,
            )
            : enCalendario
            ? dayAlreadyPicked
              ? `Tienes ${cartDesc} ${
                listosWord(cartDesc)
              } — solo falta elegir la hora 💜\n\n` +
                `Te reenviamos el horario disponible 👇`
              : `Tienes ${cartDesc} ${
                listosWord(cartDesc)
              } — solo falta elegir día y hora 💜\n\n` +
                `Te reenviamos el calendario 👇`
            : `Tienes ${cartDesc} en tu selección y aún no confirmaste tu cita 💜\n\n` +
              `¿Seguimos? Escribe *agendar* y te paso al calendario en segundos 🗓️`;
          const msg = addressWithoutHello(clientName, rawMsg);
          if (emotionalAlmostClose && rubro) {
            const image = resolveAlmostCloseImage(
              wabaConfig,
              catalog,
              serviceIds,
              serviceName,
            );
            if (image?.url) {
              await sendImageWA(
                creds,
                phone,
                image.url,
                image.caption ?? "",
                session.step,
                "emotional",
              );
            }
          }
          await sendTextWA(
            creds,
            phone,
            msg,
            session.step,
            emotionalAlmostClose ? "emotional" : "generic",
          );
          if (enCalendario) {
            const sent = await resendCalendarForPhone(supabase, phone, catalog);
            if (!sent) {
              console.warn(
                `[cart-nudge] No se pudo reenviar calendario para ${phone}`,
              );
            }
          }
          await supabaseRequest(
            `whatsapp_sessions?phone=eq.${
              encodeURIComponent(phone)
            }&tenant_id=eq.${encodeURIComponent(tenantId)}`,
            "PATCH",
            { nudge1_sent_at: nowIso },
          );
          nudge1Count++;
        }
      } catch (err) {
        errors.push(`${phone}: ${err}`);
      }
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      nudge1: nudge1Count,
      nudge2: nudge2Count,
      candidates: totalCandidates,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: nowIso,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
