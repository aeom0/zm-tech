'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

import type { DateRange } from './useDashboardPeriod'

export interface DashboardClientsResult {
  newCount: number
  returningCount: number
}

export function useDashboardClients(dateRange: DateRange) {
  return useQuery({
    queryKey: ['dashboard_clients', dateRange],
    enabled: !!supabase && !!dateRange.from && !!dateRange.to,
    queryFn: async (): Promise<DashboardClientsResult> => {
      if (!supabase) {
        return { newCount: 0, returningCount: 0 }
      }

      const fromIso = `${dateRange.from}T00:00:00`
      const toIso = `${dateRange.to}T23:59:59.999`

      const [newClientsRes, appointmentsRes] = await Promise.all([
        supabase
          .from('clients')
          .select('id, created_at')
          .gte('created_at', fromIso)
          .lte('created_at', toIso),
        supabase
          .from('appointments')
          .select('client_id')
          .eq('status', 'completed')
          .gte('date', fromIso)
          .lte('date', toIso)
          .not('client_id', 'is', null),
      ])

      if (newClientsRes.error) throw new Error(newClientsRes.error.message)
      if (appointmentsRes.error) throw new Error(appointmentsRes.error.message)

      const newRows = newClientsRes.data ?? []
      const newIds = new Set(newRows.map((r) => (r as { id: string }).id))
      const newCount = newIds.size

      const aptClientIds = [
        ...new Set(
          (appointmentsRes.data ?? [])
            .map((r) => (r as { client_id: string | null }).client_id)
            .filter((id): id is string => typeof id === 'string')
        ),
      ]

      if (aptClientIds.length === 0) {
        return { newCount, returningCount: 0 }
      }

      const { data: clientRows, error: clientsErr } = await supabase
        .from('clients')
        .select('id, created_at')
        .in('id', aptClientIds)

      if (clientsErr) throw new Error(clientsErr.message)

      let returningCount = 0
      for (const row of clientRows ?? []) {
        const r = row as { id: string; created_at: string }
        if (newIds.has(r.id)) continue
        if (r.created_at < fromIso) returningCount += 1
      }

      return { newCount, returningCount }
    },
  })
}
