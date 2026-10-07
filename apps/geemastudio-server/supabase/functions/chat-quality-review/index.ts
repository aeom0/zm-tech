// chat-quality-review — Auditor Haiku de calidad en chats WABA activos.
// Cron */15. NO habla con la clienta: solo clasifica fallos y push a owner/dev.
//
// Flags (caso Yoja / Eli 02-ago):
//   unanswered_price — preguntó precio/incluido y el bot no aclaró bien
//   cart_mismatch    — carrito no refleja lo que pidió (dup / servicio equivocado)
//   promo_ignored    — citó promo/descuento del anuncio y el bot lo ignoró
//   client_confused  — clienta molesta/confundida ("por qué no dice", etc.)
//
// Anti-spam: quality_review_sent_at en whatsapp_sessions; se reevalúa solo
// si hay actividad nueva tras el último review.
// Deploy: --no-verify-jwt (mismo patrón que silence-watchdog).

import {
  clearAnthropicCreditExhaustedFlag,
  logAIUsage,
  reportAnthropicApiFailure,
} from "../whatsapp-webhook/lib/haiku-usage.ts";
import { notifyAdmins } from "../whatsapp-webhook/lib/notify.ts";
import {
  getSupabase,
  type SupabaseClient,
} from "../whatsapp-webhook/lib/supabase.ts";
import { loadSilentPhoneSet } from "../whatsapp-webhook/lib/waba-config.ts";
import { isWaBsuid } from "../_shared/wa-recipient.mjs";
import { formatQualityPushCopy } from "../_shared/push-copy.mjs";
import { runWithRequestTenantId } from "../whatsapp-webhook/lib/tenant.ts";
import { getActiveWabaTenants } from "../_shared/tenant-waba.ts";
import { WABA_PANEL_BASE } from "../whatsapp-webhook/lib/panel-url.ts";

const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const CRON_SECRET = Deno.env.get("CRON_SECRET");

const MIN_AGE_MINUTES = 4;
const MAX_AGE_MINUTES = 30;
const MAX_ROWS = 8;
const HISTORY_LIMIT = 12;
const HAIKU_TIMEOUT_MS = 6000;
const HAIKU_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const ALLOWED_FLAGS = new Set([
  "unanswered_price",
  "cart_mismatch",
  "promo_ignored",
  "client_confused",
]);

const FLAG_LABELS: Record<string, string> = {
  unanswered_price: "precio sin aclarar",
  cart_mismatch: "carrito ≠ pedido",
  promo_ignored: "promo ignorada",
  client_confused: "clienta confundida",
};

interface CandidateRow {
  phone: string;
  last_activity_at: string;
  session_step: string | null;
  cart_items: string | null;
  quality_review_sent_at: string | null;
}

interface WaMessageRow {
  direction: "in" | "out";
  content: string | null;
  msg_type: string | null;
  created_at: string;
}

interface HaikuVerdict {
  needs_alert: boolean;
  flags: string[];
  summary: string;
  severity: "high" | "medium" | "low";
}

/** Nombre / @username para push Revisar YA (soporta BSUID PE.…). */
async function resolveClientDisplay(
  supabase: SupabaseClient,
  phone: string,
): Promise<{ firstName: string | null; waUsername: string | null }> {
  if (isWaBsuid(phone)) {
    const { data } = await supabase
      .from("clients")
      .select("name, wa_username")
      .eq("wa_user_id", phone)
      .maybeSingle();
    const n = (data?.name ?? "").trim();
    const first =
      n.length >= 2 && !/^cliente\s+wa/i.test(n) && !/^qa\s/i.test(n)
        ? n.split(/\s+/)[0]?.slice(0, 24) || null
        : null;
    return {
      firstName: first,
      waUsername: (data?.wa_username ?? "").trim() || null,
    };
  }
  const last9 = phone.replace(/\D/g, "").slice(-9);
  if (last9.length < 9) return { firstName: null, waUsername: null };
  const { data } = await supabase
    .from("clients")
    .select("name, wa_username")
    .or(`phone.ilike.%${last9},phone_normalized.eq.${last9}`)
    .limit(5);
  const row = (data ?? []).find((r) => {
    const n = (r.name ?? "").trim();
    return n.length >= 2 && !/^cliente\s+wa/i.test(n) && !/^qa\s/i.test(n);
  });
  if (!row?.name) {
    const withUser = (data ?? []).find((r) => (r.wa_username ?? "").trim());
    return {
      firstName: null,
      waUsername: (withUser?.wa_username ?? "").trim() || null,
    };
  }
  const first = row.name.trim().split(/\s+/)[0];
  return {
    firstName: first?.slice(0, 24) || null,
    waUsername: (row.wa_username ?? "").trim() || null,
  };
}

