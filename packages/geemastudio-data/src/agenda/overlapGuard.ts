import type { SupabaseClient } from '@supabase/supabase-js'
import {
  formatAppointmentWallclock,
  formatoHoraHHMMEnZona,
  parseAppointmentWallclock,
} from '@zmtech/tenant-config'

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

function fmtTimeHHMM(d: Date, timeZone: string): string {
  return formatoHoraHHMMEnZona(d, timeZone)
}

export async function guardOverlapBeforeInsert(
  client: SupabaseClient,
  args: {
    employeeId: string
    dateIso: string
    durationMinutes: number
    timeZone: string
    excludeAppointmentId?: string | null
  }
): Promise<void> {
  const candidateStart = parseAppointmentWallclock(args.dateIso, args.timeZone)
  if (!candidateStart) throw new Error('La fecha de la cita no es válida.')
  const candidateEnd = addMinutes(candidateStart, args.durationMinutes)

  const windowStart = addMinutes(candidateStart, -12 * 60)
  const windowEnd = addMinutes(candidateEnd, 12 * 60)

  const { data, error } = await client
    .from('appointments')
    .select('id, date, duration')
    .eq('employee_id', args.employeeId)
    .neq('status', 'cancelled')
    .gte('date', formatAppointmentWallclock(windowStart, args.timeZone))
    .lte('date', formatAppointmentWallclock(windowEnd, args.timeZone))
    .order('date', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const existing = (data ?? []) as {
    id: string
    date: string
    duration: number
  }[]

  for (const apt of existing) {
    if (args.excludeAppointmentId && apt.id === args.excludeAppointmentId) {
      continue
    }

    const start = parseAppointmentWallclock(apt.date, args.timeZone)
    if (!start) continue
    const end = addMinutes(start, apt.duration)
    const overlaps = start < candidateEnd && end > candidateStart
    if (!overlaps) continue

    throw new Error(`Horario ocupado. Termina a las ${fmtTimeHHMM(end, args.timeZone)}.`)
  }
}

export async function guardOverlapForLines(
  client: SupabaseClient,
  args: {
    employeeIds: string[]
    dateIso: string
    durationMinutes: number
    timeZone: string
    excludeAppointmentId?: string | null
  }
): Promise<void> {
  const uniqueEmployeeIds = [...new Set(args.employeeIds.filter(Boolean))]
  await Promise.all(
    uniqueEmployeeIds.map((employeeId) =>
      guardOverlapBeforeInsert(client, {
        employeeId,
        dateIso: args.dateIso,
        durationMinutes: args.durationMinutes,
        timeZone: args.timeZone,
        excludeAppointmentId: args.excludeAppointmentId,
      })
    )
  )
}
