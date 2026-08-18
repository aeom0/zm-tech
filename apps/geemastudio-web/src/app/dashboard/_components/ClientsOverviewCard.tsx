'use client'

import { UserPlus, Users } from 'lucide-react'

import { MetricSkeleton } from './MetricSkeleton'

interface ClientsOverviewCardProps {
  newCount: number
  returningCount: number
  isLoading: boolean
}

export function ClientsOverviewCard({
  newCount,
  returningCount,
  isLoading,
}: ClientsOverviewCardProps) {
  if (isLoading) {
    return <MetricSkeleton variant="card" />
  }

  const total = newCount + returningCount
  const newPct = total > 0 ? Math.round((newCount / total) * 100) : 0
  const retPct = total > 0 ? 100 - newPct : 0

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-[#1A1A1A] p-5">
      <div className="flex items-center gap-2 text-sm font-medium text-white/60">
        <Users className="h-4 w-4 text-pink-400" />
        Clientes en el período
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs text-white/50">
            <UserPlus className="h-3.5 w-3.5" />
            Nuevos clientes
          </div>
          <p className="text-2xl font-semibold tabular-nums text-white">{newCount}</p>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs text-white/50">
            <Users className="h-3.5 w-3.5" />
            Recurrentes
          </div>
          <p className="text-2xl font-semibold tabular-nums text-white">{returningCount}</p>
        </div>
      </div>

      <div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <div
            className="h-full bg-emerald-500/90 transition-all"
            style={{ width: `${newPct}%` }}
            title={`Nuevos ${newPct}%`}
          />
          <div
            className="h-full bg-sky-500/90 transition-all"
            style={{ width: `${retPct}%` }}
            title={`Recurrentes ${retPct}%`}
          />
        </div>
        <p className="mt-2 text-xs text-white/45">
          Recurrente = cita completada en el período y alta antes del rango.
        </p>
      </div>
    </div>
  )
}
