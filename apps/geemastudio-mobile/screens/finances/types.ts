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
