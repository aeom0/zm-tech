import type { SupabaseClient } from '@supabase/supabase-js'

import type { VerificationFilter, VerificationItem } from './types'

/** Ventana del historial: evita listas enormes. */
export const VERIFICATION_HISTORY_DAYS = 30
const HISTORY_LIMIT = 100

const STATUS_BY_FILTER: Record<VerificationFilter, string> = {
  pending: 'payment_submitted',
  approved: 'approved',
  rejected: 'rejected',
}

interface VerificationRow {
  id: string
  client_name: string | null
  service_name: string | null
  appointment_date: string
  amount_deposit: number | string | null
  amount_total: number | string | null
  kind: string | null
  approved_at: string | null
  rejected_at: string | null
  deposit_forfeit_risk: boolean | null
}

export function rowToVerificationItem(
  row: VerificationRow,
  filter: VerificationFilter
): VerificationItem {
  const isPostService = row.kind === 'post_service_payment'
  return {
    id: row.id,
    client_name: row.client_name ?? '—',
    date: row.appointment_date,
    price: Number(isPostService ? row.amount_total : row.amount_deposit) || 0,
    serviceName: row.service_name || '—',
    kind: row.kind,
    status: filter,
    resolvedAt: row.approved_at ?? row.rejected_at,
    readOnly: true,
    depositForfeited: row.deposit_forfeit_risk === true,
    canMarkForfeit: !isPostService && filter !== 'rejected',
  }
}

/** Comprobantes de pago enviados por WhatsApp (`appointment_verifications`). */
export async function fetchVerifications(
  client: SupabaseClient,
  filter: VerificationFilter
): Promise<VerificationItem[]> {
  let q = client
    .from('appointment_verifications')
    .select(
      'id, client_name, service_name, appointment_date, amount_deposit, amount_total, kind, approved_at, rejected_at, deposit_forfeit_risk'
    )
    .eq('status', STATUS_BY_FILTER[filter])
    .order('created_at', { ascending: false })
    .limit(HISTORY_LIMIT)
  if (filter !== 'pending') {
    q = q.gte(
      'created_at',
      new Date(Date.now() - VERIFICATION_HISTORY_DAYS * 86_400_000).toISOString()
    )
  }
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return ((data ?? []) as VerificationRow[]).map((row) => rowToVerificationItem(row, filter))
}

export async function countPendingVerifications(client: SupabaseClient): Promise<number> {
  const { count, error } = await client
    .from('appointment_verifications')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'payment_submitted')
  if (error) throw new Error(error.message)
  return count ?? 0
}

/** Marca interna «Adelanto perdido»: no avisa a la clienta. */
export async function setDepositForfeited(
  client: SupabaseClient,
  verificationId: string,
  forfeited: boolean
): Promise<void> {
  const { error } = await client
    .from('appointment_verifications')
    .update({ deposit_forfeit_risk: forfeited, updated_at: new Date().toISOString() })
    .eq('id', verificationId)
  if (error) throw new Error(error.message)
}
