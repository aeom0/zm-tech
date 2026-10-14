import type { SupabaseClient } from '@supabase/supabase-js'
import type { ExpenseWriteInput, MonthlyFinancialRow, OperationalExpense } from './types'

export function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

/** Traduce errores de escritura de gastos (p. ej. la restricción única por mes). */
export function expenseMutationError(error: { message: string; code?: string }): Error {
  if (error.code === '23505') {
    return new Error(
      'Ya registraste un gasto con esa categoría y descripción en ese mes. Edítalo o usa otra descripción.'
    )
  }
  return new Error(error.message)
}

export async function fetchMonthlyFinancialSummary(
  client: SupabaseClient,
  opts: {
    tenantId: string
    from: string
    to: string
  }
): Promise<MonthlyFinancialRow[]> {
  const { data, error } = await client.rpc('get_monthly_financial_summary', {
    p_tenant_id: opts.tenantId,
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

export async function fetchExpensesForMonth(
  client: SupabaseClient,
  opts: {
    tenantId: string
    expenseMonth: string
  }
): Promise<OperationalExpense[]> {
  const { data, error } = await client
    .from('operational_expenses')
    .select(
      'id, tenant_id, category, label, amount, expense_month, expense_date, is_estimated, source, source_ref, created_at, updated_at'
    )
    .eq('tenant_id', opts.tenantId)
    .eq('expense_month', opts.expenseMonth)
    .order('category', { ascending: true })
    .order('label', { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as OperationalExpense[]
}

export async function upsertExpense(
  client: SupabaseClient,
  opts: {
    tenantId: string
    expense: ExpenseWriteInput
    id?: string
  }
): Promise<OperationalExpense> {
  const payload = {
    tenant_id: opts.tenantId,
    category: opts.expense.category,
    label: opts.expense.label.trim(),
    amount: opts.expense.amount == null ? null : opts.expense.amount.toFixed(2),
    expense_month: opts.expense.expense_month,
    expense_date: opts.expense.expense_date ?? null,
    is_estimated: opts.expense.is_estimated ?? false,
    source: 'manual' as const,
    created_by: opts.expense.created_by ?? null,
    updated_at: new Date().toISOString(),
  }

  if (opts.id) {
    const { data, error } = await client
      .from('operational_expenses')
      .update(payload)
      .eq('id', opts.id)
      .eq('tenant_id', opts.tenantId)
      .select('*')
      .single()
    if (error) throw expenseMutationError(error)
    return data as OperationalExpense
  }

  const { data, error } = await client
    .from('operational_expenses')
    .insert(payload)
    .select('*')
    .single()
  if (error) throw expenseMutationError(error)
  return data as OperationalExpense
}

export async function deleteExpense(
  client: SupabaseClient,
  opts: {
    tenantId: string
    id: string
  }
): Promise<void> {
  const { error } = await client
    .from('operational_expenses')
    .delete()
    .eq('id', opts.id)
    .eq('tenant_id', opts.tenantId)
  if (error) throw new Error(error.message)
}
