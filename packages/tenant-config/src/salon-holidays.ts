/**
 * Feriados / no laborables del salón — catálogos por país + helpers puros.
 * Filas por tenant viven en `salon_holidays`; este módulo no muta estado global.
 */

import { diaLaboralKeyDesdeFechaEnZona } from './iana-timezone'
import type { TenantConfig } from './types'

export const DEFAULT_HOLIDAY_OPEN_UNTIL = 12

export interface HolidayCatalogEntry {
  date: string
  name: string
  /** Default false — cierres de CC son override del tenant en BD. */
  isClosed?: boolean
  openUntilHour?: number
}

export interface SalonHoliday {
  date: string
  name: string
  isClosed: boolean
  /** Primera hora de inicio de cita; null = apertura habitual del día. */
  openFromHour: number | null
  /** Última hora de inicio de cita; null = cierre habitual del día. */
  openUntilHour: number | null
}

/** Índice por YYYY-MM-DD. */
export type SalonHolidayIndex = Map<string, SalonHoliday>

export interface HolidayAlert {
  dateKey: string
  name: string
  daysUntil: number
  isToday: boolean
  isTomorrow: boolean
  scheduleHint: string
}

/** Feriados nacionales PE 2026 — alineado al seed operativo de ZM Lash (tenant #1).
 * Cierres (`isClosed`) = días en que el CC no abre (Las Plazuelas); el admin puede reabrir.
 * `openUntilHour` solo aplica si el día NO está cerrado. */
export const PE_HOLIDAYS_2026: readonly HolidayCatalogEntry[] = [
  { date: '2026-01-01', name: 'Año Nuevo' },
  { date: '2026-04-02', name: 'Jueves Santo' },
  { date: '2026-04-03', name: 'Viernes Santo' },
  { date: '2026-05-01', name: 'Día del Trabajo' },
  { date: '2026-06-29', name: 'San Pedro y San Pablo' },
  { date: '2026-07-23', name: 'Día de la Fuerza Aérea', isClosed: true },
  { date: '2026-07-28', name: 'Fiestas Patrias', isClosed: true },
  { date: '2026-07-29', name: 'Fiestas Patrias', isClosed: true },
  { date: '2026-08-06', name: 'Batalla de Junín', openUntilHour: 14 },
  { date: '2026-08-30', name: 'Santa Rosa de Lima' },
  { date: '2026-10-08', name: 'Combate de Angamos' },
  { date: '2026-11-01', name: 'Todos los Santos' },
  { date: '2026-12-08', name: 'Inmaculada Concepción' },
  { date: '2026-12-25', name: 'Navidad' },
]

/**
 * Feriados nacionales VE 2026 para salón (no el calendario bancario BCV a ciegas).
 * Admin puede marcar is_closed o ajustar open_until en BD.
 */
export const VE_HOLIDAYS_2026: readonly HolidayCatalogEntry[] = [
  { date: '2026-01-01', name: 'Año Nuevo' },
  { date: '2026-01-06', name: 'Día de Reyes' },
  { date: '2026-02-16', name: 'Lunes de Carnaval' },
  { date: '2026-02-17', name: 'Martes de Carnaval' },
  { date: '2026-04-02', name: 'Jueves Santo' },
  { date: '2026-04-03', name: 'Viernes Santo' },
  { date: '2026-04-19', name: 'Declaración de la Independencia' },
  { date: '2026-05-01', name: 'Día del Trabajador' },
  { date: '2026-06-24', name: 'Batalla de Carabobo' },
  { date: '2026-07-05', name: 'Día de la Independencia' },
  { date: '2026-07-24', name: 'Natalicio del Libertador' },
  { date: '2026-10-12', name: 'Día de la Resistencia Indígena' },
  { date: '2026-12-24', name: 'Nochebuena' },
  { date: '2026-12-25', name: 'Navidad' },
  { date: '2026-12-31', name: 'Fin de Año' },
]

