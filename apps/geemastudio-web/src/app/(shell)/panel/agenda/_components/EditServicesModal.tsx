'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, ListPlus } from 'lucide-react'
import {
  computeServiceLinesTotals,
  fetchAppointmentServices,
  updateAppointmentServices,
  type AgendaService,
  type AgendaServiceLine,
} from '@geemastudio/data'

import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { StateNote } from '@/components/ui/StateNote'
import type { AgendaAppointment } from '@/hooks/agenda/types'
import { useAvailabilityCheck } from '@/hooks/agenda/useAvailabilityCheck'
import { useServiceEligibility } from '@/hooks/personal/useAvailability'
import { useStaffLabels } from '@/hooks/personal/useStaffLabels'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'
import { supabase } from '@/lib/supabase'

import { AvailabilityNote } from './AvailabilityNote'
import { ServiceLinesEditor } from './ServiceLinesEditor'

interface EditServicesModalProps {
  apt: AgendaAppointment
  services: AgendaService[]
  employees: { id: string; name: string }[]
  tenantId: string
  timeZone: string
  currencyCode: string
  onClose: () => void
  onSuccess: () => void
}

/** Líneas iniciales: las de `appointment_services` o, en citas antiguas, las columnas legacy. */
function initialLines(
  rows: Awaited<ReturnType<typeof fetchAppointmentServices>>,
  apt: AgendaAppointment
): AgendaServiceLine[] {
  if (rows.length > 0) {
    return rows.map((r) => ({
      serviceId: r.service_id,
      employeeId: r.employee_id ?? apt.employee_id ?? '',
      ...(r.packId ? { packId: r.packId } : {}),
    }))
  }
  const ids = apt.service_ids?.length ? apt.service_ids : apt.service_id ? [apt.service_id] : []
  return ids.map((serviceId) => ({ serviceId, employeeId: apt.employee_id ?? '' }))
}

export function EditServicesModal(props: EditServicesModalProps) {
  const linesQuery = useQuery({
    queryKey: ['web_agenda_appointment_lines', props.apt.id],
    enabled: !!supabase,
    queryFn: async () => (supabase ? fetchAppointmentServices(supabase, props.apt.id) : []),
  })

  if (linesQuery.isLoading || linesQuery.error) {
    return (
      <Modal title="Editar servicios" size="lg" onClose={props.onClose}>
        {linesQuery.error ? (
          <StateNote kind="error">No se pudieron cargar los servicios de la cita.</StateNote>
        ) : (
          <StateNote kind="loading">Cargando servicios…</StateNote>
        )}
      </Modal>
    )
  }

  return <EditServicesForm {...props} initial={initialLines(linesQuery.data ?? [], props.apt)} />
}

function EditServicesForm({
  apt,
  services,
  employees,
  tenantId,
  timeZone,
  currencyCode,
  onClose,
  onSuccess,
  initial,
}: EditServicesModalProps & { initial: AgendaServiceLine[] }) {
  const eligibilityQuery = useServiceEligibility()
  const { data: staffLabels } = useStaffLabels()
  const [lines, setLines] = useState<AgendaServiceLine[]>(initial)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const day = apt.date.slice(0, 10)
  const totals = computeServiceLinesTotals(lines, services)
  const availability = useAvailabilityCheck({
    employeeIds: lines.map((l) => l.employeeId),
    wallclock: apt.date.replace(' ', 'T').slice(0, 19),
    durationMinutes: totals.totalDuration,
    timeZone,
    excludeAppointmentId: apt.id,
  })

  const handleSave = async () => {
    if (!supabase) return
    if (lines.length === 0 || lines.some((l) => !l.serviceId || !l.employeeId)) {
      setErrorMessage('Selecciona servicio y profesional en cada línea')
      return
    }
    setIsSubmitting(true)
    setErrorMessage(null)
    try {
      await updateAppointmentServices(supabase, {
        id: apt.id,
        date: apt.date,
        lines,
        services,
        tenantId,
        timeZone,
      })
      onSuccess()
      onClose()
    } catch (err) {
      setErrorMessage((err as Error).message || 'No se pudieron guardar los servicios')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      title="Editar servicios"
      icon={<ListPlus className="h-5 w-5 text-[var(--tenant-primary)]" />}
      description={
        <>
          Cita de <strong className="text-fg">{apt.client_name}</strong>
        </>
      }
      size="lg"
      onClose={onClose}
      dismissible={!isSubmitting}
      footer={
        <>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            loading={isSubmitting}
            disabled={availability.status === 'busy'}
          >
            Guardar servicios
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormError message={errorMessage} />
        <ServiceLinesEditor
          lines={lines}
          onChange={setLines}
          services={services}
          employees={employees}
          day={day}
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
      </div>
    </Modal>
  )
}
