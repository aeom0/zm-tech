'use client'

import { KIND_LABEL, type SoldKind } from '@/hooks/finanzas/useExecutiveDashboard'
import type { SoldItemRow } from '@/hooks/finanzas/executiveService'
import { ChartCard, ChartEmpty, ChartSkeleton } from './ChartCard'
import { useExecutiveFmt } from './ExecutiveFmtContext'

interface Props {
  data: SoldItemRow[]
  loading?: boolean
}

function KindBadge({ kind }: { kind: SoldKind }) {
  const { kindColor } = useExecutiveFmt()
  return (
    <span
      className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
      style={{
        color: kindColor[kind],
        backgroundColor: `${kindColor[kind]}18`,
      }}
    >
      {KIND_LABEL[kind]}
    </span>
  )
}

export function RankingList({ data, loading }: Props) {
  const { fmt, kindColor } = useExecutiveFmt()
  const max = Math.max(1, ...data.map((row) => row.revenue))

  return (
    <ChartCard title="Más vendidos" subtitle="Por ingreso en citas completed del rango">
      {loading ? (
        <ChartSkeleton height={320} />
      ) : data.length === 0 ? (
        <ChartEmpty message="Sin ranking para este rango." />
      ) : (
        <ol className="space-y-2.5">
          {data.map((row, index) => {
            const width = Math.max(4, (row.revenue / max) * 100)
            return (
              <li key={`${row.kind}-${row.item_id}`} className="min-w-0">
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="w-4 shrink-0 text-xs tabular-nums text-zinc-400">
                      {index + 1}
                    </span>
                    <KindBadge kind={row.kind} />
                    <span className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {row.item_name}
                    </span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-200">
                    {fmt(row.revenue)}
                  </span>
                </div>
                <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${width}%`,
                      backgroundColor: kindColor[row.kind],
                    }}
                  />
                </div>
                <p className="mt-0.5 ml-6 text-[11px] tabular-nums text-zinc-500">
                  {row.sold_count} {row.sold_count === 1 ? 'venta' : 'ventas'}
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </ChartCard>
  )
}
