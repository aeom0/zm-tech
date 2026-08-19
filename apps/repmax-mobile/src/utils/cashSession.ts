import type { DetallesPago } from '@zmtech/tasas'
import type { PaymentMethod, Sale } from '../types/database'

export type CashPaymentMethod = Exclude<PaymentMethod, 'MIXED'>

export interface CashPaymentSummary {
  totalUsd: number
  totalBs: number
}

export type CashPaymentBreakdown = Partial<Record<CashPaymentMethod, CashPaymentSummary>>

const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100

function sumar(
  breakdown: CashPaymentBreakdown,
  method: CashPaymentMethod,
  monto: number,
  moneda: 'USD' | 'BS',
  tasa: number
) {
  const actual = breakdown[method] ?? { totalUsd: 0, totalBs: 0 }
  breakdown[method] = {
    totalUsd: redondear(actual.totalUsd + (moneda === 'BS' ? monto / tasa : monto)),
    totalBs: redondear(actual.totalBs + (moneda === 'BS' ? monto : 0)),
  }
}

/**
 * Resume los medios realmente usados. En ventas mixtas usa paymentDetails
 * para separar efectivo USD y Bs, en vez de agrupar todo como MIXED.
 */
export function resumirPagos(sales: Sale[]): CashPaymentBreakdown {
  const breakdown: CashPaymentBreakdown = {}

  for (const sale of sales) {
    const tasa = sale.usdBsRate && sale.usdBsRate > 0 ? sale.usdBsRate : 1
    const detalles = sale.paymentDetails as DetallesPago | undefined
    const entradas = Object.entries(detalles ?? {}).filter(
      ([method, detail]) => method !== 'MIXED' && detail
    ) as [CashPaymentMethod, { monto: number; moneda: 'USD' | 'BS' }][]

    if (entradas.length > 0) {
      for (const [method, detail] of entradas) {
        sumar(breakdown, method, detail.monto, detail.moneda, tasa)
      }
      continue
    }

    // Compatibilidad con ventas antiguas que no tengan payment_details.
    if (sale.paymentMethod !== 'MIXED') {
      sumar(breakdown, sale.paymentMethod, sale.totalUsd, 'USD', tasa)
    }
  }

  return breakdown
}

export function totalDesgloseUsd(breakdown: CashPaymentBreakdown): number {
  return redondear(
    Object.values(breakdown).reduce((total, method) => total + (method?.totalUsd ?? 0), 0)
  )
}
