// lib/waba-config.ts — Carga la configuración editable del bot desde waba_config
// Patrón idéntico a loadCatalog(): una carga, reusada 60 s en el isolate.

import type { SupabaseClient } from "./supabase.ts";
import { getRequestTenantId } from "./tenant.ts";
import { cachedLoad } from "./ttl-cache.ts";
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

/** Copy del CMS puede tardar hasta este lapso en el bot. */
export const WABA_CONFIG_TTL_MS = 60_000;

const configCache = new Map<string, { value: WabaConfigMap; at: number }>();
const configInflight = new Map<string, Promise<WabaConfigMap>>();

/**
 * Carga todas las entradas activas de waba_config en un Map key→value.
 * Si falla (tabla no existe, red, etc.), retorna Map vacío → fallback a hardcoded.
 * Nunca lanza excepción para no interrumpir el flujo del bot.
 * El acierto vive 60 s en el isolate; un fallo no se cachea.
 */
export async function loadWabaConfig(
  supabase: SupabaseClient,
  tenantId?: string,
): Promise<WabaConfigMap> {
  const scopedTenantId = tenantId?.trim() || getRequestTenantId();
  return cachedLoad(
    configCache,
    configInflight,
    scopedTenantId,
    WABA_CONFIG_TTL_MS,
    () => loadWabaConfigFromDb(supabase, scopedTenantId),
  );
}

async function loadWabaConfigFromDb(
  supabase: SupabaseClient,
  scopedTenantId: string,
): Promise<{ value: WabaConfigMap; store: boolean }> {
  try {
    const { data, error } = await supabase
      .from("waba_config")
      .select("config_key, config_value, is_active")
      .eq("tenant_id", scopedTenantId)
      .eq("is_active", true);

    if (error || !data) {
      console.warn(
        "[WABA-CMS] No se pudo cargar waba_config, usando fallback hardcoded:",
        error?.message,
      );
      return { value: new Map(), store: false };
    }

    const map = new Map<string, Record<string, unknown>>();
    for (const row of data as WabaConfigEntry[]) {
      map.set(row.config_key, row.config_value);
    }

    console.log(`[WABA-CMS] Configuración cargada: ${map.size} entradas`);
    return { value: map, store: true };
  } catch (err) {
    console.warn("[WABA-CMS] Error cargando waba_config:", err);
    return { value: new Map(), store: false };
  }
}

/**
 * Helper para obtener un string de config con fallback seguro.
 */
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

/** Número positivo desde waba_config (amount / minutes / value). */
export function getConfigPositiveNumber(
  config: WabaConfigMap,
  key: string,
  fallback: number,
  fields: string[] = ["amount", "minutes", "value", "number"],
): number {
  const entry = config.get(key) as Record<string, unknown> | undefined;
  if (!entry) return fallback;
  for (const f of fields) {
    const n = typeof entry[f] === "number" ? entry[f] : Number(entry[f]);
    if (Number.isFinite(n) && (n as number) > 0) return n as number;
  }
  return fallback;
}

/** Boolean desde waba_config (`enabled` / `value`). */
export function getConfigBoolean(
  config: WabaConfigMap,
  key: string,
  fallback: boolean,
): boolean {
  const entry = config.get(key) as Record<string, unknown> | undefined;
  if (!entry) return fallback;
  for (const f of ["enabled", "value"]) {
    const v = entry[f];
    if (typeof v === "boolean") return v;
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
  }
  return fallback;
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

/** Fallback anti-spam (misma lista que dispatcher). */
export const FALLBACK_BLOCKED_PHONE_NUMBERS: readonly string[] = [
  "51907976917",
  "519810020000",
  "51981002000",
];

/**
 * Números con bot en silencio total (CMS `blocked_phone_numbers` + fallback).
 * Usado por webhook y crons (watchdog/nudges) para no hablarles tras pausa manual.
 */
export async function loadBlockedPhoneSet(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const config = await loadWabaConfig(supabase);
  const fromCms = getConfigStringArray(
    config,
    "blocked_phone_numbers",
    "phones",
    [],
  );
  return new Set([...FALLBACK_BLOCKED_PHONE_NUMBERS, ...fromCms]);
}

/**
 * Teléfonos con `bot_paused_at` (foto diseño → staff takeover).
 *
 * Fail-closed: si PostgREST falla (timeout/504 transitorio) incluso tras
 * reintentar, lanza en vez de devolver Set() vacío — un Set vacío aquí
 * significa "nadie está pausado" y deja pasar nudges a clientas que staff
 * pausó a mano (incidente María …6497, 10-sep: 504 justo en esta query
 * dejó pasar 3 nudges 17 min después de la pausa). Ver LECCIONES.md.
 */
export async function loadPausedPhoneSet(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const tenantId = getRequestTenantId();
  let lastError: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300));
    const { data, error } = await supabase
      .from("whatsapp_sessions")
      .select("phone")
      .eq("tenant_id", tenantId)
      .not("bot_paused_at", "is", null);
    if (!error) {
      return new Set(
        (data ?? [])
          .map((r: { phone?: string }) =>
            typeof r.phone === "string" ? r.phone.trim() : "",
          )
          .filter(Boolean),
      );
    }
    lastError = error.message;
    console.error(
      `[waba-config] loadPausedPhoneSet intento ${attempt + 1}:`,
      error.message,
    );
  }
  throw new Error(`loadPausedPhoneSet falló tras reintento: ${lastError}`);
}

