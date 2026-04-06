// ai-assistant.ts — Capa de IA (Claude Haiku) para texto libre en browsing

import type { ServiceCatalog } from "../lib/services-catalog.ts";
import type { SupabaseClient } from "../lib/supabase.ts";
import type {
  HaikuRuntimeSettings,
  HaikuTriggerKeywordLists,
  WabaConfigMap,
} from "../lib/waba-config.ts";
import {
  getHaikuRuntimeSettings,
  resolveChatSystemPromptBase,
} from "../lib/waba-config.ts";
import { HAIKU_RUNTIME_NUMERIC_DEFAULTS } from "../lib/haiku-cms-defaults.ts";
import { formatMoney } from "../format.ts";
import type { WaSendConfig } from "../lib/tenant-config.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

export type AITriggerType = "free_question" | "recommendation" | "fallback";

export interface AITriggerResult {
  type: AITriggerType;
  originalMessage: string;
}

export interface AIContext {
  phoneNumber: string;
  contactName: string;
  catalog: ServiceCatalog;
  supabase: SupabaseClient;
  tenantId: string;
  currencyCode: string;
  timezone: string;
  businessName: string;
  wa: WaSendConfig;
}

const INTERACTIVE_PREFIXES = [
  "cat-",
  "svc-",
  "pack_",
  "pitem_",
  "promo_",
  "subcat_",
  "date_",
  "time_",
];
const CART_IDS = [
  "agregar_otro",
  "ver_seleccion",
  "agendar_ya",
  "vaciar_carrito",
  "volver_categorias",
];
const MENU_MAIN_OPTIONS = [
  "ver_promos",
  "agendar_cita",
  "ver_servicios",
  "horarios",
  "ubicacion",
];
const SALUDOS = [
  "hola",
  "buenos días",
  "buenos dias",
  "buenas tardes",
  "buenas noches",
  "hi",
  "hello",
  "menu",
  "menú",
  "inicio",
];

const DETERMINISTIC_INTENTS: { keywords: string[]; exact?: boolean }[] = [
  {
    keywords: [
      "promo",
      "promos",
      "promocion",
      "promociones",
      "oferta",
      "ofertas",
      "descuento",
      "descuentos",
    ],
  },
  {
    keywords: ["servicio", "servicios", "pack", "packs", "paquete", "paquetes"],
  },
  {
    keywords: [
      "agendar",
      "agenda",
      "reservar",
      "reserva",
      "cita",
      "quiero una cita",
      "hacer una cita",
    ],
  },
];

export function detectAITrigger(
  message: string,
  lists: HaikuTriggerKeywordLists,
): AITriggerResult | null {
  const trimmed = message.trim();
  const lower = trimmed.toLowerCase();

  const recommendationKw = lists.recommendation;
  const freeQuestionKw = lists.free_question;
  const blockedKw = lists.blocked;

  if (trimmed.length <= 3) return null;
  if (/^\d+$/.test(trimmed)) return null;

  for (const prefix of INTERACTIVE_PREFIXES) {
    if (lower.startsWith(prefix)) return null;
  }

  if (CART_IDS.includes(lower) || MENU_MAIN_OPTIONS.includes(lower))
    return null;

  if (SALUDOS.some((s) => lower.includes(s))) return null;

  for (const intent of DETERMINISTIC_INTENTS) {
    if (intent.keywords.some((k) => lower.includes(k))) return null;
  }

  if (blockedKw.length > 0 && blockedKw.some((k) => k && lower.includes(k))) {
    return null;
  }

  if (recommendationKw.some((k) => lower.includes(k))) {
    return { type: "recommendation", originalMessage: trimmed };
  }

  if (freeQuestionKw.some((k) => lower.includes(k))) {
    return { type: "free_question", originalMessage: trimmed };
  }

  return { type: "fallback", originalMessage: trimmed };
}

