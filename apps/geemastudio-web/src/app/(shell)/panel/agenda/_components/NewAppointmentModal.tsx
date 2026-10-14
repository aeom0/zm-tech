'use client'

import { useState } from 'react'
import { Plus, Trash2, X, Clock, Calendar as CalendarIcon, User, DollarSign } from 'lucide-react'
import {
  computeServiceLinesTotals,
  createAppointment,
  type AgendaService,
  type AgendaServiceLine,
} from '@geemastudio/data'
import { formatAppointmentWallclock } from '@zmtech/tenant-config'
import { supabase } from '@/lib/supabase'

/** Montar solo mientras está abierto: el estado del formulario se inicializa al montar. */
interface NewAppointmentModalProps {
  onClose: () => void
  onSuccess: () => void
  services: AgendaService[]
  employees: { id: string; name: string; color: string }[]
  initialDate?: string // YYYY-MM-DD
  timeZone: string
  currencyCode: string
  tenantId: string
}

export function NewAppointmentModal({
  onClose,
  onSuccess,
  services,
  employees,
  initialDate,
  timeZone,
  currencyCode,
  tenantId,
}: NewAppointmentModalProps) {
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [date, setDate] = useState(
    () => initialDate || formatAppointmentWallclock(new Date(), timeZone).slice(0, 10)
  )
  const [time, setTime] = useState('10:00')

  const defaultEmpId = employees[0]?.id || ''
  const defaultSvcId = services[0]?.id || ''

  const [lines, setLines] = useState<AgendaServiceLine[]>([
    { serviceId: defaultSvcId, employeeId: defaultEmpId },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const totals = computeServiceLinesTotals(lines, services)

  const handleAddLine = () => {
    if (services.length === 0) return
    setLines((prev) => [...prev, { serviceId: services[0].id, employeeId: defaultEmpId }])
  }

  const handleRemoveLine = (index: number) => {
    if (lines.length <= 1) return
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  const handleUpdateLine = (index: number, patch: Partial<AgendaServiceLine>) => {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) {
      setErrorMessage('No hay conexión con el servidor')
      return
    }
    if (!clientName.trim()) {
      setErrorMessage('Ingresa el nombre del cliente')
      return
    }
    if (lines.length === 0 || lines.some((l) => !l.serviceId || !l.employeeId)) {
      setErrorMessage('Selecciona servicio y profesional en cada línea')
      return
    }

    const dateTimeIso = `${date}T${time}:00`

    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await createAppointment(
        supabase,
        {
          client_name: clientName.trim(),
          client_phone: clientPhone.trim() || null,
          date: dateTimeIso,
          status: 'scheduled',
          lines,
          tenantId,
          timeZone,
        },
        services
      )

      onSuccess()
      onClose()
    } catch (err) {
      setErrorMessage((err as Error).message || 'No se pudo crear la cita')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-fg/[0.08] bg-sunken p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-fg/[0.08] pb-4">
          <h2 className="text-lg font-bold text-fg">Nueva Cita</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-fg/[0.05] hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          {/* Cliente */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-soft">Cliente *</label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nombre y apellido"
                  className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-soft">Teléfono</label>
              <input
                type="tel"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Ej. +51 987654321"
                className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
              />
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-soft">Fecha *</label>
              <div className="relative">
                <CalendarIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-soft">Hora *</label>
              <div className="relative">
                <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                <input
                  type="time"
                  required
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] py-2 pl-9 pr-3 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
                />
              </div>
            </div>
          </div>

          {/* Servicios y Profesionales */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-fg-soft">
                Servicios seleccionados ({lines.length})
              </label>
              <button
                type="button"
                onClick={handleAddLine}
                className="inline-flex items-center gap-1 text-xs font-medium text-[var(--tenant-primary)] hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar servicio
              </button>
            </div>

            <div className="max-h-48 space-y-2.5 overflow-y-auto pr-1">
              {lines.map((line, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-xl border border-fg/[0.06] bg-fg/[0.02] p-2.5"
                >
                  <div className="flex-1 space-y-2 sm:flex sm:items-center sm:gap-2 sm:space-y-0">
                    <select
                      value={line.serviceId}
                      onChange={(e) => handleUpdateLine(idx, { serviceId: e.target.value })}
                      className="w-full rounded-lg border border-fg/[0.08] bg-sunken px-2.5 py-1.5 text-xs text-fg outline-none"
                    >
                      {services.map((svc) => (
                        <option key={svc.id} value={svc.id}>
                          {svc.name} ({svc.duration}m - {currencyCode} {svc.price})
                        </option>
                      ))}
                    </select>

                    <select
                      value={line.employeeId}
                      onChange={(e) => handleUpdateLine(idx, { employeeId: e.target.value })}
                      className="w-full rounded-lg border border-fg/[0.08] bg-sunken px-2.5 py-1.5 text-xs text-fg outline-none sm:w-44"
                    >
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(idx)}
                      className="rounded-lg p-1.5 text-fg-subtle hover:bg-red-500/10 hover:text-red-500"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totales */}
          <div className="flex items-center justify-between rounded-xl border border-fg/[0.08] bg-fg/[0.04] p-3 text-sm">
            <div className="flex items-center gap-2 text-fg-subtle">
              <Clock className="h-4 w-4" />
              <span>Duración: {totals.totalDuration} min</span>
            </div>
            <div className="flex items-center gap-1 font-bold text-fg">
              <DollarSign className="h-4 w-4 text-[var(--tenant-primary)]" />
              <span>
                Total: {currencyCode} {totals.totalPrice.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-fg/[0.08] px-4 py-2 text-sm font-medium text-fg-soft hover:bg-fg/[0.04]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-[var(--tenant-primary)] px-5 py-2 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Guardando…' : 'Crear cita'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
