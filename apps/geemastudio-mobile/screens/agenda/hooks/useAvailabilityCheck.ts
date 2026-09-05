import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import {
  formatAppointmentWallclock,
  formatoHoraHHMMEnZona,
  parseAppointmentWallclock,
} from '@zmtech/tenant-config'

type AvailabilityStatus = 'idle' | 'checking' | 'free' | 'busy' | 'error'

interface AvailabilityResult {
  status: AvailabilityStatus
  isBusy: boolean
  busyUntil: Date | null
  conflictingAppointmentId: string | null
  errorMessage: string | null
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000)
}

function computeOverlapBusyUntil(args: {
  candidateStart: Date
  candidateDurationMinutes: number
  timeZone: string
  excludeAppointmentId?: string | null
  existing: Array<{ id: string; date: string; duration: number }>
}): { busyUntil: Date; conflictingAppointmentId: string } | null {
  const candidateEnd = addMinutes(args.candidateStart, args.candidateDurationMinutes)

  let best: { busyUntil: Date; conflictingAppointmentId: string } | null = null

  for (const apt of args.existing) {
    if (args.excludeAppointmentId && apt.id === args.excludeAppointmentId) {
      continue
    }
    const start = parseAppointmentWallclock(apt.date, args.timeZone) ?? new Date(apt.date)
    const end = addMinutes(start, apt.duration)

    const overlaps = start < candidateEnd && end > args.candidateStart
    if (!overlaps) continue

    if (!best || end.getTime() < best.busyUntil.getTime()) {
      best = { busyUntil: end, conflictingAppointmentId: apt.id }
    }
  }

  return best
}

/**
 * Chequea disponibilidad para uno o varios profesionales (cita multi-servicio).
 * Si alguno está ocupado, reporta busy hasta que el último de los ocupados termine.
 */
export function useAvailabilityCheck(args: {
  employeeIds: string[]
  startDate: Date | null
  durationMinutes: number
  timeZone: string
  excludeAppointmentId?: string | null
  enabled?: boolean
  staleTimeMs?: number
}) {
  const uniqueEmployeeIds = [...new Set(args.employeeIds.filter(Boolean))].sort()

  const enabled =
    (args.enabled ?? true) &&
    uniqueEmployeeIds.length > 0 &&
    !!args.startDate &&
    Number.isFinite(args.durationMinutes) &&
    args.durationMinutes > 0

  const start = args.startDate
  const durationMinutes = args.durationMinutes
  const timeZone = args.timeZone

  const query = useQuery({
    queryKey: [
      'availability_check',
      uniqueEmployeeIds,
      start ? formatAppointmentWallclock(start, timeZone) : null,
      durationMinutes,
      args.excludeAppointmentId ?? null,
      timeZone,
    ],
    enabled,
    staleTime: args.staleTimeMs ?? 30_000,
    queryFn: async () => {
      if (!start) {
        return {
          overlap: null,
          label: null,
        } as const
      }

      const candidateStart = start
      const candidateEnd = addMinutes(candidateStart, durationMinutes)

      // Ventana chica para no traer toda la tabla.
      const windowStart = addMinutes(candidateStart, -12 * 60)
      const windowEnd = addMinutes(candidateEnd, 12 * 60)

      const perEmployeeOverlaps = await Promise.all(
        uniqueEmployeeIds.map(async (employeeId) => {
          const { data, error } = await supabase
            .from('appointments')
            .select('id, date, duration')
            .eq('employee_id', employeeId)
            .gte('date', formatAppointmentWallclock(windowStart, timeZone))
            .lte('date', formatAppointmentWallclock(windowEnd, timeZone))
            .order('date', { ascending: true })

          if (error) {
            throw new Error(error.message)
          }

          const existing = (data ?? []) as Array<{
            id: string
            date: string
            duration: number
          }>

          return computeOverlapBusyUntil({
            candidateStart,
            candidateDurationMinutes: durationMinutes,
            timeZone,
            excludeAppointmentId: args.excludeAppointmentId ?? null,
            existing,
          })
        })
      )

      // Todos deben estar libres a la vez: busyUntil = cuando termina el último ocupado.
      const overlap = perEmployeeOverlaps.reduce<
        { busyUntil: Date; conflictingAppointmentId: string } | null
      >((latest, candidate) => {
        if (!candidate) return latest
        if (!latest || candidate.busyUntil.getTime() > latest.busyUntil.getTime()) {
          return candidate
        }
        return latest
      }, null)

      return {
        overlap,
        label: overlap ? formatoHoraHHMMEnZona(overlap.busyUntil, timeZone) : null,
      } as const
    },
  })

  const result: AvailabilityResult = useMemo(() => {
    if (!enabled) {
      return {
        status: 'idle',
        isBusy: false,
        busyUntil: null,
        conflictingAppointmentId: null,
        errorMessage: null,
      }
    }

    if (query.isLoading) {
      return {
        status: 'checking',
        isBusy: false,
        busyUntil: null,
        conflictingAppointmentId: null,
        errorMessage: null,
      }
    }

    if (query.isError) {
      const msg = query.error instanceof Error ? query.error.message : 'Error inesperado'
      return {
        status: 'error',
        isBusy: false,
        busyUntil: null,
        conflictingAppointmentId: null,
        errorMessage: msg,
      }
    }

    const overlap = query.data?.overlap ?? null
    return {
      status: overlap ? 'busy' : 'free',
      isBusy: !!overlap,
      busyUntil: overlap?.busyUntil ?? null,
      conflictingAppointmentId: overlap?.conflictingAppointmentId ?? null,
      errorMessage: null,
    }
  }, [enabled, query.data, query.error, query.isError, query.isLoading])

  return {
    ...result,
    refetch: query.refetch,
    isFetching: query.isFetching,
    busyUntilLabel: query.data?.label ?? null,
  }
}
