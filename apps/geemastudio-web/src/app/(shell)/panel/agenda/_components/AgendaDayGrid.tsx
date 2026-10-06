'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AGENDA_BORDE_VISUAL_MIN,
  computeOverlapLayout,
  esCeldaAgendaEnHorarioLaboral,
  esHoyEnZonaIANA,
  formatoHoraAgendaSlot,
  instanteCitaDesdeTexto,
  minutosDelDiaEnZona,
  type TenantConfig,
  type TimeFormatPreference,
} from '@zmtech/tenant-config'

import { AgendaAppointmentCard } from './AgendaAppointmentCard'
import { AgendaAvailabilityBlock } from './AgendaAvailabilityBlock'
import { PX_PER_HOUR, type AgendaAppointment } from '@/hooks/agenda/types'
import type { AvailabilityBlock } from '@/hooks/agenda/availabilityBlocks'

const PX_PER_MINUTE = PX_PER_HOUR / 60
const EDGE_BUFFER = AGENDA_BORDE_VISUAL_MIN * PX_PER_MINUTE
const OFF_HOURS_CLASS = 'bg-sunken/60'

interface AgendaDayEmployee {
  id: string
  name: string
  color: string
  avatar_url?: string | null
}

interface AgendaDayGridProps {
  selectedDate: Date
  timezone: string
  timeFormat: TimeFormatPreference
  language: TenantConfig['locale']['language']
  businessHours: TenantConfig['businessHours'] | undefined
  /** Horas enteras con etiqueta (sin el borde visual). */
  gridHours: number[]
  employees: AgendaDayEmployee[]
  appointments: AgendaAppointment[]
  blocksByEmployee: Map<string, AvailabilityBlock[]>
  coveringNames: Map<string, string>
  serviceNameFor: (apt: AgendaAppointment) => string
  onOpenDetail: (apt: AgendaAppointment) => void
}

