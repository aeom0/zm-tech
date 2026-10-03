'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  calcularSemanaAgenda,
  esHoyEnZonaIANA,
  inicioDiaHoyEnZonaIANA,
  sumarDiasEnZonaIANA,
  sumarSemanasEnZonaIANA,
} from '@zmtech/tenant-config'

import { STATUS_CHIP, type AgendaStatusFilter } from '@/hooks/agenda/types'

export type AgendaView = 'day' | 'week'

interface AgendaToolbarProps {
  view: AgendaView
  onToggleView: () => void
  selectedDate: Date
  timezone: string
  statusFilter: AgendaStatusFilter
  onStatusChange: (f: AgendaStatusFilter) => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  count: number
}

export function AgendaToolbar({
  view,
  onToggleView,
  selectedDate,
  timezone,
  statusFilter,
  onStatusChange,
  onPrev,
  onNext,
  onToday,
  count,
}: AgendaToolbarProps) {
  const isWeek = view === 'week'
  let label: string
  let isToday: boolean
  if (isWeek) {
    const { weekDays } = calcularSemanaAgenda(selectedDate, timezone)
    const fmt = (d: Date, withYear: boolean) =>
      d.toLocaleDateString('es-419', {
        timeZone: timezone,
        day: 'numeric',
        month: 'short',
        ...(withYear ? { year: 'numeric' } : {}),
      })
    label = `${fmt(weekDays[0], false)} – ${fmt(weekDays[6], true)}`
    isToday = weekDays.some((d) => esHoyEnZonaIANA(d, timezone))
  } else {
    label = selectedDate.toLocaleDateString('es-419', {
      timeZone: timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    isToday = esHoyEnZonaIANA(selectedDate, timezone)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-fg/[0.08] bg-fg/[0.04] text-fg-soft hover:bg-fg/[0.08] md:h-9 md:w-9"
          aria-label={isWeek ? 'Semana anterior' : 'Día anterior'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onToggleView}
          className="min-w-0 flex-1 rounded-xl px-2 py-1 text-center transition-colors hover:bg-fg/[0.04]"
          aria-label={isWeek ? 'Volver a vista de día' : 'Ver semana completa'}
        >
          <div className="truncate text-sm font-semibold text-fg">{label}</div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-tenant-text">
            {isWeek ? 'Semana · clic para ver día' : 'Día · clic para ver semana'}
            <span className="ml-2 font-normal normal-case tracking-normal text-fg-subtle">
              {count} {count === 1 ? 'cita' : 'citas'}
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-fg/[0.08] bg-fg/[0.04] text-fg-soft hover:bg-fg/[0.08] md:h-9 md:w-9"
          aria-label={isWeek ? 'Semana siguiente' : 'Día siguiente'}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {!isToday && (
          <button
            type="button"
            onClick={onToday}
            className="border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/10 rounded-xl border px-3 py-1.5 text-xs font-semibold text-tenant-text"
          >
            Hoy
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {STATUS_CHIP.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onStatusChange(chip.id)}
            className={[
              'rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
              statusFilter === chip.id
                ? 'border-[var(--tenant-primary)]/40 bg-[var(--tenant-primary)]/15 text-tenant-text'
                : 'border-fg/[0.08] bg-card text-fg-soft hover:bg-fg/[0.04]',
            ].join(' ')}
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function goToday(timezone: string): Date {
  return inicioDiaHoyEnZonaIANA(timezone)
}

export function shiftDay(date: Date, delta: number, timezone: string): Date {
  return sumarDiasEnZonaIANA(date, delta, timezone)
}

export function shiftWeek(date: Date, delta: number, timezone: string): Date {
  return sumarSemanasEnZonaIANA(date, delta, timezone)
}
