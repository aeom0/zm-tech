import type { PaymentMode } from '@geemastudio/shared-schema'

import { supabase } from '@/lib/supabase'
import { detectCatalogDialect, type CatalogDialect } from '@/screens/services/lib/catalogAdapter'

/** Mismo dialecto que packs/promos: ZM prod no tiene extras de Geema en `employees`. */
export type EmployeesDialect = CatalogDialect

export const EMPLOYEE_SELECT_ZM =
  'id, name, email, phone, color, role, commission_percentage, notes, is_active, created_at, avatar_url, sort_order'

export const EMPLOYEE_SELECT_GEEMA =
  'id, name, email, phone, color, role, commission_percentage, notes, is_active, created_at, payment_mode, salary_amount, avatar_url, sort_order'

export interface EmployeeRow {
  id: string
  name: string
  email: string | null
  phone: string | null
  color: string
  role: string
  commission_percentage: number | null
  payment_mode: PaymentMode
  salary_amount: string | null
  notes: string | null
  is_active: boolean
  avatar_url: string | null
  sort_order: number | null
}

export interface EmployeeRawRow {
  id: string
  name: string
  email?: string | null
  phone?: string | null
  color: string
  role?: string | null
  commission_percentage?: number | null
  payment_mode?: string | null
  salary_amount?: string | number | null
  notes?: string | null
  is_active: boolean
  avatar_url?: string | null
  sort_order?: number | null
}

export interface EmployeeWriteInput {
  name: string
  email: string | null
  phone: string | null
  color: string
  commission_percentage: number | null
  payment_mode: PaymentMode
  salary_amount: number | null
  notes: string | null
  is_active: boolean
  avatar_url: string | null
}

export function rowToEmployee(row: EmployeeRawRow, dialect: EmployeesDialect): EmployeeRow {
  const paymentMode: PaymentMode =
    dialect === 'geema' &&
    (row.payment_mode === 'commission' ||
      row.payment_mode === 'salary' ||
      row.payment_mode === 'mixed')
      ? row.payment_mode
      : 'commission'

  return {
    id: row.id,
    name: row.name,
    email: row.email ?? null,
    phone: row.phone ?? null,
    color: row.color,
    role: row.role ?? 'employee',
    commission_percentage: row.commission_percentage ?? 0,
    payment_mode: paymentMode,
    salary_amount: row.salary_amount != null ? String(row.salary_amount) : null,
    notes: row.notes ?? null,
    is_active: row.is_active,
    avatar_url: row.avatar_url ?? null,
    sort_order: row.sort_order ?? null,
  }
}

/** Columnas que ZM prod acepta. Geema añade modo de pago; avatar_url existe en ambos esquemas. */
export function toEmployeeWritePayload(
  input: EmployeeWriteInput,
  dialect: EmployeesDialect
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    phone: input.phone,
    color: input.color,
    commission_percentage: input.commission_percentage ?? 0,
    notes: input.notes,
    is_active: input.is_active,
    avatar_url: input.avatar_url,
  }
  if (dialect === 'geema') {
    payload.payment_mode = input.payment_mode
    payload.salary_amount = input.salary_amount
  }
  return payload
}

export async function fetchAllEmployees(): Promise<EmployeeRow[]> {
  const dialect = await detectCatalogDialect()
  const { data, error } =
    dialect === 'zm'
      ? await supabase
          .from('employees')
          .select(EMPLOYEE_SELECT_ZM)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true })
      : await supabase
          .from('employees')
          .select(EMPLOYEE_SELECT_GEEMA)
          .order('sort_order', { ascending: true, nullsFirst: false })
          .order('created_at', { ascending: true })
  if (error) {
    throw new Error(error.message)
  }
  return ((data ?? []) as unknown as EmployeeRawRow[]).map((row) => rowToEmployee(row, dialect))
}

/** Persiste el nuevo orden manual (arrastre en Personal). `orderedIds[0]` queda primero. */
export async function reorderEmployees(orderedIds: string[]): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    supabase
      .from('employees')
      .update({ sort_order: index + 1 })
      .eq('id', id)
  )
  const results = await Promise.all(updates)
  const failed = results.find((r) => r.error)
  if (failed?.error) {
    throw new Error(failed.error.message)
  }
}

export async function fetchEmployeeById(id: string): Promise<EmployeeRow | null> {
  const dialect = await detectCatalogDialect()
  const { data, error } =
    dialect === 'zm'
      ? await supabase.from('employees').select(EMPLOYEE_SELECT_ZM).eq('id', id).maybeSingle()
      : await supabase.from('employees').select(EMPLOYEE_SELECT_GEEMA).eq('id', id).maybeSingle()
  if (error) {
    throw new Error(error.message)
  }
  if (!data) return null
  return rowToEmployee(data as unknown as EmployeeRawRow, dialect)
}

export async function insertEmployee(input: EmployeeWriteInput): Promise<void> {
  const dialect = await detectCatalogDialect()
  const { error } = await supabase
    .from('employees')
    .insert(toEmployeeWritePayload(input, dialect))
  if (error) {
    throw new Error(error.message)
  }
}

export async function updateEmployee(id: string, input: EmployeeWriteInput): Promise<void> {
  const dialect = await detectCatalogDialect()
  const { error } = await supabase
    .from('employees')
    .update(toEmployeeWritePayload(input, dialect))
    .eq('id', id)
  if (error) {
    throw new Error(error.message)
  }
}
