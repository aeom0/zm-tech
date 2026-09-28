'use client'

import { MessageCircle, Send, Sparkles, Users } from 'lucide-react'

interface SummaryStatsStripProps {
  mensajesRecibidos: number
  clientesUnicos: number
  respuestasBot: number
  respuestasIa: number
  cargando?: boolean
}

export function SummaryStatsStrip({
  mensajesRecibidos,
  clientesUnicos,
  respuestasBot,
  respuestasIa,
  cargando,
}: SummaryStatsStripProps) {
  const items = [
    {
      icon: MessageCircle,
      label: 'Mensajes recibidos',
      value: mensajesRecibidos,
      hint: 'En el período seleccionado',
    },
    {
      icon: Users,
      label: 'Clientes únicos',
      value: clientesUnicos,
      hint: 'Que escribieron al bot',
    },
    {
      icon: Send,
      label: 'Respuestas del bot',
      value: respuestasBot,
      hint: 'Mensajes enviados al cliente',
    },
    {
      icon: Sparkles,
      label: 'Respondidos por IA',
      value: respuestasIa,
      hint: 'Turnos con respuesta del asistente',
    },
  ] as const

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1 snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 sm:overflow-visible">
      {items.map((it) => {
        const Icon = it.icon
        return (
          <div
            key={it.label}
            className="snap-start min-w-[200px] sm:min-w-0 shrink-0 sm:shrink rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--tenant-primary)]/10">
                <Icon className="h-4 w-4 text-[var(--tenant-primary)]" />
              </div>
              <span className="text-xs font-medium leading-tight text-zinc-400">{it.label}</span>
            </div>
            {cargando ? (
              <div className="h-8 w-16 animate-pulse rounded bg-white/[0.06]" />
            ) : (
              <p className="text-2xl font-bold tabular-nums text-white">
                {it.value.toLocaleString('es-PE')}
              </p>
            )}
            <p className="mt-1 text-[11px] text-zinc-500">{it.hint}</p>
          </div>
        )
      })}
    </div>
  )
}
