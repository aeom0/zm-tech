import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommissionMode, PaymentMode } from '@geemastudio/shared-schema'
import { isMissingColumnError } from '../catalog/catalogAdapter'
import type { EmployeeRawRow, EmployeeRow, EmployeeWriteInput, EmployeesDialect } from './types'

export const EMPLOYEE_SELECT_ZM =
  'id, name, email, phone, color, role, commission_percentage, commission_mode, house_cut_fixed, notes, is_active, created_at, avatar_url, sort_order, does_all_services'

export const EMPLOYEE_SELECT_GEEMA =
  'id, name, email, phone, color, role, commission_percentage, commission_mode, house_cut_fixed, notes, is_active, created_at, payment_mode, salary_amount, avatar_url, sort_order, does_all_services'

let cachedEmployeesDialect: EmployeesDialect | null = null
let employeesDetectPromise: Promise<EmployeesDialect> | null = null

export async function detectEmployeesDialect(client: SupabaseClient): Promise<EmployeesDialect> {
  if (cachedEmployeesDialect) return cachedEmployeesDialect
  if (!employeesDetectPromise) {
    employeesDetectPromise = (async () => {
      try {
        const { error } = await client.from('employees').select('payment_mode').limit(1)
        if (!error) {
          cachedEmployeesDialect = 'geema'
          return 'geema'
        }
        if (isMissingColumnError(error)) {
          cachedEmployeesDialect = 'zm'
          return 'zm'
        }
        throw new Error(error.message)
      } catch (err) {
        employeesDetectPromise = null
        throw err
      }
    })()
  }
  return employeesDetectPromise
}

export function resetEmployeesDialectCache(): void {
  cachedEmployeesDialect = null
  employeesDetectPromise = null
}

function parseCommissionMode(raw: string | null | undefined): CommissionMode {
  return raw === 'fixed_house' ? 'fixed_house' : 'percent'
}

export function rowToEmployee(
  row: EmployeeRawRow | Record<string, unknown>,
  dialect: EmployeesDialect
): EmployeeRow {
  const paymentMode: PaymentMode =
    dialect === 'geema' &&
    (row.payment_mode === 'commission' ||
      row.payment_mode === 'salary' ||
      row.payment_mode === 'mixed')
      ? row.payment_mode
      : 'commission'

  return {
    id: String(row.id),
    name: String(row.name),
    email: (row.email as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    color: String(row.color ?? '#40E0D0'),
    role: String(row.role ?? 'employee'),
    commission_percentage: (row.commission_percentage as number | null) ?? 0,
    commission_mode: parseCommissionMode(row.commission_mode as string | null),
    house_cut_fixed: (row.house_cut_fixed as number | null) ?? null,
    payment_mode: paymentMode,
    salary_amount: row.salary_amount != null ? String(row.salary_amount) : null,
    notes: (row.notes as string | null) ?? null,
    is_active: Boolean(row.is_active),
    avatar_url: (row.avatar_url as string | null) ?? null,
    sort_order: row.sort_order != null ? Number(row.sort_order) : null,
    does_all_services: row.does_all_services !== false,
  }
}

export function toEmployeeWritePayload(
  input: EmployeeWriteInput,
  dialect: EmployeesDialect
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    color: input.color,
    commission_percentage: input.commission_percentage ?? 0,
    commission_mode: input.commission_mode,
    house_cut_fixed: input.commission_mode === 'fixed_house' ? input.house_cut_fixed : null,
    notes: input.notes?.trim() || null,
    is_active: input.is_active,
    avatar_url: input.avatar_url,
  }
  if (input.does_all_services !== undefined) {
    payload.does_all_services = input.does_all_services
  }
  if (dialect === 'geema') {
    payload.payment_mode = input.payment_mode
    payload.salary_amount = input.salary_amount
  }
  return payload
}

export async function fetchEmployees(
  client: SupabaseClient,
  dialectOverride?: EmployeesDialect
): Promise<EmployeeRow[]> {
  const dialect = dialectOverride ?? (await detectEmployeesDialect(client))
  const selectQuery = dialect === 'zm' ? EMPLOYEE_SELECT_ZM : EMPLOYEE_SELECT_GEEMA

  const { data, error } = await client
    .from('employees')
    .select(selectQuery)
    .order('is_active', { ascending: false })
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('name', { ascending: true })

  if (error) {
    // Si does_all_services aún no existe en el esquema remoto, reintentamos sin él
    if (isMissingColumnError(error)) {
      const selectFallback = (
        dialect === 'zm' ? EMPLOYEE_SELECT_ZM : EMPLOYEE_SELECT_GEEMA
      ).replace(', does_all_services', '')
      const retry = await client
        .from('employees')
        .select(selectFallback)
        .order('is_active', { ascending: false })
        .order('sort_order', { ascending: true, nullsFirst: false })
        .order('name', { ascending: true })
      if (retry.error) throw new Error(retry.error.message)
      return ((retry.data ?? []) as unknown as Record<string, unknown>[]).map((row) =>
        rowToEmployee(row, dialect)
      )
    }
    throw new Error(error.message)
  }

  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) =>
    rowToEmployee(row, dialect)
  )
}

