'use client'

import { AlertCircle, Target } from 'lucide-react'
import type { BreakEven } from '@/hooks/finanzas/useExecutiveDashboard'
import { ChartCard } from './ChartCard'
import { useExecutiveFmt } from './ExecutiveFmtContext'

interface Props {
  data: BreakEven
  loading?: boolean
}

export function BreakEvenCard({ data, loading }: Props) {
  const { fmt } = useExecutiveFmt()
  const progreso =
    data.citasNecesarias && data.citasNecesarias > 0
      ? Math.min(100, (data.citas / data.citasNecesarias) * 100)
      : data.costos <= 0 && data.ingresos > 0
        ? 100
        : 0
  const cubierto = data.faltan === 0 || (data.costos <= 0 && data.ingresos > 0)

  return (
    <ChartCard
      title="Punto de equilibrio"
      subtitle="Citas completed del mes vs costos (gastos + ads)"
    >
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="h-[72px] animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800"
                aria-hidden
              />
            ))}
          </div>
          <div className="space-y-1.5">
            <div className="h-3 w-32 animate-pulse rounded bg-zinc-100 dark:bg-zinc-800" />
            <div className="h-2.5 animate-pulse rounded-full bg-zinc-100 dark:bg-zinc-800" />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!data.gastosCargados ? (
            <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 dark:border-amber-900/50 dark:bg-amber-950/30">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Completa los gastos del mes en la app móvil (Finanzas → Resumen) para ver el
                equilibrio real. Ads sí entran si el sync ya corrió.
              </p>
            </div>
          ) : null}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="Costos del mes" value={fmt(data.costos)} />
            <Metric
              label="Ticket promedio"
              value={data.ticket == null ? '—' : fmt(data.ticket)}
              hint={data.citas === 0 ? 'Sin citas completed' : `${data.citas} citas`}
            />
            <Metric
              label="Citas para equilibrar"
              value={data.citasNecesarias == null ? '—' : String(data.citasNecesarias)}
            />
            <Metric
              label={cubierto ? 'Estado' : 'Faltan'}
              value={cubierto ? 'Cubierto' : data.faltan == null ? '—' : String(data.faltan)}
              hint={`${data.diasRestantes} día${data.diasRestantes === 1 ? '' : 's'} restantes`}
              emphasize={cubierto}
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5" aria-hidden />
                Progreso del mes
              </span>
              <span className="tabular-nums">
                {data.citas}
                {data.citasNecesarias != null ? ` / ${data.citasNecesarias}` : ''}
              </span>
            </div>
            <div
              className="h-2.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
              role="progressbar"
              aria-valuenow={Math.round(progreso)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progreso hacia el punto de equilibrio"
            >
              <div
                className={`h-full rounded-full transition-[width] duration-300 ${
                  cubierto ? 'bg-emerald-500' : 'bg-[var(--primary)]'
                }`}
                style={{ width: `${progreso}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </ChartCard>
  )
}

function Metric({
  label,
  value,
  hint,
  emphasize,
}: {
  label: string
  value: string
  hint?: string
  emphasize?: boolean
}) {
  return (
    <div className="min-w-0 rounded-xl bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/60">
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{label}</p>
      <p
        className={`mt-0.5 text-base font-semibold tabular-nums ${
          emphasize
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-zinc-900 dark:text-zinc-100'
        }`}
      >
        {value}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-zinc-400">{hint}</p> : null}
    </div>
  )
}
