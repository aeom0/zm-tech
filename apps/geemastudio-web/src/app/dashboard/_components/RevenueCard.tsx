'use client'

import { TrendingDown, TrendingUp, Wallet } from 'lucide-react'

import { formatDashboardCurrency } from '@/lib/dashboardCurrency'

import { MetricSkeleton } from './MetricSkeleton'

interface RevenueCardProps {
  totalRevenue: number
  avgPerAppointment: number
  prevPeriodRevenue: number
  currencyCode: string
  isLoading: boolean
}

export function RevenueCard({
  totalRevenue,
  avgPerAppointment,
  prevPeriodRevenue,
  currencyCode,
  isLoading,
}: RevenueCardProps) {
  if (isLoading) {
    return <MetricSkeleton variant="card" />
  }

  const delta =
    prevPeriodRevenue > 0
      ? ((totalRevenue - prevPeriodRevenue) / prevPeriodRevenue) * 100
      : totalRevenue > 0
        ? 100
        : 0
  const up = delta >= 0

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
            <Wallet className="h-4 w-4 text-emerald-400" />
            Ingresos del período
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100 sm:text-3xl">
            {formatDashboardCurrency(totalRevenue, currencyCode)}
          </p>
        </div>
        {prevPeriodRevenue !== 0 || totalRevenue !== 0 ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              up ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
            }`}
          >
            {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            {`${up ? '+' : ''}${delta.toFixed(0)}%`}
          </span>
        ) : null}
      </div>
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        Ticket promedio:{' '}
        <span className="tabular-nums text-zinc-800 dark:text-zinc-200">
          {avgPerAppointment > 0
            ? formatDashboardCurrency(avgPerAppointment, currencyCode)
            : '—'}
        </span>
        <span className="block text-xs text-zinc-400">Por cita completada del período</span>
      </p>
    </div>
  )
}
