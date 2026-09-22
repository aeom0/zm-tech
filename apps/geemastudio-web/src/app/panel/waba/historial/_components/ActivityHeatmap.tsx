'use client'

import { useMemo, useState } from 'react'
import type { HeatmapCell } from '../_hooks/useWabaHistorial'

const DIAS_CORTO = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

interface ActivityHeatmapProps {
  celdas: HeatmapCell[]
  totalEntrantesPeriodo: number
}

export function ActivityHeatmap({ celdas, totalEntrantesPeriodo }: ActivityHeatmapProps) {
  const [hover, setHover] = useState<{
    dia: number
    hora: number
    count: number
  } | null>(null)

  const { max, matriz } = useMemo(() => {
    const m = new Map<string, number>()
    let maxC = 0
    for (const c of celdas) {
      m.set(`${c.diaSemana}-${c.hora}`, c.count)
      if (c.count > maxC) maxC = c.count
    }
    return { max: maxC, matriz: m }
  }, [celdas])

  if (totalEntrantesPeriodo < 50) {
    return null
  }

  const horasEtiqueta = [0, 3, 6, 9, 12, 15, 18, 21]

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">
        Actividad por hora (mensajes entrantes)
      </h3>
      <p className="mb-3 text-xs text-zinc-400">
        Zona horaria Lima. Celda más oscura = más mensajes en esa franja.
      </p>

      <div className="overflow-x-auto">
        <div
          className="inline-grid min-w-[280px] gap-px rounded-xl bg-white/[0.06] p-1"
          style={{
            gridTemplateColumns: `44px repeat(7, minmax(0, 1fr))`,
            gridTemplateRows: `auto repeat(24, minmax(0, 10px))`,
          }}
        >
          <div />
          {DIAS_CORTO.map((d) => (
            <div
              key={d}
              className="py-1 text-center text-[10px] font-semibold text-zinc-400"
            >
              {d}
            </div>
          ))}

          {Array.from({ length: 24 }, (_, hora) => (
            <div key={hora} className="contents">
              <div className="flex items-center justify-end pr-1 text-[9px] tabular-nums text-zinc-500">
                {horasEtiqueta.includes(hora) ? `${hora}h` : ''}
              </div>
              {DIAS_CORTO.map((_, dia) => {
                const count = matriz.get(`${dia}-${hora}`) ?? 0
                const opacity = max > 0 ? Math.max(0.08, count / max) : 0.08
                return (
                  <div
                    key={`${dia}-${hora}`}
                    className="rounded-[1px] bg-[#25D366]"
                    style={{ opacity }}
                    title={`${DIAS_CORTO[dia]} ${hora}h — ${count} mensajes`}
                    onMouseEnter={() => setHover({ dia, hora, count })}
                    onMouseLeave={() => setHover(null)}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {hover && (
        <p className="mt-3 text-xs tabular-nums text-zinc-300">
          {DIAS_CORTO[hover.dia]} {hover.hora}h — {hover.count.toLocaleString('es-PE')} mensajes
        </p>
      )}
    </div>
  )
}
