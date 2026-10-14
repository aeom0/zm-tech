'use client'

import { useMemo, useState } from 'react'
import { UserCheck, UserX } from 'lucide-react'
import {
  EMPTY_ELIGIBILITY,
  employeeCanDoServices,
  uniqueServiceIds,
  type AssignWindowAppointment,
  type ServiceEligibilityIndex,
} from '@geemastudio/data'
import {
  formatAppointmentWallclock,
  instanteCitaDesdeTexto,
  zonaIANASegura,
} from '@zmtech/tenant-config'

import { FilterChips } from '@/components/ui/FilterChips'
import { FormError } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { StateNote } from '@/components/ui/StateNote'
import { useAuth } from '@/contexts/AuthContext'
import { useAgendaServicesMap } from '@/hooks/agenda/useAgendaData'
import { useAssignEmployeeMutation, useAssignWindow } from '@/hooks/asignar/useAssignWindow'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { useServiceEligibility } from '@/hooks/personal/useAvailability'
import { useEmployees } from '@/hooks/personal/useEmployees'
import { useStaffLabels } from '@/hooks/personal/useStaffLabels'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'

type Period = 'upcoming' | 'past'
type Employee = { id: string; name: string; color: string }

export default function PanelAsignarPage() {
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { data: settings } = useTenantSettings()
  const { data: staffLabels } = useStaffLabels()
  const timeZone = settings ? zonaIANASegura(settings.timezone) : null
  const currencyCode = settings?.currency_code ?? 'USD'

  const windowQuery = useAssignWindow(timeZone)
  const employeesQuery = useEmployees()
  const servicesQuery = useAgendaServicesMap()
  const eligibilityQuery = useServiceEligibility()
  const assign = useAssignEmployeeMutation()

  const [period, setPeriod] = useState<Period>('upcoming')
  const [onlyUnassigned, setOnlyUnassigned] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const employees = useMemo<Employee[]>(
    () => (employeesQuery.data ?? []).filter((e) => e.is_active),
    [employeesQuery.data]
  )
  const empById = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees])

  const { upcoming, past } = useMemo(() => {
    const now = timeZone ? formatAppointmentWallclock(new Date(), timeZone) : ''
    const all = windowQuery.data ?? []
    return {
      upcoming: all.filter((a) => a.date >= now),
      // Lo más reciente primero al revisar el pasado.
      past: all.filter((a) => a.date < now).reverse(),
    }
  }, [windowQuery.data, timeZone])

  const isUnassigned = (a: AssignWindowAppointment) =>
    !a.employee_id || !empById.has(a.employee_id)
  const source = period === 'upcoming' ? upcoming : past
  const items = onlyUnassigned ? source.filter(isUnassigned) : source
  const pendingUpcoming = upcoming.filter(isUnassigned).length
  const pendingPast = past.filter(isUnassigned).length

  const serviceNames = servicesQuery.data ?? new Map<string, string>()
  const staffSingular = staffLabels?.singular ?? 'Profesional'

  const handleAssign = (appointmentId: string, employeeId: string) => {
    setBusyId(appointmentId)
    setError(null)
    assign.mutate(
      { appointmentId, employeeId },
      {
        onError: (e) => setError(e.message),
        onSettled: () => setBusyId(null),
      }
    )
  }

  if (!authLoading && !isAdmin) {
    return <StateNote kind="warning">Solo el dueño del negocio puede asignar citas.</StateNote>
  }

  const loading = !timeZone || windowQuery.isLoading || employeesQuery.isLoading

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Asignar citas"
        description={`Elige quién atiende cada cita de la última semana y la próxima.`}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          ariaLabel="Periodo"
          options={[
            { id: 'upcoming', label: 'Próximas', count: pendingUpcoming || undefined },
            { id: 'past', label: 'Pasadas', count: pendingPast || undefined },
          ]}
          value={period}
          onChange={(v) => setPeriod(v as Period)}
        />
        <label className="inline-flex min-h-[36px] cursor-pointer items-center gap-2 text-sm text-fg-soft">
          <input
            type="checkbox"
            checked={onlyUnassigned}
            onChange={(e) => setOnlyUnassigned(e.target.checked)}
            className="h-4 w-4 accent-[var(--tenant-primary)]"
          />
          Solo sin asignar
        </label>
      </div>

      <FormError message={error} />

      {loading ? (
        <StateNote kind="loading">Cargando citas…</StateNote>
      ) : windowQuery.error ? (
        <StateNote kind="error">{(windowQuery.error as Error).message}</StateNote>
      ) : employees.length === 0 ? (
        <StateNote kind="empty">No hay profesionales activos. Configúralos en Personal.</StateNote>
      ) : items.length === 0 ? (
        <StateNote kind="empty" icon={<UserCheck className="h-5 w-5" />}>
          {onlyUnassigned
            ? period === 'upcoming'
              ? 'Todas las próximas citas tienen a alguien asignado.'
              : 'Todas las citas de la última semana quedaron asignadas.'
            : 'No hay citas en este periodo.'}
        </StateNote>
      ) : (
        <ul className="space-y-2">
          {items.map((apt) => (
            <AssignRow
              key={apt.id}
              apt={apt}
              timeZone={timeZone}
              currencyCode={currencyCode}
              serviceNames={serviceNames}
              employees={employees}
              assigned={apt.employee_id ? (empById.get(apt.employee_id) ?? null) : null}
              eligibility={eligibilityQuery.data ?? EMPTY_ELIGIBILITY}
              staffLabel={staffSingular}
              busy={busyId === apt.id}
              onAssign={(employeeId) => handleAssign(apt.id, employeeId)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function AssignRow({
  apt,
  timeZone,
  currencyCode,
  serviceNames,
  employees,
  assigned,
  eligibility,
  staffLabel,
  busy,
  onAssign,
}: {
  apt: AssignWindowAppointment
  timeZone: string
  currencyCode: string
  serviceNames: Map<string, string>
  employees: Employee[]
  assigned: Employee | null
  eligibility: ServiceEligibilityIndex
  staffLabel: string
  busy: boolean
  onAssign: (employeeId: string) => void
}) {
  const serviceIds = uniqueServiceIds(apt.service_id, apt.service_ids, apt.line_service_ids)
  const serviceLabel =
    serviceIds.map((id) => serviceNames.get(id)).filter(Boolean).join(' + ') || 'Servicio'

  // Solo quienes hacen todos los servicios de la cita (o los cubren ese día);
  // si nadie califica, no se filtra para no bloquear la asignación.
  const day = apt.date.slice(0, 10)
  const eligible = employees.filter((e) => employeeCanDoServices(eligibility, e.id, serviceIds, day))
  const options = eligible.length > 0 ? eligible : employees
  if (assigned && !options.some((e) => e.id === assigned.id)) options.unshift(assigned)

  const when = instanteCitaDesdeTexto(apt.date, timeZone)
  const dateLabel = Number.isNaN(when.getTime())
    ? apt.date
    : when.toLocaleString('es', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
      })

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 sm:flex-row sm:items-center">
      <span
        aria-hidden
        className="hidden h-10 w-1 shrink-0 rounded-full sm:block"
        style={{ backgroundColor: assigned?.color ?? '#a1a1aa' }}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate font-semibold text-fg">{apt.client_name}</span>
          <span className="shrink-0 text-sm font-semibold text-fg">
            {formatDashboardCurrency(Number(apt.price) || 0, currencyCode)}
          </span>
        </div>
        <div className="truncate text-sm text-fg-muted">{serviceLabel}</div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="capitalize text-fg-subtle">{dateLabel}</span>
          {!assigned && (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
              <UserX className="h-3.5 w-3.5" aria-hidden /> Sin asignar
            </span>
          )}
          {eligible.length === 0 && serviceIds.length > 0 && (
            <span className="text-fg-subtle">Nadie tiene configurados estos servicios</span>
          )}
        </div>
      </div>
      <select
        aria-label={`${staffLabel} para ${apt.client_name}`}
        value={assigned?.id ?? ''}
        disabled={busy}
        onChange={(e) => e.target.value && onAssign(e.target.value)}
        className="w-full rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-fg outline-none focus:border-[var(--tenant-primary)] disabled:opacity-50 sm:w-48"
      >
        {!assigned && <option value="">Elegir {staffLabel.toLowerCase()}…</option>}
        {options.map((e) => (
          <option key={e.id} value={e.id}>
            {e.name}
          </option>
        ))}
      </select>
    </li>
  )
}
