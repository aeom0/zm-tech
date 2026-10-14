import type { CommissionMode, PaymentMode, EmployeeTimeOffKind } from '@geemastudio/shared-schema'
import type { CatalogDialect } from '../catalog/types'

export type { CommissionMode, PaymentMode, EmployeeTimeOffKind }
export type EmployeesDialect = CatalogDialect

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
  does_all_services: boolean
}

export const PRESET_COLORS = [
  '#40E0D0',
  '#9C27B0',
  '#4CAF50',
  '#2196F3',
  '#E91E63',
  '#FF9800',
] as const

export const DEFAULT_COMMISSION_PERCENT = 40

export interface EmployeeRawRow {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  color: string
  role?: string | null
  commission_percentage?: number | null
  commission_mode?: string | null
  house_cut_fixed?: number | null
  payment_mode?: string | null
  salary_amount?: string | number | null
  notes?: string | null
  is_active: boolean
  avatar_url?: string | null
  sort_order?: number | null
  does_all_services?: boolean | null
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
  does_all_services?: boolean
}

export interface TimeOffRecord {
  id: string
  employee_id: string
  kind: EmployeeTimeOffKind
  date_from: string
  date_to: string | null
  start_time: string | null
  end_time: string | null
  reason: string | null
  is_paid: boolean | null
}

export interface CoverageRecord {
  id: string
  covered_employee_id: string
  covering_employee_id: string
  date_from: string
  date_to: string
  note: string | null
}

export interface WorkShift {
  weekday: number
  start_time: string
  end_time: string
}

export interface TimeOffInput {
  employee_id: string
  kind: EmployeeTimeOffKind
  date_from: string
  date_to: string | null
  start_time: string | null
  end_time: string | null
  reason: string | null
  is_paid: boolean | null
}

export interface CoverageInput {
  covered_employee_id: string
  covering_employee_id: string
  date_from: string
  date_to: string
  note: string | null
}

export interface AffectedAppointment {
  id: string
  date: string
  client_name: string | null
  duration: number | null
}

export interface CoverageWindow {
  coveredId: string
  coveringId: string
  dateFrom: string
  dateTo: string
}

export interface ServiceEligibilityIndex {
  doesAll: ReadonlySet<string>
  serviceIdsByEmployee: ReadonlyMap<string, ReadonlySet<string>>
  coverages: readonly CoverageWindow[]
}