export const HOLIDAY_CATALOGS: Record<string, readonly HolidayCatalogEntry[]> = {
  PE: PE_HOLIDAYS_2026,
  VE: VE_HOLIDAYS_2026,
}

export function getHolidayCatalog(
  country: string | null | undefined
): readonly HolidayCatalogEntry[] {
  if (!country) return []
  return HOLIDAY_CATALOGS[country.toUpperCase()] ?? []
}

/** Rango permitido en BD (`salon_holidays_open_*_check`). */
const MIN_SPECIAL_HOUR = 6
const MAX_SPECIAL_HOUR = 23

/** null/undefined/no numérico → null (horario habitual). */
function clampSpecialHour(hour: number | null | undefined): number | null {
  if (hour === null || hour === undefined) return null
  const n = Number(hour)
  if (!Number.isFinite(n)) return null
  return Math.min(MAX_SPECIAL_HOUR, Math.max(MIN_SPECIAL_HOUR, Math.trunc(n)))
}

export function normalizeDateKey(date: string): string {
  return String(date).slice(0, 10)
}

export function indexSalonHolidays(
  rows: Array<{
    date: string
    name?: string | null
    is_closed?: boolean
    isClosed?: boolean
    open_until_hour?: number | null
    openUntilHour?: number | null
    open_from_hour?: number | null
    openFromHour?: number | null
  }>
): SalonHolidayIndex {
  const map: SalonHolidayIndex = new Map()
  for (const row of rows) {
    const key = normalizeDateKey(row.date)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) continue
    const isClosed = Boolean(row.is_closed ?? row.isClosed)
    map.set(key, {
      date: key,
      name: (row.name ?? 'Feriado').trim() || 'Feriado',
      isClosed,
      openFromHour: clampSpecialHour(row.open_from_hour ?? row.openFromHour),
      openUntilHour: clampSpecialHour(row.open_until_hour ?? row.openUntilHour),
    })
  }
  return map
}

/** Filas listas para INSERT desde catálogo de país. */
export function catalogRowsForSeed(
  country: string,
  tenantId: string
): Array<{
  tenant_id: string
  date: string
  name: string
  is_closed: boolean
  open_until_hour: number
}> {
  return getHolidayCatalog(country).map((e) => ({
    tenant_id: tenantId,
    date: e.date,
    name: e.name,
    is_closed: Boolean(e.isClosed),
    open_until_hour: clampSpecialHour(e.openUntilHour) ?? DEFAULT_HOLIDAY_OPEN_UNTIL,
  }))
}

export function getHoliday(dateKey: string, index: SalonHolidayIndex): SalonHoliday | undefined {
  return index.get(normalizeDateKey(dateKey))
}

export function isHolidayClosed(dateKey: string, index: SalonHolidayIndex): boolean {
  return getHoliday(dateKey, index)?.isClosed === true
}

export function isHolidayDate(dateKey: string, index: SalonHolidayIndex): boolean {
  return index.has(normalizeDateKey(dateKey))
}

/** Hora 0–23 → '9 AM', '12 PM', '2 PM'. */
export function formatHourLabel(hour: number): string {
  if (hour === 0) return '12 AM'
  if (hour === 12) return '12 PM'
  if (hour < 12) return `${hour} AM`
  return `${hour - 12} PM`
}

/** @deprecated usar `formatHourLabel`. */
export const formatHolidayUntilLabel = formatHourLabel

/**
 * Resumen del horario de un día especial abierto, sin conocer el horario habitual:
 * 'Desde 2 PM', 'Última cita 1 PM', 'De 2 PM a 6 PM (última cita)', 'Horario habitual'.
 */
export function describeSpecialDayHours(h: {
  openFromHour: number | null
  openUntilHour: number | null
}): string {
  const { openFromHour: from, openUntilHour: until } = h
  if (from !== null && until !== null) {
    return `De ${formatHourLabel(from)} a ${formatHourLabel(until)} (última cita)`
  }
  if (from !== null) return `Desde ${formatHourLabel(from)}`
  if (until !== null) return `Última cita ${formatHourLabel(until)}`
  return 'Horario habitual'
}

