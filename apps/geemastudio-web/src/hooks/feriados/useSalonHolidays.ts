'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSalonHoliday,
  deleteSalonHoliday,
  fetchSalonHolidays,
  queryKeys,
  seedSalonHolidaysFromCatalog,
  updateSalonHoliday,
  type SalonHolidayCreateInput,
  type SalonHolidayUpdateInput,
} from '@geemastudio/data'
import { indexSalonHolidays, type SalonHolidayIndex } from '@zmtech/tenant-config'

import { useAuth } from '@/contexts/AuthContext'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { supabase } from '@/lib/supabase'

/**
 * Feriados del tenant. Si la tabla está vacía siembra el catálogo del país
 * (`tenant_settings.country`), igual que mobile.
 */
export function useSalonHolidays() {
  const { profile, isAdmin } = useAuth()
  const { data: settings } = useTenantSettings()
  const qc = useQueryClient()
  const seedingRef = useRef(false)
  const tenantId = profile?.tenant_id ?? null
  const country = settings?.country ?? null

  const query = useQuery({
    queryKey: queryKeys.holidays.list(tenantId),
    enabled: !!supabase && !!tenantId,
    staleTime: 60_000,
    queryFn: () => {
      if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
      return fetchSalonHolidays(supabase, tenantId as string)
    },
  })

  useEffect(() => {
    if (!supabase || !isAdmin || !tenantId || !country) return
    if (query.isLoading || query.isFetching || query.isError) return
    if (!query.data || query.data.length > 0 || seedingRef.current) return
    seedingRef.current = true
    void seedSalonHolidaysFromCatalog(supabase, tenantId, country)
      .then((seeded) => {
        if (seeded > 0) return qc.invalidateQueries({ queryKey: queryKeys.holidays.all })
      })
      .catch((err: unknown) => {
        console.warn('[feriados] seed:', err instanceof Error ? err.message : err)
      })
      .finally(() => {
        seedingRef.current = false
      })
  }, [isAdmin, tenantId, country, query.data, query.isLoading, query.isFetching, query.isError, qc])

  const holidays = useMemo(() => query.data ?? [], [query.data])
  const holidayIndex: SalonHolidayIndex = useMemo(() => indexSalonHolidays(holidays), [holidays])

  return { ...query, tenantId, country, holidays, holidayIndex }
}

export function useSalonHolidayMutations(tenantId: string | null, country: string | null) {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.holidays.all })
  const client = () => {
    if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
    return supabase
  }

  const create = useMutation({
    mutationFn: (input: Omit<SalonHolidayCreateInput, 'tenantId'>) => {
      if (!tenantId) throw new Error('No se pudo resolver el negocio')
      return createSalonHoliday(client(), { ...input, tenantId })
    },
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: (input: SalonHolidayUpdateInput) => updateSalonHoliday(client(), input),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteSalonHoliday(client(), id),
    onSuccess: invalidate,
  })
  const reloadCatalog = useMutation({
    mutationFn: async () => {
      if (!tenantId || !country) throw new Error('Configura el país del negocio primero')
      return seedSalonHolidaysFromCatalog(client(), tenantId, country)
    },
    onSuccess: invalidate,
  })

  return { create, update, remove, reloadCatalog }
}
