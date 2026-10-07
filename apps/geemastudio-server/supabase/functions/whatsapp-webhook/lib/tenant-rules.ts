// lib/tenant-rules.ts — Reglas de negocio del bot WABA por tenant (Sprint 5 S5-1).
// Patrón idéntico a waba-config.ts: una carga por request, nunca lanza,
// fallback a los valores hardcodeados actuales de ZM si la fila/columna
// está vacía. Fuente: tenant_settings.waba_rules (jsonb), key tenant_slug.
//
// S5-2/S5-3: horarios, staff, pagos y cupo se leen vía
// ensureTenantWabaRulesLoaded() + lib/tenant-rules-store.ts.
// S5-5: el panel edita horario, depósito y staff; un array vacío explícito
// (sundayExtraSlots) se respeta y no vuelve al default de ZM.

import type { SupabaseClient } from "./supabase.ts";
import { getRequestTenantId } from "./tenant.ts";
import { isWabaRulesFresh, setLoadedWabaRules } from "./tenant-rules-store.ts";
import {
  ADMIN_PHONE,
  EXTENSIONES_KARELIS_SERVICE_IDS,
  EXTENSIONES_NO_LANE_SERVICE_IDS,
  KARELIS_AFTERNOON_START_HOUR,
  MEDIOS_DE_PAGO,
  SPECIAL_OVERLAP_CATEGORIES,
  SPECIAL_OVERLAP_EXTRA_SERVICE_IDS,
} from "./constants.ts";
import { FIXED_DEPOSIT_AMOUNT } from "./peru-holidays.ts";
import {
  MEAL_DURATION_MINUTES,
  MEAL_END_MINUTES,
  MEAL_START_MINUTES,
} from "./slot-occupation.ts";

export interface TenantWabaScheduleRules {
  weekday: { open: string; close: string };
  sunday?: { open: string; close: string };
  slotMinutes: number[];
  /** Slots que se agregan además del rango normal (ej. ZM domingo 13:00). */
  sundayExtraSlots?: string[];
}

export interface TenantWabaDepositRules {
  fixedAmount?: number;
  sundayRate?: number;
  requiresHistoryForRate: boolean;
}

/**
 * NOTA (auditoría S5-1): la capacidad real de ZM NO ramifica por employeeId —
 * `overlapCapForCart`/`classifyOccupiedCapacityLane` (services-catalog.ts)
 * deciden el cupo/carril mirando categoría y servicio únicamente. Se
 * modela así, no como `lanes[].employeeIds`, para no inventar una
 * abstracción que el código real no tiene (evita rediseño en S5-3).
 */
export interface TenantWabaCapacityRules {
  defaultCap: number;
  specialCap?: number;
  /** Categorías 100% especiales: cap=specialCap si TODO el carrito cae aquí (o en specialExtraServiceIds). */
  specialCategoryIds?: string[];
  /** Excepciones puntuales de categorías no-100%-especiales que sí cuentan como especiales. */
  specialExtraServiceIds?: string[];
  /** Servicios de cat-extensiones que solo atiende el carril "Karelis" (destajo, turno tarde). */
  extensionesKarelisServiceIds?: string[];
  /** Hora Lima desde la cual el carril Karelis atiende (inclusive). */
  karelisAfterHour?: number;
  /** Servicios sin carril de especialista dedicado (cap genérico fijo, ej. Retiro de Pestañas). */
  unassignedCapServiceIds?: string[];
  /** Almuerzo fijo de Stephani (único carril con almuerzo hoy). Minutos desde medianoche Lima. */
  mealBreak?: {
    startMinutes: number;
    endMinutes: number;
    durationMinutes: number;
  };
}

export interface TenantWabaCtwaInterestOption {
  id: string;
  label: string;
  categoryIds: string[];
}

export interface TenantWabaRules {
  timezone: string;
  schedule: TenantWabaScheduleRules;
  deposit: TenantWabaDepositRules;
  capacity: TenantWabaCapacityRules;
  staffByCategory: Record<string, string[]>;
  ctwaInterestOptions?: TenantWabaCtwaInterestOption[];
  coordinationPhone: string;
  paymentMethodsText: string;
}

/**
 * Default = comportamiento hardcodeado actual de ZM (constants.ts +
 * peru-holidays.ts + slot-occupation.ts). Debe quedar idéntico a esos
 * archivos hasta que S5-2/S5-3 los reemplacen por lecturas de este tipo.
 */
