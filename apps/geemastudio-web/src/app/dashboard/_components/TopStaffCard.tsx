'use client'

import { Sparkles } from 'lucide-react'

import { formatDashboardCurrency } from '@/lib/dashboardCurrency'

import type { TopStaffEntry } from '@/hooks/dashboard/useDashboardTopStaff'

import { LUNARIS } from '@/lib/theme'

import { MetricSkeleton } from './MetricSkeleton'

interface TopStaffCardProps {
  items: TopStaffEntry[] | undefined
  currencyCode: string
  isLoading: boolean
}

export function TopStaffCard({ items, currencyCode, isLoading }: TopStaffCardProps) {
  if (isLoading) {
    return (
      <div className="space-y-3 rounded-xl border border-white/10 bg-[#1A1A1A] p-5">
        <MetricSkeleton variant="bar" />
        <MetricSkeleton variant="list-item" />
        <MetricSkeleton variant="list-item" />
        <MetricSkeleton variant="list-item" />
      </div>
    )
  }

  const list = items ?? []
  const max = list.reduce((m, x) => Math.max(m, x.revenue), 0) || 1

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-[#1A1A1A] p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-white/60">
        <Sparkles className="h-4 w-4 text-violet-400" />
        Top profesionales por ingresos
      </div>
      {list.length === 0 ? (
        <p className="py-2 text-sm text-white/45">
          No hay pagos vinculados a citas en este período.
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((row, i) => {
            const pct = Math.round((row.revenue / max) * 100)
            const dot =
              row.color && /^#?[0-9a-fA-F]{6}$/.test(row.color.replace('#', ''))
                ? row.color.startsWith('#')
                  ? row.color
                  : `#${row.color}`
                : LUNARIS.primaryMid
            return (
              <li key={row.employeeId} className="flex items-center gap-3">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: dot }}
                  title={row.name}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex justify-between gap-2 text-sm">
                    <span className="truncate text-white">{row.name}</span>
                    <span className="shrink-0 tabular-nums text-white/80">
                      {formatDashboardCurrency(row.revenue, currencyCode)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.07]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: dot,
                        opacity: 0.85,
                      }}
                    />
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
