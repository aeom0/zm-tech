'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Loader2, Plus, Trash2 } from 'lucide-react'
import { WEEK_DAYS, trimTime } from '@geemastudio/shared-schema'

import { useSaveWorkShifts, useWorkShifts } from '@/hooks/personal/useAvailability'
import type { EmployeeRow } from '@/hooks/personal/types'
import { StateNote } from '@/components/ui/StateNote'
import { fieldClass, ghostBtnClass, primaryBtnClass } from './availabilityUi'

interface Shift {
  start: string
  end: string
}
type Week = Record<number, Shift[]>

const DEFAULT_SHIFT: Shift = { start: '09:00', end: '18:00' }

/** Suma minutos a HH:MM sin pasar de 23:59. */
function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number)
  const total = Math.min((h ?? 0) * 60 + (m ?? 0) + minutes, 23 * 60 + 59)
  const hh = Math.floor(total / 60)
  const mm = total % 60
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
}

/** El turno nuevo arranca cuando termina el último, para no solaparse. */
function nextShift(shifts: Shift[]): Shift {
  if (shifts.length === 0) return { ...DEFAULT_SHIFT }
  const start = [...shifts].sort((a, b) => a.end.localeCompare(b.end)).at(-1)?.end ?? '09:00'
  const end = addMinutes(start, 240)
  if (end <= start) return { start: '18:00', end: '22:00' }
  return { start, end }
}

function emptyWeek(): Week {
  return { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] }
}

function validate(week: Week): string | null {
  for (const d of WEEK_DAYS) {
    const shifts = [...(week[d.weekday] ?? [])].sort((a, b) => a.start.localeCompare(b.start))
    for (let i = 0; i < shifts.length; i++) {
      const s = shifts[i]!
      if (!s.start || !s.end || s.end <= s.start) {
        return `${d.label}: la hora de fin debe ser posterior al inicio.`
      }
      if (i > 0 && s.start < shifts[i - 1]!.end) {
        return `${d.label}: los turnos se solapan.`
      }
    }
  }
  return null
}

export function ScheduleTab({ employee, staffSingular }: { employee: EmployeeRow; staffSingular: string }) {
  const query = useWorkShifts(employee.id)
  const save = useSaveWorkShifts(employee.id)
  const [custom, setCustom] = useState(false)
  const [week, setWeek] = useState<Week>(emptyWeek())
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!query.data) return
    const w = emptyWeek()
    for (const r of query.data) {
      w[r.weekday]!.push({ start: trimTime(r.start_time), end: trimTime(r.end_time) })
    }
    setWeek(w)
    setCustom(query.data.length > 0)
  }, [query.data])

  const update = (weekday: number, next: Shift[]) => {
    setSaved(false)
    setWeek((prev) => ({ ...prev, [weekday]: next }))
  }

  const enableCustom = (on: boolean) => {
    setSaved(false)
    setCustom(on)
    if (on && WEEK_DAYS.every((d) => (week[d.weekday] ?? []).length === 0)) {
      const w = emptyWeek()
      for (const d of WEEK_DAYS) if (d.weekday !== 0) w[d.weekday] = [{ ...DEFAULT_SHIFT }]
      setWeek(w)
    }
  }

  const copyTo = (from: number) => {
    setSaved(false)
    setWeek((prev) => {
      const next = emptyWeek()
      for (const d of WEEK_DAYS) next[d.weekday] = (prev[from] ?? []).map((s) => ({ ...s }))
      return next
    })
  }

  if (query.isLoading) return <StateNote kind="loading">Cargando horario…</StateNote>
  if (query.isError || !query.data) {
    return (
      <StateNote kind="error">
        No se pudo cargar el horario. Recarga antes de guardar, para no borrar los turnos.
      </StateNote>
    )
  }

  const error = custom ? validate(week) : null
  const noShifts = custom && WEEK_DAYS.every((d) => (week[d.weekday] ?? []).length === 0)

  const submit = () => {
    const shifts = custom
      ? WEEK_DAYS.flatMap((d) =>
          (week[d.weekday] ?? []).map((s) => ({
            weekday: d.weekday,
            start_time: s.start,
            end_time: s.end,
          }))
        )
      : []
    save.mutate(shifts, { onSuccess: () => setSaved(true) })
  }

  return (
    <div className="space-y-4">
      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-2xl border border-fg/[0.08] bg-card px-4 py-3">
        <input
          type="checkbox"
          checked={!custom}
          onChange={(e) => enableCustom(!e.target.checked)}
          className="h-5 w-5 accent-[var(--tenant-primary)]"
        />
        <span>
          <span className="block text-sm font-semibold text-fg">Usa el horario del negocio</span>
          <span className="block text-xs text-fg-subtle">
            Desmárcalo para definir los días y turnos de {staffSingular.toLowerCase()}.
          </span>
        </span>
      </label>

      {custom && (
        <div className="space-y-2">
          {WEEK_DAYS.map((d) => {
            const shifts = week[d.weekday] ?? []
            return (
              <div key={d.weekday} className="rounded-2xl border border-fg/[0.08] bg-card px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-fg">{d.label}</span>
                  <div className="flex gap-1">
                    {shifts.length > 0 && (
                      <button
                        type="button"
                        title="Copiar a los demás días"
                        aria-label={`Copiar el horario del ${d.label.toLowerCase()} a los demás días`}
                        className={`${ghostBtnClass} !px-2`}
                        onClick={() => copyTo(d.weekday)}
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label={`Agregar turno el ${d.label.toLowerCase()}`}
                      className={`${ghostBtnClass} !px-2`}
                      onClick={() => update(d.weekday, [...shifts, nextShift(shifts)])}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {shifts.length === 0 ? (
                  <p className="mt-1 text-xs text-fg-subtle">No trabaja este día.</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {shifts.map((s, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={s.start}
                          aria-label="Inicio del turno"
                          className={fieldClass}
                          onChange={(e) =>
                            update(d.weekday, shifts.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))
                          }
                        />
                        <span className="text-fg-subtle">a</span>
                        <input
                          type="time"
                          value={s.end}
                          aria-label="Fin del turno"
                          className={fieldClass}
                          onChange={(e) =>
                            update(d.weekday, shifts.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))
                          }
                        />
                        <button
                          type="button"
                          aria-label="Quitar turno"
                          className={`${ghostBtnClass} !px-2`}
                          onClick={() => update(d.weekday, shifts.filter((_, j) => j !== i))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          })}
        </div>
      )}

      {noShifts && (
        <StateNote kind="warning">
          Agrega al menos un turno, o vuelve a usar el horario del negocio. Guardar sin turnos borraría el
          horario de {staffSingular.toLowerCase()}.
        </StateNote>
      )}
      {error && <StateNote kind="error">{error}</StateNote>}
      {save.error && <StateNote kind="error">{(save.error as Error).message}</StateNote>}

      <div className="flex items-center justify-end gap-3">
        {saved && (
          <span className="inline-flex items-center gap-1 text-xs text-fg-subtle">
            <Check className="h-4 w-4" /> Guardado
          </span>
        )}
        <button
          type="button"
          className={primaryBtnClass}
          disabled={save.isPending || !!error || noShifts}
          onClick={submit}
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Guardar horario
        </button>
      </div>
    </div>
  )
}
