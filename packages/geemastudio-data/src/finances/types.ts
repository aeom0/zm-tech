export type FinancesPaymentKind = 'deposit' | 'service' | 'product'
export type FinancesPaymentType = 'full' | 'abono' | 'producto'

export function paymentKindFromType(type: FinancesPaymentType): FinancesPaymentKind {
  if (type === 'abono') return 'deposit'
  if (type === 'producto') return 'product'
  return 'service'
}

export interface PaymentInput {
  tenant_id: string
  appointment_id?: string | null
  amount: string | number
  method: string
  date: string
  notes?: string | null
  is_abono?: boolean
  service_total?: number | null
  kind?: FinancesPaymentKind | null
  paid_currency?: 'USD' | 'VES' | null
  exchange_rate?: number | string | null
  amount_ves?: number | string | null
}

export interface FinancesPayment {
  id: string
  tenant_id: string
  appointment_id: string | null
  amount: string
  method: string
  date: string
  notes: string | null
  is_abono?: boolean
  service_total?: string | null
  kind?: FinancesPaymentKind | null
  paid_currency?: 'USD' | 'VES' | null
  exchange_rate?: string | number | null
  amount_ves?: string | number | null
  created_at?: string
}

export const EXPENSE_CATEGORIES = [
  { id: 'alquiler', label: 'Alquiler' },
  { id: 'insumos', label: 'Insumos' },
  { id: 'planilla_fija', label: 'Planilla fija' },
  { id: 'servicios_basicos', label: 'Servicios básicos' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'mantenimiento', label: 'Mantenimiento' },
  { id: 'comisiones_terceros', label: 'Comisiones' },
  { id: 'impuestos', label: 'Impuestos' },
  { id: 'otros', label: 'Otros' },
] as const

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number]['id']

export interface OperationalExpense {
  id: string
  tenant_id: string
  category: ExpenseCategory
  label: string
  amount: string | number | null
  expense_month: string
  expense_date: string | null
  is_estimated: boolean
  source?: 'manual' | 'recurring_template' | 'whatsapp_ocr'
  source_ref?: string | null
  created_at?: string
  updated_at?: string
}

export interface ExpenseWriteInput {
  category: ExpenseCategory
  label: string
  amount: number | null
  expense_month: string
  expense_date?: string | null
  is_estimated?: boolean
  created_by?: string | null
}

export interface MonthlyFinancialRow {
  month: string
  revenue: number
  expenses: number
  ads_spend: number
}
