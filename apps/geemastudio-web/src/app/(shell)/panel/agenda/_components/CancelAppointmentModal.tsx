'use client'

import { useState } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import {
  APPOINTMENT_CANCEL_REASONS,
  type AppointmentCancelReason,
} from '@geemastudio/shared-schema'
import { cancelAppointment } from '@geemastudio/data'
import { supabase } from '@/lib/supabase'

/** Montar solo mientras está abierto: el estado del formulario se inicializa al montar. */
interface CancelAppointmentModalProps {
  appointmentId: string
  clientName: string
  timeZone: string
  onClose: () => void
  onSuccess: () => void
}

export function CancelAppointmentModal({
  appointmentId,
  clientName,
  timeZone,
  onClose,
  onSuccess,
}: CancelAppointmentModalProps) {
  const [reason, setReason] = useState<AppointmentCancelReason>('client_cancelled')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await cancelAppointment(supabase, {
        id: appointmentId,
        reason,
        note: note.trim() || null,
        timeZone,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setErrorMessage((err as Error).message || 'No se pudo cancelar la cita')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-scrim/60" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-fg/[0.08] bg-sunken p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-fg/[0.08] pb-4">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <h2 className="text-lg font-bold text-fg">Cancelar Cita</h2>
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
            ¿Confirmas la cancelación de la cita de{' '}
            <strong className="text-fg">{clientName}</strong>?
          </p>

          {errorMessage && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
              {errorMessage}
            </div>
          )}

          <div>
            <label className="mb-1 block text-xs font-semibold text-fg-soft">
              Motivo de cancelación *
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as AppointmentCancelReason)}
              className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
            >
              {APPOINTMENT_CANCEL_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-fg-soft">
              Observación adicional (opcional)
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Detalles sobre la cancelación…"
              className="w-full rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2 text-sm text-fg outline-none focus:border-[var(--tenant-primary)]"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-fg/[0.08] px-4 py-2 text-sm font-medium text-fg-soft hover:bg-fg/[0.04]"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Cancelando…' : 'Confirmar cancelación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