export const DEFAULT_ZM_WABA_RULES: TenantWabaRules = {
  timezone: "America/Lima",
  schedule: {
    weekday: { open: "10:00", close: "18:00" },
    sunday: { open: "10:30", close: "13:00" },
    slotMinutes: [0, 30],
    sundayExtraSlots: ["13:00"],
  },
  deposit: {
    fixedAmount: FIXED_DEPOSIT_AMOUNT,
    sundayRate: 0.2,
    requiresHistoryForRate: true,
  },
  capacity: {
    defaultCap: 1,
    specialCap: 2,
    specialCategoryIds: [...SPECIAL_OVERLAP_CATEGORIES],
    specialExtraServiceIds: [...SPECIAL_OVERLAP_EXTRA_SERVICE_IDS],
    extensionesKarelisServiceIds: [...EXTENSIONES_KARELIS_SERVICE_IDS],
    karelisAfterHour: KARELIS_AFTERNOON_START_HOUR,
    unassignedCapServiceIds: [...EXTENSIONES_NO_LANE_SERVICE_IDS],
    mealBreak: {
      startMinutes: MEAL_START_MINUTES,
      endMinutes: MEAL_END_MINUTES,
      durationMinutes: MEAL_DURATION_MINUTES,
    },
  },
  staffByCategory: {
    "cat-extensiones": ["emp-sthefani"],
    "cat-lifting": ["emp-sthefani", "emp-vanessa"],
    "cat-cejas-rostro": ["emp-sthefani"],
    "cat-microblading": ["emp-alejandra"],
    "cat-depilacion": ["emp-sthefani"],
    "cat-unas": ["emp-sthefani"],
  },
  coordinationPhone: ADMIN_PHONE,
  paymentMethodsText: MEDIOS_DE_PAGO,
};

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function normalizeStringArray(
  v: unknown,
  fallback: string[],
  allowEmpty = false,
): string[] {
  if (!Array.isArray(v)) return fallback;
  const out = v
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  if (out.length === 0) return allowEmpty ? [] : fallback;
  return out;
}

function normalizeSchedule(
  raw: unknown,
  fallback: TenantWabaScheduleRules,
): TenantWabaScheduleRules {
  if (!isPlainObject(raw)) return fallback;
  const weekday = isPlainObject(raw.weekday)
    ? {
      open: typeof raw.weekday.open === "string"
        ? raw.weekday.open
        : fallback.weekday.open,
      close: typeof raw.weekday.close === "string"
        ? raw.weekday.close
        : fallback.weekday.close,
    }
    : fallback.weekday;
  const sunday = isPlainObject(raw.sunday)
    ? {
      open: typeof raw.sunday.open === "string"
        ? raw.sunday.open
        : (fallback.sunday?.open ?? ""),
      close: typeof raw.sunday.close === "string"
        ? raw.sunday.close
        : (fallback.sunday?.close ?? ""),
    }
    : fallback.sunday;
  const slotMinutes = Array.isArray(raw.slotMinutes)
    ? raw.slotMinutes.filter((n: unknown) => typeof n === "number")
    : fallback.slotMinutes;
  const sundayExtraSlots = Array.isArray(raw.sundayExtraSlots)
    ? normalizeStringArray(raw.sundayExtraSlots, [], true)
    : fallback.sundayExtraSlots;
  return {
    weekday,
    sunday,
    slotMinutes: slotMinutes.length > 0 ? slotMinutes : fallback.slotMinutes,
    sundayExtraSlots,
  };
}

function normalizeDeposit(
  raw: unknown,
  fallback: TenantWabaDepositRules,
): TenantWabaDepositRules {
  if (!isPlainObject(raw)) return fallback;
  return {
    fixedAmount: typeof raw.fixedAmount === "number"
      ? raw.fixedAmount
      : fallback.fixedAmount,
    sundayRate: typeof raw.sundayRate === "number"
      ? raw.sundayRate
      : fallback.sundayRate,
    requiresHistoryForRate: typeof raw.requiresHistoryForRate === "boolean"
      ? raw.requiresHistoryForRate
      : fallback.requiresHistoryForRate,
  };
}

