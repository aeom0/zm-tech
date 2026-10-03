'use client'

import { GitBranch } from 'lucide-react'
import type { FlowDatum } from '../_hooks/useWabaHistorial'

interface TopFlowsCardProps {
  flujos: FlowDatum[]
  cargando?: boolean
}

export function TopFlowsCard({ flujos, cargando }: TopFlowsCardProps) {
  const max = flujos.length ? Math.max(...flujos.map((f) => f.count)) : 0

  return (
    <div className="h-full rounded-2xl border border-fg/[0.08] bg-fg/[0.03] p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10">
          <GitBranch className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold text-fg">Flujos más frecuentes</h3>
      </div>

      {cargando ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded bg-fg/[0.06]" />
          ))}
        </div>
      ) : flujos.length === 0 ? (
        <p className="text-sm text-fg-muted">Sin datos de flujos en este período.</p>
      ) : (
        <ul className="space-y-3">
          {flujos.map((f) => {
            const w = max > 0 ? Math.round((f.count / max) * 100) : 0
            return (
              <li key={`${f.paso}-${f.count}`} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="min-w-0 truncate text-fg-soft">
                    {f.etiquetaFija ? (
                      f.etiqueta
                    ) : (
                      <span className="italic text-fg-muted">{f.etiqueta}</span>
                    )}
                  </span>
                  <span className="shrink-0 tabular-nums text-fg-muted">
                    {f.count.toLocaleString('es-PE')}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-fg/[0.06]">
                  <div
                    className="h-full rounded-full bg-[var(--chart-wa)]"
                    style={{ width: `${w}%` }}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
