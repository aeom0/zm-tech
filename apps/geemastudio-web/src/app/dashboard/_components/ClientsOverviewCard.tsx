'use client'

import { UserPlus, Users } from 'lucide-react'

import { MetricSkeleton } from './MetricSkeleton'

interface ClientsOverviewCardProps {
  newCount: number
  returningCount: number
  isLoading: boolean
  clientTerm?: string
}

function plural(termino: string, cantidad: number): string {
  const base = termino.trim().toLocaleLowerCase('es') || 'cliente'
  if (Math.abs(cantidad) === 1) return base
  return base.endsWith('s') ? base : `${base}s`
}

export function ClientsOverviewCard({
  newCount,
  returningCount,
  isLoading,
  clientTerm = 'cliente',
}: ClientsOverviewCardProps) {
  if (isLoading) {
    return <MetricSkeleton variant="card" />
  }

  const total = newCount + returningCount
  const newPct = total > 0 ? Math.round((newCount / total) * 100) : 0
  const retPct = total > 0 ? 100 - newPct : 0
  const gente = plural(clientTerm, 2)
  const una = plural(clientTerm, 1)
  const femenino = una.endsWith('a')
  const titulo = `${gente.charAt(0).toUpperCase()}${gente.slice(1)} con cita en el período`
  const etiquetaNuevas = femenino ? 'Nuevas' : 'Nuevos'

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-500 dark:text-zinc-400">
        <Users className="h-4 w-4 text-pink-400" />
        {titulo}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <UserPlus className="h-3.5 w-3.5" />
            {etiquetaNuevas}
          </div>
          <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{newCount}</p>
        </div>
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <Users className="h-3.5 w-3.5" />
            Recurrentes
          </div>
          <p className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{returningCount}</p>
        </div>
      </div>

      <div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
          <div
            className="h-full bg-emerald-500/90 transition-all"
            style={{ width: `${newPct}%` }}
            title={`${etiquetaNuevas} ${newPct}%`}
          />
          <div
            className="h-full bg-sky-500/90 transition-all"
            style={{ width: `${retPct}%` }}
            title={`Recurrentes ${retPct}%`}
          />
        </div>
        <p className="mt-2 text-xs text-zinc-400">
          {femenino ? 'Nueva' : 'Nuevo'} = primera cita completada. Recurrente ={' '}
          {femenino ? 'esa' : 'ese'} {una} ya había venido. No cuenta fichas creadas sin cita.
        </p>
      </div>
    </div>
  )
}
