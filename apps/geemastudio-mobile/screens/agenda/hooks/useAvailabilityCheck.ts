import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'

import { checkEmployeesAvailability, queryKeys } from '@geemastudio/data'
import { formatAppointmentWallclock, formatoHoraHHMMEnZona } from '@zmtech/tenant-config'

import { supabase } from '@/lib/supabase'

type AvailabilityStatus = 'idle' | 'checking' | 'free' | 'busy' | 'error'

interface AvailabilityResult {
  status: AvailabilityStatus
  isBusy: boolean
  busyUntil: Date | null
  conflictingAppointmentId: string | null
  errorMessage: string | null
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
      ...queryKeys.agenda.availabilityCheck,
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

      const overlap = await checkEmployeesAvailability(supabase, {
        employeeIds: uniqueEmployeeIds,
        start,
        durationMinutes,
        timeZone,
        excludeAppointmentId: args.excludeAppointmentId ?? null,
      })

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
