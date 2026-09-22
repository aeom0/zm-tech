'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getLimaDateParts, limaMonthStart } from './executiveDates'
import {
  countExpensesForMonth,
  fetchMonthlyClientGrowth,
  fetchMonthlyFinancialSummary,
  fetchSoldItemRanking,
  rangeFrom,
  type ClientGrowthRow,
  type GrowthRange,
  type MonthlyFinancialRow,
  type SoldItemRow,
  type SoldKind,
} from './executiveService'

export type {
  ClientGrowthRow,
  GrowthRange,
  MonthlyFinancialRow,
  SoldItemRow,
  SoldKind,
}

export interface MixSlice {
  kind: SoldKind
  label: string
  revenue: number
  count: number
}

export interface BreakEven {
  ingresos: number
  gastos: number
  ads: number
  costos: number
  citas: number
  ticket: number | null
  citasNecesarias: number | null
  faltan: number | null
  diasRestantes: number
  diasDelMes: number
  gastosCargados: boolean
}

export const KIND_LABEL: Record<SoldKind, string> = {
  service: 'Servicio',
  pack: 'Pack',
  promo: 'Promo',
}

function limaMonthMeta(iso: string) {
  const [y, m] = iso.slice(0, 10).split('-').map(Number)
  const daysDelMes = new Date(y, m, 0).getDate()
  const today = getLimaDateParts()
  const sameMonth = limaMonthStart() === `${y}-${String(m).padStart(2, '0')}-01`
  const diasRestantes = sameMonth ? Math.max(0, daysDelMes - today.day + 1) : daysDelMes
  return { daysDelMes, diasRestantes }
}

export function useExecutiveDashboard(
  range: GrowthRange,
  tenantId: string | null,
  focusMonth?: string
) {
  const currentMonth = limaMonthStart()
  const from = rangeFrom(currentMonth, range)
  const targetMonth = focusMonth ?? currentMonth
  const enabled = Boolean(tenantId)

  const summaryQ = useQuery({
    queryKey: ['web_exec_summary', tenantId, from, currentMonth],
    staleTime: 60_000,
    enabled,
    queryFn: () =>
      fetchMonthlyFinancialSummary({ from, to: currentMonth, tenantId: tenantId! }),
  })
  const growthQ = useQuery({
    queryKey: ['web_exec_growth', tenantId, from, currentMonth],
    staleTime: 60_000,
    enabled,
    queryFn: () => fetchMonthlyClientGrowth({ from, to: currentMonth, tenantId: tenantId! }),
  })
  const rankingQ = useQuery({
    queryKey: ['web_exec_ranking', tenantId, from, currentMonth],
    staleTime: 60_000,
    enabled,
    queryFn: () =>
      fetchSoldItemRanking({ from, to: currentMonth, limit: 40, tenantId: tenantId! }),
  })
  const expenseCountQ = useQuery({
    queryKey: ['web_exec_expense_count', tenantId, currentMonth],
    staleTime: 60_000,
    enabled,
    queryFn: () =>
      countExpensesForMonth({ expenseMonth: currentMonth, tenantId: tenantId! }),
  })

  const monthly = useMemo(() => summaryQ.data ?? [], [summaryQ.data])
  const growth = useMemo(() => growthQ.data ?? [], [growthQ.data])
  const ranking = useMemo(() => rankingQ.data ?? [], [rankingQ.data])

  const currentKpi = useMemo(() => {
    const row = monthly.find((r) => r.month.slice(0, 10) === targetMonth)
    const ingresos = row?.revenue ?? 0
    const gastos = row?.expenses ?? 0
    const ads = row?.ads_spend ?? 0
    const utilidad = ingresos - gastos - ads
    const margenPct = ingresos > 0 ? Math.round((utilidad / ingresos) * 1000) / 10 : null
    return { ingresos, gastos, ads, utilidad, margenPct }
  }, [monthly, targetMonth])

  const mix = useMemo<MixSlice[]>(() => {
    const acc: Record<SoldKind, MixSlice> = {
      service: { kind: 'service', label: KIND_LABEL.service, revenue: 0, count: 0 },
      pack: { kind: 'pack', label: KIND_LABEL.pack, revenue: 0, count: 0 },
      promo: { kind: 'promo', label: KIND_LABEL.promo, revenue: 0, count: 0 },
    }
    for (const row of ranking) {
      acc[row.kind].revenue += row.revenue
      acc[row.kind].count += row.sold_count
    }
    return [acc.service, acc.pack, acc.promo].filter((s) => s.revenue > 0 || s.count > 0)
  }, [ranking])

  const breakEven = useMemo<BreakEven>(() => {
    const growthRow = growth.find((r) => r.month_start.slice(0, 10) === targetMonth)
    const citas = growthRow?.citas ?? 0
    const { ingresos, gastos, ads } = currentKpi
    const costos = gastos + ads
    const ticket = citas > 0 ? ingresos / citas : null
    const citasNecesarias = ticket && ticket > 0 ? Math.ceil(costos / ticket) : null
    const faltan = citasNecesarias == null ? null : Math.max(0, citasNecesarias - citas)
    const { daysDelMes, diasRestantes } = limaMonthMeta(targetMonth)
    const gastosCargados =
      targetMonth === currentMonth ? (expenseCountQ.data ?? 0) > 0 : true
    return {
      ingresos,
      gastos,
      ads,
      costos,
      citas,
      ticket,
      citasNecesarias,
      faltan,
      diasRestantes,
      diasDelMes: daysDelMes,
      gastosCargados,
    }
  }, [growth, currentKpi, targetMonth, currentMonth, expenseCountQ.data])

  return {
    currentMonth,
    targetMonth,
    availableMonths: monthly.map((r) => r.month.slice(0, 10)),
    monthly,
    growth,
    ranking,
    mix,
    currentKpi,
    breakEven,
    isLoading:
      !enabled ||
      summaryQ.isLoading ||
      growthQ.isLoading ||
      rankingQ.isLoading ||
      expenseCountQ.isLoading,
    isError: summaryQ.isError || growthQ.isError || rankingQ.isError,
    errorMessage:
      (summaryQ.error as Error | undefined)?.message ??
      (growthQ.error as Error | undefined)?.message ??
      (rankingQ.error as Error | undefined)?.message ??
      null,
  }
}
