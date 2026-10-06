// slot-occupation.ts — Ocupación real de slots (duración catálogo + turnover + almuerzo)

import { getLoadedWabaRules } from "./tenant-rules-store.ts";

/** Categoría uñas: turnover más largo entre clientas. */
export const NAIL_CATEGORY_ID = "cat-unas";

/** Minutos extra tras servicio de uñas (limpieza / preparación). */
export const NAIL_TURNOVER_MINUTES = 30;

/** Minutos extra tras cualquier otro servicio. */
export const OTHER_TURNOVER_MINUTES = 15;

/** Ventana objetivo del almuerzo Stephani (Lima). */
export const MEAL_START_MINUTES = 12 * 60;
export const MEAL_END_MINUTES = 14 * 60 + 30;
export const MEAL_DURATION_MINUTES = 45;

export const SALON_OPEN_MINUTES = 10 * 60;
export const SALON_CLOSE_MINUTES = 18 * 60;

/** Almuerzo del tenant (waba_rules.capacity.mealBreak); ZM si no hay reglas cargadas. */
function mealBreak() {
  return (
    getLoadedWabaRules()?.capacity.mealBreak ?? {
      startMinutes: MEAL_START_MINUTES,
      endMinutes: MEAL_END_MINUTES,
      durationMinutes: MEAL_DURATION_MINUTES,
    }
  );
}

export type AgendaInterval = { start: number; end: number };

/** Turnover según categoría del servicio en catálogo. */
export function turnoverMinutesForCategory(categoryId?: string | null): number {
  return categoryId === NAIL_CATEGORY_ID
    ? NAIL_TURNOVER_MINUTES
    : OTHER_TURNOVER_MINUTES;
}

/**
 * Minutos que ocupa el carrito en agenda: suma de duraciones + UN solo
 * turnover al final de la cita (el más largo entre las categorías
 * presentes, ej. +30 si hay uñas). Antes se sumaba turnover por cada
 * servicio del carrito, lo que inflaba de más citas con 2+ servicios
 * (ej. un pack de manicure+pedicure sumaba +60 en vez de +30) y hacía
 * que el bot mostrara "sin horarios" cuando sí había cupo real (caso
 * real Alberto VE …4665, 17-sep-2026).
 * Sin filas de servicio: fallbackDuration + turnover genérico.
 */
export function occupiedMinutesForServices(
  services: { duration: number; category_id?: string | null }[],
  fallbackDuration = 0,
): number {
  if (services.length === 0) {
    return fallbackDuration > 0 ? fallbackDuration + OTHER_TURNOVER_MINUTES : 0;
  }
  const totalDuration = services.reduce((sum, svc) => sum + svc.duration, 0);
  const turnover = Math.max(
    ...services.map((svc) => turnoverMinutesForCategory(svc.category_id)),
  );
  return totalDuration + turnover;
}

/**
 * Minutos de agenda de un carrito: si su composición coincide con un pack con
 * `slot_minutes` (ej. Lifting + Laminado = 50, 2 Lifting = 75) se usa ese
 * valor, que ya incluye turnover. Si no, suma de servicios + turnover.
 */
export function occupiedMinutesForComposition(
  serviceIds: string[],
  services: { duration: number; category_id?: string | null }[],
  packSlotMinutes: Map<string, number> | undefined,
  fallbackDuration = 0,
): number {
  const override = packSlotMinutes?.get([...serviceIds].sort().join("|"));
  if (override && override > 0) return override;
  return occupiedMinutesForServices(services, fallbackDuration);
}

/** Solape de intervalos en minutos desde medianoche (Lima). */
export function intervalsOverlap(
  a: AgendaInterval,
  b: AgendaInterval,
): boolean {
  return a.start < b.end && a.end > b.start;
}

/**
 * ¿Cabe un descanso de almuerzo (45 min)?
 * - Si hubo trabajo en la mañana (inicio < 12:00 y fin > 10:00), el break debe
 *   caber entre 12:00 y 14:30.
 * - Si la mañana estuvo libre, el almuerzo puede desplazarse hasta salonClose.
 */
export function hasFlexibleMealBreak(
  appointments: AgendaInterval[],
  candidate: AgendaInterval,
  salonCloseMinutes: number = SALON_CLOSE_MINUTES,
): boolean {
  const meal = mealBreak();
  const all = [...appointments, candidate].sort((a, b) => a.start - b.start);
  const hadMorningAppointment = appointments.some(
    (a) => a.start < meal.startMinutes && a.end > SALON_OPEN_MINUTES,
  );

  const breakWindowEnd = hadMorningAppointment
    ? Math.min(meal.endMinutes, salonCloseMinutes)
    : salonCloseMinutes;
  const busy = all.filter(
    (a) => a.end > meal.startMinutes && a.start < breakWindowEnd,
  );
  let cursor = meal.startMinutes;
  for (const interval of busy) {
    const start = Math.max(interval.start, meal.startMinutes);
    if (start - cursor >= meal.durationMinutes) return true;
    cursor = Math.max(cursor, Math.min(interval.end, breakWindowEnd));
  }
  return breakWindowEnd - cursor >= meal.durationMinutes;
}


/** Camillas del salón: todo lo que no es uñas usa una. */
export const SALON_BEDS = 2;

/**
 * Camillas que ocupa una cita o carrito: 0 si todo es uñas, 1 si trae algo
 * que no es uñas (lifting, cejas, extensiones, retiro, depilación…).
 * Sin servicios conocidos asume 1 (conservador).
 */
export function bedsForServices(
  services: { category_id?: string | null }[],
): number {
  if (services.length === 0) return 1;
  return services.every((svc) => svc.category_id === NAIL_CATEGORY_ID) ? 0 : 1;
}

/**
 * Camillas libres para una cita nueva: `incoming` camillas caben junto a lo
 * que ya ocupa el mismo horario. Las reglas de carril (Karelis/Stephani) y
 * almuerzo se evalúan aparte; esto solo agrega el tope físico.
 */
export function bedsAvailable(
  occupiedBeds: number,
  incomingBeds: number,
  totalBeds: number = SALON_BEDS,
): boolean {
  return occupiedBeds + incomingBeds <= totalBeds;
}
