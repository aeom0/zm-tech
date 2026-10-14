'use client'

import { useId, useState } from 'react'
import { AlertTriangle, UserX } from 'lucide-react'
import {
  APPOINTMENT_CANCEL_REASONS,
  type AppointmentCancelReason,
} from '@geemastudio/shared-schema'
import { cancelAppointment, NO_SHOW_CANCEL_REASON } from '@geemastudio/data'

import { Button } from '@/components/ui/Button'
import { Field, FormError, inputClass } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { supabase } from '@/lib/supabase'

/** Montar solo mientras está abierto: el estado del formulario se inicializa al montar. */
interface CancelAppointmentModalProps {
  appointmentId: string
  clientName: string
  timeZone: string
  /** Motivo preseleccionado (p. ej. `no_show` desde «No asistió»). */
  initialReason?: AppointmentCancelReason
  onClose: () => void
  onSuccess: () => void
}

export function CancelAppointmentModal({
  appointmentId,
  clientName,
  timeZone,
  initialReason = 'client_cancelled',
  onClose,
  onSuccess,
}: CancelAppointmentModalProps) {
  const ids = useId()
  const [reason, setReason] = useState<AppointmentCancelReason>(initialReason)
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const isNoShow = reason === NO_SHOW_CANCEL_REASON

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

  const formId = `${ids}-form`

  return (
    <Modal
      title={isNoShow ? 'Marcar inasistencia' : 'Cancelar cita'}
      icon={
        isNoShow ? (
          <UserX className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        ) : (
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
        )
      }
      description={
        <>
          Cita de <strong className="text-fg">{clientName}</strong>
        </>
      }
      size="sm"
      onClose={onClose}
      dismissible={!isSubmitting}
      footer={
        <>
          <Button onClick={onClose} disabled={isSubmitting}>
            Volver
          </Button>
          <Button type="submit" form={formId} variant="danger" loading={isSubmitting}>
            {isNoShow ? 'Marcar inasistencia' : 'Cancelar cita'}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <FormError message={errorMessage} />

        <Field label="Motivo" htmlFor={`${ids}-reason`}>
          <select
            id={`${ids}-reason`}
            value={reason}
            onChange={(e) => setReason(e.target.value as AppointmentCancelReason)}
            className={inputClass}
          >
            {APPOINTMENT_CANCEL_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Observación (opcional)" htmlFor={`${ids}-note`}>
          <textarea
            id={`${ids}-note`}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Detalles para el historial de la clienta"
            className={inputClass}
          />
        </Field>
      </form>
    </Modal>
  )
}
