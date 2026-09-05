import { supabase } from '@/lib/supabase'
import type { CommissionPayout } from '../types'

function requireTenantId(tenantId?: string): string {
  if (!tenantId) {
    throw new Error('tenantId es requerido para operaciones de comisiones')
  }
  return tenantId
}

/** Pagos cuyo rango [period_start, period_end] solapa el rango filtrado. */
export async function fetchPayoutsForRange(opts: {
  tenantId?: string
  periodStart: string
  periodEnd: string
}): Promise<CommissionPayout[]> {
  const tenantId = requireTenantId(opts.tenantId)
  const { data, error } = await supabase
    .from('commission_payouts')
    .select(
      'id, tenant_id, employee_id, period_start, period_end, amount, paid_at, method, notes, created_at'
    )
    .eq('tenant_id', tenantId)
    .lte('period_start', opts.periodEnd)
    .gte('period_end', opts.periodStart)
    .order('paid_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as CommissionPayout[]
}

export interface PayoutWrite {
  employee_id: string
  period_start: string
  period_end: string
  amount: number
  method?: string | null
  notes?: string | null
  created_by?: string | null
}

export async function createPayout(opts: {
  tenantId?: string
  data: PayoutWrite
}): Promise<void> {
  const tenantId = requireTenantId(opts.tenantId)
  const row = {
    tenant_id: tenantId,
    employee_id: opts.data.employee_id,
    period_start: opts.data.period_start,
    period_end: opts.data.period_end,
    amount: opts.data.amount.toFixed(2),
    method: opts.data.method ?? null,
    notes: opts.data.notes ?? null,
    created_by: opts.data.created_by ?? null,
  }
  const { error } = await supabase.from('commission_payouts').insert(row)
  if (error) throw new Error(error.message)
}

export async function deletePayout(id: string): Promise<void> {
  const { error } = await supabase.from('commission_payouts').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
