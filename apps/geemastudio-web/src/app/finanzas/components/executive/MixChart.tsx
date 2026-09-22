'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { KIND_LABEL, type MixSlice } from '@/hooks/finanzas/useExecutiveDashboard'
import { ChartCard, ChartEmpty } from './ChartCard'
import { useExecutiveFmt } from './ExecutiveFmtContext'

interface Props {
  data: MixSlice[]
  loading?: boolean
}

export function MixChart({ data, loading }: Props) {
  const { fmt, kindColor } = useExecutiveFmt()
  const total = data.reduce((sum, row) => sum + row.revenue, 0)

  return (
    <ChartCard
      title="Ingresos por tipo"
      subtitle="Servicios, packs y promos en citas completed"
    >
      {loading ? (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div
            className="h-[200px] w-[200px] max-w-full shrink-0 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800"
            aria-hidden
          />
          <div className="w-full space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-9 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800"
                aria-hidden
              />
            ))}
          </div>
        </div>
      ) : total <= 0 ? (
        <ChartEmpty message="Sin ventas completed en este rango." />
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="h-[200px] w-full shrink-0 sm:w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="revenue"
                  nameKey="label"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((slice) => (
                    <Cell key={slice.kind} fill={kindColor[slice.kind]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null
                    const slice = payload[0]?.payload as MixSlice | undefined
                    if (!slice) return null
                    const pct =
                      total > 0 ? Math.round((slice.revenue / total) * 1000) / 10 : 0
                    return (
                      <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
                        <p className="font-medium">{slice.label}</p>
                        <p>
                          {fmt(slice.revenue)} · {pct}%
                        </p>
                        <p>{slice.count} vendidos</p>
                      </div>
                    )
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="min-w-0 w-full space-y-2">
            {data.map((slice) => {
              const pct = total > 0 ? Math.round((slice.revenue / total) * 1000) / 10 : 0
              return (
                <li key={slice.kind} className="min-w-0">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-sm"
                        style={{ backgroundColor: kindColor[slice.kind] }}
                        aria-hidden
                      />
                      <span className="truncate text-zinc-800 dark:text-zinc-200">
                        {KIND_LABEL[slice.kind]}
                      </span>
                    </span>
                    <span className="shrink-0 tabular-nums text-zinc-600 dark:text-zinc-400">
                      {pct}%
                    </span>
                  </div>
                  <p className="ml-[18px] text-xs tabular-nums text-zinc-500">
                    {fmt(slice.revenue)} · {slice.count}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </ChartCard>
  )
}