/**
 * OUT recientes del panel / WhatsApp Business app.
 * Merillyn …7296: browse-reengage empujó Softgel aunque Vanessa ya cerraba
 * por panel (~1 h antes). `bot_paused_at` puede estar null si se reactivó.
 */
export const STAFF_RECENT_OUT_HOURS = 4;

/** Fail-closed, mismo criterio que {@link loadPausedPhoneSet}. */
export async function loadRecentStaffOutboundPhoneSet(
  supabase: SupabaseClient,
  lookbackHours: number = STAFF_RECENT_OUT_HOURS,
): Promise<Set<string>> {
  const since = new Date(
    Date.now() - lookbackHours * 60 * 60 * 1000,
  ).toISOString();
  let lastError: string | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 300));
    const { data, error } = await supabase
      .from("wa_messages")
      .select("phone")
      .eq("direction", "out")
      .in("source", ["panel", "staff_app"])
      .gte("created_at", since);
    if (!error) {
      return new Set(
        (data ?? [])
          .map((r: { phone?: string }) =>
            typeof r.phone === "string" ? r.phone.trim() : "",
          )
          .filter(Boolean),
      );
    }
    lastError = error.message;
    console.error(
      `[waba-config] loadRecentStaffOutboundPhoneSet intento ${attempt + 1}:`,
      error.message,
    );
  }
  throw new Error(
    `loadRecentStaffOutboundPhoneSet falló tras reintento: ${lastError}`,
  );
}

/**
 * CMS blocklist + pausadas + staff reciente por panel/app.
 * Preferir esto en crons para no reenganchar mientras Vanessa responde.
 *
 * Puede lanzar (fail-closed) si `loadPausedPhoneSet` o
 * `loadRecentStaffOutboundPhoneSet` no pudieron confirmar el estado tras
 * reintentar — el caller (cron) debe abortar el envío en ese caso, nunca
 * tratarlo como "nadie está silenciado".
 */
export async function loadSilentPhoneSet(
  supabase: SupabaseClient,
): Promise<Set<string>> {
  const [blocked, paused, staffRecent] = await Promise.all([
    loadBlockedPhoneSet(supabase),
    loadPausedPhoneSet(supabase),
    loadRecentStaffOutboundPhoneSet(supabase),
  ]);
  return new Set([...blocked, ...paused, ...staffRecent]);
}

/** Palabras disparadoras del asistente (panel → `haiku_trigger_keywords`). */
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

/**
 * Lee `haiku_trigger_keywords` de waba_config.
 * Si falta la fila o una clave concreta, se usa el valor de `haiku-cms-defaults.ts`.
 * Si la clave existe pero el array está vacío, se respeta ([] = sin palabras de ese tipo).
 */
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

/** System prompt base (sin catálogo). Vacío en BD → texto default del CMS. */
export function getHaikuSystemPromptBase(config: WabaConfigMap): string {
  const raw = config.get("haiku_system_prompt");
  const c =
    raw && typeof raw === "object"
      ? (raw as Record<string, unknown>).content
      : undefined;
  if (typeof c === "string" && c.trim()) return c.trim();
  return HAIKU_SYSTEM_PROMPT_BASE_DEFAULT;
}

/** Mínimo para la API si alguien borra todo el prompt en BD. */
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

/** Límites de API + textos de bienvenida Haiku (panel → `haiku_settings`). */
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
