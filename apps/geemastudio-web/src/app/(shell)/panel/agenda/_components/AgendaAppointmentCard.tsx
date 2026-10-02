'use client'

import {
  formatoHoraInstanteEnZona,
  instanteCitaDesdeTexto,
  minutosDelDiaEnZona,
  type TimeFormatPreference,
} from '@zmtech/tenant-config'

import { PX_PER_HOUR, STATUS_LABEL, type AgendaAppointment } from '@/hooks/agenda/types'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'

/** Fondo degradado por profesional, igual que `OwnerDayGrid` de mobile. */
export function agendaCardGradient(color: string): string {
  return `linear-gradient(135deg, color-mix(in srgb, ${color} 72%, #18181b), color-mix(in srgb, ${color} 28%, #18181b))`
}

interface AgendaAppointmentCardProps {
  apt: AgendaAppointment
  timezone: string
  timeFormat: TimeFormatPreference
  language: 'es' | 'es-VE' | 'es-PE' | 'es-CO' | 'es-AR' | 'es-CL' | 'es-MX' | 'pt-BR'
  serviceName: string
  currencyCode: string
  color: string
  hourStart: number
  onClick: () => void
}

export function AgendaAppointmentCard({
  apt,
  timezone,
  timeFormat,
  language,
  serviceName,
  currencyCode,
  color,
  hourStart,
  onClick,
}: AgendaAppointmentCardProps) {
  const start = instanteCitaDesdeTexto(apt.date, timezone)
  const topMin = minutosDelDiaEnZona(start, timezone) - hourStart * 60
  const height = Math.max((apt.duration / 60) * PX_PER_HOUR, 28)
  const top = (topMin / 60) * PX_PER_HOUR
  const hora = formatoHoraInstanteEnZona(start, timezone, language, timeFormat)
  const extra =
    Array.isArray(apt.service_ids) && apt.service_ids.length > 1
      ? ` +${apt.service_ids.length - 1}`
      : ''

  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute left-1 right-1 z-10 overflow-hidden rounded-lg px-2 py-1 text-left transition hover:brightness-110"
      style={{
        top,
        height,
        background: agendaCardGradient(color),
        boxShadow: `0 3px 6px color-mix(in srgb, ${color} 30%, transparent)`,
      }}
      title={`${apt.client_name} · ${hora}`}
    >
      <div className="truncate text-[11px] font-semibold text-white">
        {hora} · {apt.client_name}
      </div>
      <div className="truncate text-[10px] text-white/70">
        {serviceName}
        {extra}
      </div>
      {height >= 48 && (
        <div className="mt-0.5 truncate text-[10px] text-white/60">
          {STATUS_LABEL[apt.status] ?? apt.status} ·{' '}
          {formatDashboardCurrency(parseFloat(apt.price || '0'), currencyCode)}
        </div>
      )}
    </button>
  )
}
