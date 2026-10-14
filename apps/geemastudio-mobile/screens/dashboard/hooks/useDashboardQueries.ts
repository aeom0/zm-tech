import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  computeTopServices,
  fetchCompletedServiceRefs,
  fetchDashboardAppointments,
  fetchDashboardStats,
  fetchPaymentsForAppointments,
  queryKeys,
  type TopServicesPeriod,
} from '@geemastudio/data'

import { supabase } from '@/lib/supabase'
import { useEmployeesQuery } from '@/screens/personal/hooks/useEmployeesData'

import type {
  DashboardAppointment,
  DashboardPayment,
  DashboardServiceRow,
  DashboardStats,
} from '../types'

export type { TopServicesPeriod }

export function useDashboardQueries(
  startOfDay: string,
  statsEndOfDay: string,
  appointmentsEndOfDay: string,
  topServicesPeriod: TopServicesPeriod,
  monthStartOfDay: string,
  paymentStartOfDay: string,
  paymentEndOfDay: string
) {
  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats(
      paymentStartOfDay,
      paymentEndOfDay,
      startOfDay,
      statsEndOfDay
    ),
    queryFn: () =>
      fetchDashboardStats(supabase, {
        paymentFrom: paymentStartOfDay,
        paymentTo: paymentEndOfDay,
        appointmentFrom: startOfDay,
        appointmentTo: statsEndOfDay,
      }),
  })

  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    isError: appointmentsError,
    refetch: refetchAppointments,
  } = useQuery<DashboardAppointment[]>({
    queryKey: queryKeys.dashboard.appointments(startOfDay, appointmentsEndOfDay),
    queryFn: () => fetchDashboardAppointments(supabase, startOfDay, appointmentsEndOfDay),
  })

  const { data: employees = [] } = useEmployeesQuery()

  const { data: services = [] } = useQuery<DashboardServiceRow[]>({
    queryKey: ['dashboard_services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('id, name, price, duration, category_id')
        .order('created_at', { ascending: true })
      if (error) {
        throw new Error(error.message)
      }
      return (data ?? []) as DashboardServiceRow[]
    },
  })

  const since = topServicesPeriod === 'month' ? monthStartOfDay : null
  const { data: completedServices = [] } = useQuery({
    queryKey: queryKeys.dashboard.completedServices(topServicesPeriod, since),
    queryFn: () => fetchCompletedServiceRefs(supabase, since),
  })

  const topServices = useMemo(
    () => computeTopServices(completedServices, (id) => services.find((s) => s.id === id)?.name),
    [completedServices, services]
  )

  const appointmentIds = appointments.map((a) => a.id)

  const { data: paymentsByAppointment = [] } = useQuery<DashboardPayment[]>({
    queryKey: queryKeys.dashboard.payments(appointmentIds),
    queryFn: () => fetchPaymentsForAppointments(supabase, appointmentIds),
    enabled: appointmentIds.length > 0,
  })

  const hasError = statsError || appointmentsError
  const refetchAll = () => {
    refetchStats()
    refetchAppointments()
  }

  return {
    stats,
    statsLoading,
    statsError,
    refetchStats,
    appointments,
    appointmentsLoading,
    appointmentsError,
    refetchAppointments,
    employees,
    services,
    paymentsByAppointment,
    topServices,
    hasError,
    refetchAll,
  }
}
