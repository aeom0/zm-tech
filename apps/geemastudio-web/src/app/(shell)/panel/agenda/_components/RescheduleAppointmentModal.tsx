'use client'

import { useState } from 'react'
import { X, Calendar, Clock } from 'lucide-react'
import { fetchAppointmentServices, rescheduleAppointment } from '@geemastudio/data'
import { supabase } from '@/lib/supabase'

/** Montar solo mientras está abierto: el estado del formulario se inicializa al montar. */
interface RescheduleAppointmentModalProps {
  appointmentId: string
  clientName: string
  currentDateIso: string
  currentEmployeeId: string | null
  duration: number
  timeZone: string
  onClose: () => void
  onSuccess: () => void
}

export function RescheduleAppointmentModal({
  appointmentId,
  clientName,
  currentDateIso,
  currentEmployeeId,
  duration,
  timeZone,
  onClose,
  onSuccess,
}: RescheduleAppointmentModalProps) {
  const initialDate = currentDateIso.slice(0, 10)
  const initialTime = currentDateIso.slice(11, 16) || '10:00'

  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(initialTime)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setIsSubmitting(true)
    setErrorMessage(null)

    const newDateTimeIso = `${date}T${time}:00`

    try {
      // Solo cambia la hora: el choque se valida contra todos los profesionales de la cita.
      const lines = await fetchAppointmentServices(supabase, appointmentId)
      const employeeIds = [
        ...new Set(lines.map((l) => l.employee_id).filter((id): id is string => !!id)),
      ]
      await rescheduleAppointment(supabase, {
        id: appointmentId,
        date: newDateTimeIso,
        employee_id: currentEmployeeId ?? employeeIds[0] ?? '',
        employeeIds,
        duration,
        timeZone,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setErrorMessage((err as Error).message || 'No se pudo reprogramar la cita')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-fg/[0.08] bg-sunken p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-fg/[0.08] pb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[var(--tenant-primary)]" />
            <h2 className="text-lg font-bold text-fg">Reprogramar Cita</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-fg-subtle hover:bg-fg/[0.05] hover:text-fg"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <p className="text-sm text-fg-muted">
            Reprogramando cita para <strong className="text-fg">{clientName}</strong> ({duration}{' '}
            min).
          </p>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-fg-soft">Nueva fecha *</label>
              <div className="relative">
                <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
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
              <label className="mb-1 block text-xs font-semibold text-fg-soft">Nueva hora *</label>
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

          <div className="flex justify-end gap-3 pt-3">
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
              {isSubmitting ? 'Guardando…' : 'Confirmar cambio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
