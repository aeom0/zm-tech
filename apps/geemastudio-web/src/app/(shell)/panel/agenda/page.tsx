'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatAppointmentWallclock, horasVisiblesParaAgenda } from '@zmtech/tenant-config'

import { AgendaDayGrid } from './_components/AgendaDayGrid'
import {
  AgendaToolbar,
  goToday,
  shiftDay,
  shiftWeek,
  type AgendaView,
} from './_components/AgendaToolbar'
import { AgendaWeekGrid } from './_components/AgendaWeekGrid'
import { AppointmentDetailDrawer } from './_components/AppointmentDetailDrawer'
import {
  useAgendaDayAppointments,
  useAgendaWeekAppointments,
  useAgendaServicesMap,
  useAgendaTenantSchedule,
} from '@/hooks/agenda/useAgendaData'
import type { AgendaAppointment, AgendaStatusFilter } from '@/hooks/agenda/types'
import { buildDayBlocks } from '@/hooks/agenda/availabilityBlocks'
import { useDayAvailability } from '@/hooks/personal/useAvailability'
import { useEmployees } from '@/hooks/personal/useEmployees'
import { StateNote } from '@/components/ui/StateNote'
import { PageHeader } from '@/components/ui/PageHeader'

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
  const [view, setView] = useState<AgendaView>('day')
  const [statusFilter, setStatusFilter] = useState<AgendaStatusFilter>('all')
  const [selectedApt, setSelectedApt] = useState<AgendaAppointment | null>(null)

  useEffect(() => {
    if (!scheduleQuery.data) return
    setSelectedDate((prev) => prev ?? goToday(scheduleQuery.data!.timezone))
  }, [scheduleQuery.data])

  const dayQuery = useAgendaDayAppointments(selectedDate, timezone, statusFilter)
  const weekQuery = useAgendaWeekAppointments(selectedDate, timezone, statusFilter, view === 'week')
  const aptsQuery = view === 'week' ? weekQuery : dayQuery

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

  const serviceMap = servicesQuery.data ?? new Map<string, string>()

  const serviceNameFor = (apt: AgendaAppointment) => {
    const ids = apt.service_ids?.length ? apt.service_ids : [apt.service_id]
    const names = ids.flatMap((id) => (id && serviceMap.get(id)) || [])
    return names.length ? names.join(' + ') : 'Servicio'
  }

  const dayIso = useMemo(
    () =>
      selectedDate && view === 'day'
        ? formatAppointmentWallclock(selectedDate, timezone).slice(0, 10)
        : null,
    [selectedDate, view, timezone]
  )
  const dayAvailability = useDayAvailability(dayIso)
  const blocksByEmployee = useMemo(() => {
    if (!dayAvailability.data) return new Map()
    return buildDayBlocks(
      dayAvailability.data,
      activeEmployees.map((e) => e.id),
      new Map(activeEmployees.map((e) => [e.id, e.name]))
    )
  }, [dayAvailability.data, activeEmployees])
  const coveringNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const c of dayAvailability.data?.coverages ?? []) {
      const covered = activeEmployees.find((e) => e.id === c.covered_employee_id)
      if (covered) names.set(c.covering_employee_id, covered.name)
    }
    return names
  }, [dayAvailability.data, activeEmployees])

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
      <div className="text-sm text-fg-muted">
        {scheduleQuery.isLoading ? 'Cargando agenda…' : 'Preparando zona horaria…'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description={
          <>
            {view === 'week' ? 'Vista semanal' : 'Vista día por profesional'} · zona {timezone} ·
            solo lectura (edición desde la app del celular)
          </>
        }
      />

      <AgendaToolbar
        view={view}
        onToggleView={() => setView((v) => (v === 'day' ? 'week' : 'day'))}
        selectedDate={selectedDate}
        timezone={timezone}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        onPrev={() =>
          setSelectedDate(
            view === 'week'
              ? shiftWeek(selectedDate, -1, timezone)
              : shiftDay(selectedDate, -1, timezone)
          )
        }
        onNext={() =>
          setSelectedDate(
            view === 'week'
              ? shiftWeek(selectedDate, 1, timezone)
              : shiftDay(selectedDate, 1, timezone)
          )
        }
        onToday={() => setSelectedDate(goToday(timezone))}
        count={aptsQuery.data?.length ?? 0}
      />

      {errorMessage && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {loading && <StateNote kind="loading">Cargando citas…</StateNote>}

      {!loading && !errorMessage && view === 'day' && activeEmployees.length === 0 && (
        <StateNote kind="empty">No hay profesionales activos. Configúralos en Personal.</StateNote>
      )}

      {!loading && view === 'week' && (
        <AgendaWeekGrid
          selectedDate={selectedDate}
          timezone={timezone}
          timeFormat={timeFormat}
          language={language}
          appointments={aptsQuery.data ?? []}
          employees={activeEmployees}
          serviceNameFor={serviceNameFor}
          onSelectDay={(day) => {
            setSelectedDate(day)
            setView('day')
          }}
          onOpenDetail={setSelectedApt}
        />
      )}

      {!loading && view === 'day' && activeEmployees.length > 0 && (
        <AgendaDayGrid
          selectedDate={selectedDate}
          timezone={timezone}
          timeFormat={timeFormat}
          language={language}
          businessHours={businessHours}
          gridHours={gridHours}
          employees={activeEmployees}
          appointments={aptsQuery.data ?? []}
          blocksByEmployee={blocksByEmployee}
          coveringNames={coveringNames}
          serviceNameFor={serviceNameFor}
          onOpenDetail={setSelectedApt}
        />
      )}

      {!loading && view === 'day' && unassigned.length > 0 && (
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <div className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
            Sin asignar ({unassigned.length})
          </div>
          <ul className="space-y-1 text-sm text-fg-soft">
            {unassigned.map((apt) => (
              <li key={apt.id}>
                <button
                  type="button"
                  className="hover:text-tenant-text"
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
            selectedApt.employee_id ? (empById.get(selectedApt.employee_id)?.name ?? null) : null
          }
          employeeColor={
            selectedApt.employee_id
              ? (empById.get(selectedApt.employee_id)?.color ?? 'var(--tenant-primary)')
              : '#71717a'
          }
          currencyCode={currencyCode}
          onClose={() => setSelectedApt(null)}
        />
      )}
    </div>
  )
}
