'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarOff, Loader2, Trash2, UserCheck } from 'lucide-react'
import {
  EMPLOYEE_TIME_OFF_KINDS,
  TIME_OFF_KIND_LABELS,
  trimTime,
  type EmployeeTimeOffKind,
} from '@geemastudio/shared-schema'

import {
  useAddCoverage,
  useAddTimeOff,
  useAffectedAppointments,
  useCoverages,
  useDeleteCoverage,
  useDeleteTimeOff,
  useTimeOff,
} from '@/hooks/personal/useAvailability'
import type { EmployeeRow } from '@/hooks/personal/types'
import { StateNote } from '@/components/ui/StateNote'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import {
  fieldClass,
  formatIsoDate,
  ghostBtnClass,
  labelClass,
  primaryBtnClass,
  todayIso,
} from './availabilityUi'

function rangeLabel(from: string, to: string | null): string {
  if (to === null) return `Desde el ${formatIsoDate(from)}, hasta nuevo aviso`
  return from === to ? formatIsoDate(from) : `${formatIsoDate(from)} al ${formatIsoDate(to)}`
}

function AffectedList({
  loading,
  items,
}: {
  loading: boolean
  items: { id: string; date: string; client_name: string | null }[]
}) {
  if (loading) return null
  if (items.length === 0) return null
  return (
    <StateNote kind="warning">
      <span className="block font-semibold">
        {items.length} {items.length === 1 ? 'cita quedaría' : 'citas quedarían'} sin profesional
      </span>
      <span className="mt-1 block text-xs">
        Se conservan, pero hay que reasignarlas desde Asignar profesionales.
      </span>
      <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-xs">
        {items.map((a) => (
          <li key={a.id}>
            {formatIsoDate(a.date.slice(0, 10))} {a.date.slice(11, 16)} · {a.client_name ?? 'Sin nombre'}
          </li>
        ))}
      </ul>
    </StateNote>
  )
}

