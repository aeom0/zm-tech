'use client'

import { useQuery } from '@tanstack/react-query'
import { resolverTasasDuales, type TasasDuales } from '@zmtech/tasas'

import { supabase } from '@/lib/supabase'
import { CACHE_TASAS_TTL_MS, TABLAS_TASAS } from '@/lib/tasas'

interface UseTasaCambioOptions {
  /** Solo tenants con país VE (o con tasa activa); evita consultas innecesarias. */
  enabled: boolean
  usarTasaManual?: boolean
  tasaManual?: number | null
}

/**
 * Tasa USD→Bs para tenants VE: BCV en vivo, o la manual del tenant si está activa
 * (o si no hay datos). `usdBsRateEfectivo` es null si no hay ninguna disponible.
 */
export function useTasaCambio({
  enabled,
  usarTasaManual = false,
  tasaManual,
}: UseTasaCambioOptions) {
  const query = useQuery({
    queryKey: ['tasas_duales'],
    enabled: enabled && !!supabase,
    staleTime: CACHE_TASAS_TTL_MS,
    queryFn: async (): Promise<TasasDuales | null> =>
      // Cast: evita TS2589 (inferencia profunda de tipos de Supabase).
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabase ? resolverTasasDuales(supabase as any, TABLAS_TASAS) : null,
  })

  const manual = tasaManual && tasaManual > 0 ? tasaManual : null
  const tasas = query.data ?? null
  const usdBsRateEfectivo =
    usarTasaManual && manual ? manual : tasas?.bcv.disponible ? tasas.bcv.valor : manual

  return {
    tasas,
    usdBsRateEfectivo,
    isLoading: query.isLoading,
    refrescar: query.refetch,
  }
}
