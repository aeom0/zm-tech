import { supabase } from '@/lib/supabase'
import type {
  ExpenseCategory,
  MonthlyFinancialRow,
  OperationalExpense,
} from '../types'

export function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0
  const n =
    typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

function requireTenantId(tenantId?: string): string {
  if (!tenantId) {
    throw new Error('tenantId es requerido para operaciones de gastos')
  }
  return tenantId
}

export async function fetchMonthlyFinancialSummary(opts: {
  tenantId?: string
  from: string
  to: string
}): Promise<MonthlyFinancialRow[]> {
  const tenantId = requireTenantId(opts.tenantId)
  const { data, error } = await supabase.rpc('get_monthly_financial_summary', {
    p_tenant_id: tenantId,
    p_from: opts.from,
    p_to: opts.to,
  })
  if (error) throw new Error(error.message)
  return (data ?? []).map(
    (row: {
      month: string
      revenue: string | number
      expenses: string | number
      ads_spend: string | number
    }) => ({
      month: String(row.month).slice(0, 10),
      revenue: toNumber(row.revenue),
      expenses: toNumber(row.expenses),
      ads_spend: toNumber(row.ads_spend),
    })
  )
}

export async function fetchExpensesForMonth(opts: {
  tenantId?: string
  expenseMonth: string
}): Promise<OperationalExpense[]> {
  const tenantId = requireTenantId(opts.tenantId)
  const { data, error } = await supabase
    .from('operational_expenses')
    .select(
      'id, tenant_id, category, label, amount, expense_month, expense_date, is_estimated, source, source_ref, created_at, updated_at'
    )
    .eq('tenant_id', tenantId)
    .eq('expense_month', opts.expenseMonth)
    .order('category', { ascending: true })
    .order('label', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as OperationalExpense[]
}

export interface ExpenseWrite {
  category: ExpenseCategory
  label: string
  amount: number | null
  expense_month: string
  expense_date?: string | null
  is_estimated?: boolean
  created_by?: string | null
}

export async function upsertExpense(opts: {
  tenantId?: string
  id?: string
  data: ExpenseWrite
}): Promise<void> {
  const tenantId = requireTenantId(opts.tenantId)
  const row = {
    tenant_id: tenantId,
    category: opts.data.category,
    label: opts.data.label.trim(),
    amount: opts.data.amount == null ? null : opts.data.amount.toFixed(2),
    expense_month: opts.data.expense_month,
    expense_date: opts.data.expense_date ?? null,
    is_estimated: opts.data.is_estimated ?? false,
    source: 'manual' as const,
    created_by: opts.data.created_by ?? null,
  }
  if (opts.id) {
    const { error } = await supabase
      .from('operational_expenses')
      .update(row)
      .eq('id', opts.id)
    if (error) throw new Error(error.message)
    return
  }
  const { error } = await supabase.from('operational_expenses').upsert(row, {
    onConflict: 'tenant_id,category,label,expense_month',
  })
  if (error) throw new Error(error.message)
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase
    .from('operational_expenses')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}
