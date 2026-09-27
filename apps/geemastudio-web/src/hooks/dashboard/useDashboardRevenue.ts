'use client'

import { useQuery } from '@tanstack/react-query'
import { differenceInCalendarDays, format, parseISO, subDays } from 'date-fns'

import { supabase } from '@/lib/supabase'

import { diaSiguiente, ticketCitasCompletadas } from '@/lib/ticketCitas'

import { tenantRangeBoundary, type DateRange } from './useDashboardPeriod'

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

export function useDashboardRevenue(dateRange: DateRange, timeZone = 'America/Caracas') {
  return useQuery({
    queryKey: ['dashboard_revenue', dateRange, timeZone],
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
      const fromIso = tenantRangeBoundary(dateRange.from, timeZone)
      const toIso = tenantRangeBoundary(dateRange.to, timeZone, true)
      const prevFromIso = tenantRangeBoundary(prev.from, timeZone)
      const prevToIso = tenantRangeBoundary(prev.to, timeZone, true)

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
      for (const p of rows) {
        const amount = Number.parseFloat(p.amount)
        if (Number.isFinite(amount)) totalRevenue += amount
      }

      const ticket = await ticketCitasCompletadas(
        `${dateRange.from} 00:00:00`,
        `${diaSiguiente(dateRange.to)} 00:00:00`
      )
      const avgPerAppointment = ticket.ticket ?? 0

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
