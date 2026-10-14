// peru-holidays.ts — Feriados del salón (Lima). Seed fallback + hydrate desde BD.

import { getLoadedWabaRules } from "./tenant-rules-store.ts";
import type { SupabaseClient } from "./supabase.ts";
import { DEFAULT_TENANT_ID, getRequestTenantId } from "./tenant.ts";

/** Seed 2026 — usado hasta hydrate o si BD falla. */
export const PERU_HOLIDAYS_SEED = [
  "2026-01-01", // Año Nuevo
  "2026-04-02", // Jueves Santo
  "2026-04-03", // Viernes Santo
  "2026-05-01", // Día del Trabajo
  "2026-06-29", // San Pedro y San Pablo
  "2026-07-23", // Día de la Fuerza Aérea — CC cerrado
  "2026-07-28", // Fiestas Patrias — CC cerrado
  "2026-07-29", // Fiestas Patrias — CC cerrado
  "2026-08-06", // Batalla de Junín
  "2026-08-30", // Santa Rosa de Lima
  "2026-10-08", // Combate de Angamos
  "2026-11-01", // Todos los Santos
  "2026-12-08", // Inmaculada Concepción
  "2026-12-25", // Navidad
] as const;

export const PERU_HOLIDAYS_CLOSED_SEED = [
  "2026-07-23",
  "2026-07-28",
  "2026-07-29",
] as const;

/** Última hora de inicio en feriados del seed (CC abierto). En BD, NULL = cierre habitual. */
export const DEFAULT_HOLIDAY_OPEN_UNTIL = 12;

/** Excepciones de horario en seed (Batalla de Junín hasta 2 PM). */
export const PERU_HOLIDAY_OPEN_UNTIL_SEED: Record<string, number> = {
  "2026-08-06": 14,
};

/** @deprecated Sets mutables del tenant default (ZM); se mantienen por compat. */
export const PERU_HOLIDAYS_2026 = new Set<string>(PERU_HOLIDAYS_SEED);
export const PERU_HOLIDAYS_CLOSED = new Set<string>(PERU_HOLIDAYS_CLOSED_SEED);

type HolidayState = {
  holidaySet: Set<string>;
  closedSet: Set<string>;
  /** null = apertura / cierre habitual del día. */
  openFromByDate: Record<string, number | null>;
  openUntilByDate: Record<string, number | null>;
  closedReasonByDate: Record<string, string | null>;
  loadedAt: number;
};

/** Estado por tenant: un isolate atiende varios tenants, no puede compartir cache. */
const stateByTenant = new Map<string, HolidayState>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const EMPTY_STATE: HolidayState = {
  holidaySet: new Set(),
  closedSet: new Set(),
  openFromByDate: {},
  openUntilByDate: {},
  closedReasonByDate: {},
  loadedAt: 0,
};

function seedState(): HolidayState {
  return buildState(
    PERU_HOLIDAYS_SEED.map((date) => ({
      date,
      is_closed: (PERU_HOLIDAYS_CLOSED_SEED as readonly string[]).includes(
        date,
      ),
      open_until_hour: PERU_HOLIDAY_OPEN_UNTIL_SEED[date] ??
        DEFAULT_HOLIDAY_OPEN_UNTIL,
    })),
  );
}

/** Sin carga previa: ZM cae al seed (comportamiento legacy); otros tenants, vacío. */
function currentState(): HolidayState {
  const tenantId = getRequestTenantId();
  const st = stateByTenant.get(tenantId);
  if (st) return st;
  return tenantId === DEFAULT_TENANT_ID ? seedState() : EMPTY_STATE;
}

export type SalonHolidayRow = {
  date: string;
  is_closed: boolean;
  open_from_hour?: number | null;
  open_until_hour?: number | null;
  name?: string | null;
};

/**
 * Fechas donde el cierre es del *Centro Comercial* (feriado nacional real).
 * Cualquier otra fila `is_closed` en `salon_holidays` (evento, staff, etc.)
 * es un cierre interno del salón, no del CC — no usar el copy "el CC no abre".
 */
const CC_CLOSED_DATES = new Set<string>(PERU_HOLIDAYS_CLOSED_SEED);

/** null/no numérico → null (horario habitual); si no, 6–23 como el CHECK de BD. */
function clampSpecialHour(hour: number | null | undefined): number | null {
  if (hour === null || hour === undefined) return null;
  const n = Number(hour);
  if (!Number.isFinite(n)) return null;
  return Math.min(23, Math.max(6, Math.trunc(n)));
}

function buildState(rows: SalonHolidayRow[]): HolidayState {
  const st: HolidayState = {
    holidaySet: new Set(),
    closedSet: new Set(),
    openFromByDate: {},
    openUntilByDate: {},
    closedReasonByDate: {},
    loadedAt: Date.now(),
  };
  for (const row of rows) {
    const key = String(row.date).slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    st.holidaySet.add(key);
    if (row.is_closed) st.closedSet.add(key);
    st.openFromByDate[key] = clampSpecialHour(row.open_from_hour);
    st.openUntilByDate[key] = clampSpecialHour(row.open_until_hour);
    st.closedReasonByDate[key] = row.name ?? null;
  }
  return st;
}