export async function createEmployee(
  client: SupabaseClient,
  input: EmployeeWriteInput,
  dialectOverride?: EmployeesDialect
): Promise<EmployeeRow> {
  const dialect = dialectOverride ?? (await detectEmployeesDialect(client))
  const selectQuery = dialect === 'zm' ? EMPLOYEE_SELECT_ZM : EMPLOYEE_SELECT_GEEMA
  const payload = toEmployeeWritePayload(input, dialect)

  const { data, error } = await client
    .from('employees')
    .insert(payload)
    .select(selectQuery)
    .single()
  if (error || !data) throw new Error(error?.message ?? 'Error creando profesional')
  return rowToEmployee(data as unknown as Record<string, unknown>, dialect)
}

export async function updateEmployee(
  client: SupabaseClient,
  id: string,
  input: Partial<EmployeeWriteInput>,
  dialectOverride?: EmployeesDialect
): Promise<void> {
  const dialect = dialectOverride ?? (await detectEmployeesDialect(client))
  const patch: Record<string, unknown> = {}

  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.email !== undefined) patch.email = input.email?.trim() || null
  if (input.phone !== undefined) patch.phone = input.phone?.trim() || null
  if (input.color !== undefined) patch.color = input.color
  if (input.commission_percentage !== undefined) {
    patch.commission_percentage = input.commission_percentage ?? 0
  }
  if (input.commission_mode !== undefined) patch.commission_mode = input.commission_mode
  if (input.house_cut_fixed !== undefined) {
    patch.house_cut_fixed = input.commission_mode === 'fixed_house' ? input.house_cut_fixed : null
  }
  if (input.notes !== undefined) patch.notes = input.notes?.trim() || null
  if (input.is_active !== undefined) patch.is_active = input.is_active
  if (input.avatar_url !== undefined) patch.avatar_url = input.avatar_url
  if (input.does_all_services !== undefined) patch.does_all_services = input.does_all_services

  if (dialect === 'geema') {
    if (input.payment_mode !== undefined) patch.payment_mode = input.payment_mode
    if (input.salary_amount !== undefined) patch.salary_amount = input.salary_amount
  }

  const { error } = await client.from('employees').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function reorderEmployees(
  client: SupabaseClient,
  orderedIds: string[]
): Promise<void> {
  const updates = orderedIds.map((id, index) =>
    client
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

export async function fetchEmployeeById(
  client: SupabaseClient,
  id: string,
  dialectOverride?: EmployeesDialect
): Promise<EmployeeRow | null> {
  const dialect = dialectOverride ?? (await detectEmployeesDialect(client))
  const selectQuery = dialect === 'zm' ? EMPLOYEE_SELECT_ZM : EMPLOYEE_SELECT_GEEMA

  const { data, error } = await client
    .from('employees')
    .select(selectQuery)
    .eq('id', id)
    .maybeSingle()
  if (error) {
    if (isMissingColumnError(error)) {
      const selectFallback = selectQuery.replace(', does_all_services', '')
      const retry = await client.from('employees').select(selectFallback).eq('id', id).maybeSingle()
      if (retry.error) throw new Error(retry.error.message)
      if (!retry.data) return null
      return rowToEmployee(retry.data as unknown as Record<string, unknown>, dialect)
    }
    throw new Error(error.message)
  }
  if (!data) return null
  return rowToEmployee(data as unknown as Record<string, unknown>, dialect)
}

export async function deleteEmployee(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('employees').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export const fetchAllEmployees = fetchEmployees
export const insertEmployee = createEmployee

const AVATAR_BUCKET = 'employee-avatars'

export async function uploadEmployeeAvatar(
  client: SupabaseClient,
  employeeId: string,
  file: File | Blob | ArrayBuffer | Uint8Array,
  ext = 'jpg',
  contentType = 'image/jpeg'
): Promise<string> {
  const path = `${employeeId}/${Date.now()}.${ext}`
  const { error } = await client.storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(error.message)

  const { data } = client.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return data.publicUrl
}
