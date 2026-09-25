'use client'

import { useMemo, useState } from 'react'
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'

export type PeriodKey = 'week' | 'month' | 'custom'

export interface DateRange {
  from: string
  to: string
}

export function useDashboardPeriod() {
  const [period, setPeriod] = useState<PeriodKey>('week')
  const [customRange, setCustomRange] = useState<DateRange | null>(null)

  const dateRange = useMemo((): DateRange => {
    const today = new Date()
    if (period === 'week') {
      const monday = startOfWeek(today, { weekStartsOn: 1 })
      return {
        from: format(monday, 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      }
    }
    if (period === 'month') {
      const first = startOfMonth(today)
      return {
        from: format(first, 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      }
    }
    return (
      customRange ?? {
        from: format(today, 'yyyy-MM-dd'),
        to: format(today, 'yyyy-MM-dd'),
      }
    )
  }, [period, customRange])

  // Citas: incluye las agendadas hasta el cierre de la semana o el mes en curso.
  const appointmentsRange = useMemo((): DateRange => {
    const today = new Date()
    if (period === 'week') {
      return {
        from: dateRange.from,
        to: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      }
    }
    if (period === 'month') {
      return { from: dateRange.from, to: format(endOfMonth(today), 'yyyy-MM-dd') }
    }
    return dateRange
  }, [period, dateRange])

  return { period, setPeriod, dateRange, appointmentsRange, customRange, setCustomRange }
}
