'use client'

import { HelpCircle, Sparkles } from 'lucide-react'
import type { HaikuHistorial } from '../_hooks/useWabaHistorial'

interface HaikuUsageCardProps {
  haiku: HaikuHistorial | undefined
  totalMensajesRecibidos: number
  cargando?: boolean
}

export function HaikuUsageCard({ haiku, totalMensajesRecibidos, cargando }: HaikuUsageCardProps) {
  if (cargando) {
    return (
      <div className="h-full min-h-[180px] rounded-2xl border border-fg/[0.08] bg-fg/[0.03] p-5">
        <div className="mb-4 h-6 w-40 animate-pulse rounded bg-fg/[0.06]" />
        <div className="h-20 animate-pulse rounded bg-fg/[0.06]" />
      </div>
    )
  }

  const llamadas = haiku?.llamadas ?? 0
  const sinDatos = !haiku || haiku.sinTabla || llamadas === 0

  const pctBase =
    totalMensajesRecibidos > 0 ? Math.min(100, (llamadas / totalMensajesRecibidos) * 100) : 0

  const costoFmt =
    haiku && llamadas > 0
      ? haiku.costoEstimadoUSD.toLocaleString('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        })
      : null

  return (
    <div className="h-full rounded-2xl border border-fg/[0.08] bg-fg/[0.03] p-5">
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10">
          <Sparkles className="h-4 w-4 text-violet-700 dark:text-violet-400" />
        </div>
        <h3 className="text-sm font-semibold text-fg">Asistente inteligente</h3>
      </div>

      {sinDatos ? (
        <p className="text-sm text-fg-muted">Sin actividad del asistente en este período.</p>
      ) : (
        <>
          <p className="text-2xl font-bold tabular-nums text-fg">
            {llamadas.toLocaleString('es-PE')}{' '}
            <span className="text-sm font-normal text-fg-muted">
              conversaciones con respuesta automática
            </span>
          </p>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-fg-muted">
              <span>Parte de mensajes entrantes</span>
              <span className="tabular-nums">{pctBase.toFixed(0)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-fg/[0.06]">
              <div
                className="h-full rounded-full bg-violet-500/80 transition-all"
                style={{ width: `${pctBase}%` }}
              />
            </div>
          </div>

          {costoFmt != null && (
            <div className="mt-4 flex items-start gap-1.5">
              <p className="flex-1 text-xs text-fg-subtle">
                Costo estimado: <span className="font-medium text-fg-soft">{costoFmt}</span>
                <span className="mt-0.5 block">
                  Estimación referencial según precios públicos del proveedor del modelo.
                </span>
              </p>
              <span
                className="shrink-0 text-fg-subtle"
                title="Solo orientativo; el consumo real puede variar."
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}
