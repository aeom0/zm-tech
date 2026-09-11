'use client'

import {
  formatoHoraInstanteEnZona,
  instanteCitaDesdeTexto,
  minutosDelDiaEnZona,
  type TimeFormatPreference,
} from '@zmtech/tenant-config'

import { PX_PER_HOUR, STATUS_LABEL, type AgendaAppointment } from '@/hooks/agenda/types'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'

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
      className="absolute left-1 right-1 z-10 overflow-hidden rounded-lg border border-white/10 bg-zinc-900/95 px-2 py-1 text-left shadow-sm transition hover:border-white/25"
      style={{
        top,
        height,
        borderLeftWidth: 3,
        borderLeftColor: color,
      }}
      title={`${apt.client_name} · ${hora}`}
    >
      <div className="truncate text-[11px] font-semibold text-white">
        {hora} · {apt.client_name}
      </div>
      <div className="truncate text-[10px] text-zinc-400">
        {serviceName}
        {extra}
      </div>
      {height >= 48 && (
        <div className="mt-0.5 truncate text-[10px] text-zinc-500">
          {STATUS_LABEL[apt.status] ?? apt.status} ·{' '}
          {formatDashboardCurrency(parseFloat(apt.price || '0'), currencyCode)}
        </div>
      )}
    </button>
  )
}
