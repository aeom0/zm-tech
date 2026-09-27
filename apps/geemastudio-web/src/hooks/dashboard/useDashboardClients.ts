'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

import type { DateRange } from './useDashboardPeriod'

export interface DashboardClientsResult {
  newCount: number
  returningCount: number
}

const LOTE_IDS = 100

/** Clientas con cita completada en el período: nueva si esa es su primera, recurrente si ya había venido. */
export function useDashboardClients(dateRange: DateRange, timeZone = 'America/Caracas') {
  return useQuery({
    queryKey: ['dashboard_clients', dateRange, timeZone],
    enabled: !!supabase && !!dateRange.from && !!dateRange.to,
    queryFn: async (): Promise<DashboardClientsResult> => {
      if (!supabase) {
        return { newCount: 0, returningCount: 0 }
      }

      const appointmentFrom = `${dateRange.from} 00:00:00`
      const appointmentTo = `${dateRange.to} 23:59:59`

      const inRangeRes = await supabase
        .from('appointments')
        .select('client_id')
        .eq('status', 'completed')
        .gte('date', appointmentFrom)
        .lte('date', appointmentTo)
        .not('client_id', 'is', null)

      if (inRangeRes.error) throw new Error(inRangeRes.error.message)

      const ids = [
        ...new Set(
          (inRangeRes.data ?? [])
            .map((row) => (row as { client_id: string | null }).client_id)
            .filter((id): id is string => typeof id === 'string')
        ),
      ]

      if (ids.length === 0) {
        return { newCount: 0, returningCount: 0 }
      }

      const priorIds = new Set<string>()
      for (let i = 0; i < ids.length; i += LOTE_IDS) {
        const lote = ids.slice(i, i + LOTE_IDS)
        const priorRes = await supabase
          .from('appointments')
          .select('client_id')
          .eq('status', 'completed')
          .lt('date', appointmentFrom)
          .in('client_id', lote)

        if (priorRes.error) throw new Error(priorRes.error.message)
        for (const row of priorRes.data ?? []) {
          const id = (row as { client_id: string | null }).client_id
          if (id) priorIds.add(id)
        }
      }

      let returningCount = 0
      for (const id of ids) {
        if (priorIds.has(id)) returningCount += 1
      }

      return { newCount: ids.length - returningCount, returningCount }
    },
  })
}
