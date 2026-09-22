'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { monthTick } from '@/hooks/finanzas/executiveDates'
import type { ClientGrowthRow } from '@/hooks/finanzas/executiveService'
import {
  ChartCard,
  ChartEmpty,
  ChartSkeleton,
  SwatchLegend,
} from './ChartCard'
import { useExecutiveFmt } from './ExecutiveFmtContext'

interface Props {
  data: ClientGrowthRow[]
  loading?: boolean
}

export function ClientGrowthChart({ data, loading }: Props) {
  const { colors } = useExecutiveFmt()
  const chartData = data.map((row) => ({
    label: monthTick(row.month_start),
    nuevas: row.nuevas,
    recurrentes: row.recurrentes,
    citas: row.citas,
  }))
  const hasMovement = chartData.some(
    (r) => r.nuevas > 0 || r.recurrentes > 0 || r.citas > 0
  )

  return (
    <ChartCard
      title="Crecimiento de clientes"
      subtitle="Primera cita completed = nueva; el resto, recurrente"
      legend={
        <SwatchLegend
          items={[
            { color: colors.primary, label: 'Nuevas' },
            { color: colors.gold, label: 'Recurrentes' },
          ]}
        />
      }
    >
      {loading ? (
        <ChartSkeleton height={260} />
      ) : !hasMovement ? (
        <ChartEmpty message="Sin citas completed en este rango." />
      ) : (
        <div className="h-[260px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
                allowDecimals={false}
                tick={{ fontSize: 11, fill: 'currentColor' }}
                width={32}
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
                      <p>Nuevas: {row.nuevas}</p>
                      <p>Recurrentes: {row.recurrentes}</p>
                      <p>Citas: {row.citas}</p>
                    </div>
                  )
                }}
              />
              <Bar
                dataKey="nuevas"
                name="Nuevas"
                stackId="clientes"
                fill={colors.primary}
                radius={[0, 0, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="recurrentes"
                name="Recurrentes"
                stackId="clientes"
                fill={colors.gold}
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </ChartCard>
  )
}
