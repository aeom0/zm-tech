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

export function getEmployeeColor(
  employees: AgendaEmployee[],
  employeeId: string,
  fallbackColor: string
): string {
  const employee = employees.find((e) => e.id === employeeId)
  return employee?.color ?? fallbackColor
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

/** Carril asignado a una cita dentro de su cluster de solapamiento + total de carriles del cluster. */
export interface OverlapLaneInfo {
  lane: number
  laneCount: number
}

/**
 * Asigna "carriles" (lanes) a citas que se solapan en el tiempo dentro de una
 * misma columna (ej. mismo profesional en la vista día del owner, con citas
 * posicionadas de forma absoluta por hora de inicio/duración).
 *
 * Sin esto, dos citas del mismo profesional en el mismo rango horario se
 * dibujan una encima de otra (texto ilegible). Con carriles, cada cita
 * solapada ocupa un ancho parcial de la columna, lado a lado.
 *
 * Algoritmo: barrido por inicio agrupando en clusters de citas mutuamente
 * solapadas (se extiende el fin del cluster mientras la siguiente cita
 * empiece antes de que termine el cluster acumulado). Dentro de cada
 * cluster, asigna carriles en modo greedy: el primer carril libre cuyo fin
 * sea <= el inicio de la cita actual; si ninguno está libre, se abre un
 * carril nuevo.
 */
export function computeOverlapLayout(
  items: { id: string; startMin: number; endMin: number }[]
): Map<string, OverlapLaneInfo> {
  const result = new Map<string, OverlapLaneInfo>()
  const sorted = [...items].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)

  let cluster: typeof sorted = []
  let clusterEnd = -Infinity

  const flushCluster = () => {
    if (cluster.length === 0) return
    const laneEnds: number[] = []
    const laneById = new Map<string, number>()
    for (const it of cluster) {
      let laneIdx = laneEnds.findIndex((end) => end <= it.startMin)
      if (laneIdx === -1) {
        laneIdx = laneEnds.length
        laneEnds.push(it.endMin)
      } else {
        laneEnds[laneIdx] = it.endMin
      }
      laneById.set(it.id, laneIdx)
    }
    const laneCount = laneEnds.length
    for (const it of cluster) {
      result.set(it.id, { lane: laneById.get(it.id) ?? 0, laneCount })
    }
    cluster = []
    clusterEnd = -Infinity
  }

  for (const it of sorted) {
    if (cluster.length === 0 || it.startMin < clusterEnd) {
      cluster.push(it)
      clusterEnd = Math.max(clusterEnd, it.endMin)
    } else {
      flushCluster()
      cluster.push(it)
      clusterEnd = it.endMin
    }
  }
  flushCluster()

  return result
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
export function addPackServiceLines(
  pack: AgendaPack,
  defaultEmployeeId: string
): AgendaServiceLine[] {
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
