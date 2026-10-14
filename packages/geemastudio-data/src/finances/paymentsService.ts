import type { SupabaseClient } from '@supabase/supabase-js'
import type { FinancesPayment, PaymentInput } from './types'

export async function createPayment(
  client: SupabaseClient,
  input: PaymentInput
): Promise<FinancesPayment> {
  const payload: Record<string, unknown> = {
    tenant_id: input.tenant_id,
    appointment_id: input.appointment_id || null,
    amount: String(input.amount),
    method: input.method,
    date: input.date,
    notes: input.notes?.trim() || null,
    is_abono: Boolean(input.is_abono),
    service_total: input.service_total != null ? input.service_total : null,
    kind: input.kind ?? (input.is_abono ? 'deposit' : 'service'),
  }

  if (input.paid_currency !== undefined) payload.paid_currency = input.paid_currency
  if (input.exchange_rate !== undefined) payload.exchange_rate = input.exchange_rate
  if (input.amount_ves !== undefined) payload.amount_ves = input.amount_ves

  const { data, error } = await client.from('payments').insert(payload).select('*').single()

  if (error) throw new Error(error.message)
  return data as FinancesPayment
}

export async function fetchPaymentsForAppointment(
  client: SupabaseClient,
  appointmentId: string
): Promise<FinancesPayment[]> {
  const { data, error } = await client
    .from('payments')
    .select('*')
    .eq('appointment_id', appointmentId)
    .order('date', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as FinancesPayment[]
}

export async function fetchRecentPayments(
  client: SupabaseClient,
  tenantId?: string | null,
  limit: number = 50
): Promise<FinancesPayment[]> {
  let query = client.from('payments').select('*').order('date', { ascending: false }).limit(limit)
  if (tenantId) query = query.eq('tenant_id', tenantId)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []) as FinancesPayment[]
}

export async function deletePayment(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('payments').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function updatePayment(
  client: SupabaseClient,
  id: string,
  patch: Omit<PaymentInput, 'tenant_id'>
): Promise<void> {
  const payload: Record<string, unknown> = {
    appointment_id: patch.appointment_id ?? null,
    amount: String(patch.amount),
    method: patch.method,
    date: patch.date,
    notes: patch.notes?.trim() || null,
    is_abono: Boolean(patch.is_abono),
    service_total: patch.service_total ?? null,
    kind: patch.kind ?? (patch.is_abono ? 'deposit' : 'service'),
  }
  if (patch.paid_currency !== undefined) payload.paid_currency = patch.paid_currency
  if (patch.exchange_rate !== undefined) payload.exchange_rate = patch.exchange_rate
  if (patch.amount_ves !== undefined) payload.amount_ves = patch.amount_ves

  const { error } = await client.from('payments').update(payload).eq('id', id)
  if (error) throw new Error(error.message)
}
