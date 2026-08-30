import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useEmployeesQuery } from '@/screens/personal/hooks/useEmployeesData'

import type { DashboardAppointment, DashboardServiceRow, DashboardStats } from '../types'

async function fetchDashboardStats(startOfDay: string, endOfDay: string): Promise<DashboardStats> {
  const [paymentsRes, completedRes, scheduledRes, inventoryRes] = await Promise.all([
    supabase.from('payments').select('amount').gte('date', startOfDay).lte('date', endOfDay),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('date', startOfDay)
      .lte('date', endOfDay),
    supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .gte('date', startOfDay)
      .lte('date', endOfDay),
    supabase.from('inventory_items').select('quantity, min_stock'),
  ])

  if (paymentsRes.error) {
    throw new Error(paymentsRes.error.message)
  }
  if (completedRes.error) {
    throw new Error(completedRes.error.message)
  }
  if (scheduledRes.error) {
    throw new Error(scheduledRes.error.message)
  }
  if (inventoryRes.error) {
    throw new Error(inventoryRes.error.message)
  }

  const todayRevenue = (paymentsRes.data ?? []).reduce(
    (sum, p) => sum + parseFloat(String(p.amount)),
    0
  )

  const rows = inventoryRes.data ?? []
  const lowStockItems = rows.filter((r) => r.quantity <= r.min_stock).length

  return {
    todayRevenue,
    completedAppointments: completedRes.count ?? 0,
    upcomingAppointments: scheduledRes.count ?? 0,
    lowStockItems,
  }
}

export function useDashboardQueries(startOfDay: string, endOfDay: string) {
  const {
    data: stats,
    isLoading: statsLoading,
    refetch: refetchStats,
  } = useQuery<DashboardStats>({
    queryKey: ['dashboard_stats', startOfDay, endOfDay],
    queryFn: () => fetchDashboardStats(startOfDay, endOfDay),
  })

  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    refetch: refetchAppointments,
  } = useQuery<DashboardAppointment[]>({
    queryKey: ['appointments_today', startOfDay, endOfDay],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, client_name, date, duration, price, status, employee_id, service_id')
        .gte('date', startOfDay)
        .lte('date', endOfDay)
        .order('date', { ascending: true })

      if (error) {
        throw new Error(error.message)
      }
      return (data ?? []) as DashboardAppointment[]
    },
  })

  const { data: employees = [] } = useEmployeesQuery()

  const { data: services = [] } = useQuery<DashboardServiceRow[]>({
    queryKey: ['services'],
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

  return {
    stats,
    statsLoading,
    refetchStats,
    appointments,
    appointmentsLoading,
    refetchAppointments,
    employees,
    services,
  }
}
