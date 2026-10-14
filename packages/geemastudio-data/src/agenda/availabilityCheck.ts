import type { SupabaseClient } from '@supabase/supabase-js'
import { formatAppointmentWallclock, parseAppointmentWallclock } from '@zmtech/tenant-config'

export interface AvailabilityOverlap {
  /** Cuándo queda libre el último profesional ocupado. */
  busyUntil: Date
  conflictingAppointmentId: string
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

/** Primer choque de una franja contra citas existentes (el que termina antes). */
export function findOverlap(args: {
  candidateStart: Date
  candidateDurationMinutes: number
  timeZone: string
  excludeAppointmentId?: string | null
  existing: readonly { id: string; date: string; duration: number }[]
}): AvailabilityOverlap | null {
  const candidateEnd = addMinutes(args.candidateStart, args.candidateDurationMinutes)
  let best: AvailabilityOverlap | null = null

  for (const apt of args.existing) {
    if (args.excludeAppointmentId && apt.id === args.excludeAppointmentId) continue
    const start = parseAppointmentWallclock(apt.date, args.timeZone)
    if (!start) continue
    const end = addMinutes(start, apt.duration)
    if (!(start < candidateEnd && end > args.candidateStart)) continue
    if (!best || end.getTime() < best.busyUntil.getTime()) {
      best = { busyUntil: end, conflictingAppointmentId: apt.id }
    }
  }
  return best
}

type BusySlot = { id: string; date: string; duration: number }

/**
 * Citas no canceladas de la ventana que ocupan a cada profesional: por el
 * encabezado (`appointments.employee_id`) o por alguna línea de servicio
 * (`appointment_services.employee_id`), así una cita con dos personas bloquea a ambas.
 */
export async function fetchBusySlotsByEmployee(
  client: SupabaseClient,
  args: { employeeIds: readonly string[]; from: string; to: string }
): Promise<Map<string, BusySlot[]>> {
  const wanted = new Set(args.employeeIds.filter(Boolean))
  const result = new Map<string, BusySlot[]>([...wanted].map((id) => [id, []]))
  if (wanted.size === 0) return result

  const { data: apts, error } = await client
    .from('appointments')
    .select('id, date, duration, employee_id')
    .neq('status', 'cancelled')
    .gte('date', args.from)
    .lte('date', args.to)
    .order('date', { ascending: true })
  if (error) throw new Error(error.message)
  const rows = (apts ?? []) as (BusySlot & { employee_id: string | null })[]
  if (rows.length === 0) return result

  const { data: lines, error: linesError } = await client
    .from('appointment_services')
    .select('appointment_id, employee_id')
    .in(
      'appointment_id',
      rows.map((r) => r.id)
    )
  if (linesError) throw new Error(linesError.message)

  const people = new Map<string, Set<string>>()
  for (const r of rows) people.set(r.id, new Set(r.employee_id ? [r.employee_id] : []))
  for (const l of (lines ?? []) as { appointment_id: string; employee_id: string | null }[]) {
    if (l.employee_id) people.get(l.appointment_id)?.add(l.employee_id)
  }

  for (const r of rows) {
    for (const emp of people.get(r.id) ?? []) {
      result.get(emp)?.push({ id: r.id, date: r.date, duration: r.duration })
    }
  }
  return result
}

/**
 * Chequea si uno o varios profesionales (cita multi-servicio) están libres a la vez.
 * Si alguno está ocupado, devuelve cuándo termina el último de los ocupados.
 */
export async function checkEmployeesAvailability(
  client: SupabaseClient,
  args: {
    employeeIds: readonly string[]
    start: Date
    durationMinutes: number
    timeZone: string
    excludeAppointmentId?: string | null
  }
): Promise<AvailabilityOverlap | null> {
  const employeeIds = [...new Set(args.employeeIds.filter(Boolean))]
  if (employeeIds.length === 0) return null

  const candidateEnd = addMinutes(args.start, args.durationMinutes)
  // Ventana chica para no traer toda la tabla.
  const busy = await fetchBusySlotsByEmployee(client, {
    employeeIds,
    from: formatAppointmentWallclock(addMinutes(args.start, -12 * 60), args.timeZone),
    to: formatAppointmentWallclock(addMinutes(candidateEnd, 12 * 60), args.timeZone),
  })

  let latest: AvailabilityOverlap | null = null
  for (const employeeId of employeeIds) {
    const candidate = findOverlap({
      candidateStart: args.start,
      candidateDurationMinutes: args.durationMinutes,
      timeZone: args.timeZone,
      excludeAppointmentId: args.excludeAppointmentId,
      existing: busy.get(employeeId) ?? [],
    })
    if (candidate && (!latest || candidate.busyUntil.getTime() > latest.busyUntil.getTime())) {
      latest = candidate
    }
  }
  return latest
}
