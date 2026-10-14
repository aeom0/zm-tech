'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  computeTopServices,
  fetchCompletedServiceRefs,
  fetchDashboardAppointments,
  fetchDashboardStats,
  queryKeys,
  type TopServicesPeriod,
} from '@geemastudio/data'
import {
  formatAppointmentWallclock,
  inicioDiaHoyEnZonaIANA,
  inicioMesActualEnZonaIANA,
  sumarDiasEnZonaIANA,
} from '@zmtech/tenant-config'

import { useAgendaServicesMap } from '@/hooks/agenda/useAgendaData'
import { supabase } from '@/lib/supabase'

/** Límites del día y del mes en la zona del tenant (texto de pared para citas, ISO para pagos). */
export function useTodayRange(timeZone: string | null) {
  return useMemo(() => {
    if (!timeZone) return null
    const start = inicioDiaHoyEnZonaIANA(timeZone)
    const next = sumarDiasEnZonaIANA(start, 1, timeZone)
    return {
      paymentFrom: start.toISOString(),
      paymentTo: next.toISOString(),
      appointmentFrom: formatAppointmentWallclock(start, timeZone),
      appointmentTo: formatAppointmentWallclock(new Date(next.getTime() - 1000), timeZone),
      monthStart: formatAppointmentWallclock(inicioMesActualEnZonaIANA(timeZone), timeZone),
    }
  }, [timeZone])
}

type TodayRange = NonNullable<ReturnType<typeof useTodayRange>>

/** KPIs del día: ingresos, completadas, pendientes y stock bajo. Solo admin (pagos tienen RLS). */
export function useHomeStats(range: TodayRange | null, enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.dashboard.stats(
      range?.paymentFrom ?? '',
      range?.paymentTo ?? '',
      range?.appointmentFrom ?? '',
      range?.appointmentTo ?? ''
    ),
    enabled: enabled && !!range && !!supabase,
    refetchInterval: 60_000,
    queryFn: () => fetchDashboardStats(supabase!, range!),
  })
}

export function useTodayAppointments(range: TodayRange | null) {
  return useQuery({
    queryKey: queryKeys.dashboard.appointments(
      range?.appointmentFrom ?? '',
      range?.appointmentTo ?? ''
    ),
    enabled: !!range && !!supabase,
    refetchInterval: 60_000,
    queryFn: () =>
      fetchDashboardAppointments(supabase!, range!.appointmentFrom, range!.appointmentTo),
  })
}

export function useTopServices(
  period: TopServicesPeriod,
  monthStart: string | null,
  enabled: boolean
) {
  const services = useAgendaServicesMap()
  const since = period === 'month' ? monthStart : null
  const refs = useQuery({
    queryKey: queryKeys.dashboard.completedServices(period, since),
    enabled: enabled && !!supabase && (period === 'all' || !!monthStart),
    staleTime: 5 * 60_000,
    queryFn: () => fetchCompletedServiceRefs(supabase!, since),
  })
  const data = useMemo(
    () => computeTopServices(refs.data ?? [], (id) => services.data?.get(id)),
    [refs.data, services.data]
  )
  return { data, isLoading: refs.isLoading, error: refs.error as Error | null }
}