function normalizeCapacity(
  raw: unknown,
  fallback: TenantWabaCapacityRules,
): TenantWabaCapacityRules {
  if (!isPlainObject(raw)) return fallback;
  const mealBreak = isPlainObject(raw.mealBreak)
    ? (() => {
      const { startMinutes, endMinutes, durationMinutes } = raw
        .mealBreak as Record<string, unknown>;
      return typeof startMinutes === "number" &&
          typeof endMinutes === "number" &&
          typeof durationMinutes === "number"
        ? { startMinutes, endMinutes, durationMinutes }
        : fallback.mealBreak;
    })()
    : fallback.mealBreak;
  return {
    defaultCap: typeof raw.defaultCap === "number"
      ? raw.defaultCap
      : fallback.defaultCap,
    specialCap: typeof raw.specialCap === "number"
      ? raw.specialCap
      : fallback.specialCap,
    specialCategoryIds: Array.isArray(raw.specialCategoryIds)
      ? normalizeStringArray(raw.specialCategoryIds, [])
      : fallback.specialCategoryIds,
    specialExtraServiceIds: Array.isArray(raw.specialExtraServiceIds)
      ? normalizeStringArray(raw.specialExtraServiceIds, [])
      : fallback.specialExtraServiceIds,
    extensionesKarelisServiceIds: Array.isArray(
        raw.extensionesKarelisServiceIds,
      )
      ? normalizeStringArray(raw.extensionesKarelisServiceIds, [])
      : fallback.extensionesKarelisServiceIds,
    karelisAfterHour: typeof raw.karelisAfterHour === "number"
      ? raw.karelisAfterHour
      : fallback.karelisAfterHour,
    unassignedCapServiceIds: Array.isArray(raw.unassignedCapServiceIds)
      ? normalizeStringArray(raw.unassignedCapServiceIds, [])
      : fallback.unassignedCapServiceIds,
    mealBreak,
  };
}

function normalizeStaffByCategory(
  raw: unknown,
  fallback: Record<string, string[]>,
): Record<string, string[]> {
  if (!isPlainObject(raw)) return fallback;
  const out: Record<string, string[]> = {};
  for (const [category, employeeIds] of Object.entries(raw)) {
    out[category] = normalizeStringArray(employeeIds, []);
  }
  return Object.keys(out).length > 0 ? out : fallback;
}

/**
 * Normaliza el jsonb crudo de `tenant_settings.waba_rules` contra el
 * default del tenant (ZM por ahora). Campos faltantes o mal tipados caen al
 * default — nunca lanza, nunca deja un campo `undefined` inesperado.
 */
export function normalizeTenantWabaRules(
  raw: unknown,
  fallback: TenantWabaRules = DEFAULT_ZM_WABA_RULES,
): TenantWabaRules {
  if (!isPlainObject(raw)) return fallback;
  return {
    timezone: typeof raw.timezone === "string"
      ? raw.timezone
      : fallback.timezone,
    schedule: normalizeSchedule(raw.schedule, fallback.schedule),
    deposit: normalizeDeposit(raw.deposit, fallback.deposit),
    capacity: normalizeCapacity(raw.capacity, fallback.capacity),
    staffByCategory: normalizeStaffByCategory(
      raw.staffByCategory,
      fallback.staffByCategory,
    ),
    ctwaInterestOptions: Array.isArray(raw.ctwaInterestOptions)
      ? (raw.ctwaInterestOptions as TenantWabaCtwaInterestOption[])
      : fallback.ctwaInterestOptions,
    coordinationPhone: typeof raw.coordinationPhone === "string"
      ? raw.coordinationPhone
      : fallback.coordinationPhone,
    paymentMethodsText: typeof raw.paymentMethodsText === "string"
      ? raw.paymentMethodsText
      : fallback.paymentMethodsText,
  };
}

/**
 * Carga `tenant_settings.waba_rules` para el tenant actual (o el pasado
 * explícitamente). Nunca lanza — si falla la query, la fila no existe o la
 * columna es null, retorna DEFAULT_ZM_WABA_RULES (comportamiento idéntico
 * al hardcodeado de hoy). Esto es lo que garantiza que mergear S5-1 no
 * cambia nada en producción hasta que se siembren datos y S5-2/S5-3
 * empiecen a leer de acá.
 */
export async function getTenantWabaRules(
  supabase: SupabaseClient,
  tenantId?: string,
): Promise<TenantWabaRules> {
  const scopedTenantId = tenantId?.trim() || getRequestTenantId();
  try {
    const { data, error } = await supabase
      .from("tenant_settings")
      .select("waba_rules")
      .eq("tenant_slug", scopedTenantId)
      .maybeSingle();

    if (error || !data?.waba_rules) {
      return DEFAULT_ZM_WABA_RULES;
    }

    return normalizeTenantWabaRules(data.waba_rules);
  } catch (err) {
    console.warn("[WABA] getTenantWabaRules error, usando default ZM:", err);
    return DEFAULT_ZM_WABA_RULES;
  }
}

/**
 * Hidrata el cache por tenant (TTL 5 min) para que constants.ts y los handlers
 * lean las reglas de forma síncrona. Nunca lanza: si falla, guarda el default ZM.
 */
export async function ensureTenantWabaRulesLoaded(
  supabase: SupabaseClient,
  tenantId: string = getRequestTenantId(),
): Promise<void> {
  if (isWabaRulesFresh(tenantId)) return;
  setLoadedWabaRules(tenantId, await getTenantWabaRules(supabase, tenantId));
}
