import type { SupabaseClient } from '@supabase/supabase-js'

import { isLowStock } from '../inventory/inventoryCategories'
import type {
  CompletedServiceRef,
  DashboardAppointment,
  DashboardDayRange,
  DashboardPayment,
  DashboardStats,
  DashboardTopService,
} from './types'

export const TOP_SERVICES_LIMIT = 5

/** Ingresos, citas completadas y pendientes del día, más productos con stock bajo. */
export async function fetchDashboardStats(
  client: SupabaseClient,
  range: DashboardDayRange
): Promise<DashboardStats> {
  const [paymentsRes, completedRes, scheduledRes, inventoryRes] = await Promise.all([
    client
      .from('payments')
      .select('amount')
      .gte('date', range.paymentFrom)
      .lt('date', range.paymentTo),
    client
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed')
      .gte('date', range.appointmentFrom)
      .lte('date', range.appointmentTo),
    client
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'scheduled')
      .gte('date', range.appointmentFrom)
      .lte('date', range.appointmentTo),
    client.from('inventory_items').select('quantity, min_stock'),
  ])

  for (const res of [paymentsRes, completedRes, scheduledRes, inventoryRes]) {
    if (res.error) throw new Error(res.error.message)
  }

  const todayRevenue = (paymentsRes.data ?? []).reduce(
    (sum, p) => sum + (parseFloat(String(p.amount)) || 0),
    0
  )
  const lowStockItems = (
    (inventoryRes.data ?? []) as { quantity: number; min_stock: number }[]
  ).filter(isLowStock).length

  return {
    todayRevenue,
    completedAppointments: completedRes.count ?? 0,
    upcomingAppointments: scheduledRes.count ?? 0,
    lowStockItems,
  }
}

/** Citas entre dos instantes de pared (inclusive), en orden cronológico. */
export async function fetchDashboardAppointments(
  client: SupabaseClient,
  from: string,
  to: string
): Promise<DashboardAppointment[]> {
  const { data, error } = await client
    .from('appointments')
    .select('id, client_name, date, duration, price, status, employee_id, service_id, service_ids')
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as DashboardAppointment[]
}

/** Servicios de las citas completadas; `since` (texto de pared) acota al mes. */
export async function fetchCompletedServiceRefs(
  client: SupabaseClient,
  since?: string | null
): Promise<CompletedServiceRef[]> {
  let query = client
    .from('appointments')
    .select('service_id, service_ids')
    .eq('status', 'completed')
  if (since) query = query.gte('date', since)
  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as CompletedServiceRef[]
}

export async function fetchPaymentsForAppointments(
  client: SupabaseClient,
  appointmentIds: string[]
): Promise<DashboardPayment[]> {
  if (appointmentIds.length === 0) return []
  const { data, error } = await client
    .from('payments')
    .select('id, appointment_id, amount, is_abono')
    .in('appointment_id', appointmentIds)
  if (error) throw new Error(error.message)
  return (data ?? []) as DashboardPayment[]
}

/** Cuenta cada servicio de las citas (multi-servicio cuenta cada uno) y toma los más pedidos. */
export function computeTopServices(
  refs: CompletedServiceRef[],
  nameById: (id: string) => string | undefined,
  limit = TOP_SERVICES_LIMIT
): DashboardTopService[] {
  const counts = new Map<string, number>()
  for (const ref of refs) {
    const ids = ref.service_ids && ref.service_ids.length > 0 ? ref.service_ids : [ref.service_id]
    for (const id of ids) {
      if (!id) continue
      counts.set(id, (counts.get(id) ?? 0) + 1)
    }
  }
  return Array.from(counts.entries())
    .map(([id, count]) => ({ id, count, name: nameById(id) ?? 'Servicio' }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'))
    .slice(0, limit)
}
