'use client'

import { useMemo, useState } from 'react'
import { format, startOfMonth, startOfWeek } from 'date-fns'

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

  return { period, setPeriod, dateRange, customRange, setCustomRange }
}
