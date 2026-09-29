/**
 * Datos de costo WABA (Meta pricing_analytics) desde waba_pricing_daily.
 * Capa de datos — sin UI ni React Query. Fechas en zona IANA del tenant.
 */
import { supabase } from '@/lib/supabase'
import { getTenantBillingMonthKey, getTenantTodayString } from '../lib/billingMonth'

/** Fila cruda de PostgREST (snake_case). */
export interface WabaPricingDailyRow {
  date: string
  pricing_category: string
  pricing_type: string
  country_code: string | null
  cost: string | number
  volume: number
}

export interface WabaPricingCategoryAgg {
  pricing_category: string
  label: string
  cost: number
  volume: number
}

export interface WabaPricingMonthCompare {
  current_month_cost: number
  previous_month_cost: number
  /** Variación relativa (0.25 = +25%). null si mes anterior = 0. */
  month_over_month_pct: number | null
  current_month_key: string
  previous_month_key: string
  current_month_label: string
  previous_month_label: string
}

export interface WabaPricingSummary {
  range_start: string
  range_end: string
  total_cost: number
  total_volume: number
  by_category: WabaPricingCategoryAgg[]
  month_compare: WabaPricingMonthCompare
}

const CATEGORY_LABELS: Record<string, string> = {
  MARKETING: 'Marketing',
  UTILITY: 'Utility',
  AUTHENTICATION: 'Authentication',
  AUTHENTICATION_INTERNATIONAL: 'Auth. internacional',
  SERVICE: 'Service (gratis)',
  REFERRAL_CONVERSION: 'Referral',
}

/** Agrupa categorías hermanas para la UI (ej. AUTH_* → Authentication). */
function categoryBucket(raw: string): string {
  if (raw === 'AUTHENTICATION_INTERNATIONAL') return 'AUTHENTICATION'
  return raw
}

function categoryLabel(bucket: string): string {
  return CATEGORY_LABELS[bucket] ?? bucket
}

function toNumber(value: string | number | null | undefined): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const n = Number.parseFloat(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function monthLabelEs(year: number, monthIndex: number): string {
  const d = new Date(Date.UTC(year, monthIndex, 15, 12, 0, 0))
  return new Intl.DateTimeFormat('es-PE', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}

function prevMonth(year: number, monthIndex: number): { year: number; monthIndex: number } {
  if (monthIndex === 0) return { year: year - 1, monthIndex: 11 }
  return { year, monthIndex: monthIndex - 1 }
}

function monthDateBounds(year: number, monthIndex: number): { start: string; end: string } {
  const start = `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
  const end = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

function daysAgoIso(timezone: string, days: number): string {
  const today = getTenantTodayString(timezone)
  const d = new Date(`${today}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() - days)
  return d.toISOString().slice(0, 10)
}

function aggregateByCategory(rows: WabaPricingDailyRow[]): WabaPricingCategoryAgg[] {
  const map = new Map<string, { cost: number; volume: number }>()
  for (const row of rows) {
    const bucket = categoryBucket(row.pricing_category)
    const prev = map.get(bucket) ?? { cost: 0, volume: 0 }
    prev.cost += toNumber(row.cost)
    prev.volume += row.volume ?? 0
    map.set(bucket, prev)
  }
  return Array.from(map.entries())
    .map(([pricing_category, agg]) => ({
      pricing_category,
      label: categoryLabel(pricing_category),
      cost: agg.cost,
      volume: agg.volume,
    }))
    .sort((a, b) => b.cost - a.cost || b.volume - a.volume)
}

/**
 * Filas diarias en un rango inclusive (YYYY-MM-DD).
 * Por defecto: últimos 30 días calendario del tenant.
 */
export async function fetchWabaPricingByCategory(
  timezone: string,
  rangeStart?: string,
  rangeEnd?: string
): Promise<{
  range_start: string
  range_end: string
  rows: WabaPricingDailyRow[]
  by_category: WabaPricingCategoryAgg[]
  total_cost: number
  total_volume: number
}> {
  const end = rangeEnd ?? getTenantTodayString(timezone)
  const start = rangeStart ?? daysAgoIso(timezone, 29)

  const { data, error } = await supabase
    .from('waba_pricing_daily')
    .select('date, pricing_category, pricing_type, country_code, cost, volume')
    .gte('date', start)
    .lte('date', end)
    .order('date', { ascending: true })

  if (error) {
    throw new Error(`waba_pricing_daily: ${error.message}`)
  }

  const rows = (data ?? []) as WabaPricingDailyRow[]
  const by_category = aggregateByCategory(rows)
  const total_cost = by_category.reduce((s, c) => s + c.cost, 0)
  const total_volume = by_category.reduce((s, c) => s + c.volume, 0)

  return {
    range_start: start,
    range_end: end,
    rows,
    by_category,
    total_cost,
    total_volume,
  }
}

/** Total gastado mes actual vs mes anterior (calendario del tenant). */
export async function fetchWabaPricingMonthCompare(
  timezone: string
): Promise<WabaPricingMonthCompare> {
  const [year, month] = getTenantBillingMonthKey(timezone).split('-').map(Number)
  const monthIndex = month - 1
  const prev = prevMonth(year, monthIndex)
  const currentBounds = monthDateBounds(year, monthIndex)
  const previousBounds = monthDateBounds(prev.year, prev.monthIndex)

  const { data, error } = await supabase
    .from('waba_pricing_daily')
    .select('date, cost')
    .gte('date', previousBounds.start)
    .lte('date', currentBounds.end)

  if (error) {
    throw new Error(`waba_pricing_daily (mes): ${error.message}`)
  }

  let current_month_cost = 0
  let previous_month_cost = 0
  for (const row of data ?? []) {
    const cost = toNumber((row as { cost: string | number }).cost)
    const d = String((row as { date: string }).date).slice(0, 10)
    if (d >= currentBounds.start && d <= currentBounds.end) {
      current_month_cost += cost
    } else if (d >= previousBounds.start && d <= previousBounds.end) {
      previous_month_cost += cost
    }
  }

  let month_over_month_pct: number | null = null
  if (previous_month_cost > 0) {
    month_over_month_pct = (current_month_cost - previous_month_cost) / previous_month_cost
  } else if (current_month_cost > 0) {
    month_over_month_pct = null
  } else {
    month_over_month_pct = 0
  }

  return {
    current_month_cost,
    previous_month_cost,
    month_over_month_pct,
    current_month_key: `${year}-${String(month).padStart(2, '0')}`,
    previous_month_key: `${prev.year}-${String(prev.monthIndex + 1).padStart(2, '0')}`,
    current_month_label: monthLabelEs(year, monthIndex),
    previous_month_label: monthLabelEs(prev.year, prev.monthIndex),
  }
}

/** Resumen completo para la card de Finanzas. */
export async function fetchWabaPricingSummary(timezone: string): Promise<WabaPricingSummary> {
  const [byRange, month_compare] = await Promise.all([
    fetchWabaPricingByCategory(timezone),
    fetchWabaPricingMonthCompare(timezone),
  ])

  return {
    range_start: byRange.range_start,
    range_end: byRange.range_end,
    total_cost: byRange.total_cost,
    total_volume: byRange.total_volume,
    by_category: byRange.by_category,
    month_compare,
  }
}
