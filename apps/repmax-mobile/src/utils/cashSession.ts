import type { DetallesPago } from '@zmtech/tasas'
import type { PaymentMethod, Sale } from '../types/database'

export type CashPaymentMethod = Exclude<PaymentMethod, 'MIXED'>

export interface CashPaymentSummary {
  totalUsd: number
  totalBs: number
}

// Incluye 'MIXED' como cajón de compatibilidad para ventas antiguas sin payment_details.
export type CashPaymentBreakdown = Partial<Record<PaymentMethod, CashPaymentSummary>>

const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100

function sumar(
  breakdown: CashPaymentBreakdown,
  method: PaymentMethod,
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
    const detalles = sale.paymentDetails as DetallesPago | undefined
    const entradas = Object.entries(detalles ?? {}).filter(
      ([method, detail]) => method !== 'MIXED' && detail
    ) as [CashPaymentMethod, { monto: number; moneda: 'USD' | 'BS' }][]

    // Si falta usd_bs_rate en la venta, se reconstruye a partir de total_bs/total_usd
    // (guardados con la tasa real usada al vender) en vez de asumir 1:1, lo que
    // inflaría el equivalente en USD de cualquier pago en bolívares.
    const tasa =
      sale.usdBsRate && sale.usdBsRate > 0
        ? sale.usdBsRate
        : sale.totalBs && sale.totalUsd > 0
          ? sale.totalBs / sale.totalUsd
          : undefined

    if (entradas.length > 0) {
      for (const [method, detail] of entradas) {
        if (detail.moneda === 'BS' && !tasa) continue
        sumar(breakdown, method, detail.monto, detail.moneda, tasa ?? 1)
      }
      continue
    }

    // Compatibilidad con ventas antiguas (MIXED sin payment_details): no se puede
    // reconstruir el desglose por medio, pero el monto debe seguir sumando al total.
    sumar(breakdown, sale.paymentMethod, sale.totalUsd, 'USD', 1)
  }

  return breakdown
}

export function totalDesgloseUsd(breakdown: CashPaymentBreakdown): number {
  return redondear(
    Object.values(breakdown).reduce((total, method) => total + (method?.totalUsd ?? 0), 0)
  )
}
