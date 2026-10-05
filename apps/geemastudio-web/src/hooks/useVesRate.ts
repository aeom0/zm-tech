'use client'

import { useCallback } from 'react'
import { convertirUsdABs, formatearBs } from '@zmtech/tasas'

import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { useTasaCambio } from './useTasaCambio'

/** Países con conversión USD→Bs (BCV). */
const VE_COUNTRY = 'VE'

/**
 * Conversión a bolívares para tenants de Venezuela. Para otros países `enabled`
 * es false y no se consulta nada. Los precios del tenant VE están en USD.
 */
export function useVesRate() {
  const { data: settings } = useTenantSettings()
  const enabled = settings?.country === VE_COUNTRY
  const { tasas, usdBsRateEfectivo, isLoading, refrescar } = useTasaCambio({
    enabled,
    usarTasaManual: settings?.usar_tasa_manual,
    tasaManual: settings?.tasa_manual_usd_ves,
  })

  /** "Bs. 1.234,56" para un monto USD, o null si no aplica / no hay tasa. */
  const formatBs = useCallback(
    (usd: number | string | null | undefined): string | null => {
      const n = typeof usd === 'string' ? parseFloat(usd) : usd
      if (!enabled || !usdBsRateEfectivo || n == null || !Number.isFinite(n)) return null
      return formatearBs(convertirUsdABs(n, usdBsRateEfectivo))
    },
    [enabled, usdBsRateEfectivo]
  )

  return { enabled, rate: usdBsRateEfectivo, tasas, isLoading, refrescar, formatBs }
}
