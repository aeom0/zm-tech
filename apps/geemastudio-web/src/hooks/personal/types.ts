export type CatalogDialect = 'geema' | 'zm'
export type CommissionMode = 'percent' | 'fixed_house'
export type PaymentMode = 'commission' | 'salary' | 'mixed'

export interface EmployeeRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  color: string
  role: string
  commission_percentage: number | null
  commission_mode: CommissionMode
  house_cut_fixed: number | null
  payment_mode: PaymentMode
  salary_amount: string | null
  notes: string | null
  is_active: boolean
  avatar_url: string | null
  sort_order: number | null
}

export interface EmployeeWriteInput {
  name: string
  email: string | null
  phone: string | null
  color: string
  commission_percentage: number | null
  commission_mode: CommissionMode
  house_cut_fixed: number | null
  payment_mode: PaymentMode
  salary_amount: number | null
  notes: string | null
  is_active: boolean
  avatar_url: string | null
}

export const EMPLOYEE_SELECT_ZM =
  'id, name, email, phone, color, role, commission_percentage, commission_mode, house_cut_fixed, notes, is_active, created_at, avatar_url, sort_order'

export const EMPLOYEE_SELECT_GEEMA =
  'id, name, email, phone, color, role, commission_percentage, commission_mode, house_cut_fixed, notes, is_active, created_at, payment_mode, salary_amount, avatar_url, sort_order'

export const PRESET_COLORS = [
  '#40E0D0',
  '#9C27B0',
  '#4CAF50',
  '#2196F3',
  '#E91E63',
  '#FF9800',
] as const

export const DEFAULT_COMMISSION_PERCENT = 40
