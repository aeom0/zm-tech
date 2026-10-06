// ads-bounce-nudge — Reenganche CTWA sin 2.º mensaje (~2 h).
// Cron cada 30 min. Solo sesiones con from_ad_at, sin carrito, sin inbound
// posterior al welcome. Steps: browsing | awaiting_ctwa_interest | null.
// Texto libre dentro de ventana 24h (sin plantilla).
// Horario de ENVÍO propio (9–22 Lima, todos los días) — independiente del salón.

import {
  clearAnthropicCreditExhaustedFlag,
  logAIUsage,
  reportAnthropicApiFailure,
} from "../whatsapp-webhook/lib/haiku-usage.ts";
import type { SupabaseClient } from "../whatsapp-webhook/lib/supabase.ts";
import { addressWithoutHello } from "../whatsapp-webhook/lib/client-address.ts";
import { runWithRequestTenantId } from "../whatsapp-webhook/lib/tenant.ts";
import { getSupabase } from "../whatsapp-webhook/lib/supabase.ts";
import {
  getActiveWabaTenants,
  getTenantWabaCredentials,
  sendWhatsAppMessage,
  type TenantWabaCredentials,
} from "../_shared/tenant-waba.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET");
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const LIMA_UTC_OFFSET = 5; // UTC-5
const HAIKU_TIMEOUT_MS = 5000;
const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

/** Elegible tras 90 min sin 2.º inbound (no molestar si sigue activa). */
const NUDGE_MIN = 90;
/**
 * Colchón de seguridad en el RPC (no la ventana ideal 90–150).
 * Permite diferir madrugada → 9 AM sin perder el lead tras 150 min.
 */
const CANDIDATE_MAX_MINUTES = 24 * 60;

const DEFAULT_NUDGE_TEXT =
  "¿Sigues interesada en lo que viste en Instagram? 💜\n" +
  "Cuéntanos qué te gustaría (pestañas, cejas, uñas…) y te pasamos precios y horarios aquí mismo.";

interface BounceCandidate {
  phone: string;
  from_ad_at: string;
  session_step: string | null;
  ads_bounce_nudge_sent_at: string | null;
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
  if (!res.ok) {
    const err = await res.text();
    console.error(
      `[ads-bounce-nudge] REST ${method} ${path}:`,
      err.slice(0, 200),
    );
    return null;
  }
  return res.json();
}

