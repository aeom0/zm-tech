'use client'

import { useMemo, useState } from 'react'
import { endOfMonth, endOfWeek, format, startOfMonth, startOfWeek } from 'date-fns'
import { instanteCitaDesdeTexto } from '@zmtech/tenant-config'

export type PeriodKey = 'week' | 'month' | 'custom'

export interface DateRange {
  from: string
  to: string
}

export function tenantRangeBoundary(
  dateOnly: string,
  timeZone: string,
  endOfDay = false
): string {
  return instanteCitaDesdeTexto(
    `${dateOnly} ${endOfDay ? '23:59:59' : '00:00:00'}`,
    timeZone
  ).toISOString()
}

function tenantToday(timeZone: string): Date {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? '01'
  return new Date(`${value('year')}-${value('month')}-${value('day')}T12:00:00Z`)
}

export function useDashboardPeriod(timeZone = 'America/Caracas') {
  const [period, setPeriod] = useState<PeriodKey>('week')
  const [customRange, setCustomRange] = useState<DateRange | null>(null)

  const dateRange = useMemo((): DateRange => {
    const today = tenantToday(timeZone)
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
  }, [period, customRange, timeZone])

  // Citas: incluye las agendadas hasta el cierre de la semana o el mes en curso.
  const appointmentsRange = useMemo((): DateRange => {
    const today = tenantToday(timeZone)
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
  }, [period, dateRange, timeZone])

  return { period, setPeriod, dateRange, appointmentsRange, customRange, setCustomRange }
}
