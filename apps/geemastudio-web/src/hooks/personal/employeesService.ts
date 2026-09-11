'use client'

import { supabase } from '@/lib/supabase'
import {
  EMPLOYEE_SELECT_GEEMA,
  EMPLOYEE_SELECT_ZM,
  type CatalogDialect,
  type CommissionMode,
  type EmployeeRow,
  type EmployeeWriteInput,
  type PaymentMode,
} from './types'

interface SupabaseErrorLike {
  message?: string
  code?: string
}

function isMissingColumnError(err: SupabaseErrorLike): boolean {
  const m = (err.message ?? '').toLowerCase()
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    err.code === '42703' ||
    err.code === 'PGRST204'
  )
}

let cachedDialect: CatalogDialect | null = null
let detectPromise: Promise<CatalogDialect> | null = null

/** Sondea si `employees.payment_mode` existe (Geema) o no (ZM). */
export async function detectEmployeesDialect(): Promise<CatalogDialect> {
  if (cachedDialect) return cachedDialect
  if (!supabase) throw new Error('Supabase no está configurado')

  if (!detectPromise) {
    detectPromise = (async () => {
      try {
        const { error } = await supabase!.from('employees').select('payment_mode').limit(1)
        if (!error) {
          cachedDialect = 'geema'
          return 'geema'
        }
        if (isMissingColumnError(error)) {
          cachedDialect = 'zm'
          return 'zm'
        }
        throw new Error(error.message)
      } catch (err) {
        detectPromise = null
        throw err
      }
    })()
  }
  return detectPromise
}

function parseCommissionMode(raw: string | null | undefined): CommissionMode {
  return raw === 'fixed_house' ? 'fixed_house' : 'percent'
}

function rowToEmployee(row: Record<string, unknown>, dialect: CatalogDialect): EmployeeRow {
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
    sort_order: (row.sort_order as number | null) ?? null,
  }
}

export function toEmployeeWritePayload(
  input: EmployeeWriteInput,
  dialect: CatalogDialect
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: input.name,
    email: input.email,
    phone: input.phone,
    color: input.color,
    commission_percentage: input.commission_percentage ?? 0,
    commission_mode: input.commission_mode,
    house_cut_fixed: input.commission_mode === 'fixed_house' ? input.house_cut_fixed : null,
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
  if (!supabase) throw new Error('Supabase no está configurado')
  const dialect = await detectEmployeesDialect()
  const select = dialect === 'zm' ? EMPLOYEE_SELECT_ZM : EMPLOYEE_SELECT_GEEMA

  const { data, error } = await supabase
    .from('employees')
    .select(select as string)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return ((data ?? []) as unknown as Record<string, unknown>[]).map((row) =>
    rowToEmployee(row, dialect)
  )
}

export async function insertEmployee(input: EmployeeWriteInput): Promise<EmployeeRow> {
  if (!supabase) throw new Error('Supabase no está configurado')
  const dialect = await detectEmployeesDialect()
  const select = dialect === 'zm' ? EMPLOYEE_SELECT_ZM : EMPLOYEE_SELECT_GEEMA

  const { data, error } = await supabase
    .from('employees')
    .insert(toEmployeeWritePayload(input, dialect))
    .select(select as string)
    .single()

  if (error) throw new Error(error.message)
  return rowToEmployee(data as unknown as Record<string, unknown>, dialect)
}

export async function updateEmployee(id: string, input: EmployeeWriteInput): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado')
  const dialect = await detectEmployeesDialect()
  const { error } = await supabase
    .from('employees')
    .update(toEmployeeWritePayload(input, dialect))
    .eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteEmployee(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado')
  const { error } = await supabase.from('employees').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

const AVATAR_BUCKET = 'employee-avatars'

export async function uploadEmployeeAvatar(
  employeeId: string,
  file: File
): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado')
  const ext = file.type.includes('png') ? 'png' : file.type.includes('webp') ? 'webp' : 'jpg'
  const path = `${employeeId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    contentType: file.type || 'image/jpeg',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteAvatarIfStorage(publicUrl: string | null | undefined): Promise<void> {
  if (!supabase || !publicUrl?.trim()) return
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`
  const i = publicUrl.indexOf(marker)
  if (i === -1) return
  const path = decodeURIComponent(publicUrl.slice(i + marker.length).split('?')[0] ?? '')
  if (!path) return
  await supabase.storage.from(AVATAR_BUCKET).remove([path])
}
