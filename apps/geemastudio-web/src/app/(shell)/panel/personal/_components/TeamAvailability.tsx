'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, Loader2, Plus, Trash2 } from 'lucide-react'
import { TIME_OFF_KIND_LABELS, WEEK_DAYS, trimTime } from '@geemastudio/shared-schema'

import { useDashboardTenant } from '@/hooks/dashboard/useDashboardTenant'
import { useEmployees } from '@/hooks/personal/useEmployees'
import { useStaffLabels } from '@/hooks/personal/useStaffLabels'
import {
  useAllServiceCounts,
  useAllTimeOff,
  useAllWorkShifts,
  useCoverages,
  useDeleteCoverage,
  useDeleteTimeOff,
} from '@/hooks/personal/useAvailability'
import { useServicios } from '@/hooks/servicios/useServicios'
import type { EmployeeRow } from '@/hooks/personal/types'
import { PageHeader } from '@/components/ui/PageHeader'
import { StateNote } from '@/components/ui/StateNote'
import { useConfirm } from '@/components/ui/ConfirmDialog'

import { AvailabilityModal } from './AvailabilityModal'
import { PersonalSubNav } from './PersonalSubNav'
import { formatIsoDate, primaryBtnClass, todayIso } from './availabilityUi'

type Mode = 'schedule' | 'services' | 'timeoff'

const COPY: Record<Mode, { title: string; description: string }> = {
  schedule: {
    title: 'Horarios',
    description: 'Días y turnos de cada profesional. Quien no tiene horario propio usa el del negocio.',
  },
  services: {
    title: 'Servicios por profesional',
    description: 'Qué servicios realiza cada profesional; define quién aparece al agendar.',
  },
  timeoff: {
    title: 'Ausencias',
    description: 'Vacaciones, permisos y coberturas de todo el equipo.',
  },
}

function rangeLabel(from: string, to: string | null): string {
  if (to === null) return `Desde el ${formatIsoDate(from)}, hasta nuevo aviso`
  return from === to ? formatIsoDate(from) : `${formatIsoDate(from)} al ${formatIsoDate(to)}`
}

const rowClass =
  'flex w-full items-center gap-3 rounded-2xl border border-fg/[0.08] bg-fg/[0.03] px-4 py-3 text-left'

