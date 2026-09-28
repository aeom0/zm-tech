'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { VolumeDatum } from '../_hooks/useWabaHistorial'

const COLOR_RECIBIDO = '#25D366'
const COLOR_ENVIADO = '#71717a'

interface VolumeChartProps {
  titulo: string
  data: VolumeDatum[]
  cargando?: boolean
}

export function VolumeChart({ titulo, data, cargando }: VolumeChartProps) {
  if (cargando) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <div className="text-sm text-zinc-500">Cargando gráfico…</div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <p className="px-4 text-center text-sm text-zinc-400">
          No hay mensajes registrados en este período (o el límite de muestra se alcanzó).
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
      <h3 className="mb-3 text-sm font-semibold text-white">{titulo}</h3>
      <div className="h-[240px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#a1a1aa' }}
              interval="preserveStartEnd"
            />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} width={32} />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null
                const rec = payload.find((p) => p.dataKey === 'recibidos')?.value ?? 0
                const env = payload.find((p) => p.dataKey === 'enviados')?.value ?? 0
                return (
                  <div className="rounded-lg border border-white/[0.12] bg-zinc-900 px-3 py-2 text-xs shadow-lg">
                    <p className="mb-1 font-medium text-zinc-100">
                      {String(payload[0]?.payload?.label ?? '')}
                    </p>
                    <p className="text-zinc-300">
                      Recibidos: {Number(rec).toLocaleString('es-PE')}
                    </p>
                    <p className="text-zinc-300">
                      Enviados: {Number(env).toLocaleString('es-PE')}
                    </p>
                  </div>
                )
              }}
            />
            <Bar dataKey="recibidos" name="Recibidos" fill={COLOR_RECIBIDO} radius={[4, 4, 0, 0]} />
            <Bar dataKey="enviados" name="Enviados" fill={COLOR_ENVIADO} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
