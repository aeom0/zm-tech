import { Colors } from '@/constants/theme'
import {
  esMismoDiaCalendarioEnZona,
  esHoyEnZonaIANA,
  horaCalendarioEnZona,
  instanteCitaDesdeTexto,
} from '@zmtech/tenant-config'

import type { AgendaAppointment, AgendaEmployee, AgendaService, AgendaStatusFilter } from './types'

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
