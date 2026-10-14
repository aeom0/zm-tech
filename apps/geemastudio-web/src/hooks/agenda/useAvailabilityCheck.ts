'use client'

import { useQuery } from '@tanstack/react-query'
import { checkEmployeesAvailability, queryKeys } from '@geemastudio/data'
import { formatoHoraHHMMEnZona, parseAppointmentWallclock } from '@zmtech/tenant-config'

import { supabase } from '@/lib/supabase'

export type AvailabilityState =
  | { status: 'idle' | 'checking' | 'free' }
  | { status: 'busy'; busyUntilLabel: string }
  | { status: 'error'; message: string }

/**
 * Aviso en vivo de choque de horario (mismo criterio que mobile). El guard del
 * paquete vuelve a validar al guardar; esto solo adelanta el aviso.
 */
export function useAvailabilityCheck(args: {
  employeeIds: readonly string[]
  /** Fecha-hora de pared `YYYY-MM-DDTHH:MM:SS` en la zona del negocio. */
  wallclock: string | null
  durationMinutes: number
  timeZone: string
  excludeAppointmentId?: string | null
}): AvailabilityState {
  const employeeIds = [...new Set(args.employeeIds.filter(Boolean))].sort()
  const start = args.wallclock ? parseAppointmentWallclock(args.wallclock, args.timeZone) : null
  const enabled =
    !!supabase && employeeIds.length > 0 && !!start && args.durationMinutes > 0

  const query = useQuery({
    queryKey: [
      ...queryKeys.agenda.availabilityCheck,
      employeeIds,
      args.wallclock,
      args.durationMinutes,
      args.excludeAppointmentId ?? null,
      args.timeZone,
    ],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      if (!supabase || !start) return null
      const overlap = await checkEmployeesAvailability(supabase, {
        employeeIds,
        start,
        durationMinutes: args.durationMinutes,
        timeZone: args.timeZone,
        excludeAppointmentId: args.excludeAppointmentId ?? null,
      })
      return overlap ? formatoHoraHHMMEnZona(overlap.busyUntil, args.timeZone) : null
    },
  })

  if (!enabled) return { status: 'idle' }
  if (query.isLoading) return { status: 'checking' }
  if (query.isError) {
    return { status: 'error', message: (query.error as Error).message || 'Error inesperado' }
  }
  return query.data ? { status: 'busy', busyUntilLabel: query.data } : { status: 'free' }
}
