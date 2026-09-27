'use client'

import { CalendarRange } from 'lucide-react'

import type { AppointmentsByStatus } from '@/hooks/dashboard/useDashboardAppointments'

import { MetricSkeleton } from './MetricSkeleton'

const STATUS_META: {
  key: keyof Pick<AppointmentsByStatus, 'completed' | 'pending' | 'cancelled'>
  label: string
  color: string
}[] = [
  { key: 'completed', label: 'Completadas', color: '#22c55e' },
  { key: 'pending', label: 'Pendientes', color: '#eab308' },
  { key: 'cancelled', label: 'Canceladas', color: '#ef4444' },
]

interface AppointmentsStatusCardProps {
  data: AppointmentsByStatus | undefined
  isLoading: boolean
}

export function AppointmentsStatusCard({ data, isLoading }: AppointmentsStatusCardProps) {
  if (isLoading) {
    return <MetricSkeleton variant="card" />
  }

  const grouped = data ?? {
    completed: 0,
    pending: 0,
    cancelled: 0,
    other: 0,
    total: 0,
  }

  const totalMain = STATUS_META.reduce((s, m) => s + grouped[m.key], 0) + grouped.other

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        <CalendarRange className="h-4 w-4 text-sky-400" />
        Citas por estado
      </div>
      <p className="text-xs text-zinc-400">
        {totalMain} con fecha en el período. Cada cita está en un solo estado.
      </p>
      <div className="space-y-3">
        {STATUS_META.map(({ key, label, color }) => {
          const n = grouped[key]
          const pct = totalMain > 0 ? Math.round((n / totalMain) * 100) : 0
          return (
            <div key={key}>
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
                <span className="tabular-nums text-zinc-800 dark:text-zinc-200">
                  {n} ({pct}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          )
        })}
        {grouped.other > 0 ? (
          <div>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-zinc-500 dark:text-zinc-400">Otras</span>
              <span className="tabular-nums text-zinc-800 dark:text-zinc-200">{grouped.other}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div
                className="h-full rounded-full bg-white/30 transition-all"
                style={{
                  width: `${totalMain > 0 ? Math.round((grouped.other / totalMain) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
