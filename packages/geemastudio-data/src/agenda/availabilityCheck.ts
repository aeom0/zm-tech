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
  const windowStart = formatAppointmentWallclock(addMinutes(args.start, -12 * 60), args.timeZone)
  const windowEnd = formatAppointmentWallclock(addMinutes(candidateEnd, 12 * 60), args.timeZone)

  const overlaps = await Promise.all(
    employeeIds.map(async (employeeId) => {
      const { data, error } = await client
        .from('appointments')
        .select('id, date, duration')
        .eq('employee_id', employeeId)
        .neq('status', 'cancelled')
        .gte('date', windowStart)
        .lte('date', windowEnd)
        .order('date', { ascending: true })
      if (error) throw new Error(error.message)
      return findOverlap({
        candidateStart: args.start,
        candidateDurationMinutes: args.durationMinutes,
        timeZone: args.timeZone,
        excludeAppointmentId: args.excludeAppointmentId,
        existing: (data ?? []) as { id: string; date: string; duration: number }[],
      })
    })
  )

  return overlaps.reduce<AvailabilityOverlap | null>((latest, candidate) => {
    if (!candidate) return latest
    if (!latest || candidate.busyUntil.getTime() > latest.busyUntil.getTime()) return candidate
    return latest
  }, null)
}
