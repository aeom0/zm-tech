import { convertirUsdABs } from '@zmtech/tasas'

/** Columnas de `payments` para pagos en Bs (solo tenants VE). */
export interface PaymentVesFields {
  paid_currency?: 'USD' | 'VES'
  exchange_rate?: number
  amount_ves?: number
}

/** Métodos que en Venezuela se pagan en bolívares sin pasar por el selector de moneda. */
const VES_QUICK_METHODS = ['pago_movil']

/**
 * Campos de Bs para el flujo rápido de "cita completada" (sin selector de moneda):
 * Pago Móvil se registra en Bs con la tasa vigente; el resto no lleva moneda.
 */
export function vesFieldsForQuickMethod(
  method: string,
  amountUsd: number,
  rate: number | null
): PaymentVesFields {
  if (!rate || !VES_QUICK_METHODS.includes(method)) return {}
  return {
    paid_currency: 'VES',
    exchange_rate: rate,
    amount_ves: convertirUsdABs(amountUsd, rate),
  }
}