async function rpcFindCandidates(
  tenantId: string,
  minMinutes: number,
  maxMinutes: number,
): Promise<BounceCandidate[]> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/rpc/waba_find_ads_bounce_phones`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_tenant_id: tenantId,
        min_minutes: minMinutes,
        max_minutes: maxMinutes,
      }),
    },
  );
  if (!res.ok) {
    const err = await res.text();
    console.error("[ads-bounce-nudge] RPC error:", err.slice(0, 300));
    return [];
  }
  const data = await res.json();
  return Array.isArray(data) ? (data as BounceCandidate[]) : [];
}

async function loadNudgeText(tenantId: string): Promise<string> {
  const rows = (await supabaseRequest(
    `waba_config?config_key=eq.meta_ads_bounce_nudge_text&tenant_id=eq.${encodeURIComponent(tenantId)}&select=config_value&is_active=eq.true&limit=1`,
  )) as Array<{ config_value?: { text?: string } }> | null;
  const text = rows?.[0]?.config_value?.text;
  return typeof text === "string" && text.trim()
    ? text.trim()
    : DEFAULT_NUDGE_TEXT;
}


/**
 * Copy por rubro (análisis 06-oct): el texto de `waba_config` lista pestañas
 * (Clásicas/Rímel/3D/4D/Lifting) y contradecía a clientas que ya habían pedido
 * uñas/cejas. Haiku lee el hilo y redacta el nudge del rubro conversado.
 *  - string  → copy del rubro específico
 *  - ""      → sin rubro claro (clic de anuncio sin contexto): copy de waba_config
 *  - null    → Haiku falló: copy genérico neutral (no asume pestañas)
 */
async function askHaikuBounceCopy(
  supabase: SupabaseClient,
  phone: string,
  tenantId: string,
): Promise<string | null> {
  if (!ANTHROPIC_API_KEY) return null;
  const rows = (await supabaseRequest(
    `wa_messages?phone=eq.${encodeURIComponent(phone)}&tenant_id=eq.${encodeURIComponent(tenantId)}&select=direction,content&order=created_at.desc&limit=8`,
  )) as Array<{ direction: string; content: string | null }> | null;
  if (!rows) return null;
  const transcript = rows
    .reverse()
    .map((m) => `[${m.direction}] ${(m.content ?? "").slice(0, 300)}`)
    .join("\n");

  const systemPrompt =
    "Eres parte del equipo de ZM Lash & Nails Beauty (salón en Perú). Una clienta " +
    "llegó desde un anuncio de Instagram/Meta, recibió respuesta y no volvió a " +
    "escribir en ~2 h. 'in' = clienta, 'out' = equipo/bot. Redacta 1–2 líneas " +
    "para retomar, en español peruano, tono asesora cercana. " +
    "Si el hilo muestra un rubro concreto (uñas, pestañas, cejas, lifting, " +
    "depilación, etc.), habla SOLO de ese rubro e invita a elegir el servicio o " +
    "el día; NO listes otros rubros ni servicios de otro rubro. " +
    "Si el hilo no muestra ningún rubro concreto, devuelve message vacío. " +
    "PROHIBIDO: apodos (babe, amor, cielo, linda, reina…), saludar con Hola, " +
    "inventar precios/horarios/dirección, redirigir al 932 (este YA es el canal), " +
    "decir que dejas calendario. Responde ÚNICAMENTE JSON: " +
    '{"message": "texto o cadena vacía"}';

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
      void reportAnthropicApiFailure(supabase, {
        status: response.status,
        bodyText: errText,
        source: "ads_bounce_nudge",
        phoneNumber: phone,
      });
      return null;
    }
    const data = await response.json();
    void clearAnthropicCreditExhaustedFlag(supabase);
    void logAIUsage(
      supabase,
      "ads_bounce_nudge",
      (data?.usage?.input_tokens as number) ?? 0,
      (data?.usage?.output_tokens as number) ?? 0,
      phone,
    );
    const rawText = (data?.content?.[0]?.text as string | undefined)?.trim();
    const jsonMatch = rawText?.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]);
    return typeof parsed.message === "string" ? parsed.message.trim() : null;
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[ads-bounce-nudge] Haiku:", (err as Error).message);
    return null;
  }
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
    console.error(`[ads-bounce-nudge] WA error para ${to}:`, err.slice(0, 200));
    return false;
  }
  await supabaseRequest("wa_messages", "POST", {
    phone: to,
    tenant_id: creds.tenantId,
    direction: "out",
    msg_type: "text",
    content: message,
    step_before: "browsing",
    source: "nudge",
  });
  return true;
}

async function loadBlockedPhones(tenantId: string): Promise<Set<string>> {
  const fallback = ["51907976917", "51981002000", "519810020000"];
  try {
    const rows = (await supabaseRequest(
      `waba_config?config_key=eq.blocked_phone_numbers&tenant_id=eq.${encodeURIComponent(tenantId)}&is_active=eq.true&select=config_value&limit=1`,
    )) as Array<{ config_value?: { phones?: unknown } }> | null;
    const raw = rows?.[0]?.config_value?.phones;
    const fromCms = Array.isArray(raw)
      ? raw.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean)
      : [];
    return new Set([...fallback, ...fromCms]);
  } catch {
    return new Set(fallback);
  }
}

/** Baja de marketing (STOP). Fail-closed: `null` = la query falló → lanzar. */
async function loadMarketingOptOutPhones(
  tenantId: string,
): Promise<Set<string>> {
  const rows = (await supabaseRequest(
    `waba_config?config_key=eq.marketing_opt_out&tenant_id=eq.${encodeURIComponent(tenantId)}&is_active=eq.true&select=config_value&limit=1`,
  )) as Array<{ config_value?: { phones?: unknown } }> | null;
  if (rows === null) throw new Error("marketing_opt_out query falló");
  const raw = rows[0]?.config_value?.phones;
  return new Set(
    Array.isArray(raw)
      ? raw.map((v) => (typeof v === "string" ? v.trim() : "")).filter(Boolean)
      : [],
  );
}

/**
 * Sesiones con staff takeover (foto diseño / pausa manual).
 *
 * Fail-closed: `supabaseRequest` traga los 4xx/5xx y devuelve `null`
 * (log + continuar), lo cual para esta query en particular es peligroso —
 * un `null` aquí se interpretaba como "nadie está pausado" y dejaba pasar
 * nudges a clientas pausadas a mano (incidente María …6497, 10-sep: 504
 * transitorio de PostgREST justo en esta query). Reintenta 1 vez y, si
 * sigue fallando, lanza para que el caller aborte el envío.
 */
async function loadPausedPhones(tenantId: string): Promise<Set<string>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300));
    const rows = (await supabaseRequest(
      `whatsapp_sessions?bot_paused_at=not.is.null&tenant_id=eq.${encodeURIComponent(tenantId)}&select=phone`,
    )) as Array<{ phone?: string }> | null;
    if (rows !== null) {
      return new Set(
        rows
          .map((r) => (typeof r.phone === "string" ? r.phone.trim() : ""))
          .filter(Boolean),
      );
    }
  }
  throw new Error("loadPausedPhones falló tras reintento");
}

/**
 * OUT panel / staff_app recientes (Merillyn — no pisa cierre de Vanessa).
 * Fail-closed, mismo criterio que {@link loadPausedPhones}.
 */
async function loadRecentStaffOutboundPhones(
  tenantId: string,
): Promise<Set<string>> {
  const since = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300));
    const rows = (await supabaseRequest(
      `wa_messages?direction=eq.out&source=in.(panel,staff_app)&created_at=gte.${encodeURIComponent(since)}&tenant_id=eq.${encodeURIComponent(tenantId)}&select=phone`,
    )) as Array<{ phone?: string }> | null;
    if (rows !== null) {
      return new Set(
        rows
          .map((r) => (typeof r.phone === "string" ? r.phone.trim() : ""))
          .filter(Boolean),
      );
    }
  }
  throw new Error("loadRecentStaffOutboundPhones falló tras reintento");
}

/**
 * Horario propio del reenganche CTWA: 9:00–22:00 Lima, todos los días
 * (incluye domingo y feriados). Independiente del horario de atención del salón.
 */
function isWithinReengancheHours(): boolean {
  const utcNow = new Date();
  const limaHour = (utcNow.getUTCHours() - LIMA_UTC_OFFSET + 24) % 24;
  return limaHour >= 9 && limaHour < 22;
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const isCron = Boolean(CRON_SECRET) && authHeader === `Bearer ${CRON_SECRET}`;
  const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  if (!isCron && !isServiceRole) {
    return new Response("Unauthorized", { status: 401 });
  }

  const qaBypassHours =
    isCron && req.headers.get("X-QA-Bypass-Hours") === "true";
  const nowIso = new Date().toISOString();

  const supabase = getSupabase();
  const activeTenants = await getActiveWabaTenants(supabase);
  let sent = 0;
  let totalCandidates = 0;
  const errors: string[] = [];
  const skippedForHours: string[] = [];

  for (const tenant of activeTenants) {
    const creds = await getTenantWabaCredentials(supabase, tenant);
    if (!creds) continue;

    await runWithRequestTenantId(tenant.tenantId, () =>
      processTenantAdsBounce(tenant.tenantId, creds),
    );
  }

  async function processTenantAdsBounce(
    tenantId: string,
    creds: TenantWabaCredentials,
  ): Promise<void> {
    let blockedPhones: Set<string>;
    let pausedPhones: Set<string>;
    let optOutPhones: Set<string>;
    let staffRecentPhones: Set<string>;
    try {
      blockedPhones = await loadBlockedPhones(tenantId);
      pausedPhones = await loadPausedPhones(tenantId);
      optOutPhones = await loadMarketingOptOutPhones(tenantId);
      staffRecentPhones = await loadRecentStaffOutboundPhones(tenantId);
    } catch (err) {
      console.error(
        `[ads-bounce-nudge] chequeo de teléfonos silenciados falló (${tenantId}), abortando corrida (fail-closed):`,
        err instanceof Error ? err.message : err,
      );
      errors.push(`${tenantId}: silent phone check failed`);
      return;
    }
    const silentPhones = new Set([
      ...blockedPhones,
      ...pausedPhones,
      ...optOutPhones,
      ...staffRecentPhones,
    ]);
    const candidates = (
      await rpcFindCandidates(tenantId, NUDGE_MIN, CANDIDATE_MAX_MINUTES)
    ).filter((c) => !silentPhones.has(c.phone));
    totalCandidates += candidates.length;

    if (!qaBypassHours && !isWithinReengancheHours()) {
      console.log(
        `[ads-bounce-nudge] ${candidates.length} candidatas (${tenantId}), 0 enviadas, fuera de horario reenganche (9am-10pm Lima)`,
      );
      skippedForHours.push(tenantId);
      return;
    }

    const nudgeText = await loadNudgeText(tenantId);

    for (const row of candidates) {
      const phone = row.phone;
      try {
        // Re-leer antes de enviar (carrera con browse/watchdog a las 09:00)
        const sessions = (await supabaseRequest(
          `whatsapp_sessions?phone=eq.${encodeURIComponent(phone)}&tenant_id=eq.${encodeURIComponent(tenantId)}&select=from_ad_at,ads_bounce_nudge_sent_at,browse_reengage_sent_at,watchdog_sent_at`,
        )) as Array<{
          from_ad_at?: string | null;
          ads_bounce_nudge_sent_at?: string | null;
          browse_reengage_sent_at?: string | null;
          watchdog_sent_at?: string | null;
        }> | null;
        const sess = sessions?.[0];
        const fromAd = sess?.from_ad_at
          ? new Date(sess.from_ad_at).getTime()
          : 0;
        const browseAt = sess?.browse_reengage_sent_at
          ? new Date(sess.browse_reengage_sent_at).getTime()
          : 0;
        const watchAt = sess?.watchdog_sent_at
          ? new Date(sess.watchdog_sent_at).getTime()
          : 0;
        const adsAt = sess?.ads_bounce_nudge_sent_at
          ? new Date(sess.ads_bounce_nudge_sent_at).getTime()
          : 0;
        if (adsAt > 0 && fromAd > 0 && adsAt >= fromAd) {
          console.log(`[ads-bounce-nudge] skip ya enviado: ${phone.slice(-4)}`);
          continue;
        }
        if (
          (browseAt > 0 && fromAd > 0 && browseAt >= fromAd) ||
          (watchAt > 0 && fromAd > 0 && watchAt >= fromAd)
        ) {
          console.log(
            `[ads-bounce-nudge] skip browse/watchdog ya habló: ${phone.slice(-4)}`,
          );
          await supabaseRequest(
            `whatsapp_sessions?phone=eq.${encodeURIComponent(phone)}&tenant_id=eq.${encodeURIComponent(tenantId)}`,
            "PATCH",
            { ads_bounce_nudge_sent_at: nowIso },
          );
          continue;
        }

        const tenantFilter = `&tenant_id=eq.${encodeURIComponent(tenantId)}`;
        const clientRows = (await supabaseRequest(
          phone.startsWith("PE.")
            ? `clients?wa_user_id=eq.${encodeURIComponent(phone)}${tenantFilter}&select=name&limit=1`
            : `clients?or=(phone.eq.${encodeURIComponent(phone)},phone_normalized.eq.${encodeURIComponent(phone.slice(-9))})${tenantFilter}&select=name&limit=1`,
        )) as Array<{ name?: string }> | null;
        const clientName = clientRows?.[0]?.name ?? null;
        const haikuCopy = await askHaikuBounceCopy(supabase, phone, tenantId);
        const copy =
          haikuCopy === null
            ? DEFAULT_NUDGE_TEXT
            : haikuCopy || nudgeText;
        const styled = addressWithoutHello(clientName, copy);
        const ok = await sendTextWA(creds, phone, styled);
        if (!ok) {
          errors.push(`${phone}: WA send failed`);
          continue;
        }
        await supabaseRequest(
          `whatsapp_sessions?phone=eq.${encodeURIComponent(phone)}&tenant_id=eq.${encodeURIComponent(tenantId)}`,
          "PATCH",
          { ads_bounce_nudge_sent_at: nowIso },
        );
        sent++;
      } catch (err) {
        errors.push(`${phone}: ${err}`);
      }
    }
  }

  if (skippedForHours.length > 0 && skippedForHours.length === activeTenants.length) {
    return new Response(
      JSON.stringify({
        skipped: true,
        reason: "fuera de horario reenganche (9am-10pm Lima)",
        candidates: totalCandidates,
      }),
      { headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      success: true,
      sent,
      candidates: totalCandidates,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: nowIso,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