/** Pantalla de equipo para un tema de disponibilidad; la edición abre el mismo formulario de siempre. */
export function TeamAvailability({ mode }: { mode: Mode }) {
  const employeesQuery = useEmployees()
  const labels = useStaffLabels()
  const tenant = useDashboardTenant()
  const shifts = useAllWorkShifts()
  const counts = useAllServiceCounts()
  const services = useServicios()
  const timeOff = useAllTimeOff()
  const coverages = useCoverages()
  const delTimeOff = useDeleteTimeOff('')
  const delCoverage = useDeleteCoverage()
  const { confirm, dialog } = useConfirm()

  const staffPlural = labels.data?.plural ?? 'Profesionales'
  const staffSingular = labels.data?.singular ?? 'Profesional'
  const timezone = tenant.data?.timezone
  const all = useMemo(() => employeesQuery.data ?? [], [employeesQuery.data])
  const active = useMemo(() => all.filter((e) => e.is_active), [all])
  const names = useMemo(() => new Map(all.map((e) => [e.id, e.name])), [all])
  const activeServices = (services.data ?? []).filter((s) => s.is_active).length

  const [editing, setEditing] = useState<EmployeeRow | null>(null)

  const daysById = useMemo(() => {
    const map = new Map<string, Set<number>>()
    for (const s of shifts.data ?? []) {
      const set = map.get(s.employee_id) ?? new Set<number>()
      set.add(s.weekday)
      map.set(s.employee_id, set)
    }
    return map
  }, [shifts.data])

  const today = todayIso(timezone)
  const isCurrent = (to: string | null) => to === null || to >= today
  const upcoming = (timeOff.data ?? []).filter((t) => isCurrent(t.date_to))
  const past = (timeOff.data ?? [])
    .filter((t) => !isCurrent(t.date_to))
    .reverse()
    .slice(0, 10)
  const activeCoverages = (coverages.data ?? []).filter((c) => c.date_to >= today).reverse()

  const dataQuery = mode === 'schedule' ? shifts : mode === 'services' ? counts : timeOff
  const loading = employeesQuery.isLoading || dataQuery.isLoading
  const failed = employeesQuery.isError || dataQuery.isError

  const renderTimeOff = (t: NonNullable<typeof timeOff.data>[number]) => (
    <li key={t.id} className={rowClass}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-fg">{names.get(t.employee_id) ?? staffSingular}</div>
        <div className="text-xs text-fg-muted">
          {TIME_OFF_KIND_LABELS[t.kind]} · {rangeLabel(t.date_from, t.date_to)}
          {t.start_time && t.end_time ? ` · ${trimTime(t.start_time)}–${trimTime(t.end_time)}` : ''}
        </div>
        {t.reason && <div className="truncate text-xs text-fg-subtle">{t.reason}</div>}
      </div>
      <button
        type="button"
        aria-label="Eliminar ausencia"
        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-fg/[0.08] md:h-9 md:w-9"
        onClick={async () => {
          const ok = await confirm({
            title: '¿Eliminar esta ausencia?',
            description: 'Los horarios vuelven a estar disponibles.',
            confirmLabel: 'Eliminar',
            destructive: true,
          })
          if (ok) delTimeOff.mutate(t.id)
        }}
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </button>
    </li>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={staffPlural}
        description="Equipo, servicios que hace cada uno, horarios, ausencias, comisiones y foto de perfil."
      />
      <PersonalSubNav staffPlural={staffPlural} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-fg">{COPY[mode].title}</h2>
          <p className="text-sm text-fg-muted">{COPY[mode].description}</p>
        </div>
        {mode === 'timeoff' && active[0] && (
          <button type="button" className={primaryBtnClass} onClick={() => setEditing(active[0]!)}>
            <Plus className="h-4 w-4" /> Nueva ausencia
          </button>
        )}
      </div>

      {loading && (
        <StateNote kind="loading">
          <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Cargando…
        </StateNote>
      )}
      {!loading && failed && <StateNote kind="error">No se pudo cargar la información del equipo.</StateNote>}

      {!loading && !failed && mode !== 'timeoff' && (
        <ul className="space-y-2">
          {active.map((e) => {
            const days = daysById.get(e.id)
            const summary =
              mode === 'services'
                ? e.does_all_services
                  ? 'Todos los servicios'
                  : (counts.data?.[e.id] ?? 0) === 0
                    ? 'Sin servicios asignados'
                    : `${counts.data?.[e.id]} de ${activeServices} servicios`
                : null
            return (
              <li key={e.id}>
                <button type="button" className={rowClass} onClick={() => setEditing(e)}>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-fg">{e.name}</div>
                    {mode === 'schedule' && days ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {WEEK_DAYS.map((d) => (
                          <span
                            key={d.weekday}
                            className={`rounded-md border px-1.5 py-0.5 text-xs font-semibold ${
                              days.has(d.weekday)
                                ? 'border-[var(--tenant-primary)] text-[var(--tenant-primary)]'
                                : 'border-fg/[0.08] text-fg-subtle'
                            }`}
                          >
                            {d.short}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-fg-muted">{summary ?? 'Usa el horario del negocio'}</div>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-fg-subtle" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {!loading && !failed && mode === 'timeoff' && (
        <div className="space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-fg">Vigentes y próximas</h3>
            {upcoming.length === 0 ? (
              <StateNote kind="empty">No hay ausencias vigentes ni próximas.</StateNote>
            ) : (
              <ul className="space-y-2">{upcoming.map(renderTimeOff)}</ul>
            )}
          </section>
          {activeCoverages.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-fg">Coberturas</h3>
              <ul className="space-y-2">
                {activeCoverages.map((c) => (
                  <li key={c.id} className={rowClass}>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-fg">
                        {names.get(c.covering_employee_id) ?? staffSingular} cubre a{' '}
                        {names.get(c.covered_employee_id) ?? staffSingular}
                      </div>
                      <div className="text-xs text-fg-muted">{rangeLabel(c.date_from, c.date_to)}</div>
                    </div>
                    <button
                      type="button"
                      aria-label="Eliminar cobertura"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-fg/[0.08] md:h-9 md:w-9"
                      onClick={async () => {
                        const ok = await confirm({
                          title: '¿Eliminar esta cobertura?',
                          confirmLabel: 'Eliminar',
                          destructive: true,
                        })
                        if (ok) delCoverage.mutate(c.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {past.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-fg">Anteriores</h3>
              <ul className="space-y-2">{past.map(renderTimeOff)}</ul>
            </section>
          )}
        </div>
      )}

      <AvailabilityModal
        employee={editing}
        employees={all}
        staffSingular={staffSingular}
        timezone={timezone}
        only={mode}
        onSwitch={mode === 'timeoff' ? setEditing : undefined}
        onClose={() => setEditing(null)}
      />
      {dialog}
    </div>
  )
}
