'use client'

import { useId, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Calendar } from 'lucide-react'
import { fetchAppointmentServices, rescheduleAppointment } from '@geemastudio/data'

import { Button } from '@/components/ui/Button'
import { Field, FormError, inputClass } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useAvailabilityCheck } from '@/hooks/agenda/useAvailabilityCheck'
import { supabase } from '@/lib/supabase'

import { AvailabilityNote } from './AvailabilityNote'

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
  const ids = useId()
  const [date, setDate] = useState(currentDateIso.slice(0, 10))
  const [time, setTime] = useState(currentDateIso.slice(11, 16) || '10:00')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Solo cambia la hora: el choque se valida contra todos los profesionales de la cita.
  const linesQuery = useQuery({
    queryKey: ['web_agenda_appointment_lines', appointmentId],
    enabled: !!supabase,
    queryFn: async () => (supabase ? fetchAppointmentServices(supabase, appointmentId) : []),
  })
  const lineEmployeeIds = [
    ...new Set(
      (linesQuery.data ?? []).map((l) => l.employee_id).filter((id): id is string => !!id)
    ),
  ]
  const employeeIds =
    lineEmployeeIds.length > 0 ? lineEmployeeIds : currentEmployeeId ? [currentEmployeeId] : []

  const wallclock = date && time ? `${date}T${time}:00` : null
  const availability = useAvailabilityCheck({
    employeeIds,
    wallclock,
    durationMinutes: duration,
    timeZone,
    excludeAppointmentId: appointmentId,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !wallclock) return
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      await rescheduleAppointment(supabase, {
        id: appointmentId,
        date: wallclock,
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

  const formId = `${ids}-form`

  return (
    <Modal
      title="Reprogramar cita"
      icon={<Calendar className="h-5 w-5 text-[var(--tenant-primary)]" />}
      description={
        <>
          <strong className="text-fg">{clientName}</strong> · {duration} min
        </>
      }
      size="sm"
      onClose={onClose}
      dismissible={!isSubmitting}
      footer={
        <>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form={formId}
            variant="primary"
            loading={isSubmitting}
            disabled={availability.status === 'busy'}
          >
            Guardar cambio
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <FormError message={errorMessage} />

        <div className="grid grid-cols-2 gap-3">
          <Field label="Nueva fecha" htmlFor={`${ids}-date`}>
            <input
              id={`${ids}-date`}
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Nueva hora" htmlFor={`${ids}-time`}>
            <input
              id={`${ids}-time`}
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        <AvailabilityNote state={availability} />
      </form>
    </Modal>
  )
}
