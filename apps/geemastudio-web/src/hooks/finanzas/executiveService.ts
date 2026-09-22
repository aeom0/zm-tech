import { supabase } from '@/lib/supabase'
import { shiftMonth } from './executiveDates'

export type GrowthRange = '6m' | '12m' | 'all'
export type SoldKind = 'service' | 'pack' | 'promo'

export interface MonthlyFinancialRow {
  month: string
  revenue: number
  expenses: number
  ads_spend: number
}

export interface ClientGrowthRow {
  month_start: string
  nuevas: number
  recurrentes: number
  citas: number
}

export interface SoldItemRow {
  kind: SoldKind
  item_id: string
  item_name: string
  sold_count: number
  revenue: number
}

function toNumber(value: string | number | null | undefined): number {
  if (value == null) return 0
  const n =
    typeof value === 'number' ? Number(value) : Number.parseFloat(String(value))
  return Number.isFinite(n) ? n : 0
}

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase no configurado')
  }
  return supabase
}

export function rangeFrom(currentMonth: string, range: GrowthRange): string {
  if (range === '12m') return shiftMonth(currentMonth, -11)
  if (range === 'all') return shiftMonth(currentMonth, -35)
  return shiftMonth(currentMonth, -5)
}

export async function fetchMonthlyFinancialSummary(opts: {
  from: string
  to: string
  tenantId: string
}): Promise<MonthlyFinancialRow[]> {
  const client = requireClient()
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

export async function fetchMonthlyClientGrowth(opts: {
  from: string
  to: string
  tenantId: string
}): Promise<ClientGrowthRow[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('get_monthly_client_growth', {
    p_tenant_id: opts.tenantId,
    p_from: opts.from,
    p_to: opts.to,
  })
  if (error) throw new Error(error.message)
  return (data ?? []).map(
    (row: {
      month_start: string
      nuevas: string | number
      recurrentes: string | number
      citas: string | number
    }) => ({
      month_start: String(row.month_start).slice(0, 10),
      nuevas: Math.round(toNumber(row.nuevas)),
      recurrentes: Math.round(toNumber(row.recurrentes)),
      citas: Math.round(toNumber(row.citas)),
    })
  )
}

export async function fetchSoldItemRanking(opts: {
  from: string
  to: string
  limit?: number
  tenantId: string
}): Promise<SoldItemRow[]> {
  const client = requireClient()
  const { data, error } = await client.rpc('get_sold_item_ranking', {
    p_tenant_id: opts.tenantId,
    p_from: opts.from,
    p_to: opts.to,
    p_limit: opts.limit ?? 12,
  })
  if (error) throw new Error(error.message)
  return (data ?? []).map(
    (row: {
      kind: string
      item_id: string
      item_name: string
      sold_count: string | number
      revenue: string | number
    }) => ({
      kind: (row.kind === 'pack' || row.kind === 'promo' ? row.kind : 'service') as SoldKind,
      item_id: String(row.item_id),
      item_name: String(row.item_name ?? ''),
      sold_count: Math.round(toNumber(row.sold_count)),
      revenue: toNumber(row.revenue),
    })
  )
}

export async function countExpensesForMonth(opts: {
  expenseMonth: string
  tenantId: string
}): Promise<number> {
  const client = requireClient()
  const { count, error } = await client
    .from('operational_expenses')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', opts.tenantId)
    .eq('expense_month', opts.expenseMonth)
  if (error) throw new Error(error.message)
  return count ?? 0
}