export function hydrateSalonHolidays(
  rows: SalonHolidayRow[],
  tenantId: string = getRequestTenantId(),
): void {
  const st = buildState(rows);
  stateByTenant.set(tenantId, st);

  if (tenantId === DEFAULT_TENANT_ID) {
    PERU_HOLIDAYS_2026.clear();
    for (const k of st.holidaySet) PERU_HOLIDAYS_2026.add(k);
    PERU_HOLIDAYS_CLOSED.clear();
    for (const k of st.closedSet) PERU_HOLIDAYS_CLOSED.add(k);
  }
}

function resetToSeed(tenantId: string): void {
  if (tenantId === DEFAULT_TENANT_ID) {
    stateByTenant.set(tenantId, seedState());
  } else {
    stateByTenant.set(tenantId, buildState([]));
  }
}

/** ZM cae al seed 2026; otro tenant queda sin feriados (no hereda el calendario de ZM). */
function holidayFallbackLabel(tenantId: string): string {
  return tenantId === DEFAULT_TENANT_ID ? "usando seed" : "sin feriados";
}

/**
 * Cierre del CC Las Plazuelas. Solo ZM y las fechas del seed: un cierre
 * interno, o el de otro tenant en la misma fecha, no usa ese copy.
 */
export function isZmMallClosed(dateKey: string): boolean {
  const key = dateKey.slice(0, 10);
  return (
    getRequestTenantId() === DEFAULT_TENANT_ID && CC_CLOSED_DATES.has(key)
  );
}

/**
 * Carga feriados del tenant desde BD (cache 5 min por tenant). Nunca lanza —
 * fallback al seed (ZM) o a "sin feriados" (otros tenants).
 */
export async function ensureSalonHolidaysLoaded(
  supabase: SupabaseClient,
  tenantId: string = getRequestTenantId(),
): Promise<void> {
  const cached = stateByTenant.get(tenantId);
  if (cached && Date.now() - cached.loadedAt < CACHE_TTL_MS) {
    return;
  }

  try {
    const { data, error } = await supabase
      .from("salon_holidays")
      .select("date, is_closed, open_from_hour, open_until_hour, name")
      .eq("tenant_id", tenantId);

    if (error || !data) {
      console.warn(
        `[WABA] salon_holidays no disponible (${tenantId}), ${
          holidayFallbackLabel(tenantId)
        }:`,
        error?.message,
      );
      resetToSeed(tenantId);
      return;
    }

    if (data.length === 0) {
      console.warn(
        `[WABA] salon_holidays vacío (${tenantId}), ${
          holidayFallbackLabel(tenantId)
        }`,
      );
      resetToSeed(tenantId);
      return;
    }

    hydrateSalonHolidays(
      data.map(
        (r: {
          date: string;
          is_closed: boolean;
          open_from_hour?: number | null;
          open_until_hour?: number | null;
          name?: string | null;
        }) => ({
          date: r.date,
          is_closed: !!r.is_closed,
          open_from_hour: r.open_from_hour,
          open_until_hour: r.open_until_hour,
          name: r.name,
        }),
      ),
      tenantId,
    );
    console.log(
      `[WABA] Feriados hidratados (${tenantId}): ${data.length} filas`,
    );
  } catch (err) {
    console.warn(`[WABA] Error cargando salon_holidays (${tenantId}):`, err);
    resetToSeed(tenantId);
  }
}

export function isPeruHoliday(dateKey: string): boolean {
  return currentState().holidaySet.has(dateKey.slice(0, 10));
}

/** CC / salón cerrado ese día — no hay slots ni agendado WABA/app. */
export function isSalonClosed(dateKey: string): boolean {
  return currentState().closedSet.has(dateKey.slice(0, 10));
}

/**
 * Última hora de inicio de cita en el día especial; null = cierre habitual.
 * Ignorar si el día está cerrado.
 */
export function getHolidayOpenUntilHour(dateKey: string): number | null {
  const key = dateKey.slice(0, 10);
  return currentState().openUntilByDate[key] ?? null;
}

/**
 * Primera hora de inicio de cita en el día especial; null = apertura habitual.
 * Ignorar si el día está cerrado.
 */
export function getHolidayOpenFromHour(dateKey: string): number | null {
  const key = dateKey.slice(0, 10);
  return currentState().openFromByDate[key] ?? null;
}

