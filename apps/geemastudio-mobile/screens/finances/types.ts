import type { PaymentMode } from '@geemastudio/shared-schema'

export interface FinancesPayment {
  id: string
  appointment_id: string | null
  amount: string
  method: string
  date: string
  notes: string | null
  is_abono?: boolean
  service_total?: string | null
}

export type FinancesPeriod = 'today' | 'week' | 'month'

export interface FinancesAppointmentOption {
  id: string
  client_name: string
  date: string
  status: string
  price: string
  service_id: string | null
  employee_id: string | null
}

export interface FinancesServiceOption {
  id: string
  name: string
}

export interface FinancesEmployeeOption {
  id: string
  name: string
  payment_mode: PaymentMode
  commission_percentage: number | null
  salary_amount: string | null
}

/** Pago libre, adelanto WhatsApp (20%), o completar el 80% restante */
export type FinancesPaymentType = 'full' | 'abono' | 'completar'

export interface FinancesDesgloseRow {
  id: string
  name: string
  generado: number
  pagado: number
  pendiente: number
}

export type FinanceView = 'detalle' | 'resumen'

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
  amount: string | null
  expense_month: string
  expense_date: string | null
  is_estimated: boolean
  source: 'manual' | 'recurring_template' | 'whatsapp_ocr'
  source_ref: string | null
  created_at: string
  updated_at: string
}

export interface MonthlyFinancialRow {
  month: string
  revenue: number
  expenses: number
  ads_spend: number
}
