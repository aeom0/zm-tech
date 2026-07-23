// lib/waba-config.ts — Carga waba_config filtrada por tenant

import type { SupabaseClient } from "./supabase.ts";
import {
  HAIKU_SYSTEM_EMERGENCY_ONE_LINE,
  HAIKU_SYSTEM_PROMPT_BASE_DEFAULT,
  HAIKU_TRIGGER_KEYWORDS_DEFAULT,
  HAIKU_RUNTIME_NUMERIC_DEFAULTS,
  HAIKU_WELCOME_FALLBACK_AD_DEFAULT,
  HAIKU_WELCOME_FALLBACK_ORGANIC_DEFAULT,
  HAIKU_WELCOME_GENERATION_SYSTEM_DEFAULT,
  HAIKU_WELCOME_GREETING_TEMPLATE_DEFAULT,
  HAIKU_WELCOME_SLOT_CONTEXT_DEFAULT,
} from "./haiku-cms-defaults.ts";

export interface WabaConfigEntry {
  config_key: string;
  config_value: Record<string, unknown>;
  is_active: boolean;
}

export type WabaConfigMap = Map<string, Record<string, unknown>>;

export async function loadWabaConfig(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<WabaConfigMap> {
  try {
    const { data, error } = await supabase
      .from("waba_config")
      .select("config_key, config_value, is_active")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (error || !data) {
      console.warn(
        "[WABA-CMS] No se pudo cargar waba_config, usando fallback:",
        error?.message,
      );
      return new Map();
    }

    const map = new Map<string, Record<string, unknown>>();
    for (const row of data as WabaConfigEntry[]) {
      map.set(row.config_key, row.config_value);
    }

    console.log(`[WABA-CMS] Configuración cargada: ${map.size} entradas`);
    return map;
  } catch (err) {
    console.warn("[WABA-CMS] Error cargando waba_config:", err);
    return new Map();
  }
}

export function getConfigText(
  config: WabaConfigMap,
  key: string,
  fallback: string,
): string {
  const entry = config.get(key);
  const text =
    (entry as Record<string, unknown> | undefined)?.text ??
    (entry as Record<string, unknown> | undefined)?.url;
  return typeof text === "string" && text.trim() ? text : fallback;
}

export function getConfigStringArray(
  config: WabaConfigMap,
  key: string,
  field: string,
  fallback: string[] = [],
): string[] {
  const entry = config.get(key) as Record<string, unknown> | undefined;
  const raw = entry?.[field];
  if (!Array.isArray(raw)) return fallback;
  return raw
    .map((v) => (typeof v === "string" ? v.trim() : ""))
    .filter(Boolean);
}

export interface HaikuTriggerKeywordLists {
  recommendation: string[];
  free_question: string[];
  blocked: string[];
}

function normalizeKeywordList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => (typeof x === "string" ? x.trim().toLowerCase() : ""))
    .filter(Boolean);
}

export function getHaikuTriggerKeywordsFromWaba(
  config: WabaConfigMap,
): HaikuTriggerKeywordLists {
  const D = HAIKU_TRIGGER_KEYWORDS_DEFAULT;
  const raw = config.get("haiku_trigger_keywords");
  if (!raw || typeof raw !== "object") {
    return {
      recommendation: [...D.recommendation],
      free_question: [...D.free_question],
      blocked: [...D.blocked],
    };
  }

  const o = raw as Record<string, unknown>;
  const recommendation =
    "recommendation" in o
      ? normalizeKeywordList(o.recommendation)
      : [...D.recommendation];
  const free_question =
    "free_question" in o
      ? normalizeKeywordList(o.free_question)
      : [...D.free_question];
  const blocked =
    "blocked" in o ? normalizeKeywordList(o.blocked) : [...D.blocked];

  return { recommendation, free_question, blocked };
}

export function getHaikuSystemPromptBase(config: WabaConfigMap): string {
  const raw = config.get("haiku_system_prompt");
  const c =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>).content
      : undefined;
  if (typeof c === "string" && c.trim()) return c.trim();
  return HAIKU_SYSTEM_PROMPT_BASE_DEFAULT;
}

export function resolveChatSystemPromptBase(config: WabaConfigMap): string {
  const s = getHaikuSystemPromptBase(config);
  return s.trim() ? s : HAIKU_SYSTEM_EMERGENCY_ONE_LINE;
}

export interface HaikuRuntimeSettings {
  max_tokens: number;
  timeout_ms: number;
  rate_limit_per_hour: number;
  welcome_greeting_template: string;
  welcome_generation_system: string;
  welcome_slot_context: Record<string, string>;
  welcome_fallback_ad: Record<string, string>;
  welcome_fallback_organic: Record<string, string>;
  welcome_max_tokens: number;
  welcome_timeout_ms: number;
}

function asPositiveNumber(v: unknown, fallback: number): number {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return n;
}

function mergeStringRecord(
  raw: unknown,
  fallback: Record<string, string>,
): Record<string, string> {
  const out = { ...fallback };
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === "string" && v.trim()) out[k] = v.trim();
    }
  }
  return out;
}

export function getHaikuRuntimeSettings(
  config: WabaConfigMap,
): HaikuRuntimeSettings {
  const N = HAIKU_RUNTIME_NUMERIC_DEFAULTS;
  const raw = config.get("haiku_settings");
  const o =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const welcomeTmpl = o.welcome_greeting_template;
  const welcomeGen = o.welcome_generation_system;

  return {
    max_tokens: asPositiveNumber(o.max_tokens, N.max_tokens),
    timeout_ms: asPositiveNumber(o.timeout_ms, N.timeout_ms),
    rate_limit_per_hour: asPositiveNumber(
      o.rate_limit_per_hour,
      N.rate_limit_per_hour,
    ),
    welcome_greeting_template:
      typeof welcomeTmpl === "string" && welcomeTmpl.trim()
        ? welcomeTmpl.trim()
        : HAIKU_WELCOME_GREETING_TEMPLATE_DEFAULT,
    welcome_generation_system:
      typeof welcomeGen === "string" && welcomeGen.trim()
        ? welcomeGen.trim()
        : HAIKU_WELCOME_GENERATION_SYSTEM_DEFAULT,
    welcome_slot_context: mergeStringRecord(
      o.welcome_slot_context,
      HAIKU_WELCOME_SLOT_CONTEXT_DEFAULT,
    ),
    welcome_fallback_ad: mergeStringRecord(
      o.welcome_fallback_ad,
      HAIKU_WELCOME_FALLBACK_AD_DEFAULT,
    ),
    welcome_fallback_organic: mergeStringRecord(
      o.welcome_fallback_organic,
      HAIKU_WELCOME_FALLBACK_ORGANIC_DEFAULT,
    ),
    welcome_max_tokens: asPositiveNumber(
      o.welcome_max_tokens,
      N.welcome_max_tokens,
    ),
    welcome_timeout_ms: asPositiveNumber(
      o.welcome_timeout_ms,
      N.welcome_timeout_ms,
    ),
  };
}

/** Mapa category_id → texto para foto previa (config `pre_service_photo_categories`). */
export function getPreServicePhotoMap(
  config: WabaConfigMap,
): Record<string, string> {
  const raw = config.get("pre_service_photo_categories");
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, string>;
  }
  return {};
}

/** Mapa category_id → IDs de empleados permitidos (`employee_categories_by_service_category`). */
export function getEmployeeCategoriesMap(
  config: WabaConfigMap,
): Record<string, string[]> {
  const raw = config.get("employee_categories_by_service_category");
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const out: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(o)) {
    if (Array.isArray(v)) out[k] = v.map(String);
  }
  return out;
}
