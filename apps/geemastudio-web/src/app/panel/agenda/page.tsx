'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  horasVisiblesParaAgenda,
  instanteCitaDesdeTexto,
  minutosDelDiaEnZona,
} from '@zmtech/tenant-config'

import { AgendaAppointmentCard } from './_components/AgendaAppointmentCard'
import { AgendaToolbar, goToday, shiftDay } from './_components/AgendaToolbar'
import { AppointmentDetailDrawer } from './_components/AppointmentDetailDrawer'
import {
  useAgendaDayAppointments,
  useAgendaServicesMap,
  useAgendaTenantSchedule,
} from '@/hooks/agenda/useAgendaData'
import { PX_PER_HOUR, type AgendaAppointment, type AgendaStatusFilter } from '@/hooks/agenda/types'
import { useEmployees } from '@/hooks/personal/useEmployees'

export default function PanelAgendaPage() {
  const scheduleQuery = useAgendaTenantSchedule()
  const employeesQuery = useEmployees()
  const servicesQuery = useAgendaServicesMap()

  const timezone = scheduleQuery.data?.timezone ?? 'America/Caracas'
  const timeFormat = scheduleQuery.data?.timeFormat === '12' ? '12' : '24'
  const currencyCode = scheduleQuery.data?.currencyCode ?? 'PEN'
  const businessHours = scheduleQuery.data?.businessHours
  const language = 'es' as const

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [statusFilter, setStatusFilter] = useState<AgendaStatusFilter>('all')
  const [selectedApt, setSelectedApt] = useState<AgendaAppointment | null>(null)

  useEffect(() => {
    if (!scheduleQuery.data) return
    setSelectedDate((prev) => prev ?? goToday(scheduleQuery.data!.timezone))
  }, [scheduleQuery.data])

  const aptsQuery = useAgendaDayAppointments(selectedDate, timezone, statusFilter)

  const activeEmployees = useMemo(
    () => (employeesQuery.data ?? []).filter((e) => e.is_active),
    [employeesQuery.data]
  )

  const hours = useMemo(() => horasVisiblesParaAgenda(businessHours), [businessHours])
  const hourStart = hours[0] ?? 10
  const hourEnd = (hours[hours.length - 1] ?? 19) + 1
  const gridHours = useMemo(() => {
    const list: number[] = []
    for (let h = hourStart; h < hourEnd; h++) list.push(h)
    return list.length ? list : [10, 11, 12, 13, 14, 15, 16, 17, 18]
  }, [hourStart, hourEnd])

  const gridHeight = gridHours.length * PX_PER_HOUR
  const serviceMap = servicesQuery.data ?? new Map<string, string>()

  const serviceNameFor = (apt: AgendaAppointment) => {
    if (apt.service_id && serviceMap.has(apt.service_id)) {
      return serviceMap.get(apt.service_id)!
    }
    return 'Servicio'
  }

  const empById = useMemo(() => new Map(activeEmployees.map((e) => [e.id, e])), [activeEmployees])

  const unassigned = useMemo(
    () => (aptsQuery.data ?? []).filter((a) => !a.employee_id || !empById.has(a.employee_id)),
    [aptsQuery.data, empById]
  )

  const loading =
    scheduleQuery.isLoading ||
    employeesQuery.isLoading ||
    (selectedDate != null && aptsQuery.isLoading)

  const errorMessage =
    (scheduleQuery.error as Error | null)?.message ??
    (employeesQuery.error as Error | null)?.message ??
    (aptsQuery.error as Error | null)?.message ??
    null

  if (!selectedDate) {
    return (
      <div className="text-sm text-zinc-400">
        {scheduleQuery.isLoading ? 'Cargando agenda…' : 'Preparando zona horaria…'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-zinc-500">Panel</div>
        <h1 className="text-2xl font-bold text-white">Agenda</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Vista día por profesional · zona {timezone} · solo lectura (edición en mobile)
        </p>
      </div>

      <AgendaToolbar
        selectedDate={selectedDate}
        timezone={timezone}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onPrev={() => setSelectedDate(shiftDay(selectedDate, -1, timezone))}
        onNext={() => setSelectedDate(shiftDay(selectedDate, 1, timezone))}
        onToday={() => setSelectedDate(goToday(timezone))}
        count={aptsQuery.data?.length ?? 0}
      />

      {errorMessage && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage}
        </div>
      )}

      {loading && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
          Cargando citas…
        </div>
      )}

      {!loading && !errorMessage && activeEmployees.length === 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
          No hay profesionales activos. Configúralos en Personal.
        </div>
      )}

      {!loading && activeEmployees.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
          <div
            className="min-w-max"
            style={{
              display: 'grid',
              gridTemplateColumns: `56px repeat(${activeEmployees.length}, minmax(160px, 1fr))`,
            }}
          >
            <div className="sticky left-0 z-20 border-b border-r border-white/[0.08] bg-zinc-950 px-2 py-3 text-[10px] text-zinc-500">
              Hora
            </div>
            {activeEmployees.map((emp) => (
              <div
                key={emp.id}
                className="border-b border-white/[0.08] bg-zinc-950/80 px-3 py-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: emp.color }}
                  />
                  <span className="truncate text-xs font-semibold text-white">{emp.name}</span>
                </div>
              </div>
            ))}

            <div
              className="relative border-r border-white/[0.08] bg-zinc-950"
              style={{ height: gridHeight }}
            >
              {gridHours.map((h, i) => (
                <div
                  key={h}
                  className="absolute left-0 right-0 border-t border-white/[0.04] px-1 text-[10px] text-zinc-500"
                  style={{ top: i * PX_PER_HOUR, height: PX_PER_HOUR }}
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {activeEmployees.map((emp) => {
              const colApts = (aptsQuery.data ?? []).filter((a) => a.employee_id === emp.id)
              return (
                <div
                  key={emp.id}
                  className="relative border-l border-white/[0.06] bg-white/[0.01]"
                  style={{ height: gridHeight }}
                >
                  {gridHours.map((h, i) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-white/[0.04]"
                      style={{ top: i * PX_PER_HOUR, height: PX_PER_HOUR }}
                    />
                  ))}
                  {colApts.map((apt) => {
                    const start = instanteCitaDesdeTexto(apt.date, timezone)
                    const mins = minutosDelDiaEnZona(start, timezone)
                    if (!Number.isFinite(mins)) return null
                    return (
                      <AgendaAppointmentCard
                        key={apt.id}
                        apt={apt}
                        timezone={timezone}
                        timeFormat={timeFormat}
                        language={language}
                        serviceName={serviceNameFor(apt)}
                        currencyCode={currencyCode}
                        color={emp.color}
                        hourStart={hourStart}
                        onClick={() => setSelectedApt(apt)}
                      />
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!loading && unassigned.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="mb-2 text-sm font-semibold text-amber-200">
            Sin asignar ({unassigned.length})
          </div>
          <ul className="space-y-1 text-sm text-zinc-300">
            {unassigned.map((apt) => (
              <li key={apt.id}>
                <button
                  type="button"
                  className="hover:text-[#40E0D0]"
                  onClick={() => setSelectedApt(apt)}
                >
                  {apt.client_name} · {serviceNameFor(apt)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedApt && (
        <AppointmentDetailDrawer
          apt={selectedApt}
          timezone={timezone}
          timeFormat={timeFormat}
          language={language}
          serviceName={serviceNameFor(selectedApt)}
          employeeName={
            selectedApt.employee_id ? empById.get(selectedApt.employee_id)?.name ?? null : null
          }
          employeeColor={
            selectedApt.employee_id
              ? empById.get(selectedApt.employee_id)?.color ?? '#40E0D0'
              : '#71717a'
          }
          currencyCode={currencyCode}
          onClose={() => setSelectedApt(null)}
        />
      )}
    </div>
  )
}
