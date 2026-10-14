'use client'

import { useMemo, useState } from 'react'
import { CalendarOff, CalendarPlus, Download, Pencil, Sun, Trash2 } from 'lucide-react'
import type { SalonHolidayRecord } from '@geemastudio/data'
import {
  dateKeyEnZona,
  describeSpecialDayHours,
  formatHourLabel,
  zonaIANASegura,
} from '@zmtech/tenant-config'

import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Field, FormError, inputClass } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { StateNote } from '@/components/ui/StateNote'
import { useAuth } from '@/contexts/AuthContext'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { useSalonHolidayMutations, useSalonHolidays } from '@/hooks/feriados/useSalonHolidays'

import { ConfiguracionNav } from '../configuracion/_components/ConfiguracionNav'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
/** null = horario habitual del día. */
const OPEN_FROM_OPTIONS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const OPEN_UNTIL_OPTIONS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]

function formatDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString('es', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export default function PanelFeriadosPage() {
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { data: settings } = useTenantSettings()
  const holidaysQuery = useSalonHolidays()
  const { create, update, remove, reloadCatalog } = useSalonHolidayMutations(
    holidaysQuery.tenantId,
    holidaysQuery.country
  )
  const { confirm, dialog } = useConfirm()
  const [editing, setEditing] = useState<SalonHolidayRecord | 'new' | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const today = dateKeyEnZona(new Date(), zonaIANASegura(settings?.timezone))
  const { upcoming, past } = useMemo(() => {
    const sorted = [...holidaysQuery.holidays].sort((a, b) => a.date.localeCompare(b.date))
    return {
      upcoming: sorted.filter((h) => h.date.slice(0, 10) >= today),
      past: sorted.filter((h) => h.date.slice(0, 10) < today).reverse(),
    }
  }, [holidaysQuery.holidays, today])

  const handleDelete = async (row: SalonHolidayRecord) => {
    const ok = await confirm({
      title: 'Eliminar feriado',
      description: `Se quitará ${row.name} (${formatDateKey(row.date)}). La agenda y el asistente volverán al horario habitual ese día.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (!ok) return
    setError(null)
    remove.mutate(row.id, { onError: (e) => setError(e.message) })
  }

  const handleReload = async () => {
    const ok = await confirm({
      title: 'Recargar feriados nacionales',
      description:
        'Se agregan las fechas del catálogo de tu país que falten. No modifica los días que ya editaste.',
      confirmLabel: 'Recargar',
    })
    if (!ok) return
    setError(null)
    reloadCatalog.mutate(undefined, {
      onSuccess: (n) =>
        setNotice(n > 0 ? 'Catálogo nacional revisado.' : 'Tu país no tiene catálogo de feriados.'),
      onError: (e) => setError(e.message),
    })
  }

  if (!authLoading && !isAdmin) {
    return (
      <div className="max-w-2xl space-y-6">
        <ConfiguracionNav />
        <StateNote kind="warning">Solo el dueño del negocio puede editar los feriados.</StateNote>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <ConfiguracionNav />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-fg sm:text-2xl">Feriados y días especiales</h1>
          <p className="mt-1 max-w-prose text-sm text-fg-muted">
            Cierra el local o recorta el horario de un día: abrir más tarde, adelantar la última
            cita o ambas. La agenda y el asistente de WhatsApp lo respetan.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            size="sm"
            icon={<Download className="h-3.5 w-3.5" />}
            onClick={handleReload}
            loading={reloadCatalog.isPending}
          >
            Nacionales
          </Button>
          <Button
            size="sm"
            variant="primary"
            icon={<CalendarPlus className="h-3.5 w-3.5" />}
            onClick={() => setEditing('new')}
          >
            Agregar día
          </Button>
        </div>
      </div>

      <FormError message={error} />
      {notice && (
        <div role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-800 dark:text-emerald-200">
          {notice}
        </div>
      )}

      {holidaysQuery.isLoading ? (
        <StateNote kind="loading">Cargando feriados…</StateNote>
      ) : holidaysQuery.error ? (
        <StateNote kind="error">{(holidaysQuery.error as Error).message}</StateNote>
      ) : holidaysQuery.holidays.length === 0 ? (
        <StateNote kind="empty" icon={<CalendarOff className="h-5 w-5" />}>
          No hay feriados registrados. Usa «Nacionales» o agrega un día.
        </StateNote>
      ) : (
        <div className="space-y-6">
          <HolidayList
            title={`Próximos (${upcoming.length})`}
            rows={upcoming}
            onEdit={setEditing}
            onDelete={handleDelete}
          />
          {past.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-fg-subtle hover:text-fg-soft">
                Pasados ({past.length})
              </summary>
              <div className="mt-2 opacity-70">
                <HolidayList rows={past} onEdit={setEditing} onDelete={handleDelete} />
              </div>
            </details>
          )}
        </div>
      )}

      {editing && (
        <HolidayModal
          holiday={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSave={async (values) => {
            if (editing === 'new') {
              await create.mutateAsync(values)
            } else {
              await update.mutateAsync({ id: editing.id, ...values })
            }
          }}
        />
      )}

      {dialog}
    </div>
  )
}

function HolidayList({
  title,
  rows,
  onEdit,
  onDelete,
}: {
  title?: string
  rows: SalonHolidayRecord[]
  onEdit: (row: SalonHolidayRecord) => void
  onDelete: (row: SalonHolidayRecord) => void
}) {
  return (
    <section>
      {title && (
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">
          {title}
        </h2>
      )}
      {rows.length === 0 ? (
        <p className="text-sm text-fg-subtle">Sin días especiales próximos.</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-fg">{row.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                  <span>{formatDateKey(row.date)}</span>
                  <span
                    className={[
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold',
                      row.is_closed
                        ? 'bg-red-500/10 text-red-700 dark:text-red-300'
                        : 'bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]',
                    ].join(' ')}
                  >
                    {row.is_closed ? (
                      <CalendarOff className="h-3 w-3" aria-hidden />
                    ) : (
                      <Sun className="h-3 w-3" aria-hidden />
                    )}
                    {row.is_closed
                      ? 'Cerrado'
                      : describeSpecialDayHours({
                          openFromHour: row.open_from_hour,
                          openUntilHour: row.open_until_hour,
                        })}
                  </span>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Editar ${row.name}`}
                onClick={() => onEdit(row)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-fg-subtle hover:bg-fg/[0.06] hover:text-fg"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label={`Eliminar ${row.name}`}
                onClick={() => onDelete(row)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-fg-subtle hover:bg-red-500/10 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

interface HolidayValues {
  date: string
  name: string
  is_closed: boolean
  open_from_hour: number | null
  open_until_hour: number | null
}

/** Montar solo mientras está abierto: el estado del formulario se inicializa al montar. */
function HolidayModal({
  holiday,
  onClose,
  onSave,
}: {
  holiday: SalonHolidayRecord | null
  onClose: () => void
  onSave: (values: HolidayValues) => Promise<void>
}) {
  const [date, setDate] = useState(holiday?.date.slice(0, 10) ?? '')
  const [name, setName] = useState(holiday?.name ?? '')
  const [isClosed, setIsClosed] = useState(holiday?.is_closed ?? true)
  const [openFrom, setOpenFrom] = useState<number | null>(holiday?.open_from_hour ?? null)
  const [openUntil, setOpenUntil] = useState<number | null>(holiday?.open_until_hour ?? null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!DATE_RE.test(date)) return setError('Elige la fecha del día especial.')
    if (!name.trim()) return setError('Escribe un nombre para el día.')
    if (!isClosed && openFrom !== null && openUntil !== null && openFrom > openUntil) {
      return setError('La última cita no puede ser antes de la hora de apertura.')
    }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        date,
        name: name.trim(),
        is_closed: isClosed,
        open_from_hour: isClosed ? null : openFrom,
        open_until_hour: isClosed ? null : openUntil,
      })
      onClose()
    } catch (err) {
      setError((err as Error).message || 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={holiday ? 'Editar día especial' : 'Nuevo día especial'}
      icon={<CalendarPlus className="h-5 w-5 text-[var(--tenant-primary)]" />}
      onClose={onClose}
      dismissible={!saving}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button type="submit" form="holiday-form" variant="primary" loading={saving}>
            Guardar
          </Button>
        </>
      }
    >
      <form id="holiday-form" onSubmit={handleSubmit} className="space-y-4">
        <FormError message={error} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Fecha" htmlFor="holiday-date" hint={holiday ? 'La fecha no se puede cambiar.' : undefined}>
            <input
              id="holiday-date"
              type="date"
              required
              disabled={!!holiday}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Nombre" htmlFor="holiday-name">
            <input
              id="holiday-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Navidad"
              className={inputClass}
            />
          </Field>
        </div>

        <div role="radiogroup" aria-label="Tipo de día" className="grid grid-cols-2 gap-2">
          {[
            { closed: true, label: 'Cerrado', hint: 'Sin citas ese día', icon: CalendarOff },
            { closed: false, label: 'Horario especial', hint: 'Abre con otro horario', icon: Sun },
          ].map((opt) => {
            const active = isClosed === opt.closed
            const Icon = opt.icon
            return (
              <button
                key={opt.label}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setIsClosed(opt.closed)}
                className={[
                  'flex items-start gap-2 rounded-xl border p-3 text-left transition',
                  active
                    ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/10'
                    : 'border-line hover:bg-fg/[0.04]',
                ].join(' ')}
              >
                <Icon
                  className={`mt-0.5 h-4 w-4 ${active ? 'text-[var(--tenant-primary)]' : 'text-fg-subtle'}`}
                  aria-hidden
                />
                <span>
                  <span className="block text-sm font-semibold text-fg">{opt.label}</span>
                  <span className="block text-xs text-fg-muted">{opt.hint}</span>
                </span>
              </button>
            )
          })}
        </div>

        {!isClosed && (
          <div className="grid gap-3 sm:grid-cols-2">
            <HourSelect
              id="holiday-from"
              label="Primera cita desde"
              value={openFrom}
              options={OPEN_FROM_OPTIONS}
              onChange={setOpenFrom}
            />
            <HourSelect
              id="holiday-until"
              label="Última cita a las"
              value={openUntil}
              options={OPEN_UNTIL_OPTIONS.filter((h) => openFrom === null || h >= openFrom)}
              onChange={setOpenUntil}
            />
            <p className="text-xs text-fg-subtle sm:col-span-2">
              {describeSpecialDayHours({ openFromHour: openFrom, openUntilHour: openUntil })}
            </p>
          </div>
        )}
      </form>
    </Modal>
  )
}

function HourSelect({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: number | null
  options: number[]
  onChange: (hour: number | null) => void
}) {
  return (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        className={inputClass}
      >
        <option value="">Como siempre</option>
        {options.map((h) => (
          <option key={h} value={h}>
            {formatHourLabel(h)}
          </option>
        ))}
      </select>
    </Field>
  )
}