export function buildCatalogAppendix(
  catalog: ServiceCatalog,
  currencyCode: string,
): string {
  const lines: string[] = [];

  if (catalog.categories.length > 0) {
    lines.push("SERVICIOS DISPONIBLES:");
    for (const cat of catalog.categories) {
      const svcs = catalog.servicesByCategory.get(cat.id) ?? [];
      if (svcs.length === 0) continue;
      lines.push(`${cat.name}:`);
      for (const svc of svcs) {
        const price = parseFloat(svc.price) || 0;
        lines.push(
          `- ${svc.name} — ${formatMoney(price, currencyCode)} (${svc.duration}min)`,
        );
      }
    }
    lines.push("");
  }

  if (catalog.packs.length > 0) {
    lines.push("PACKS ESPECIALES:");
    for (const pack of catalog.packs) {
      const price = parseFloat(String(pack.pack_price)) || 0;
      const name = pack.short_name ?? pack.title;
      lines.push(`- ${name} — ${formatMoney(price, currencyCode)}`);
    }
    lines.push("");
  }

  if (catalog.promotions.length > 0) {
    lines.push("PROMOCIONES ACTIVAS:");
    for (const promo of catalog.promotions) {
      const badge = promo.badge ? ` (${promo.badge})` : "";
      const em = promo.emoji ? `${promo.emoji} ` : "";
      lines.push(`- ${em}${promo.title}${badge}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

export function composeHaikuChatSystem(
  baseFromDb: string,
  catalog: ServiceCatalog,
  clientContext: string,
  currencyCode: string,
): string {
  const appendix = buildCatalogAppendix(catalog, currencyCode);
  return [baseFromDb.trim(), appendix, clientContext.trim()]
    .filter(Boolean)
    .join("\n\n");
}

export async function getClientContext(
  supabase: SupabaseClient,
  tenantId: string,
  phoneNumber: string,
  timezone: string,
): Promise<string> {
  try {
    const { data: clientRows } = await supabase
      .from("clients")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .eq("phone", phoneNumber)
      .limit(1);

    const client = clientRows?.[0] as { id: string; name: string } | undefined;
    if (!client) return "CLIENTA: Primera visita (cliente nueva)";

    const { data: appts } = await supabase
      .from("appointments")
      .select("date, price, services(name)")
      .eq("tenant_id", tenantId)
      .eq("client_id", client.id)
      .eq("status", "completed")
      .order("date", { ascending: false })
      .limit(5);

    if (!appts || appts.length === 0) {
      return "CLIENTA: Primera visita (cliente nueva)";
    }

    const lastDate = new Date(appts[0].date).toLocaleDateString("es-VE", {
      timeZone: timezone,
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const serviceNames = appts
      .flatMap(
        (a: { services: { name: string } | { name: string }[] | null }) => {
          if (!a.services) return [];
          return Array.isArray(a.services)
            ? a.services.map((s) => s.name)
            : [a.services.name];
        },
      )
      .filter(Boolean)
      .slice(0, 5);

    const uniqueNames = [...new Set(serviceNames)];

    return [
      "HISTORIAL DE LA CLIENTA:",
      `- Es clienta recurrente (${appts.length} visita${appts.length !== 1 ? "s" : ""} previas)`,
      `- Última visita: ${lastDate}`,
      uniqueNames.length > 0
        ? `- Servicios anteriores: ${uniqueNames.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");
  } catch {
    return "";
  }
}

export async function callAnthropicAPI(
  systemPrompt: string,
  userMessage: string,
  opts?: { max_tokens?: number; timeout_ms?: number },
): Promise<{ text: string; inputTokens: number; outputTokens: number } | null> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    console.error("[AI] ANTHROPIC_API_KEY no configurada");
    return null;
  }

  const max_tokens =
    opts?.max_tokens ?? HAIKU_RUNTIME_NUMERIC_DEFAULTS.max_tokens;
  const timeout_ms =
    opts?.timeout_ms ?? HAIKU_RUNTIME_NUMERIC_DEFAULTS.timeout_ms;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout_ms);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        "[AI] Anthropic API error:",
        response.status,
        errText.slice(0, 200),
      );
      return null;
    }

    const data = await response.json();
    const text = (data?.content?.[0]?.text as string | undefined)?.trim();
    if (!text) return null;
    return {
      text,
      inputTokens: (data?.usage?.input_tokens as number) ?? 0,
      outputTokens: (data?.usage?.output_tokens as number) ?? 0,
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if ((err as Error).name === "AbortError") {
      console.warn(
        "[AI] Timeout: Anthropic API no respondió en",
        timeout_ms,
        "ms",
      );
    } else {
      console.error("[AI] Error llamando Anthropic:", err);
    }
    return null;
  }
}

export async function handleAIMessage(
  ctx: AIContext,
  trigger: AITriggerResult,
  wabaConfig: WabaConfigMap,
): Promise<boolean> {
  const { phoneNumber, catalog, supabase, tenantId, currencyCode, timezone, wa } =
    ctx;

  try {
    const clientContext = await getClientContext(
      supabase,
      tenantId,
      phoneNumber,
      timezone,
    );
    const base = resolveChatSystemPromptBase(wabaConfig);
    const rt = getHaikuRuntimeSettings(wabaConfig);
    const fullSystem = composeHaikuChatSystem(
      base,
      catalog,
      clientContext,
      currencyCode,
    );

    const result = await callAnthropicAPI(fullSystem, trigger.originalMessage, {
      max_tokens: rt.max_tokens,
      timeout_ms: rt.timeout_ms,
    });
    if (!result) return false;

    const { sendMessage } = await import("../wa-api.ts");
    await sendMessage(phoneNumber, result.text, wa);

    void logAIUsage(
      supabase,
      tenantId,
      trigger.type,
      result.inputTokens,
      result.outputTokens,
      phoneNumber,
    );

    console.log(
      "[AI] Respondió con IA:",
      trigger.type,
      "—",
      trigger.originalMessage.slice(0, 50),
    );
    return true;
  } catch (err) {
    console.error("[AI] handleAIMessage falló:", err);
    return false;
  }
}

