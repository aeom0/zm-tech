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
    <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-[#1A1A1A] p-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-white/60">
            <Wallet className="h-4 w-4 text-emerald-400" />
            Ingresos del período
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-white sm:text-3xl">
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
      <p className="text-sm text-white/50">
        Promedio por cita con pago:{' '}
        <span className="tabular-nums text-white/80">
          {formatDashboardCurrency(avgPerAppointment, currencyCode)}
        </span>
      </p>
    </div>
  )
}
