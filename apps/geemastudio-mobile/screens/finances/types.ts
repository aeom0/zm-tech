import type { CommissionMode, PaymentMode } from '@geemastudio/shared-schema'

export interface FinancesPayment {
  id: string
  appointment_id: string | null
  amount: string
  method: string
  date: string
  notes: string | null
  is_abono?: boolean
  service_total?: string | null
  /** Concepto: adelanto del cupo, pago del servicio o venta de producto. */
  kind?: FinancesPaymentKind | null
  /** Solo tenants VE: moneda en que se pagó; `amount` siempre queda en USD. */
  paid_currency?: 'USD' | 'VES' | null
  /** Bs por USD usados al registrar el pago (snapshot). */
  exchange_rate?: string | number | null
  /** Monto pagado en Bs cuando paid_currency = 'VES'. */
  amount_ves?: string | number | null
}

export type FinancesPaymentKind = 'deposit' | 'service' | 'product'

export type FinancesPeriod = 'today' | 'week' | 'month'

export interface FinancesAppointmentOption {
  id: string
  client_id?: string | null
  client_name: string
  date: string
  status: string
  price: string
  service_id: string | null
  /** Todas las líneas de la cita (agenda las resincroniza al editar). */
  service_ids?: string[] | null
  employee_id: string | null
}

/** Cita vinculada a un pago, como la muestra la lista de pagos. */
export type FinancesLinkedAppointment = Pick<
  FinancesAppointmentOption,
  'client_name' | 'service_id' | 'service_ids' | 'price'
>

export interface FinancesServiceOption {
  id: string
  name: string
}

export interface FinancesEmployeeOption {
  id: string
  name: string
  role?: string
  payment_mode: PaymentMode
  commission_mode?: CommissionMode
  house_cut_fixed?: number | null
  commission_percentage: number | null
  salary_amount: string | null
}

/** Completar pago (saldo o precio de la cita), adelanto, o producto (retail) */
export type FinancesPaymentType = 'full' | 'abono' | 'producto'

/** Concepto que se guarda en payments.kind según el tipo elegido en el modal. */
export function paymentKindFromType(type: FinancesPaymentType): FinancesPaymentKind {
  if (type === 'abono') return 'deposit'
  if (type === 'producto') return 'product'
  return 'service'
}

export interface FinancesDesgloseRow {
  id: string
  name: string
  generado: number
  pagado: number
  pendiente: number
  comision?: number
  commissionMode?: CommissionMode
  houseCutFixed?: number | null
  houseCutEarned?: number
  commissionLabel?: string
  /** Suma de commission_payouts que solapan el período filtrado (ver rangeToPeriodDates). */
  comisionPagada?: number
  /** max(0, comision - comisionPagada) — lo que falta liquidarle en este período. */
  comisionPendienteReal?: number
}

/** Fila de la tabla commission_payouts (registro de pago de comisión al profesional). */
export interface CommissionPayout {
  id: string
  tenant_id: string
  employee_id: string
  period_start: string
  period_end: string
  amount: string
  paid_at: string
  method: string | null
  notes: string | null
  created_at: string
}

export type FinanceView = 'detalle' | 'resumen'

export {
  EXPENSE_CATEGORIES,
  type ExpenseCategory,
  type MonthlyFinancialRow,
  type OperationalExpense,
} from '@geemastudio/data'