function parseCartLabel(cartItemsJson: string | null): string {
  if (!cartItemsJson || cartItemsJson === "[]") return "(carrito vacío)";
  try {
    const items = JSON.parse(cartItemsJson) as Array<Record<string, unknown>>;
    if (!Array.isArray(items) || items.length === 0) return "(carrito vacío)";
    return items
      .map((it) => {
        const t = it.item_type ?? it.t ?? "?";
        const id = String(it.item_id ?? it.id ?? "").slice(0, 8);
        const price = it.price != null ? ` S/${it.price}` : "";
        return `${t}:${id}${price}`;
      })
      .join("; ");
  } catch {
    return cartItemsJson.slice(0, 120);
  }
}

async function askHaikuQuality(
  supabase: SupabaseClient,
  phone: string,
  history: WaMessageRow[],
  cartLabel: string,
  step: string | null,
): Promise<HaikuVerdict | null> {
  if (!ANTHROPIC_API_KEY) return null;

  const transcript = history
    .map((m) => {
      const tag = m.msg_type && m.msg_type !== "text" ? `/${m.msg_type}` : "";
      return `[${m.direction}${tag}] ${(m.content ?? "").slice(0, 350)}`;
    })
    .join("\n");

  const systemPrompt =
    "Eres auditor de calidad del WhatsApp de ZM Lash & Nails Beauty (salón en Perú). " +
    "Revisas si el bot/equipo falló al atender a la clienta. 'in' = clienta, 'out' = bot. " +
    "NO inventes problemas: solo marca flags si hay evidencia clara en el transcript. " +
    "CTWA boilerplate + imágenes de bienvenida NO es fallo. " +
    "CTWA con un solo inbound (sin 2.º mensaje real) y carrito vacío NO es fallo — lo cubre ads-bounce; needs_alert=false. " +
    "No marques promo_ignored solo porque el CTA del anuncio menciona 15% y el welcome aún no cotizó. " +
    "Si la clienta ya eligió día/hora o cerró con gracias, needs_alert=false. " +
    "Confirmar/reprogramar un recordatorio de cita, saludar, agradecer o pedir ubicación/horario respondidos correctamente NO es fallo: needs_alert=false. " +
    "Ante la duda, needs_alert=false; una alerta solo si el equipo debe intervenir YA (severity high o medium). " +
    "EFECTOS DE EXTENSIONES (ojo de gato/cat eye, ardilla, ojo abierto, fox, wispy, etc.): " +
    "son mapeos/estilos del servicio base, NO servicios aparte ni promos. " +
    "Si pidió 'rímel ojo de gato' / 'rimel + efecto X' y el carrito tiene Extensiones Rímel " +
    "(o el servicio base correcto), NUNCA marques cart_mismatch ni unanswered_price solo por el efecto. " +
    "Responde SOLO JSON válido sin markdown:\n" +
    '{"needs_alert":boolean,"flags":string[],"summary":"1 frase en español","severity":"high|medium|low"}\n' +
    "flags permitidos (subconjunto):\n" +
    "- unanswered_price: preguntó precio/qué incluye y la respuesta no aclara o evade\n" +
    "- cart_mismatch: el carrito no refleja lo pedido (servicios duplicados, pie cobrado 2 veces, " +
    "agregó algo que no pidió, o ignoró el pack/combo que pidió). " +
    "NUNCA marques cart_mismatch si Carrito actual es vacío — no hay mismatch sin ítems. " +
    "NUNCA por efecto/estilo (ojo de gato, ardilla…) si el servicio base del pedido está en el carrito.\n" +
    "- promo_ignored: citó descuento/promo del anuncio (ej. 15% Lun-Miér) y el bot no la aplicó ni explicó\n" +
    "- client_confused: clienta molesta/confundida porque no le respondieron bien (ej. por qué no dice el precio)\n" +
    "Si no hay ninguno, needs_alert=false y flags=[].";

  const userPrompt = `Teléfono …${phone.slice(-4)}\n` +
    `Paso sesión: ${step ?? "browsing"}\n` +
    `Carrito actual: ${cartLabel}\n\n` +
    `Transcript (más reciente al final):\n${transcript}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), HAIKU_TIMEOUT_MS);
  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: HAIKU_MODEL,
        max_tokens: 220,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error("[chat-quality-review] Anthropic:", response.status);
      void reportAnthropicApiFailure(supabase, {
        status: response.status,
        bodyText: errText,
        source: "chat_quality_review",
        phoneNumber: phone,
      });
      return null;
    }
    const data = (await response.json()) as {
      content?: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    void clearAnthropicCreditExhaustedFlag(supabase);
    void logAIUsage(
      supabase,
      "chat_quality_review",
      data.usage?.input_tokens ?? 0,
      data.usage?.output_tokens ?? 0,
      phone,
    );
    const raw = (data.content ?? [])
      .filter((c) => c.type === "text" && c.text)
      .map((c) => c.text!)
      .join("")
      .trim();
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as Partial<HaikuVerdict>;
    const flags = Array.isArray(parsed.flags)
      ? parsed.flags.filter(
        (f) => typeof f === "string" && ALLOWED_FLAGS.has(f),
      )
      : [];
    const severity = parsed.severity === "high" || parsed.severity === "low"
      ? parsed.severity
      : "medium";
    return {
      needs_alert: Boolean(parsed.needs_alert) && flags.length > 0,
      flags,
      summary: typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim().slice(0, 160)
        : flags.map((f) => FLAG_LABELS[f] ?? f).join("; "),
      severity,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      console.warn("[chat-quality-review] Haiku timeout");
    } else {
      console.error("[chat-quality-review] Haiku error:", err);
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization") ?? "";
  const isCron = CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`;
  const isServiceRole = authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  if (!isCron && !isServiceRole) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = getSupabase();
  const nowIso = new Date().toISOString();

  let includeQa = false;
  try {
    const body = (await req.json()) as { include_qa?: boolean };
    includeQa = body?.include_qa === true;
  } catch {
    // cron envía {} o body vacío
  }

  const activeTenants = await getActiveWabaTenants(supabase);
  let reviewed = 0;
  let alerted = 0;
  const errors: string[] = [];

  for (const tenant of activeTenants) {
    await runWithRequestTenantId(tenant.tenantId, async () => {
      const blockedPhones = await loadSilentPhoneSet(supabase);

      const { data: candidates, error: candidatesError } = await supabase.rpc(
        "waba_find_quality_review_candidates",
        {
          p_tenant_id: tenant.tenantId,
          min_age_minutes: MIN_AGE_MINUTES,
          max_age_minutes: MAX_AGE_MINUTES,
          max_rows: MAX_ROWS,
          include_qa: includeQa,
        },
      );

      if (candidatesError) {
        console.error(
          `[chat-quality-review] candidatos (${tenant.tenantId}):`,
          candidatesError.message,
        );
        errors.push(`${tenant.tenantId}: ${candidatesError.message}`);
        return;
      }

      const rows = ((candidates ?? []) as CandidateRow[]).filter(
        (r) => !blockedPhones.has(r.phone),
      );

      for (const row of rows) {
        // Con include_qa (scripts QA) sí revisamos teléfonos 519990009xx;
        // notifyAdmins ya omite el push FCM para isQaWaPhone.
        reviewed++;
        try {
          // Asegurar fila de sesión para poder marcar quality_review_sent_at
          const { data: existing } = await supabase
            .from("whatsapp_sessions")
            .select("phone, from_ad_at, cart_items, step")
            .eq("phone", row.phone)
            .eq("tenant_id", tenant.tenantId)
            .maybeSingle();
          if (!existing) {
            await supabase.from("whatsapp_sessions").upsert(
              {
                phone: row.phone,
                tenant_id: tenant.tenantId,
                step: row.session_step ?? "browsing",
                cart_items: row.cart_items ?? "[]",
                updated_at: nowIso,
              },
              { onConflict: "tenant_id,phone" },
            );
          }

          // Karla: CTWA temprano (1 inbound desde from_ad, sin carrito) → ads-bounce, no push
          const sess = existing ?? {
            from_ad_at: null as string | null,
            cart_items: row.cart_items ?? "[]",
          };
          const cartEmpty = (() => {
            try {
              const items = JSON.parse(String(sess.cart_items ?? "[]"));
              return !Array.isArray(items) || items.length === 0;
            } catch {
              return true;
            }
          })();
          if (sess.from_ad_at && cartEmpty) {
            const fromAdMs = new Date(sess.from_ad_at).getTime();
            const { count: inboundSinceAd } = await supabase
              .from("wa_messages")
              .select("id", { count: "exact", head: true })
              .eq("phone", row.phone)
              .eq("tenant_id", tenant.tenantId)
              .eq("direction", "in")
              .gte("created_at", sess.from_ad_at);
            const nIn = inboundSinceAd ?? 0;
            if (Number.isFinite(fromAdMs) && nIn <= 1) {
              await supabase
                .from("whatsapp_sessions")
                .update({ quality_review_sent_at: nowIso })
                .eq("phone", row.phone)
                .eq("tenant_id", tenant.tenantId);
              console.log(
                `[chat-quality-review] skip CTWA temprano …${
                  row.phone.slice(-4)
                } inbounds=${nIn}`,
              );
              continue;
            }
          }

          const { data: history } = await supabase
            .from("wa_messages")
            .select("direction, content, msg_type, created_at")
            .eq("phone", row.phone)
            .eq("tenant_id", tenant.tenantId)
            .order("created_at", { ascending: false })
            .limit(HISTORY_LIMIT);

          const ordered = ((history ?? []) as WaMessageRow[]).reverse();
          const cartLabel = parseCartLabel(row.cart_items);
          const verdict = await askHaikuQuality(
            supabase,
            row.phone,
            ordered,
            cartLabel,
            row.session_step,
          );

          // Índice de alerta 100% (19/19, 21-23 sep): severidad "low" = ruido, no push.
          if (verdict?.needs_alert && verdict.severity === "low") {
            console.log(
              `[chat-quality-review] skip severity=low …${row.phone.slice(-4)}`,
            );
          } else if (verdict?.needs_alert) {
            let flags = verdict.flags;
            // Defensa: carrito vacío → no tiene sentido cart_mismatch (falso positivo SOFI)
            if (cartEmpty) {
              flags = flags.filter((f) => f !== "cart_mismatch");
            }
            if (flags.length === 0) {
              await supabase
                .from("whatsapp_sessions")
                .update({ quality_review_sent_at: nowIso })
                .eq("phone", row.phone)
                .eq("tenant_id", tenant.tenantId);
              continue;
            }
            const display = await resolveClientDisplay(supabase, row.phone);
            const { title, body } = formatQualityPushCopy({
              firstName: display.firstName,
              waUsername: display.waUsername,
              phone: row.phone,
              flags,
              summary: verdict.summary,
              severity: verdict.severity,
            });
            const whoLabel = display.firstName ||
              (display.waUsername ? `@${display.waUsername}` : null) ||
              "Sin teléfono";
            await notifyAdmins(supabase, title, body, {
              type: "waba_chat",
              phone: row.phone,
              client_name: whoLabel.slice(0, 80),
              error_kind: "quality_review",
              flags: flags.join(","),
              url: `${WABA_PANEL_BASE}?phone=${encodeURIComponent(row.phone)}`,
            });
            alerted++;
            console.log(
              `[chat-quality-review] alert ${whoLabel} …${
                row.phone.slice(-4)
              } flags=${flags.join(",")}`,
            );
          }

          await supabase
            .from("whatsapp_sessions")
            .update({ quality_review_sent_at: nowIso })
            .eq("phone", row.phone)
            .eq("tenant_id", tenant.tenantId);
        } catch (err) {
          errors.push(`${row.phone}: ${String(err)}`);
        }
      }
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      reviewed,
      alerted,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: nowIso,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
