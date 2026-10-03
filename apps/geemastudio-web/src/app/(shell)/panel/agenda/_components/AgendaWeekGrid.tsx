'use client'

import {
  calcularSemanaAgenda,
  esHoyEnZonaIANA,
  esMismoDiaCalendarioEnZona,
  formatoHoraInstanteEnZona,
  instanteCitaDesdeTexto,
  type TimeFormatPreference,
} from '@zmtech/tenant-config'

import { agendaCardGradient } from './AgendaAppointmentCard'
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
    <div className="overflow-x-auto rounded-2xl border border-fg/[0.08]">
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
                'flex flex-col items-center gap-1 border-b border-fg/[0.08] px-2 py-3 transition-colors hover:bg-fg/[0.04]',
                i > 0 ? 'border-l border-l-white/[0.06]' : '',
                today ? 'bg-[var(--tenant-primary)]/[0.06]' : 'bg-sunken/80',
              ].join(' ')}
              aria-label="Ver día"
            >
              <span
                className={[
                  'text-[11px] font-semibold uppercase tracking-wide',
                  today ? 'text-tenant-text' : 'text-fg-subtle',
                ].join(' ')}
              >
                {day.toLocaleDateString('es-419', { timeZone: timezone, weekday: 'short' })}
              </span>
              <span
                className={[
                  'flex h-7 w-7 items-center justify-center rounded-full text-sm',
                  today
                    ? 'bg-[var(--tenant-primary)] font-bold text-[var(--tenant-on-primary)]'
                    : 'font-medium text-fg',
                ].join(' ')}
              >
                {day.toLocaleDateString('es-419', { timeZone: timezone, day: 'numeric' })}
              </span>
              <span
                className={[
                  'min-w-[18px] rounded px-1.5 text-[11px] font-bold',
                  count === 0
                    ? 'invisible'
                    : today
                      ? 'bg-[var(--tenant-primary)]/20 text-tenant-text'
                      : 'bg-fg/[0.06] text-fg-muted',
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
                i > 0 ? 'border-l border-fg/[0.06]' : '',
                today ? 'bg-[var(--tenant-primary)]/[0.04]' : 'bg-card',
              ].join(' ')}
            >
              {byDay[i].length === 0 ? (
                <div className="pt-4 text-center text-xs text-fg-subtle">—</div>
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
                        background: agendaCardGradient(color),
                      }}
                      title={`${apt.client_name} · ${hora} · ${svc}`}
                    >
                      <div className="flex items-center gap-1 text-[11px] font-bold text-fg/70">
                        <span className="truncate">{hora}</span>
                        {svcCount > 1 && (
                          <span className="rounded bg-fg/15 px-1 text-[11px] font-extrabold text-fg">
                            ×{svcCount}
                          </span>
                        )}
                      </div>
                      <div className="truncate text-[11px] font-semibold text-fg">{svc}</div>
                      <div className="truncate text-[11px] text-fg/60">{apt.client_name}</div>
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