export function TimeOffTab({
  employee,
  employees,
  staffSingular,
  timezone,
}: {
  employee: EmployeeRow
  employees: EmployeeRow[]
  staffSingular: string
  timezone?: string | null
}) {
  const timeOff = useTimeOff(employee.id)
  const coverages = useCoverages()
  const addTimeOff = useAddTimeOff(employee.id)
  const delTimeOff = useDeleteTimeOff(employee.id)
  const addCoverage = useAddCoverage()
  const delCoverage = useDeleteCoverage()
  const { confirm, dialog } = useConfirm()

  const names = useMemo(() => new Map(employees.map((e) => [e.id, e.name])), [employees])
  const others = employees.filter((e) => e.id !== employee.id && e.is_active)

  // Formulario de ausencia
  const [kind, setKind] = useState<EmployeeTimeOffKind>('vacation')
  const [from, setFrom] = useState(() => todayIso(timezone))
  const [to, setTo] = useState(() => todayIso(timezone))
  const [datesTouched, setDatesTouched] = useState(false)
  const [openEnded, setOpenEnded] = useState(false)
  const [partial, setPartial] = useState(false)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('13:00')
  const [reason, setReason] = useState('')
  const [paid, setPaid] = useState<'na' | 'yes' | 'no'>('na')
  const [offError, setOffError] = useState<string | null>(null)

  // Formulario de cobertura
  const [covering, setCovering] = useState('')
  const [covFrom, setCovFrom] = useState(() => todayIso(timezone))
  const [covTo, setCovTo] = useState(() => todayIso(timezone))
  const [covDatesTouched, setCovDatesTouched] = useState(false)
  const [covNote, setCovNote] = useState('')
  const [covError, setCovError] = useState<string | null>(null)

  // La zona del negocio puede llegar después del primer render.
  useEffect(() => {
    if (!timezone || datesTouched) return
    const hoy = todayIso(timezone)
    setFrom(hoy)
    setTo(hoy)
  }, [timezone, datesTouched])
  useEffect(() => {
    if (!timezone || covDatesTouched) return
    const hoy = todayIso(timezone)
    setCovFrom(hoy)
    setCovTo(hoy)
  }, [timezone, covDatesTouched])

  const effectiveTo = openEnded ? null : to
  const rangeValid = !!from && (openEnded || (!!to && to >= from))
  const offAffected = useAffectedAppointments(
    rangeValid
      ? {
          employeeId: employee.id,
          dateFrom: from,
          dateTo: effectiveTo,
          startTime: partial ? startTime : null,
          endTime: partial ? endTime : null,
        }
      : null
  )

  const covValid = !!covFrom && !!covTo && covTo >= covFrom
  const covAffected = useAffectedAppointments(
    covValid ? { employeeId: employee.id, dateFrom: covFrom, dateTo: covTo } : null
  )

  const offReviewing = rangeValid && (offAffected.isLoading || offAffected.isFetching)
  const covReviewing = covValid && (covAffected.isLoading || covAffected.isFetching)

  const submitTimeOff = (e: React.FormEvent) => {
    e.preventDefault()
    setOffError(null)
    if (offReviewing) return
    if (!rangeValid) return setOffError('Revisa las fechas: el fin no puede ser anterior al inicio.')
    if (partial && endTime <= startTime) return setOffError('La hora de fin debe ser posterior al inicio.')
    addTimeOff.mutate(
      {
        employee_id: employee.id,
        kind,
        date_from: from,
        date_to: effectiveTo,
        start_time: partial ? startTime : null,
        end_time: partial ? endTime : null,
        reason: reason.trim() || null,
        is_paid: paid === 'na' ? null : paid === 'yes',
      },
      { onSuccess: () => setReason('') }
    )
  }

  const submitCoverage = (e: React.FormEvent) => {
    e.preventDefault()
    setCovError(null)
    if (covReviewing) return
    if (!covering) return setCovError(`Elige quién cubre a ${employee.name}.`)
    if (!covValid) return setCovError('Revisa las fechas: el fin no puede ser anterior al inicio.')
    addCoverage.mutate(
      {
        covered_employee_id: employee.id,
        covering_employee_id: covering,
        date_from: covFrom,
        date_to: covTo,
        note: covNote.trim() || null,
      },
      { onSuccess: () => setCovNote('') }
    )
  }

  const myCoverages = (coverages.data ?? []).filter(
    (c) => c.covered_employee_id === employee.id || c.covering_employee_id === employee.id
  )

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <CalendarOff className="h-4 w-4" /> Ausencias
        </h3>
        <form onSubmit={submitTimeOff} className="space-y-3 rounded-2xl border border-fg/[0.08] bg-card p-4">
          <div>
            <label className={labelClass} htmlFor="to-kind">Motivo</label>
            <select id="to-kind" className={fieldClass} value={kind} onChange={(e) => setKind(e.target.value as EmployeeTimeOffKind)}>
              {EMPLOYEE_TIME_OFF_KINDS.map((k) => (
                <option key={k} value={k}>{TIME_OFF_KIND_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="to-from">Desde</label>
              <input id="to-from" type="date" className={fieldClass} value={from} onChange={(e) => { setDatesTouched(true); setFrom(e.target.value) }} />
            </div>
            <div>
              <label className={labelClass} htmlFor="to-to">Hasta</label>
              <input id="to-to" type="date" className={fieldClass} value={to} min={from} disabled={openEnded} onChange={(e) => { setDatesTouched(true); setTo(e.target.value) }} />
            </div>
          </div>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-fg">
            <input type="checkbox" checked={openEnded} onChange={(e) => setOpenEnded(e.target.checked)} className="h-5 w-5 accent-[var(--tenant-primary)]" />
            Hasta nuevo aviso
          </label>
          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-sm text-fg">
            <input type="checkbox" checked={partial} onChange={(e) => setPartial(e.target.checked)} className="h-5 w-5 accent-[var(--tenant-primary)]" />
            Solo un horario del día (turno)
          </label>
          {partial && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass} htmlFor="to-st">Desde la hora</label>
                <input id="to-st" type="time" className={fieldClass} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>
              <div>
                <label className={labelClass} htmlFor="to-et">Hasta la hora</label>
                <input id="to-et" type="time" className={fieldClass} value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="to-reason">Nota (opcional)</label>
              <input id="to-reason" className={fieldClass} value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
            <div>
              <label className={labelClass} htmlFor="to-paid">Remunerada</label>
              <select id="to-paid" className={fieldClass} value={paid} onChange={(e) => setPaid(e.target.value as 'na' | 'yes' | 'no')}>
                <option value="na">No aplica</option>
                <option value="yes">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>
          <AffectedList loading={offAffected.isLoading} items={offAffected.data ?? []} />
          {offError && <StateNote kind="error">{offError}</StateNote>}
          {addTimeOff.error && <StateNote kind="error">{(addTimeOff.error as Error).message}</StateNote>}
          <div className="flex justify-end">
            <button type="submit" className={primaryBtnClass} disabled={addTimeOff.isPending || offReviewing}>
              {(addTimeOff.isPending || offReviewing) && <Loader2 className="h-4 w-4 animate-spin" />}
              {offReviewing
                ? 'Revisando citas…'
                : (offAffected.data?.length ?? 0) > 0
                  ? 'Guardar de todos modos'
                  : 'Guardar ausencia'}
            </button>
          </div>
        </form>

        {timeOff.isLoading ? (
          <StateNote kind="loading">Cargando ausencias…</StateNote>
        ) : (timeOff.data ?? []).length === 0 ? (
          <StateNote kind="empty">{staffSingular} no tiene ausencias registradas.</StateNote>
        ) : (
          <ul className="space-y-2">
            {(timeOff.data ?? []).map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-2xl border border-fg/[0.08] bg-card px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-fg">{TIME_OFF_KIND_LABELS[t.kind]}</div>
                  <div className="text-xs text-fg-muted">
                    {rangeLabel(t.date_from, t.date_to)}
                    {t.start_time && t.end_time ? ` · ${trimTime(t.start_time)}–${trimTime(t.end_time)}` : ''}
                  </div>
                  {t.reason && <div className="truncate text-xs text-fg-subtle">{t.reason}</div>}
                </div>
                <button
                  type="button"
                  aria-label="Eliminar ausencia"
                  className={`${ghostBtnClass} !px-2`}
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
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <UserCheck className="h-4 w-4" /> Coberturas
        </h3>
        <p className="text-xs text-fg-subtle">
          Quien cubre hereda todos los servicios de {employee.name} esos días, y {employee.name} no recibe citas.
        </p>
        <form onSubmit={submitCoverage} className="space-y-3 rounded-2xl border border-fg/[0.08] bg-card p-4">
          <div>
            <label className={labelClass} htmlFor="cov-who">Quién cubre</label>
            <select id="cov-who" className={fieldClass} value={covering} onChange={(e) => setCovering(e.target.value)}>
              <option value="">Elegir…</option>
              {others.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="cov-from">Desde</label>
              <input id="cov-from" type="date" className={fieldClass} value={covFrom} onChange={(e) => { setCovDatesTouched(true); setCovFrom(e.target.value) }} />
            </div>
            <div>
              <label className={labelClass} htmlFor="cov-to">Hasta</label>
              <input id="cov-to" type="date" className={fieldClass} value={covTo} min={covFrom} onChange={(e) => { setCovDatesTouched(true); setCovTo(e.target.value) }} />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="cov-note">Nota (opcional)</label>
            <input id="cov-note" className={fieldClass} value={covNote} onChange={(e) => setCovNote(e.target.value)} />
          </div>
          <AffectedList loading={covAffected.isLoading} items={covAffected.data ?? []} />
          {covError && <StateNote kind="error">{covError}</StateNote>}
          {addCoverage.error && <StateNote kind="error">{(addCoverage.error as Error).message}</StateNote>}
          <div className="flex justify-end">
            <button type="submit" className={primaryBtnClass} disabled={addCoverage.isPending || covReviewing}>
              {(addCoverage.isPending || covReviewing) && <Loader2 className="h-4 w-4 animate-spin" />}
              {covReviewing
                ? 'Revisando citas…'
                : (covAffected.data?.length ?? 0) > 0
                  ? 'Guardar de todos modos'
                  : 'Guardar cobertura'}
            </button>
          </div>
        </form>

        {myCoverages.length > 0 && (
          <ul className="space-y-2">
            {myCoverages.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-2xl border border-fg/[0.08] bg-card px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-fg">
                    {names.get(c.covering_employee_id) ?? 'Profesional'} cubre a{' '}
                    {names.get(c.covered_employee_id) ?? 'Profesional'}
                  </div>
                  <div className="text-xs text-fg-muted">{rangeLabel(c.date_from, c.date_to)}</div>
                  {c.note && <div className="truncate text-xs text-fg-subtle">{c.note}</div>}
                </div>
                <button
                  type="button"
                  aria-label="Eliminar cobertura"
                  className={`${ghostBtnClass} !px-2`}
                  onClick={async () => {
                    const ok = await confirm({
                      title: '¿Eliminar esta cobertura?',
                      confirmLabel: 'Eliminar',
                      destructive: true,
                    })
                    if (ok) delCoverage.mutate(c.id)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {dialog}
    </div>
  )
}
