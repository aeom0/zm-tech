'use client'

import { X } from 'lucide-react'
import {
  formatoHoraInstanteEnZona,
  instanteCitaDesdeTexto,
  type TimeFormatPreference,
} from '@zmtech/tenant-config'

import { getCancelReasonLabel } from '@geemastudio/shared-schema'

import { STATUS_LABEL, type AgendaAppointment } from '@/hooks/agenda/types'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'
import { formatAppointmentDateShort } from '@/lib/format'

interface AppointmentDetailDrawerProps {
  apt: AgendaAppointment
  timezone: string
  timeFormat: TimeFormatPreference
  language: string
  serviceName: string
  employeeName: string | null
  employeeColor: string
  currencyCode: string
  onClose: () => void
}

export function AppointmentDetailDrawer({
  apt,
  timezone,
  timeFormat,
  language,
  serviceName,
  employeeName,
  employeeColor,
  currencyCode,
  onClose,
}: AppointmentDetailDrawerProps) {
  const start = instanteCitaDesdeTexto(apt.date, timezone)
  const hora = formatoHoraInstanteEnZona(
    start,
    timezone,
    language as 'es' | 'es-VE' | 'es-PE' | 'es-CO' | 'es-AR' | 'es-CL' | 'es-MX' | 'pt-BR',
    timeFormat
  )

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-scrim/60"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-fg/[0.08] bg-sunken">
        <header className="flex items-start justify-between gap-3 border-b border-fg/[0.08] px-5 py-4">
          <div className="min-w-0">
            <div className="text-xs text-fg-subtle">Cita</div>
            <h2 className="truncate text-lg font-bold text-fg">{apt.client_name}</h2>
            <p className="mt-1 text-sm text-fg-muted">
              {formatAppointmentDateShort(apt.date, timezone)} · {hora}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-fg/[0.08] bg-fg/[0.04] md:h-9 md:w-9"
          >
            <X className="h-4 w-4 text-fg-soft" />
          </button>
        </header>

        <div className="space-y-4 px-5 py-4 text-sm">
          <Row label="Estado" value={STATUS_LABEL[apt.status] ?? apt.status} />
          {apt.status === 'cancelled' && apt.cancel_reason ? (
            <Row
              label="Motivo de cancelación"
              value={getCancelReasonLabel(apt.cancel_reason) ?? ''}
            />
          ) : null}
          {apt.status === 'cancelled' && apt.cancel_note ? (
            <Row label="Observación" value={apt.cancel_note} />
          ) : null}
          <Row label="Teléfono" value={apt.client_phone || '—'} />
          <Row label="Servicio" value={serviceName || 'Sin servicio'} />
          <div>
            <div className="text-xs text-fg-subtle">Profesional</div>
            <div className="mt-1 flex items-center gap-2 text-fg">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: employeeColor }}
              />
              {employeeName || 'Sin asignar'}
            </div>
          </div>
          <Row label="Duración" value={`${apt.duration} min`} />
          <Row
            label="Precio"
            value={formatDashboardCurrency(parseFloat(apt.price || '0'), currencyCode)}
          />
          <p className="pt-2 text-xs text-fg-subtle">
            Vista de solo lectura. Crear / editar citas sigue en la app mobile por ahora.
          </p>
        </div>
      </aside>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-fg-subtle">{label}</div>
      <div className="mt-0.5 text-fg">{value}</div>
    </div>
  )
}
