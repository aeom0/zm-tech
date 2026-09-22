'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { monthTick } from '@/hooks/finanzas/executiveDates'
import type { MonthlyFinancialRow } from '@/hooks/finanzas/executiveService'
import {
  ChartCard,
  ChartEmpty,
  ChartSkeleton,
  SwatchLegend,
} from './ChartCard'
import { useExecutiveFmt } from './ExecutiveFmtContext'

interface Props {
  data: MonthlyFinancialRow[]
  loading?: boolean
}

export function ProfitChart({ data, loading }: Props) {
  const { fmt, fmtCompact, colors } = useExecutiveFmt()
  const chartData = data.map((row) => {
    const utilidad = row.revenue - row.expenses - row.ads_spend
    return {
      label: monthTick(row.month),
      ingresos: row.revenue,
      gastos: row.expenses,
      ads: row.ads_spend,
      utilidad,
    }
  })
  const hasMovement = chartData.some(
    (r) => r.ingresos !== 0 || r.gastos !== 0 || r.ads !== 0
  )

  return (
    <ChartCard
      title="Utilidad por mes"
      subtitle="Ingresos menos gastos operativos y ads"
      legend={
        <SwatchLegend
          items={[
            { color: colors.primary, label: 'Ingresos' },
            { color: colors.zinc, label: 'Gastos' },
            { color: colors.ads, label: 'Ads' },
            { color: colors.gold, label: 'Utilidad neta' },
          ]}
        />
      }
    >
      {loading ? (
        <ChartSkeleton height={260} />
      ) : !hasMovement ? (
        <ChartEmpty message="Aún no hay movimiento en este rango." />
      ) : (
        <div className="h-[260px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-zinc-200 dark:stroke-zinc-700"
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'currentColor' }}
                className="text-zinc-500"
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                domain={[0, 'auto']}
                tickFormatter={fmtCompact}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                width={52}
                className="text-zinc-500"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const row = payload[0]?.payload as (typeof chartData)[number] | undefined
                  if (!row) return null
                  return (
                    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                      <p className="mb-1 font-medium text-zinc-800 dark:text-zinc-100">
                        {row.label}
                      </p>
                      <p>Ingresos: {fmt(row.ingresos)}</p>
                      <p>Gastos: {fmt(row.gastos)}</p>
                      <p>Ads: {fmt(row.ads)}</p>
                      <p className="mt-1 font-semibold">Utilidad: {fmt(row.utilidad)}</p>
                    </div>
                  )
                }}
              />
              <Bar
                yAxisId="left"
                dataKey="ingresos"
                name="Ingresos"
                fill={colors.primary}
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                yAxisId="left"
                dataKey="gastos"
                name="Gastos"
                fill={colors.zinc}
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
              />
              <Bar
                yAxisId="left"
                dataKey="ads"
                name="Ads"
                fill={colors.ads}
                radius={[3, 3, 0, 0]}
                maxBarSize={18}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="utilidad"
                name="Utilidad"
                stroke={colors.gold}
                strokeWidth={2.5}
                dot={{ r: 3, fill: colors.gold }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
