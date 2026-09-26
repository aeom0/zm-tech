'use client'

import { useMemo, useState } from 'react'
import { monthTick } from '@/hooks/finanzas/executiveDates'
import {
  useExecutiveDashboard,
  type GrowthRange,
} from '@/hooks/finanzas/useExecutiveDashboard'
import { BreakEvenCard } from './BreakEvenCard'
import { ClientGrowthChart } from './ClientGrowthChart'
import { ExecutiveFmtProvider } from './ExecutiveFmtContext'
import { KpiStrip } from './KpiStrip'
import { MixChart } from './MixChart'
import { ProfitChart } from './ProfitChart'
import { RankingList } from './RankingList'
import { RangeToggle } from './ViewToggle'

interface Props {
  range: GrowthRange
  onChangeRange: (r: GrowthRange) => void
  tenantId: string | null
  currencyCode: string
  timezone: string
  primaryColor?: string | null
  accentColor?: string | null
}

export function ExecutiveDashboard({
  range,
  onChangeRange,
  tenantId,
  currencyCode,
  timezone,
  primaryColor,
  accentColor,
}: Props) {
  const [selectedMonth, setSelectedMonth] = useState<string | undefined>(undefined)
  const dash = useExecutiveDashboard(range, tenantId, selectedMonth, timezone)
  const isCurrentMonth = dash.targetMonth === dash.currentMonth

  const monthOptions = useMemo(() => {
    const months = [...dash.availableMonths].sort().reverse()
    return months.length > 0 ? months : [dash.currentMonth]
  }, [dash.availableMonths, dash.currentMonth])

  const sparklines = useMemo(() => {
    const last6 = dash.monthly.slice(-6)
    return {
      ingresos: last6.map((r) => r.revenue),
      gastos: last6.map((r) => r.expenses),
      ads: last6.map((r) => r.ads_spend),
      utilidad: last6.map((r) => r.revenue - r.expenses - r.ads_spend),
    }
  }, [dash.monthly])

  return (
    <ExecutiveFmtProvider
      currencyCode={currencyCode}
      primaryColor={primaryColor}
      accentColor={accentColor}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Resumen ejecutivo
            </h1>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Utilidad, clientes y mix de ventas ·{' '}
              {isCurrentMonth
                ? 'mes en curso (hora local Lima)'
                : `${monthTick(dash.targetMonth)} (Lima)`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="sr-only" htmlFor="executive-month-select">
              Mes
            </label>
            <select
              id="executive-month-select"
              value={dash.targetMonth}
              onChange={(e) =>
                setSelectedMonth(
                  e.target.value === dash.currentMonth ? undefined : e.target.value
                )
              }
              className="h-11 cursor-pointer rounded-full border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m === dash.currentMonth ? 'Mes actual' : monthTick(m)}
                </option>
              ))}
            </select>
            <RangeToggle range={range} onChange={onChangeRange} />
          </div>
        </div>

        {dash.isError ? (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            No se pudo cargar el resumen
            {dash.errorMessage ? `: ${dash.errorMessage}` : '.'}
          </p>
        ) : null}

        <KpiStrip
          ingresos={dash.currentKpi.ingresos}
          gastos={dash.currentKpi.gastos}
          ads={dash.currentKpi.ads}
          utilidad={dash.currentKpi.utilidad}
          margenPct={dash.currentKpi.margenPct}
          loading={dash.isLoading}
          sparklines={sparklines}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ProfitChart data={dash.monthly} loading={dash.isLoading} />
          <ClientGrowthChart data={dash.growth} loading={dash.isLoading} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MixChart data={dash.mix} loading={dash.isLoading} />
          <RankingList data={dash.ranking.slice(0, 12)} loading={dash.isLoading} />
        </div>

        <BreakEvenCard data={dash.breakEven} loading={dash.isLoading} />
      </div>
    </ExecutiveFmtProvider>
  )
}
