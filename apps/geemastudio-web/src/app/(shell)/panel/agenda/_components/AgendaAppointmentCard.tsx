'use client'

import {
  formatoHoraInstanteEnZona,
  instanteCitaDesdeTexto,
  minutosDelDiaEnZona,
  type TimeFormatPreference,
} from '@zmtech/tenant-config'

import { PX_PER_HOUR, type AgendaAppointment } from '@/hooks/agenda/types'

/** Fondo degradado por profesional, igual que `OwnerDayGrid` de mobile. */
export function agendaCardGradient(color: string): string {
  return `linear-gradient(135deg, color-mix(in srgb, ${color} 72%, #18181b), color-mix(in srgb, ${color} 28%, #18181b))`
}

const H_MARGIN = 3
const LANE_GAP = 3

interface AgendaAppointmentCardProps {
  apt: AgendaAppointment
  timezone: string
  timeFormat: TimeFormatPreference
  language: 'es' | 'es-VE' | 'es-PE' | 'es-CO' | 'es-AR' | 'es-CL' | 'es-MX' | 'pt-BR'
  serviceName: string
  color: string
  /** Minuto del día donde empieza la grilla (incluye el borde visual). */
  gridStartMin: number
  /** Carril dentro de un cluster de citas solapadas de la misma columna. */
  lane: number
  laneCount: number
  onClick: () => void
}

/** Tarjeta de cita en la grilla de día, con la misma jerarquía de texto que mobile. */
export function AgendaAppointmentCard({
  apt,
  timezone,
  timeFormat,
  language,
  serviceName,
  color,
  gridStartMin,
  lane,
  laneCount,
  onClick,
}: AgendaAppointmentCardProps) {
  const start = instanteCitaDesdeTexto(apt.date, timezone)
  const startMin = minutosDelDiaEnZona(start, timezone)
  const top = Math.max(0, ((startMin - gridStartMin) / 60) * PX_PER_HOUR)
  const height = Math.max((apt.duration / 60) * PX_PER_HOUR, 28)
  const hora = formatoHoraInstanteEnZona(start, timezone, language, timeFormat)
  const serviceCount =
    Array.isArray(apt.service_ids) && apt.service_ids.length > 0 ? apt.service_ids.length : 1
  const narrow = laneCount > 1

  // Con carriles, cada cita ocupa su fracción del ancho en vez de taparse entre sí.
  const gaps = H_MARGIN * 2 + LANE_GAP * (laneCount - 1)
  const laneWidth = `calc((100% - ${gaps}px) / ${laneCount})`
  const left = `calc(${H_MARGIN}px + ${lane} * (${laneWidth} + ${LANE_GAP}px))`

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'absolute z-10 overflow-hidden rounded-[10px] text-left text-white transition hover:brightness-110',
        narrow ? 'p-1' : 'p-2',
      ].join(' ')}
      style={{
        top,
        height,
        left,
        width: laneWidth,
        background: agendaCardGradient(color),
        boxShadow: `0 3px 6px color-mix(in srgb, ${color} 30%, transparent)`,
      }}
      title={`${apt.client_name} · ${hora} · ${serviceName}`}
    >
      <div
        className={[
          'font-bold leading-tight',
          narrow ? 'truncate text-[10px]' : 'line-clamp-2 text-[11px]',
          serviceCount > 1 ? 'pr-4' : '',
        ].join(' ')}
      >
        {serviceName || apt.client_name}
      </div>
      {serviceCount > 1 && (
        <span className="absolute right-1 top-0 text-[9px] font-extrabold text-white/70">
          ×{serviceCount}
        </span>
      )}
      {!!serviceName && (
        <div
          className={['mt-0.5 truncate text-white/70', narrow ? 'text-[9px]' : 'text-[10px]'].join(
            ' '
          )}
        >
          {apt.client_name}
        </div>
      )}
      <div
        className={['mt-0.5 truncate text-white/70', narrow ? 'text-[8px]' : 'text-[9px]'].join(
          ' '
        )}
      >
        {hora}
      </div>
    </button>
  )
}
