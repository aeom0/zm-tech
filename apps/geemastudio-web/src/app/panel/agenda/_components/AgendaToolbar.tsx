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
  onViewChange: (v: AgendaView) => void
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
  onViewChange,
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
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]"
          aria-label={isWeek ? 'Semana anterior' : 'Día anterior'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]"
          aria-label={isWeek ? 'Semana siguiente' : 'Día siguiente'}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {!isToday && (
          <button
            type="button"
            onClick={onToday}
            className="rounded-xl border border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--tenant-primary)]"
          >
            Hoy
          </button>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold capitalize text-white">{label}</div>
          <div className="text-xs text-zinc-500">
            {count} {count === 1 ? 'cita' : 'citas'}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-1 inline-flex overflow-hidden rounded-xl border border-white/[0.08]">
          {(['day', 'week'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onViewChange(v)}
              className={[
                'px-3 py-1.5 text-xs font-semibold transition-colors',
                view === v
                  ? 'bg-[var(--tenant-primary)]/15 text-[var(--tenant-primary)]'
                  : 'bg-white/[0.02] text-zinc-300 hover:bg-white/[0.04]',
              ].join(' ')}
            >
              {v === 'day' ? 'Día' : 'Semana'}
            </button>
          ))}
        </div>
        {STATUS_CHIP.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onStatusChange(chip.id)}
            className={[
              'rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
              statusFilter === chip.id
                ? 'border-[var(--tenant-primary)]/40 bg-[var(--tenant-primary)]/15 text-[var(--tenant-primary)]'
                : 'border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.04]',
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