function minutosDesdeMedianoche(hhmm: string): number {
  const parts = hhmm.trim().split(':')
  const h = parseInt(parts[0] ?? '', 10)
  const m = parseInt(parts[1] ?? '0', 10)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return NaN
  return h * 60 + m
}

/**
 * Franja efectiva para una fecha: businessHours del día, recortado por el día especial
 * (cerrado → null; openFrom sube la apertura; openUntil baja el cierre).
 * `close` es exclusivo para “puede iniciar cita” (último inicio = openUntil:00).
 * Misma regla que `get_available_slots` en BD.
 */
export function resolveFranjaEfectiva(
  fecha: Date,
  businessHours: TenantConfig['businessHours'],
  holidays: SalonHolidayIndex | undefined,
  timeZone: string
): { open: string; close: string } | null {
  const dayKey = diaLaboralKeyDesdeFechaEnZona(fecha, timeZone)
  const franja = businessHours[dayKey]
  if (franja === null || franja === undefined) return null
  const h = holidays?.get(dateKeyEnZona(fecha, timeZone))
  if (!h) return { open: franja.open, close: franja.close }
  if (h.isClosed) return null

  let openM = minutosDesdeMedianoche(franja.open)
  let closeM = minutosDesdeMedianoche(franja.close)
  if (!Number.isFinite(openM) || !Number.isFinite(closeM)) return null
  if (h.openFromHour !== null) openM = Math.max(openM, h.openFromHour * 60)
  // close exclusivo: un minuto después del último inicio permitido
  if (h.openUntilHour !== null) closeM = Math.min(closeM, h.openUntilHour * 60 + 1)
  if (closeM <= openM) return null
  return { open: hhmm(openM), close: hhmm(closeM) }
}

function hhmm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

function dateKeyEnZona(fecha: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(fecha)
  } catch {
    const y = fecha.getFullYear()
    const m = String(fecha.getMonth() + 1).padStart(2, '0')
    const d = String(fecha.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
}

export function scheduleHintForDate(dateKey: string, index: SalonHolidayIndex): string {
  const h = getHoliday(dateKey, index)
  if (!h) return ''
  if (h.isClosed) return 'Cerrado, sin citas'
  return describeSpecialDayHours(h)
}

export function getUpcomingHolidayAlerts(
  todayKey: string,
  index: SalonHolidayIndex,
  withinDays = 3
): HolidayAlert[] {
  const today = normalizeDateKey(todayKey)
  const alerts: HolidayAlert[] = []
  for (const [dateKey, h] of index) {
    const daysUntil = daysBetweenKeys(today, dateKey)
    if (daysUntil < 0 || daysUntil > withinDays) continue
    alerts.push({
      dateKey,
      name: h.name,
      daysUntil,
      isToday: daysUntil === 0,
      isTomorrow: daysUntil === 1,
      scheduleHint: scheduleHintForDate(dateKey, index),
    })
  }
  return alerts.sort((a, b) => a.daysUntil - b.daysUntil || a.dateKey.localeCompare(b.dateKey))
}

function daysBetweenKeys(fromKey: string, toKey: string): number {
  const [fy, fm, fd] = fromKey.split('-').map(Number)
  const [ty, tm, td] = toKey.split('-').map(Number)
  const from = Date.UTC(fy, fm - 1, fd)
  const to = Date.UTC(ty, tm - 1, td)
  return Math.round((to - from) / 86_400_000)
}

export function formatHolidayAlertTitle(alert: HolidayAlert): string {
  if (alert.isToday) return `Hoy: ${alert.name}`
  if (alert.isTomorrow) return `Mañana: ${alert.name}`
  return `En ${alert.daysUntil} días: ${alert.name}`
}

/** Re-export helper used by working-schedule after holidays check. */
export { minutosDesdeMedianoche, dateKeyEnZona }
