'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import {
  esHoyEnZonaIANA,
  inicioDiaHoyEnZonaIANA,
  sumarDiasEnZonaIANA,
} from '@zmtech/tenant-config'

import { STATUS_CHIP, type AgendaStatusFilter } from '@/hooks/agenda/types'

interface AgendaToolbarProps {
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
  selectedDate,
  timezone,
  statusFilter,
  onStatusChange,
  onPrev,
  onNext,
  onToday,
  count,
}: AgendaToolbarProps) {
  const label = selectedDate.toLocaleDateString('es-419', {
    timeZone: timezone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const isToday = esHoyEnZonaIANA(selectedDate, timezone)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]"
          aria-label="Día anterior"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-200 hover:bg-white/[0.08]"
          aria-label="Día siguiente"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        {!isToday && (
          <button
            type="button"
            onClick={onToday}
            className="rounded-xl border border-[#40E0D0]/30 bg-[#40E0D0]/10 px-3 py-1.5 text-xs font-semibold text-[#40E0D0]"
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

      <div className="flex flex-wrap gap-2">
        {STATUS_CHIP.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onStatusChange(chip.id)}
            className={[
              'rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors',
              statusFilter === chip.id
                ? 'border-[#40E0D0]/40 bg-[#40E0D0]/15 text-[#40E0D0]'
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
