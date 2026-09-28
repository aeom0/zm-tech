'use client'

import {
  calcularSemanaAgenda,
  esHoyEnZonaIANA,
  esMismoDiaCalendarioEnZona,
  formatoHoraInstanteEnZona,
  instanteCitaDesdeTexto,
  type TimeFormatPreference,
} from '@zmtech/tenant-config'

import type { AgendaAppointment } from '@/hooks/agenda/types'

interface AgendaWeekGridProps {
  selectedDate: Date
  timezone: string
  timeFormat: TimeFormatPreference
  language: 'es'
  appointments: AgendaAppointment[]
  employees: { id: string; color: string }[]
  serviceNameFor: (apt: AgendaAppointment) => string
  onSelectDay: (date: Date) => void
  onOpenDetail: (apt: AgendaAppointment) => void
}

/** Vista semanal (dom–sáb) alineada con `OwnerWeekGrid` de mobile. */
export function AgendaWeekGrid({
  selectedDate,
  timezone,
  timeFormat,
  language,
  appointments,
  employees,
  serviceNameFor,
  onSelectDay,
  onOpenDetail,
}: AgendaWeekGridProps) {
  const { weekDays } = calcularSemanaAgenda(selectedDate, timezone)
  const colorById = new Map(employees.map((e) => [e.id, e.color]))

  const byDay = weekDays.map((day) =>
    appointments
      .filter((apt) =>
        esMismoDiaCalendarioEnZona(instanteCitaDesdeTexto(apt.date, timezone), day, timezone)
      )
      .sort(
        (a, b) =>
          instanteCitaDesdeTexto(a.date, timezone).getTime() -
          instanteCitaDesdeTexto(b.date, timezone).getTime()
      )
  )

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
      <div className="grid min-w-[760px] grid-cols-7">
        {weekDays.map((day, i) => {
          const today = esHoyEnZonaIANA(day, timezone)
          const count = byDay[i].length
          return (
            <button
              key={`h-${i}`}
              type="button"
              onClick={() => onSelectDay(day)}
              className={[
                'flex flex-col items-center gap-1 border-b border-white/[0.08] px-2 py-3 transition-colors hover:bg-white/[0.04]',
                i > 0 ? 'border-l border-l-white/[0.06]' : '',
                today ? 'bg-[var(--tenant-primary)]/[0.06]' : 'bg-zinc-950/80',
              ].join(' ')}
              aria-label="Ver día"
            >
              <span
                className={[
                  'text-[10px] font-semibold uppercase tracking-wide',
                  today ? 'text-[var(--tenant-primary)]' : 'text-zinc-500',
                ].join(' ')}
              >
                {day.toLocaleDateString('es-419', { timeZone: timezone, weekday: 'short' })}
              </span>
              <span
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-sm',
                  today ? 'bg-[var(--tenant-primary)] font-bold text-black' : 'font-medium text-white',
                ].join(' ')}
              >
                {day.toLocaleDateString('es-419', { timeZone: timezone, day: 'numeric' })}
              </span>
              <span
                className={[
                  'min-w-[18px] rounded px-1.5 text-[10px] font-bold',
                  count === 0
                    ? 'invisible'
                    : today
                      ? 'bg-[var(--tenant-primary)]/20 text-[var(--tenant-primary)]'
                      : 'bg-white/[0.06] text-zinc-400',
                ].join(' ')}
              >
                {count}
              </span>
            </button>
          )
        })}

        {weekDays.map((day, i) => {
          const today = esHoyEnZonaIANA(day, timezone)
          return (
            <div
              key={`c-${i}`}
              className={[
                'min-h-[260px] space-y-1.5 p-1.5',
                i > 0 ? 'border-l border-white/[0.06]' : '',
                today ? 'bg-[var(--tenant-primary)]/[0.04]' : 'bg-white/[0.01]',
              ].join(' ')}
            >
              {byDay[i].length === 0 ? (
                <div className="pt-4 text-center text-xs text-zinc-600">—</div>
              ) : (
                byDay[i].map((apt) => {
                  const color = (apt.employee_id && colorById.get(apt.employee_id)) || '#71717a'
                  const hora = formatoHoraInstanteEnZona(
                    instanteCitaDesdeTexto(apt.date, timezone),
                    timezone,
                    language,
                    timeFormat
                  )
                  const svc = serviceNameFor(apt)
                  const svcCount = Array.isArray(apt.service_ids) ? apt.service_ids.length : 0
                  return (
                    <button
                      key={apt.id}
                      type="button"
                      onClick={() => onOpenDetail(apt)}
                      className="block w-full overflow-hidden rounded-md px-1.5 py-1 text-left transition hover:brightness-125"
                      style={{
                        backgroundColor: `color-mix(in srgb, ${color} 28%, #18181b)`,
                        borderLeft: `3px solid ${color}`,
                      }}
                      title={`${apt.client_name} · ${hora} · ${svc}`}
                    >
                      <div className="flex items-center gap-1 text-[10px] font-bold text-white/70">
                        <span className="truncate">{hora}</span>
                        {svcCount > 1 && (
                          <span className="rounded bg-white/15 px-1 text-[9px] font-extrabold text-white">
                            ×{svcCount}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] font-semibold text-white">{svc}</div>
                      <div className="truncate text-[10px] text-white/60">{apt.client_name}</div>
                    </button>
                  )
                })
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
