import { useMutation, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import {
  SALON_HOLIDAYS_QUERY_KEY,
  useSalonHolidays,
  type SalonHolidayRecord,
} from '@/hooks/useSalonHolidays'

export type { SalonHolidayRecord }

export function useSalonHolidaysAdmin() {
  const qc = useQueryClient()
  const listQuery = useSalonHolidays(true)

  const invalidate = () => qc.invalidateQueries({ queryKey: SALON_HOLIDAYS_QUERY_KEY })

  const createMutation = useMutation({
    mutationFn: async (input: {
      date: string
      name: string
      is_closed: boolean
      open_until_hour?: number
    }) => {
      const tenantId = listQuery.tenantId
      if (!tenantId) throw new Error('No se pudo resolver el tenant')
      const { data, error } = await supabase
        .from('salon_holidays')
        .insert({
          tenant_id: tenantId,
          date: input.date,
          name: input.name.trim(),
          is_closed: input.is_closed,
          open_until_hour: input.open_until_hour ?? 12,
        })
        .select('id, date, name, is_closed, open_until_hour, created_at, updated_at')
        .single()
      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya existe un feriado registrado para esa fecha.')
        }
        throw error
      }
      return data as SalonHolidayRecord
    },
    onSuccess: () => invalidate(),
  })

  const updateMutation = useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      is_closed?: boolean
      open_until_hour?: number
    }) => {
      const patch: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }
      if (input.name !== undefined) patch.name = input.name.trim()
      if (input.is_closed !== undefined) patch.is_closed = input.is_closed
      if (input.open_until_hour !== undefined) patch.open_until_hour = input.open_until_hour

      const { data, error } = await supabase
        .from('salon_holidays')
        .update(patch)
        .eq('id', input.id)
        .select('id, date, name, is_closed, open_until_hour, created_at, updated_at')
        .single()
      if (error) throw error
      return data as SalonHolidayRecord
    },
    onSuccess: () => invalidate(),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('salon_holidays').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(),
  })

  return {
    holidays: listQuery.holidays,
    holidayIndex: listQuery.holidayIndex,
    isLoading: listQuery.isLoading,
    isRefreshing: listQuery.isRefreshing,
    refetch: listQuery.refetch,
    reloadCatalogMissing: listQuery.reloadCatalogMissing,
    createHoliday: createMutation,
    updateHoliday: updateMutation,
    deleteHoliday: deleteMutation,
  }
}