/** Vista de día por profesional, alineada con `OwnerDayGrid` + `OwnerStaffAvatarStrip` de mobile. */
export function AgendaDayGrid({
  selectedDate,
  timezone,
  timeFormat,
  language,
  businessHours,
  gridHours,
  employees,
  appointments,
  blocksByEmployee,
  coveringNames,
  serviceNameFor,
  onOpenDetail,
}: AgendaDayGridProps) {
  const gridStartMin = gridHours[0] * 60 - AGENDA_BORDE_VISUAL_MIN
  const gridEndMin = (gridHours[gridHours.length - 1] + 1) * 60 + AGENDA_BORDE_VISUAL_MIN
  const totalHeight = gridHours.length * PX_PER_HOUR + EDGE_BUFFER * 2

  const isToday = esHoyEnZonaIANA(selectedDate, timezone)
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    if (!isToday) return
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [isToday])

  const nowTop = useMemo(() => {
    if (!isToday) return null
    const m = minutosDelDiaEnZona(now, timezone)
    if (!Number.isFinite(m) || m < gridStartMin || m > gridEndMin) return null
    return (m - gridStartMin) * PX_PER_MINUTE
  }, [isToday, now, timezone, gridStartMin, gridEndMin])

  const hourOpen = useMemo(
    () =>
      gridHours.map((h) =>
        businessHours
          ? esCeldaAgendaEnHorarioLaboral(selectedDate, h, businessHours, timezone)
          : true
      ),
    [gridHours, selectedDate, businessHours, timezone]
  )

  return (
    <div className="overflow-x-auto rounded-2xl border border-fg/[0.08]">
      <div
        className="min-w-max"
        style={{
          display: 'grid',
          gridTemplateColumns: `56px repeat(${employees.length}, minmax(120px, 1fr))`,
        }}
      >
        <div className="sticky left-0 z-20 border-b border-r border-fg/[0.08] bg-sunken" />
        {employees.map((emp) => {
          const firstName = emp.name?.trim().split(/\s+/)[0] ?? '?'
          const count = appointments.filter((a) => a.employee_id === emp.id).length
          return (
            <div
              key={emp.id}
              className="flex flex-col items-center border-b border-fg/[0.08] bg-sunken/80 px-2 py-3"
            >
              <div className="relative h-14 w-14">
                <div
                  className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-card text-xl font-bold"
                  style={{ border: `2px solid ${emp.color}`, color: emp.color }}
                >
                  {emp.avatar_url?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={emp.avatar_url.trim()}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    firstName.slice(0, 1).toUpperCase()
                  )}
                </div>
                {count > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-[1.5px] border-sunken bg-[var(--tenant-primary)] px-1 text-[10px] font-bold leading-none text-[var(--tenant-on-primary)]">
                    {count}
                  </span>
                )}
              </div>
              <span className="mt-1 max-w-full truncate text-xs font-semibold text-fg">
                {firstName}
              </span>
              {coveringNames.has(emp.id) && (
                <span className="max-w-full truncate text-[11px] text-sky-700 dark:text-sky-300">
                  Cubre a {coveringNames.get(emp.id)}
                </span>
              )}
            </div>
          )
        })}

        <div
          className="sticky left-0 z-20 border-r border-fg/[0.08] bg-sunken"
          style={{ height: totalHeight }}
        >
          {gridHours.map((h, i) => (
            <div
              key={h}
              className="absolute left-0 right-0 border-b border-fg/[0.06] px-1 pt-1 text-center text-[10px] font-semibold text-fg-subtle"
              style={{ top: EDGE_BUFFER + i * PX_PER_HOUR, height: PX_PER_HOUR }}
            >
              {formatoHoraAgendaSlot(selectedDate, h, timezone, language, timeFormat)}
            </div>
          ))}
        </div>

        {employees.map((emp, colIndex) => {
          const colApts = appointments.filter((a) => a.employee_id === emp.id)
          const lanes = computeOverlapLayout(
            colApts.map((apt) => {
              const startMin = minutosDelDiaEnZona(
                instanteCitaDesdeTexto(apt.date, timezone),
                timezone
              )
              return { id: apt.id, startMin, endMin: startMin + apt.duration }
            })
          )
          return (
            <div
              key={emp.id}
              className="relative border-l border-fg/[0.06] bg-card"
              style={{ height: totalHeight }}
            >
              <div
                className={`absolute left-0 right-0 top-0 ${OFF_HOURS_CLASS}`}
                style={{ height: EDGE_BUFFER }}
              />
              {gridHours.map((h, i) => (
                <div
                  key={h}
                  className={`absolute left-0 right-0 border-b border-fg/[0.06] ${hourOpen[i] ? '' : OFF_HOURS_CLASS}`}
                  style={{ top: EDGE_BUFFER + i * PX_PER_HOUR, height: PX_PER_HOUR }}
                />
              ))}
              <div
                className={`absolute bottom-0 left-0 right-0 ${OFF_HOURS_CLASS}`}
                style={{ height: EDGE_BUFFER }}
              />
              {(blocksByEmployee.get(emp.id) ?? []).map((block, i) => (
                <AgendaAvailabilityBlock
                  key={i}
                  block={block}
                  gridStartMin={gridStartMin}
                  gridEndMin={gridEndMin}
                />
              ))}
              {nowTop !== null && (
                <div
                  aria-hidden
                  className="pointer-events-none absolute left-0 right-0 z-30 h-[1.5px] bg-[var(--tenant-primary)]"
                  style={{ top: nowTop }}
                >
                  {colIndex === 0 && (
                    <span className="absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-[var(--tenant-primary)]" />
                  )}
                </div>
              )}
              {colApts.map((apt) => {
                const { lane, laneCount } = lanes.get(apt.id) ?? { lane: 0, laneCount: 1 }
                return (
                  <AgendaAppointmentCard
                    key={apt.id}
                    apt={apt}
                    timezone={timezone}
                    timeFormat={timeFormat}
                    language={language}
                    serviceName={serviceNameFor(apt)}
                    color={emp.color}
                    gridStartMin={gridStartMin}
                    lane={lane}
                    laneCount={laneCount}
                    onClick={() => onOpenDetail(apt)}
                  />
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
