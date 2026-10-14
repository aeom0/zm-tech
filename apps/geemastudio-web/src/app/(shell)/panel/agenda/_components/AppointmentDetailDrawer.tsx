'use client'

import { useState } from 'react'
import {
  X,
  Calendar,
  DollarSign,
  CheckCircle2,
  Phone,
  MessageCircle,
  AlertTriangle,
  UploadCloud,
  ImageIcon,
} from 'lucide-react'
import {
  formatoHoraInstanteEnZona,
  instanteCitaDesdeTexto,
  type TimeFormatPreference,
} from '@zmtech/tenant-config'
import { getCancelReasonLabel } from '@geemastudio/shared-schema'
import { addReferenceImages, completeAppointment, evaluateCompletionGate } from '@geemastudio/data'

import { STATUS_LABEL, type AgendaAppointment } from '@/hooks/agenda/types'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'
import { formatAppointmentDateShort } from '@/lib/format'
import { useVesRate } from '@/hooks/useVesRate'
import { useAppointmentPayments } from '@/hooks/agenda/useAgendaData'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { supabase } from '@/lib/supabase'

import { CancelAppointmentModal } from './CancelAppointmentModal'
import { RecordPaymentModal } from './RecordPaymentModal'
import { RescheduleAppointmentModal } from './RescheduleAppointmentModal'

