import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createSalonHoliday,
  deleteSalonHoliday,
  updateSalonHoliday,
  type SalonHolidayUpdateInput,
} from '@geemastudio/data'

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
      open_from_hour: number | null
      open_until_hour: number | null
    }) => {
      const tenantId = listQuery.tenantId
      if (!tenantId) throw new Error('No se pudo resolver el tenant')
      return createSalonHoliday(supabase, { ...input, tenantId })
    },
    onSuccess: () => invalidate(),
  })

  const updateMutation = useMutation({
    mutationFn: (input: SalonHolidayUpdateInput) => updateSalonHoliday(supabase, input),
    onSuccess: () => invalidate(),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSalonHoliday(supabase, id),
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
