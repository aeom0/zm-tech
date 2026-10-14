import {
  deleteExpense as deleteExpenseData,
  fetchExpensesForMonth as fetchExpensesForMonthData,
  fetchMonthlyFinancialSummary as fetchMonthlyFinancialSummaryData,
  upsertExpense as upsertExpenseData,
  type ExpenseWriteInput,
  type MonthlyFinancialRow,
  type OperationalExpense,
} from '@geemastudio/data'

import { supabase } from '@/lib/supabase'

export { toNumber } from '@geemastudio/data'

export type ExpenseWrite = ExpenseWriteInput

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
  return fetchMonthlyFinancialSummaryData(supabase, {
    tenantId: requireTenantId(opts.tenantId),
    from: opts.from,
    to: opts.to,
  })
}

export async function fetchExpensesForMonth(opts: {
  tenantId?: string
  expenseMonth: string
}): Promise<OperationalExpense[]> {
  return fetchExpensesForMonthData(supabase, {
    tenantId: requireTenantId(opts.tenantId),
    expenseMonth: opts.expenseMonth,
  })
}

export async function upsertExpense(opts: {
  tenantId?: string
  id?: string
  data: ExpenseWrite
}): Promise<void> {
  await upsertExpenseData(supabase, {
    tenantId: requireTenantId(opts.tenantId),
    id: opts.id,
    expense: opts.data,
  })
}

export async function deleteExpense(opts: { tenantId?: string; id: string }): Promise<void> {
  await deleteExpenseData(supabase, { tenantId: requireTenantId(opts.tenantId), id: opts.id })
}