interface AppointmentDetailDrawerProps {
  apt: AgendaAppointment
  timezone: string
  timeFormat: TimeFormatPreference
  language: string
  serviceName: string
  employeeName: string | null
  employeeColor: string
  currencyCode: string
  tenantId: string
  onClose: () => void
  onRefresh?: () => void
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
  tenantId,
  onClose,
  onRefresh,
}: AppointmentDetailDrawerProps) {
  const { formatBs } = useVesRate()
  const { data: tenantSettings } = useTenantSettings()
  const paymentsQuery = useAppointmentPayments(apt.id)
  const payments = paymentsQuery.data ?? []
  const gate = evaluateCompletionGate({ id: apt.id, price: apt.price || '0' }, payments)
  const start = instanteCitaDesdeTexto(apt.date, timezone)
  const hora = formatoHoraInstanteEnZona(
    start,
    timezone,
    language as 'es' | 'es-VE' | 'es-PE' | 'es-CO' | 'es-AR' | 'es-CL' | 'es-MX' | 'pt-BR',
    timeFormat
  )

  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [paymentModal, setPaymentModal] = useState<null | 'pay' | 'complete'>(null)
  const [isCompleting, setIsCompleting] = useState(false)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const cleanPhone = (apt.client_phone || '').replace(/\D/g, '')
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null
  const telUrl = apt.client_phone ? `tel:${apt.client_phone}` : null

  const handleComplete = async () => {
    if (!supabase || paymentsQuery.isLoading) return
    setActionError(null)
    if (gate.kind === 'partial') {
      setActionError(
        `Falta cobrar ${formatDashboardCurrency(gate.amountDue, currencyCode)}. Registra el saldo para completar la cita.`
      )
      return
    }
    if (gate.kind === 'needs_payment') {
      setPaymentModal('complete')
      return
    }
    setIsCompleting(true)
    try {
      await completeAppointment(supabase, apt.id, 'completed')
      onRefresh?.()
      onClose()
    } catch (err) {
      setActionError((err as Error).message || 'No se pudo completar la cita')
    } finally {
      setIsCompleting(false)
    }
  }

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !supabase) return
    setIsUploadingPhoto(true)
    setActionError(null)
    try {
      await addReferenceImages(supabase, {
        appointmentId: apt.id,
        images: [{ source: file, contentType: file.type || 'image/jpeg' }],
        currentPaths: apt.reference_image_paths || [],
        alreadyReceived: !!apt.reference_received_at,
      })
      onRefresh?.()
    } catch (err) {
      setActionError((err as Error).message || 'No se pudo subir la foto de referencia')
    } finally {
      setIsUploadingPhoto(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <button
          type="button"
          aria-label="Cerrar"
          className="absolute inset-0 bg-scrim/60"
          onClick={onClose}
        />
        <aside className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-fg/[0.08] bg-sunken">
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
            {actionError && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300">
                {actionError}
              </div>
            )}

            {/* Acciones principales de estado */}
            <div className="flex flex-wrap gap-2">
              {apt.status !== 'completed' && apt.status !== 'cancelled' && (
                <button
                  type="button"
                  onClick={handleComplete}
                  disabled={isCompleting || paymentsQuery.isLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {isCompleting ? 'Completando…' : 'Completar cita'}
                </button>
              )}

              {apt.status !== 'cancelled' && (
                <>
                  <button
                    type="button"
                    onClick={() => setIsRescheduleModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-1.5 text-xs font-medium text-fg hover:bg-fg/[0.06]"
                  >
                    <Calendar className="h-3.5 w-3.5" />
                    Reprogramar
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentModal('pay')}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                  >
                    <DollarSign className="h-3.5 w-3.5" />
                    Registrar pago
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-500/10 dark:text-red-300"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Cancelar
                  </button>
                </>
              )}
            </div>

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

            {/* Teléfono y contacto rápido */}
            <div>
              <div className="text-xs text-fg-subtle">Teléfono</div>
              <div className="mt-1 flex items-center gap-3">
                <span className="text-fg">{apt.client_phone || '—'}</span>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {telUrl && (
                  <a
                    href={telUrl}
                    className="inline-flex items-center gap-1 rounded-lg border border-fg/[0.08] px-2 py-1 text-xs font-medium text-fg-soft hover:bg-fg/[0.04]"
                  >
                    <Phone className="h-3.5 w-3.5" /> Llamar
                  </a>
                )}
              </div>
            </div>

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
            {formatBs(apt.price) && (
              <Row label="Equivalente en Bs." value={`≈ ${formatBs(apt.price)}`} />
            )}
            {paymentsQuery.isLoading ? (
              <Row label="Pagado" value="Cargando…" />
            ) : paymentsQuery.error ? (
              <Row label="Pagado" value="No se pudieron cargar los pagos" />
            ) : (
              <>
                <Row label="Pagado" value={formatDashboardCurrency(gate.totalPaid, currencyCode)} />
                {gate.amountDue > 0 && (
                  <Row
                    label="Saldo pendiente"
                    value={formatDashboardCurrency(gate.amountDue, currencyCode)}
                  />
                )}
              </>
            )}

            {/* Fotos de referencia */}
            <div className="border-t border-fg/[0.08] pt-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-fg-soft">
                  Fotos de referencia ({(apt.reference_image_paths || []).length})
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-fg/[0.08] bg-fg/[0.02] px-2.5 py-1 text-xs font-medium text-[var(--tenant-primary)] hover:bg-fg/[0.05]">
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>{isUploadingPhoto ? 'Subiendo…' : 'Subir foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingPhoto}
                    onChange={handleUploadPhoto}
                    className="hidden"
                  />
                </label>
              </div>

              {(apt.reference_image_paths || []).length > 0 ? (
                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {(apt.reference_image_paths || []).map((url: string, i: number) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-xl border border-fg/[0.08] bg-fg/[0.04]"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Referencia ${i + 1}`}
                        className="h-full w-full object-cover transition group-hover:scale-105"
                      />
                    </a>
                  ))}
                </div>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-xs text-fg-subtle">
                  <ImageIcon className="h-4 w-4" />
                  <span>No hay fotos de referencia adjuntas.</span>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Modales secundarios */}
      {isCancelModalOpen && (
        <CancelAppointmentModal
          appointmentId={apt.id}
          clientName={apt.client_name}
          timeZone={timezone}
          onClose={() => setIsCancelModalOpen(false)}
          onSuccess={() => {
            onRefresh?.()
            onClose()
          }}
        />
      )}

      {isRescheduleModalOpen && (
        <RescheduleAppointmentModal
          appointmentId={apt.id}
          clientName={apt.client_name}
          currentDateIso={apt.date}
          currentEmployeeId={apt.employee_id}
          duration={apt.duration}
          timeZone={timezone}
          onClose={() => setIsRescheduleModalOpen(false)}
          onSuccess={() => {
            onRefresh?.()
            onClose()
          }}
        />
      )}

      {paymentModal && (
        <RecordPaymentModal
          appointmentId={apt.id}
          clientName={apt.client_name}
          amountDue={gate.amountDue}
          currencyCode={currencyCode}
          tenantId={tenantId}
          country={tenantSettings?.country ?? 'PE'}
          completeAfter={paymentModal === 'complete'}
          onClose={() => setPaymentModal(null)}
          onSuccess={() => {
            void paymentsQuery.refetch()
            onRefresh?.()
            if (paymentModal === 'complete') onClose()
          }}
        />
      )}
    </>
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
