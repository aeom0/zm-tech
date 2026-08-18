import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

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

function fmtTimeHHMM(d: Date) {
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

function computeOverlapBusyUntil(args: {
  candidateStart: Date
  candidateDurationMinutes: number
  excludeAppointmentId?: string | null
  existing: Array<{ id: string; date: string; duration: number }>
}): { busyUntil: Date; conflictingAppointmentId: string } | null {
  const candidateEnd = addMinutes(args.candidateStart, args.candidateDurationMinutes)

  let best: { busyUntil: Date; conflictingAppointmentId: string } | null = null

  for (const apt of args.existing) {
    if (args.excludeAppointmentId && apt.id === args.excludeAppointmentId) {
      continue
    }
    const start = new Date(apt.date)
    const end = addMinutes(start, apt.duration)

    const overlaps = start < candidateEnd && end > args.candidateStart
    if (!overlaps) continue

    if (!best || end.getTime() < best.busyUntil.getTime()) {
      best = { busyUntil: end, conflictingAppointmentId: apt.id }
    }
  }

  return best
}

export function useAvailabilityCheck(args: {
  employeeId: string
  startDate: Date | null
  durationMinutes: number
  excludeAppointmentId?: string | null
  enabled?: boolean
  /** stale 30s como pediste */
  staleTimeMs?: number
}) {
  const enabled =
    (args.enabled ?? true) &&
    !!args.employeeId &&
    !!args.startDate &&
    Number.isFinite(args.durationMinutes) &&
    args.durationMinutes > 0

  const start = args.startDate
  const durationMinutes = args.durationMinutes

  const query = useQuery({
    queryKey: [
      'availability_check',
      args.employeeId,
      start ? start.toISOString() : null,
      durationMinutes,
      args.excludeAppointmentId ?? null,
    ],
    enabled,
    staleTime: args.staleTimeMs ?? 30_000,
    queryFn: async () => {
      if (!start) {
        return {
          existing: [],
          label: null,
        } as const
      }

      const candidateStart = start
      const candidateEnd = addMinutes(candidateStart, durationMinutes)

      // Ventana chica para no traer toda la tabla.
      // Le damos un margen por si hay duraciones que arrancan antes/terminan después.
      const windowStart = addMinutes(candidateStart, -12 * 60)
      const windowEnd = addMinutes(candidateEnd, 12 * 60)

      const { data, error } = await supabase
        .from('appointments')
        .select('id, date, duration')
        .eq('employee_id', args.employeeId)
        .gte('date', windowStart.toISOString())
        .lte('date', windowEnd.toISOString())
        .order('date', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }

      const existing = (data ?? []) as Array<{
        id: string
        date: string
        duration: number
      }>

      const overlap = computeOverlapBusyUntil({
        candidateStart,
        candidateDurationMinutes: durationMinutes,
        excludeAppointmentId: args.excludeAppointmentId ?? null,
        existing,
      })

      return {
        existing,
        overlap,
        label: overlap ? fmtTimeHHMM(overlap.busyUntil) : null,
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
