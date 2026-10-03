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
    <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4">
      {items.map((it) => {
        const Icon = it.icon
        return (
          <div
            key={it.label}
            className="min-w-[200px] shrink-0 snap-start rounded-2xl border border-fg/[0.08] bg-fg/[0.03] p-4 sm:min-w-0 sm:shrink"
          >
            <div className="mb-2 flex items-center gap-2">
              <div className="bg-[var(--tenant-primary)]/10 flex h-8 w-8 items-center justify-center rounded-xl">
                <Icon className="h-4 w-4 text-tenant-text" />
              </div>
              <span className="text-xs font-medium leading-tight text-fg-muted">{it.label}</span>
            </div>
            {cargando ? (
              <div className="h-8 w-16 animate-pulse rounded bg-fg/[0.06]" />
            ) : (
              <p className="text-2xl font-bold tabular-nums text-fg">
                {it.value.toLocaleString('es-PE')}
              </p>
            )}
            <p className="mt-1 text-[11px] text-fg-subtle">{it.hint}</p>
          </div>
        )
      })}
    </div>
  )
}
