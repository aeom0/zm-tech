'use client'

import { useId, useState } from 'react'
import { CalendarPlus, Clock } from 'lucide-react'
import {
  computeServiceLinesTotals,
  createAppointment,
  type AgendaService,
  type AgendaServiceLine,
} from '@geemastudio/data'
import { formatAppointmentWallclock } from '@zmtech/tenant-config'

import { Button } from '@/components/ui/Button'
import { Field, FormError, inputClass } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { useAvailabilityCheck } from '@/hooks/agenda/useAvailabilityCheck'
import { useServiceEligibility } from '@/hooks/personal/useAvailability'
import { useStaffLabels } from '@/hooks/personal/useStaffLabels'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'
import { supabase } from '@/lib/supabase'

import { AvailabilityNote } from './AvailabilityNote'
import { ServiceLinesEditor } from './ServiceLinesEditor'

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
  const ids = useId()
  const eligibilityQuery = useServiceEligibility()
  const { data: staffLabels } = useStaffLabels()
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [date, setDate] = useState(
    () => initialDate || formatAppointmentWallclock(new Date(), timeZone).slice(0, 10)
  )
  const [time, setTime] = useState('10:00')
  const [lines, setLines] = useState<AgendaServiceLine[]>(() => {
    const svc = services.find((s) => s.is_active !== false)
    return [{ serviceId: svc?.id ?? '', employeeId: employees[0]?.id ?? '' }]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const totals = computeServiceLinesTotals(lines, services)
  const wallclock = date && time ? `${date}T${time}:00` : null
  const availability = useAvailabilityCheck({
    employeeIds: lines.map((l) => l.employeeId),
    wallclock,
    durationMinutes: totals.totalDuration,
    timeZone,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!supabase || !wallclock) {
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

    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await createAppointment(
        supabase,
        {
          client_name: clientName.trim(),
          client_phone: clientPhone.trim() || null,
          date: wallclock,
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

  const formId = `${ids}-form`

  return (
    <Modal
      title="Nueva cita"
      icon={<CalendarPlus className="h-5 w-5 text-[var(--tenant-primary)]" />}
      size="lg"
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
            Crear cita
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} className="space-y-4">
        <FormError message={errorMessage} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Cliente" htmlFor={`${ids}-name`}>
            <input
              id={`${ids}-name`}
              type="text"
              required
              autoFocus
              autoComplete="off"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="Nombre y apellido"
              className={inputClass}
            />
          </Field>
          <Field label="Teléfono (opcional)" htmlFor={`${ids}-phone`}>
            <input
              id={`${ids}-phone`}
              type="tel"
              autoComplete="off"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
              placeholder="Con código de país"
              className={inputClass}
            />
          </Field>
          <Field label="Fecha" htmlFor={`${ids}-date`}>
            <input
              id={`${ids}-date`}
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Hora" htmlFor={`${ids}-time`}>
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

        <ServiceLinesEditor
          lines={lines}
          onChange={setLines}
          services={services}
          employees={employees}
          day={date}
          eligibility={eligibilityQuery.data}
          currencyCode={currencyCode}
          staffLabel={staffLabels?.singular}
        />

        <div className="flex items-center justify-between rounded-xl bg-fg/[0.04] px-3 py-2.5 text-sm">
          <span className="inline-flex items-center gap-1.5 text-fg-muted">
            <Clock className="h-4 w-4" aria-hidden />
            {totals.totalDuration} min
          </span>
          <span className="font-semibold text-fg">
            {formatDashboardCurrency(totals.totalPrice, currencyCode)}
          </span>
        </div>

        <AvailabilityNote state={availability} />
      </form>
    </Modal>
  )
}