export type TimeSlot =
  | "madrugada"
  | "manana"
  | "dia"
  | "tarde"
  | "noche"
  | "noche_tarde";

export function getTimeSlot(timezone: string): TimeSlot {
  const local = new Date(
    new Date().toLocaleString("en-US", { timeZone: timezone }),
  );
  const h = local.getHours();
  if (h < 6) return "madrugada";
  if (h < 10) return "manana";
  if (h < 13) return "dia";
  if (h < 18) return "tarde";
  if (h < 22) return "noche";
  return "noche_tarde";
}

export async function generateWelcomeGreeting(
  settings: HaikuRuntimeSettings,
  firstName: string,
  promoTitles: string[],
  fromAd: boolean,
  supabase?: SupabaseClient,
  phoneNumber?: string,
  tenantId?: string,
  timezone?: string,
): Promise<string | null> {
  const tz = timezone ?? "America/Caracas";
  const slot = getTimeSlot(tz);
  const slotCtx = settings.welcome_slot_context[slot] ?? "";
  const promosLine =
    promoTitles.length > 0
      ? `Promos activas: ${promoTitles.slice(0, 3).join(", ")}.`
      : "No hay promos activas este momento.";
  const adCtx = fromAd
    ? "La clienta llegó desde un anuncio — ya mostró interés previo."
    : "La clienta llegó de forma orgánica por WhatsApp.";

  const systemPrompt = settings.welcome_generation_system;

  const userPrompt = `Saludo de bienvenida para:
- Nombre: ${firstName}
- Contexto horario: ${slotCtx}
- ${adCtx}
- ${promosLine}

Máximo 3 líneas. Español natural LATAM. Sin mencionar horarios ni direcciones inventadas.`;

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    settings.welcome_timeout_ms,
  );

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: settings.welcome_max_tokens,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = await response.json();
    const text = (data?.content?.[0]?.text as string | undefined)?.trim();
    if (!text) return null;
    if (supabase && tenantId) {
      void logAIUsage(
        supabase,
        tenantId,
        "welcome_greeting",
        (data?.usage?.input_tokens as number) ?? 0,
        (data?.usage?.output_tokens as number) ?? 0,
        phoneNumber,
      );
    }
    return text;
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
}

async function hashPhone(phone: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(phone);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 8);
  } catch {
    return "unknown";
  }
}

export async function isAIRateLimited(
  supabase: SupabaseClient,
  tenantId: string,
  phoneNumber: string,
  maxPerHour: number,
): Promise<boolean> {
  try {
    const phoneHash = await hashPhone(phoneNumber);
    const { count, error } = await supabase
      .from("ai_usage_log")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("phone_hash", phoneHash)
      .gte("created_at", new Date(Date.now() - 60 * 60 * 1000).toISOString());

    if (error) return false;
    const calls = count ?? 0;
    if (calls >= maxPerHour) {
      console.warn(
        `[AI Rate-limit] ${phoneHash} superó ${maxPerHour} llamadas/hora (actual: ${calls})`,
      );
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function logAIUsage(
  supabase: SupabaseClient,
  tenantId: string,
  triggerType: string,
  inputTokens: number,
  outputTokens: number,
  phoneNumber?: string,
): Promise<void> {
  try {
    const phoneHash = phoneNumber ? await hashPhone(phoneNumber) : null;
    await supabase.from("ai_usage_log").insert({
      tenant_id: tenantId,
      trigger_type: triggerType,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      phone_hash: phoneHash,
    });
  } catch (err) {
    console.warn("[AI Usage] Error guardando log:", err);
  }
}

export function getFallbackGreeting(
  firstName: string,
  fromAd: boolean,
  settings: HaikuRuntimeSettings,
  timezone: string,
): string {
  const slot = getTimeSlot(timezone);
  const map = fromAd
    ? settings.welcome_fallback_ad
    : settings.welcome_fallback_organic;
  const tpl = map[slot] ?? map.dia ?? `Hola {nombre}`;
  const nombre = (firstName || "amiga").trim();
  return tpl.replace(/\{nombre\}/g, nombre);
}
