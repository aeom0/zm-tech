'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

import type { DateRange } from './useDashboardPeriod'

export type AppointmentStatusBucket =
  'completed' | 'cancelled' | 'scheduled' | 'confirmed' | 'other'

export interface AppointmentsByStatus {
  completed: number
  cancelled: number
  scheduled: number
  confirmed: number
  other: number
  total: number
}

export function useDashboardAppointments(dateRange: DateRange) {
  return useQuery({
    queryKey: ['dashboard_appointments', dateRange],
    enabled: !!supabase && !!dateRange.from && !!dateRange.to,
    queryFn: async (): Promise<AppointmentsByStatus> => {
      if (!supabase) {
        return {
          completed: 0,
          cancelled: 0,
          scheduled: 0,
          confirmed: 0,
          other: 0,
          total: 0,
        }
      }
      const fromIso = `${dateRange.from}T00:00:00`
      const toIso = `${dateRange.to}T23:59:59.999`

      const { data, error } = await supabase
        .from('appointments')
        .select('id, status, date')
        .gte('date', fromIso)
        .lte('date', toIso)

      if (error) throw new Error(error.message)

      const grouped: AppointmentsByStatus = {
        completed: 0,
        cancelled: 0,
        scheduled: 0,
        confirmed: 0,
        other: 0,
        total: 0,
      }

      for (const row of data ?? []) {
        const status = (row as { status: string }).status
        grouped.total += 1
        if (status === 'completed') grouped.completed += 1
        else if (status === 'cancelled') grouped.cancelled += 1
        else if (status === 'scheduled') grouped.scheduled += 1
        else if (status === 'confirmed') grouped.confirmed += 1
        else grouped.other += 1
      }

      return grouped
    },
  })
}
