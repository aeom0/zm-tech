'use client'

import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'

import { supabase } from '@/lib/supabase'

import type { DateRange } from './useDashboardPeriod'

function previousDateRange(range: DateRange): DateRange {
  const from = parseISO(range.from)
  const to = parseISO(range.to)
  const span = differenceInCalendarDays(to, from)
  const prevTo = subDays(from, 1)
  const prevFrom = subDays(prevTo, span)
  return {
    from: format(prevFrom, 'yyyy-MM-dd'),
    to: format(prevTo, 'yyyy-MM-dd'),
  }
}

export interface DashboardPaymentRow {
  amount: string
  date: string
  appointment_id: string | null
}

export interface DashboardRevenueResult {
  totalRevenue: number
  avgPerAppointment: number
  prevPeriodRevenue: number
  payments: DashboardPaymentRow[]
}

export function useDashboardRevenue(dateRange: DateRange) {
  return useQuery({
    queryKey: ['dashboard_revenue', dateRange],
    enabled: !!supabase && !!dateRange.from && !!dateRange.to,
    queryFn: async (): Promise<DashboardRevenueResult> => {
      if (!supabase) {
        return {
          totalRevenue: 0,
          avgPerAppointment: 0,
          prevPeriodRevenue: 0,
          payments: [],
        }
      }

      const prev = previousDateRange(dateRange)
      const fromIso = `${dateRange.from}T00:00:00`
      const toIso = `${dateRange.to}T23:59:59.999`
      const prevFromIso = `${prev.from}T00:00:00`
      const prevToIso = `${prev.to}T23:59:59.999`

      const [currentRes, prevRes] = await Promise.all([
        supabase
          .from('payments')
          .select('amount, date, appointment_id')
          .gte('date', fromIso)
          .lte('date', toIso)
          .eq('is_abono', false),
        supabase
          .from('payments')
          .select('amount')
          .gte('date', prevFromIso)
          .lte('date', prevToIso)
          .eq('is_abono', false),
      ])

      if (currentRes.error) throw new Error(currentRes.error.message)
      if (prevRes.error) throw new Error(prevRes.error.message)

      const rows = (currentRes.data ?? []) as DashboardPaymentRow[]
      let totalRevenue = 0
      const appointmentIds = new Set<string>()
      for (const p of rows) {
        totalRevenue += Number.parseFloat(p.amount)
        if (p.appointment_id) appointmentIds.add(p.appointment_id)
      }
      const uniqueAppointments = appointmentIds.size
      const avgPerAppointment = uniqueAppointments > 0 ? totalRevenue / uniqueAppointments : 0

      const prevRows = prevRes.data ?? []
      const prevPeriodRevenue = prevRows.reduce(
        (s, r) => s + Number.parseFloat((r as { amount: string }).amount),
        0
      )

      return {
        totalRevenue,
        avgPerAppointment,
        prevPeriodRevenue,
        payments: rows,
      }
    },
  })
}
