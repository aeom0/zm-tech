import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useTenant } from '@/contexts/TenantContext'
import {
  fetchSalonHolidays,
  queryKeys,
  seedSalonHolidaysFromCatalog,
  type SalonHolidayRecord,
} from '@geemastudio/data'
import {
  catalogRowsForSeed,
  indexSalonHolidays,
  type SalonHolidayIndex,
} from '@zmtech/tenant-config'

export const SALON_HOLIDAYS_QUERY_KEY = queryKeys.holidays.all

export type { SalonHolidayRecord }

async function resolveTenantId(userId: string | null | undefined): Promise<string | null> {
  if (!userId) return null
  const { data } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle()
  return data?.tenant_id ?? null
}

/**
 * Feriados del tenant: query + auto-seed por `locale.country` si la tabla está vacía.
 */
export function useSalonHolidays(enabled = true) {
  const { userId } = useAuth()
  const { config } = useTenant()
  const queryClient = useQueryClient()
  const seedingRef = useRef(false)

  const tenantQuery = useQuery({
    queryKey: ['profile_tenant_id', userId],
    enabled: enabled && !!userId,
    staleTime: 5 * 60_000,
    queryFn: () => resolveTenantId(userId),
  })

  const tenantId = tenantQuery.data ?? null
  const country = config.locale.country

  const holidaysQuery = useQuery({
    queryKey: queryKeys.holidays.list(tenantId),
    enabled: enabled && !!tenantId,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
    queryFn: () => fetchSalonHolidays(supabase, tenantId as string),
  })

  useEffect(() => {
    if (!enabled || !tenantId || !country) return
    if (holidaysQuery.isLoading || holidaysQuery.isFetching) return
    if (holidaysQuery.isError) return
    const rows = holidaysQuery.data
    if (!rows || rows.length > 0) return
    if (seedingRef.current) return

    seedingRef.current = true
    void (async () => {
      try {
        const seeded = await seedSalonHolidaysFromCatalog(supabase, tenantId, country)
        if (seeded > 0) {
          await queryClient.invalidateQueries({ queryKey: SALON_HOLIDAYS_QUERY_KEY })
        }
      } catch (error) {
        console.warn('[salon_holidays] seed:', error instanceof Error ? error.message : error)
      } finally {
        seedingRef.current = false
      }
    })()
  }, [
    enabled,
    tenantId,
    country,
    holidaysQuery.data,
    holidaysQuery.isLoading,
    holidaysQuery.isFetching,
    holidaysQuery.isError,
    queryClient,
  ])

  const holidays = useMemo(() => holidaysQuery.data ?? [], [holidaysQuery.data])

  const holidayIndex: SalonHolidayIndex = useMemo(() => indexSalonHolidays(holidays), [holidays])

  /** Fallback en memoria si la red falló y hay catálogo de país. */
  const effectiveIndex: SalonHolidayIndex = useMemo(() => {
    if (holidayIndex.size > 0) return holidayIndex
    if (holidaysQuery.isError && country) {
      return indexSalonHolidays(
        catalogRowsForSeed(country, tenantId ?? 'local').map((r) => ({
          date: r.date,
          name: r.name,
          is_closed: r.is_closed,
          open_until_hour: r.open_until_hour,
        }))
      )
    }
    return holidayIndex
  }, [holidayIndex, holidaysQuery.isError, country, tenantId])

  const reloadCatalogMissing = useCallback(async () => {
    if (!tenantId || !country) return
    const seeded = await seedSalonHolidaysFromCatalog(supabase, tenantId, country)
    if (seeded === 0) return
    await queryClient.invalidateQueries({ queryKey: SALON_HOLIDAYS_QUERY_KEY })
  }, [tenantId, country, queryClient])

  return {
    tenantId,
    holidays,
    holidayIndex: effectiveIndex,
    isLoading: tenantQuery.isLoading || holidaysQuery.isLoading,
    isRefreshing: holidaysQuery.isRefetching,
    refetch: holidaysQuery.refetch,
    reloadCatalogMissing,
    error: holidaysQuery.error,
  }
}
