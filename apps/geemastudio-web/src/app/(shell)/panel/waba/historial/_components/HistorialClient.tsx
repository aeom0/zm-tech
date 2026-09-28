'use client'

import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import {
  useWabaHistorial,
  WABA_HISTORIAL_MSG_CAP,
  type HistorialPeriod,
} from '../_hooks/useWabaHistorial'
import { SummaryStatsStrip } from './SummaryStatsStrip'
import { VolumeChart } from './VolumeChart'
import { HaikuUsageCard } from './HaikuUsageCard'
import { TopFlowsCard } from './TopFlowsCard'
import { ActivityHeatmap } from './ActivityHeatmap'

const PERIODOS: { id: HistorialPeriod; label: string }[] = [
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: '90d', label: '90 días' },
]

export function HistorialClient() {
  const [period, setPeriod] = useState<HistorialPeriod>('7d')
  const { volumeQuery, haikuQuery, flowsQuery } = useWabaHistorial(period)

  const cargandoVolumen = volumeQuery.isLoading
  const errorVolumen = volumeQuery.error

  const vol = volumeQuery.data
  const resumen = vol?.resumen
  const series = vol?.series ?? []
  const heatmap = vol?.heatmap ?? []
  const mensajesEntrantes = vol?.mensajesEntrantes ?? 0

  const tituloGrafico = period === '90d' ? 'Volumen por semana' : 'Volumen por día'

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs text-zinc-500">WhatsApp</div>
          <h1 className="text-2xl font-bold text-white">Actividad del bot</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Resumen de conversaciones de WhatsApp y del asistente, sin abrir chat por chat.
          </p>
        </div>

        <div className="flex shrink-0 overflow-x-auto rounded-xl border border-white/[0.08]">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={[
                'min-h-[40px] whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors',
                period === p.id
                  ? 'bg-[var(--tenant-primary)] text-white'
                  : 'text-zinc-400 hover:bg-white/[0.06]',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {errorVolumen && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            No se pudieron cargar los mensajes. Revisa tu sesión o intenta más tarde.
          </span>
        </div>
      )}

      <SummaryStatsStrip
        mensajesRecibidos={resumen?.mensajesRecibidos ?? 0}
        clientesUnicos={resumen?.clientesUnicos ?? 0}
        respuestasBot={resumen?.respuestasBot ?? 0}
        respuestasIa={haikuQuery.data?.llamadas ?? 0}
        cargando={cargandoVolumen || haikuQuery.isLoading}
      />

      <VolumeChart titulo={tituloGrafico} data={series} cargando={cargandoVolumen} />

      <div className="grid grid-cols-1 items-stretch gap-4 md:grid-cols-2">
        <HaikuUsageCard
          haiku={haikuQuery.data}
          totalMensajesRecibidos={resumen?.mensajesRecibidos ?? 0}
          cargando={haikuQuery.isLoading}
        />
        <TopFlowsCard flujos={flowsQuery.data ?? []} cargando={flowsQuery.isLoading} />
      </div>

      <ActivityHeatmap celdas={heatmap} totalEntrantesPeriodo={mensajesEntrantes} />

      {vol && vol.totalMuestra >= WABA_HISTORIAL_MSG_CAP && (
        <p className="text-center text-xs text-amber-400">
          Nota: solo se analizan hasta {WABA_HISTORIAL_MSG_CAP.toLocaleString('es-PE')} mensajes
          por consulta para mantener el panel ágil; el período puede estar truncado.
        </p>
      )}
    </div>
  )
}
