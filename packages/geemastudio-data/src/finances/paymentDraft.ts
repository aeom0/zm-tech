import { convertirBsAUsd, convertirUsdABs } from '@zmtech/tasas'

import { paymentKindFromType, type FinancesPaymentType, type PaymentInput } from './types'

/** Formulario de pago tal como lo escribe el usuario (montos en `currency`). */
export interface PaymentDraft {
  tenantId: string
  appointmentId: string | null
  type: FinancesPaymentType
  amount: string
  /** Moneda de entrada; fuera de VE siempre 'USD' (= moneda del negocio). */
  currency: 'USD' | 'VES'
  /** Tenant VE: guarda `paid_currency`, tasa y monto en Bs. */
  vesEnabled: boolean
  rate: number | null
  method: string
  notes: string
  /** Solo adelanto: valor total del servicio (moneda del negocio). */
  serviceTotal?: string
  /** Solo pago completo: parte del monto que corresponde a productos (misma moneda que `amount`). */
  productAmount?: string
  date: string
}

export type PaymentDraftResult =
  | { ok: true; rows: PaymentInput[] }
  | { ok: false; error: string }

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export function parseMoneyInput(text: string | null | undefined): number {
  if (!text) return Number.NaN
  return parseFloat(String(text).replace(',', '.'))
}

/** Convierte lo ya escrito al cambiar de moneda, para no perder el monto. */
export function convertDraftAmount(
  amount: string,
  from: 'USD' | 'VES',
  to: 'USD' | 'VES',
  rate: number | null
): string {
  if (from === to) return amount
  const n = parseMoneyInput(amount)
  if (!rate || !Number.isFinite(n) || n <= 0) return amount
  return (to === 'VES' ? convertirUsdABs(n, rate) : convertirBsAUsd(n, rate)).toFixed(2)
}

/**
 * Valida el formulario y arma las filas de `payments`. Un pago completo con
 * parte de productos se reparte en dos filas (`kind` service + product).
 */
export function buildPaymentRows(draft: PaymentDraft): PaymentDraftResult {
  const entered = parseMoneyInput(draft.amount)
  if (!Number.isFinite(entered) || entered <= 0) {
    return { ok: false, error: 'Ingresa un monto válido' }
  }

  const enBs = draft.vesEnabled && draft.currency === 'VES'
  if (enBs && !draft.rate) {
    return { ok: false, error: 'No hay tasa de cambio disponible. Configúrala en Ajustes.' }
  }
  const toUsd = (n: number) => (enBs && draft.rate ? convertirBsAUsd(n, draft.rate) : n)
  const amountUsd = toUsd(entered)

  const serviceTotal = parseMoneyInput(draft.serviceTotal)
  const hasServiceTotal =
    draft.type === 'abono' && Number.isFinite(serviceTotal) && serviceTotal > 0
  if (hasServiceTotal && amountUsd >= serviceTotal) {
    return { ok: false, error: 'El adelanto debe ser menor que el valor total del servicio' }
  }

  const productEntered = draft.type === 'full' ? parseMoneyInput(draft.productAmount) : Number.NaN
  const hasSplit = Number.isFinite(productEntered) && productEntered > 0
  if (hasSplit && productEntered >= entered) {
    return {
      ok: false,
      error: 'La parte de productos debe ser menor que el total. Si es todo producto, elige «Producto».',
    }
  }

  const row = (enteredPart: number, kindType: FinancesPaymentType): PaymentInput => ({
    tenant_id: draft.tenantId,
    appointment_id: draft.appointmentId,
    amount: String(round2(toUsd(enteredPart))),
    method: draft.method,
    date: draft.date,
    notes: draft.notes.trim() || null,
    is_abono: kindType === 'abono',
    kind: paymentKindFromType(kindType),
    service_total: kindType === 'abono' && hasServiceTotal ? serviceTotal : null,
    ...(draft.vesEnabled
      ? {
          paid_currency: enBs ? ('VES' as const) : ('USD' as const),
          exchange_rate: draft.rate ?? null,
          amount_ves: enBs ? round2(enteredPart) : null,
        }
      : {}),
  })

  if (!hasSplit) return { ok: true, rows: [row(entered, draft.type)] }
  return {
    ok: true,
    rows: [row(entered - productEntered, 'full'), row(productEntered, 'producto')],
  }
}

/** Tipo de formulario a partir de un pago guardado (para editar). */
export function paymentTypeFromPayment(p: {
  kind?: string | null
  is_abono?: boolean | null
}): FinancesPaymentType {
  if (p.kind === 'product') return 'producto'
  return p.is_abono ? 'abono' : 'full'
}
