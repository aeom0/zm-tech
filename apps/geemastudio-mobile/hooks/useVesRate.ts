import { useCallback } from 'react'
import { convertirUsdABs, formatearBs } from '@zmtech/tasas'

import { useTenant } from '@/contexts/TenantContext'
import { useTasaCambio } from './useTasaCambio'

/** Países con conversión USD→Bs (BCV). */
const VE_COUNTRY = 'VE'

/**
 * Conversión a bolívares para tenants de Venezuela. Para otros países `enabled`
 * es false y no se consulta nada. Los precios del tenant VE están en USD.
 */
export function useVesRate() {
  const { config } = useTenant()
  const enabled = config.locale.country === VE_COUNTRY
  const { tasas, usdBsRateEfectivo, isLoading, refrescar } = useTasaCambio({
    enabled,
    usarTasaManual: config.payments?.usarTasaManual,
    tasaManual: config.payments?.tasaManualUsdVes,
  })

  /** Bs equivalentes de un monto USD, o null si no aplica / no hay tasa. */
  const toBs = useCallback(
    (usd: number | string | null | undefined): number | null => {
      const n = typeof usd === 'string' ? parseFloat(usd) : usd
      if (!enabled || !usdBsRateEfectivo || n == null || !Number.isFinite(n)) return null
      return convertirUsdABs(n, usdBsRateEfectivo)
    },
    [enabled, usdBsRateEfectivo]
  )

  const formatBs = useCallback(
    (usd: number | string | null | undefined): string | null => {
      const bs = toBs(usd)
      return bs == null ? null : formatearBs(bs)
    },
    [toBs]
  )

  return { enabled, rate: usdBsRateEfectivo, tasas, isLoading, refrescar, toBs, formatBs }
}
