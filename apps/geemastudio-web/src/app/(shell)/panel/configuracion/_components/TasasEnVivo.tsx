'use client'

import type { TasasDuales } from '@zmtech/tasas'
import { formatearBs } from '@zmtech/tasas'

function Fila({ label, tasa }: { label: string; tasa: TasasDuales['bcv'] | undefined }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <div>
        <div className="font-medium text-fg-soft">{label}</div>
        <div className="text-[11px] text-fg-subtle">
          {tasa?.disponible ? `${tasa.fecha} · ${tasa.fuente}` : 'Sin datos'}
        </div>
      </div>
      <div className="font-semibold text-fg">{tasa?.disponible ? formatearBs(tasa.valor) : '—'}</div>
    </div>
  )
}

/** Tasas BCV (oficial) y USDT (paralelo) del día, con la diferencia entre ambas. */
export function TasasEnVivo({ tasas, loading }: { tasas: TasasDuales | null; loading: boolean }) {
  if (loading && !tasas) return <div className="text-xs text-fg-subtle">Cargando tasas…</div>
  return (
    <div className="space-y-2 rounded-lg bg-fg/[0.04] p-3">
      <Fila label="BCV (oficial)" tasa={tasas?.bcv} />
      <Fila label="USDT (paralelo)" tasa={tasas?.usdt} />
      {tasas?.bcv.disponible && tasas.usdt.disponible && (
        <div className="text-[11px] text-fg-subtle">
          Diferencia: {formatearBs(tasas.spread.absoluto)} ({tasas.spread.porcentaje.toFixed(1)} %)
        </div>
      )}
    </div>
  )
}
