import { Colors } from '@/constants/theme'
import {
  esMismoDiaCalendarioEnZona,
  esHoyEnZonaIANA,
  horaCalendarioEnZona,
  instanteCitaDesdeTexto,
} from '@zmtech/tenant-config'

import type {
  AgendaAppointment,
  AgendaEmployee,
  AgendaPack,
  AgendaService,
  AgendaServiceLine,
  AgendaStatusFilter,
} from './types'

/** Comparación de día calendario en zona IANA del tenant. */
export function isSameCalendarDay(a: Date, b: Date, timeZone: string): boolean {
  return esMismoDiaCalendarioEnZona(a, b, timeZone)
}

export function isToday(date: Date, timeZone: string): boolean {
  return esHoyEnZonaIANA(date, timeZone)
}

export function getAppointmentsForSlot(
  appointments: AgendaAppointment[],
  date: Date,
  hour: number,
  statusFilter: AgendaStatusFilter,
  timeZone: string
): AgendaAppointment[] {
  return appointments.filter((apt) => {
    const aptDate = instanteCitaDesdeTexto(apt.date, timeZone)
    const sameDay = esMismoDiaCalendarioEnZona(aptDate, date, timeZone)
    const sameHour = horaCalendarioEnZona(aptDate, timeZone) === hour
    const statusMatches = matchesStatusFilter(apt.status, statusFilter)
    return sameDay && sameHour && statusMatches
  })
}

export function getAptsForEmpSlot(
  appointments: AgendaAppointment[],
  date: Date,
  hour: number,
  empId: string,
  statusFilter: AgendaStatusFilter,
  timeZone: string
): AgendaAppointment[] {
  return appointments.filter((apt) => {
    const aptDate = instanteCitaDesdeTexto(apt.date, timeZone)
    const sameDay = esMismoDiaCalendarioEnZona(aptDate, date, timeZone)
    const sameHour = horaCalendarioEnZona(aptDate, timeZone) === hour
    const statusMatches = matchesStatusFilter(apt.status, statusFilter)
    return sameDay && sameHour && statusMatches && apt.employee_id === empId
  })
}

export function getEmployeeColor(employees: AgendaEmployee[], employeeId: string): string {
  const employee = employees.find((e) => e.id === employeeId)
  return employee?.color ?? Colors.light.violet
}

export function getEmployeeFirstName(employees: AgendaEmployee[], employeeId: string): string {
  const employee = employees.find((e) => e.id === employeeId)
  return employee?.name?.split(' ')[0] ?? ''
}

export function getServiceName(services: AgendaService[], serviceId: string): string {
  const service = services.find((s) => s.id === serviceId)
  return service?.name ?? ''
}

/** Citas del día en zona, opcionalmente filtradas por profesionales y estado. */
export function filterAppointmentsForOwnerDay(
  appointments: AgendaAppointment[],
  date: Date,
  employeeIds: string[],
  statusFilter: AgendaStatusFilter,
  timeZone: string
): AgendaAppointment[] {
  return appointments.filter((apt) => {
    const aptDate = instanteCitaDesdeTexto(apt.date, timeZone)
    if (!esMismoDiaCalendarioEnZona(aptDate, date, timeZone)) return false
    if (employeeIds.length > 0 && !employeeIds.includes(apt.employee_id)) {
      return false
    }
    if (!matchesStatusFilter(apt.status, statusFilter)) return false
    return true
  })
}

export function sortAppointmentsByStart(
  appointments: AgendaAppointment[],
  timeZone: string
): AgendaAppointment[] {
  return [...appointments].sort(
    (a, b) =>
      instanteCitaDesdeTexto(a.date, timeZone).getTime() -
      instanteCitaDesdeTexto(b.date, timeZone).getTime()
  )
}

/**
 * Centraliza la lógica de filtro por status.
 * "cancelled" agrupa: cancelled + no_show
 */
export function matchesStatusFilter(status: string, filter: AgendaStatusFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'cancelled') return status === 'cancelled' || status === 'no_show'
  return status === filter
}

// ── Servicios múltiples / packs (patrón ZM Lash & Nails) ────────────────────

/**
 * Reparte el total de un pack en N líneas iguales, exacto al centavo.
 * El resto (por redondeo) se asigna a las primeras líneas. No se deriva de la
 * suma de precios de catálogo de los servicios incluidos.
 */
export function splitPackTotalEqually(packTotal: number, lineCount: number): number[] {
  if (lineCount <= 0 || !Number.isFinite(packTotal)) return []
  const cents = Math.round(packTotal * 100)
  const base = Math.floor(cents / lineCount)
  const remainder = cents - base * lineCount
  const out: number[] = []
  for (let i = 0; i < lineCount; i++) {
    const c = base + (i < remainder ? 1 : 0)
    out.push(c / 100)
  }
  return out
}

/** Precio de una línea: usa priceOverride (packs) o el precio de catálogo del servicio. */
export function lineUnitPrice(line: AgendaServiceLine, services: AgendaService[]): number {
  if (typeof line.priceOverride === 'number' && Number.isFinite(line.priceOverride)) {
    return line.priceOverride
  }
  const svc = services.find((s) => s.id === line.serviceId)
  const parsed = svc ? parseFloat(svc.price) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

/** Duración de una línea: siempre la del catálogo (los packs no tienen duración propia). */
export function lineDuration(line: AgendaServiceLine, services: AgendaService[]): number {
  const svc = services.find((s) => s.id === line.serviceId)
  return svc?.duration ?? 0
}

/** Precio y duración totales de la cita: suma de todas las líneas. */
export function computeServiceLinesTotals(
  lines: AgendaServiceLine[],
  services: AgendaService[]
): { totalPrice: number; totalDuration: number } {
  return lines.reduce(
    (acc, line) => ({
      totalPrice: acc.totalPrice + lineUnitPrice(line, services),
      totalDuration: acc.totalDuration + lineDuration(line, services),
    }),
    { totalPrice: 0, totalDuration: 0 }
  )
}

/**
 * Expande un pack en una línea por cada servicio incluido, todas con el mismo
 * profesional (el "por defecto" vigente al momento de agregarlo) y el precio
 * repartido equitativamente del total del pack.
 */
export function addPackServiceLines(pack: AgendaPack, defaultEmployeeId: string): AgendaServiceLine[] {
  const ids = pack.service_ids ?? []
  if (ids.length === 0) return []
  const packTotal = parseFloat(pack.price)
  const safeTotal = Number.isFinite(packTotal) ? packTotal : 0
  const shares = splitPackTotalEqually(safeTotal, ids.length)
  return ids.map((serviceId, idx) => ({
    serviceId,
    employeeId: defaultEmployeeId,
    packId: pack.id,
    priceOverride: shares[idx] ?? 0,
  }))
}