export function formatHourShort(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

/** 'desde 2 PM', 'hasta 1 PM', 'de 2 PM a 6 PM' o '' si usa el horario habitual. */
export function specialDayHoursLabel(dateKey: string): string {
  const from = getHolidayOpenFromHour(dateKey);
  const until = getHolidayOpenUntilHour(dateKey);
  if (from !== null && until !== null) {
    return `de ${formatHourShort(from)} a ${formatHourShort(until)}`;
  }
  if (from !== null) return `desde ${formatHourShort(from)}`;
  if (until !== null) return `hasta ${formatHourShort(until)}`;
  return "";
}

/**
 * Frase para la clienta. Vacía si el día no recorta el horario.
 * La hora de cierre es la última cita que puede empezar, no la hora en que cierra el salón.
 */
export function specialDayScheduleNote(dateKey: string): string {
  const from = getHolidayOpenFromHour(dateKey);
  const until = getHolidayOpenUntilHour(dateKey);
  if (from !== null && until !== null) {
    return `La primera cita empieza a las ${
      formatHourShort(from)
    } y la última a las ${formatHourShort(until)}.`;
  }
  if (from !== null) {
    return `La primera cita empieza a las ${formatHourShort(from)}.`;
  }
  if (until !== null) {
    return `La última cita empieza a las ${formatHourShort(until)}.`;
  }
  return "";
}

/** Hint corto cuando un horario pedido cae fuera de la franja del día. */
export function formatHoursHint(dateKey?: string, dayOfWeek?: number): string {
  if (dateKey) {
    if (isSalonClosed(dateKey)) {
      return isZmMallClosed(dateKey)
        ? "Cerrado — el CC no abre ese día"
        : "Cerrado ese día";
    }
    const note = specialDayScheduleNote(dateKey);
    if (note) return note;
    if (isSunday(dateKey)) {
      return "Dom: 10:30 AM – 1 PM (adelanto S/25)";
    }
  }
  if (dayOfWeek === 0) return "Dom: 10:30 AM – 1 PM (adelanto S/25)";
  return "L-S: 10 AM – 6 PM";
}

export function dayOfWeekFromDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

export function isSunday(dateKey: string): boolean {
  return dayOfWeekFromDateKey(dateKey) === 0;
}

/**
 * Abono fijo (S/) para clientas sin ningún servicio completado en historial
 * (nuevas, o cuya cita anterior no se concretó).
 * `waba_config.deposit_fixed_amount` puede sobreescribir.
 */
export const FIXED_DEPOSIT_AMOUNT = 25;

/**
 * Tasa de adelanto obligatorio (0.2 domingo).
 * `null` = confirmación directa sin abono en chat.
 */
export function getAdvancePaymentRate(dateKey: string): number | null {
  const key = dateKey.slice(0, 10);
  if (isSalonClosed(key)) return null;
  if (isSunday(key)) return getLoadedWabaRules()?.deposit.sundayRate ?? 0.2;
  return null;
}

/** Domingos: adelanto 20% obligatorio antes de confirmar. */
export function requiresAdvancePayment(dateKey: string): boolean {
  return getAdvancePaymentRate(dateKey) !== null;
}

export function formatAdvancePercent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function getDateKeyFromYmd(
  year: number,
  month: number,
  day: number,
): string {
  return `${year}-${String(month).padStart(2, "0")}-${
    String(day).padStart(2, "0")
  }`;
}

export function getDateKeyLima(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Lima" });
}

/** Texto corto para filas del selector de fecha. */
export function getDateSelectorDescription(dateKey: string): string {
  if (isSalonClosed(dateKey)) {
    return isZmMallClosed(dateKey) ? "Cerrado — CC no abre" : "Cerrado";
  }
  const sunday = isSunday(dateKey);
  const holiday = isPeruHoliday(dateKey);
  const hours = holiday ? specialDayHoursLabel(dateKey) : "";
  const hoursSuffix = hours ? ` · ${hours}` : "";
  if (sunday && holiday) return `Dom feriado — adelanto S/25${hoursSuffix}`;
  if (sunday) return "Dom — adelanto S/25";
  if (holiday) return hours ? `Horario especial — ${hours}` : "Ver horarios";
  return "Ver horarios";
}

/** Copy cuando la clienta pide un día con CC cerrado (feriado nacional real). */
const CC_CLOSED_MESSAGE =
  "Ese día el *Centro Comercial Las Plazuelas* no abre, así que el salón está cerrado y no podemos agendar citas 💜\n\n" +
  "Elige otro día y te ayudamos a reservar.";

/** Copy genérico cuando el salón cierra por un motivo interno (evento, staff, etc.), no por el CC. */
function genericClosedMessage(reason: string | null): string {
  const motivo = reason ? ` (${reason})` : "";
  return (
    `Ese día el salón no atiende${motivo} 💜\n\n` +
    "Elige otro día y te ayudamos a reservar."
  );
}

/**
 * Mensaje para clienta cuando pide una fecha cerrada. Distingue cierre real
 * del CC (feriado nacional) de un cierre interno del salón (evento, staff)
 * para no decirle que "el CC no abre" cuando en realidad el CC sí abre.
 */
export function getSalonClosedMessage(dateKey: string): string {
  const key = dateKey.slice(0, 10);
  if (isZmMallClosed(key)) return CC_CLOSED_MESSAGE;
  return genericClosedMessage(currentState().closedReasonByDate[key] ?? null);
}
