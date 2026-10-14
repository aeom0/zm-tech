'use client'

import { useMemo, useState } from 'react'
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
  UserX,
  BadgeCheck,
  ListPlus,
  Pencil,
  Trash2,
  Eye,
} from 'lucide-react'
import {
  formatoHoraInstanteEnZona,
  instanteCitaDesdeTexto,
  type TimeFormatPreference,
} from '@zmtech/tenant-config'
import { getCancelReasonLabel } from '@geemastudio/shared-schema'
import {
  addReferenceImages,
  completeAppointment,
  deletePayment,
  evaluateCompletionGate,
  markReferencesReviewed,
  NO_SHOW_CANCEL_REASON,
  paymentMethodLabel,
  paymentTypeFromPayment,
  setAppointmentClientConfirmed,
  type AgendaService,
  type FinancesPayment,
} from '@geemastudio/data'

import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { STATUS_LABEL, type AgendaAppointment } from '@/hooks/agenda/types'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'
import { formatAppointmentDateShort } from '@/lib/format'
import { useVesRate } from '@/hooks/useVesRate'
import { useAppointmentPayments } from '@/hooks/agenda/useAgendaData'
import { useReferenceImageUrls } from '@/hooks/agenda/useReferenceImageUrls'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { supabase } from '@/lib/supabase'

import { CancelAppointmentModal } from './CancelAppointmentModal'
import { EditServicesModal } from './EditServicesModal'
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
  services: AgendaService[]
  employees: { id: string; name: string }[]
  onClose: () => void
  onRefresh?: () => void
}

type PaymentModalState =
  | null
  | { mode: 'pay' }
  | { mode: 'complete' }
  | { mode: 'edit'; payment: FinancesPayment }

const PAYMENT_TYPE_LABEL = { full: 'Pago', abono: 'Adelanto', producto: 'Producto' } as const

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
  services,
  employees,
  onClose,
  onRefresh,
}: AppointmentDetailDrawerProps) {
  const { formatBs } = useVesRate()
  const { data: tenantSettings } = useTenantSettings()
  const { confirm, dialog } = useConfirm()
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

  const referencePaths = useMemo(() => apt.reference_image_paths ?? [], [apt.reference_image_paths])
  const referenceUrlsQuery = useReferenceImageUrls(referencePaths)
  const referenceUrls = referenceUrlsQuery.data ?? []
  const referencesPending =
    referencePaths.length > 0 && !!apt.reference_received_at && !apt.reference_reviewed_at

  const [cancelReason, setCancelReason] = useState<null | 'cancel' | 'no_show'>(null)
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false)
  const [isEditServicesOpen, setIsEditServicesOpen] = useState(false)
  const [paymentModal, setPaymentModal] = useState<PaymentModalState>(null)
  // 'complete' | 'confirm' | 'review' | 'upload' | `delete:<id>`
  const [busyAction, setBusyAction] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const isOpen = apt.status !== 'completed' && apt.status !== 'cancelled'
  const isConfirmed = !!apt.client_confirmed_at
  const price = parseFloat(apt.price || '0')

  const cleanPhone = (apt.client_phone || '').replace(/\D/g, '')
  const whatsappUrl = cleanPhone ? `https://wa.me/${cleanPhone}` : null
  const telUrl = apt.client_phone ? `tel:${apt.client_phone}` : null

  const run = async (key: string, fn: () => Promise<void>, fallback: string) => {
    if (!supabase) return
    setBusyAction(key)
    setActionError(null)
    try {
      await fn()
    } catch (err) {
      setActionError((err as Error).message || fallback)
    } finally {
      setBusyAction(null)
    }
  }

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
      setPaymentModal({ mode: 'complete' })
      return
    }
    await run(
      'complete',
      async () => {
        await completeAppointment(supabase!, apt.id, 'completed')
        onRefresh?.()
        onClose()
      },
      'No se pudo completar la cita'
    )
  }

  const handleToggleConfirmed = () =>
    run(
      'confirm',
      async () => {
        await setAppointmentClientConfirmed(supabase!, apt.id, !isConfirmed)
        onRefresh?.()
      },
      'No se pudo actualizar la confirmación'
    )

  const handleMarkReviewed = () =>
    run(
      'review',
      async () => {
        await markReferencesReviewed(supabase!, apt.id)
        onRefresh?.()
      },
      'No se pudieron marcar las referencias'
    )

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    await run(
      'upload',
      async () => {
        await addReferenceImages(supabase!, {
          appointmentId: apt.id,
          images: [{ source: file, contentType: file.type || 'image/jpeg' }],
          currentPaths: referencePaths,
          alreadyReceived: !!apt.reference_received_at,
        })
        onRefresh?.()
      },
      'No se pudo subir la foto de referencia'
    )
  }

  const handleDeletePayment = async (payment: FinancesPayment) => {
    const ok = await confirm({
      title: 'Eliminar pago',
      description: `Se eliminará el registro de ${formatDashboardCurrency(Number(payment.amount), currencyCode)}. Esta acción no se puede deshacer.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (!ok) return
    await run(
      `delete:${payment.id}`,
      async () => {
        await deletePayment(supabase!, payment.id)
        await paymentsQuery.refetch()
        onRefresh?.()
      },
      'No se pudo eliminar el pago'
    )
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
        <aside
          role="dialog"
          aria-modal="true"
          aria-labelledby="apt-drawer-title"
          className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-line bg-sunken"
        >
          <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusPill status={apt.status} />
                {isConfirmed && isOpen && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                    <BadgeCheck className="h-3 w-3" aria-hidden /> Confirmada por la clienta
                  </span>
                )}
              </div>
              <h2 id="apt-drawer-title" className="mt-1.5 truncate text-lg font-bold text-fg">
                {apt.client_name}
              </h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                {formatAppointmentDateShort(apt.date, timezone)} · {hora} · {apt.duration} min
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar detalle"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-line bg-fg/[0.04] hover:bg-fg/[0.08] md:h-9 md:w-9"
            >
              <X className="h-4 w-4 text-fg-soft" />
            </button>
          </header>

          <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4 text-sm">
            {actionError && (
              <div
                role="alert"
                className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-700 dark:text-red-300"
              >
                {actionError}
              </div>
            )}

            {isOpen && (
              <div className="space-y-2">
                <Button
                  variant="primary"
                  className="w-full"
                  icon={<CheckCircle2 className="h-4 w-4" />}
                  onClick={handleComplete}
                  loading={busyAction === 'complete'}
                  disabled={paymentsQuery.isLoading}
                >
                  {gate.kind === 'needs_payment' ? 'Cobrar y completar' : 'Completar cita'}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm"
                    icon={<DollarSign className="h-3.5 w-3.5" />}
                    onClick={() => setPaymentModal({ mode: 'pay' })}
                  >
                    Registrar pago
                  </Button>
                  <Button
                    size="sm"
                    icon={<Calendar className="h-3.5 w-3.5" />}
                    onClick={() => setIsRescheduleModalOpen(true)}
                  >
                    Reprogramar
                  </Button>
                  <Button
                    size="sm"
                    icon={<ListPlus className="h-3.5 w-3.5" />}
                    onClick={() => setIsEditServicesOpen(true)}
                  >
                    Editar servicios
                  </Button>
                  <Button
                    size="sm"
                    icon={<BadgeCheck className="h-3.5 w-3.5" />}
                    onClick={handleToggleConfirmed}
                    loading={busyAction === 'confirm'}
                  >
                    {isConfirmed ? 'Quitar confirmación' : 'Marcar confirmada'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-amber-700 dark:text-amber-300"
                    icon={<UserX className="h-3.5 w-3.5" />}
                    onClick={() => setCancelReason('no_show')}
                  >
                    No asistió
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-700 dark:text-red-300"
                    icon={<AlertTriangle className="h-3.5 w-3.5" />}
                    onClick={() => setCancelReason('cancel')}
                  >
                    Cancelar cita
                  </Button>
                </div>
              </div>
            )}

            {apt.status === 'cancelled' && apt.cancel_reason ? (
              <div className="rounded-xl border border-line bg-fg/[0.03] p-3">
                <Row
                  label="Motivo de cancelación"
                  value={getCancelReasonLabel(apt.cancel_reason) ?? ''}
                />
                {apt.cancel_note ? (
                  <div className="mt-2">
                    <Row label="Observación" value={apt.cancel_note} />
                  </div>
                ) : null}
              </div>
            ) : null}

            <Section title="Cliente">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-fg">{apt.client_phone || 'Sin teléfono'}</span>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-lg bg-emerald-500/10 px-2 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {telUrl && (
                  <a
                    href={telUrl}
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-lg border border-line px-2 text-xs font-medium text-fg-soft hover:bg-fg/[0.04]"
                  >
                    <Phone className="h-3.5 w-3.5" /> Llamar
                  </a>
                )}
              </div>
            </Section>

            <Section title="Servicio">
              <div className="space-y-2">
                <div className="text-fg">{serviceName || 'Sin servicio'}</div>
                <div className="flex items-center gap-2 text-fg-muted">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: employeeColor }}
                    aria-hidden
                  />
                  {employeeName || 'Sin asignar'}
                </div>
              </div>
            </Section>

            <Section title="Cobro">
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2">
                <Stat
                  label="Precio"
                  value={formatDashboardCurrency(price, currencyCode)}
                  hint={formatBs(apt.price) ? `≈ ${formatBs(apt.price)}` : undefined}
                />
                {paymentsQuery.isLoading ? (
                  <Stat label="Pagado" value="Cargando…" />
                ) : paymentsQuery.error ? (
                  <Stat label="Pagado" value="Sin datos" />
                ) : (
                  <Stat
                    label={gate.amountDue > 0 ? 'Saldo pendiente' : 'Pagado'}
                    value={formatDashboardCurrency(
                      gate.amountDue > 0 ? gate.amountDue : gate.totalPaid,
                      currencyCode
                    )}
                    tone={gate.amountDue > 0 ? 'warn' : 'ok'}
                  />
                )}
              </dl>

              {payments.length > 0 && (
                <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line">
                  {payments.map((p) => {
                    const type = paymentTypeFromPayment(p)
                    return (
                      <li key={p.id} className="flex items-center gap-2 bg-surface px-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-fg">
                            {formatDashboardCurrency(Number(p.amount), currencyCode)}
                            <span className="ml-1.5 text-xs font-normal text-fg-subtle">
                              {PAYMENT_TYPE_LABEL[type]}
                            </span>
                          </div>
                          <div className="truncate text-xs text-fg-muted">
                            {paymentMethodLabel(p.method)}
                            {p.notes ? ` · ${p.notes}` : ''}
                          </div>
                        </div>
                        <button
                          type="button"
                          aria-label="Editar pago"
                          onClick={() => setPaymentModal({ mode: 'edit', payment: p })}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-subtle hover:bg-fg/[0.06] hover:text-fg"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          aria-label="Eliminar pago"
                          disabled={busyAction === `delete:${p.id}`}
                          onClick={() => handleDeletePayment(p)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-subtle hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </Section>

            <Section
              title={`Fotos de referencia (${referencePaths.length})`}
              action={
                <label className="inline-flex min-h-[32px] cursor-pointer items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[var(--tenant-primary)] hover:bg-fg/[0.05]">
                  <UploadCloud className="h-3.5 w-3.5" />
                  <span>{busyAction === 'upload' ? 'Subiendo…' : 'Subir foto'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={busyAction === 'upload'}
                    onChange={handleUploadPhoto}
                    className="sr-only"
                  />
                </label>
              }
            >
              {referencesPending && (
                <div className="mb-2.5 flex items-center justify-between gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-900 dark:text-amber-100">
                  <span>La clienta envió referencias sin revisar.</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<Eye className="h-3.5 w-3.5" />}
                    onClick={handleMarkReviewed}
                    loading={busyAction === 'review'}
                  >
                    Marcar revisadas
                  </Button>
                </div>
              )}

              {referencePaths.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-fg-subtle">
                  <ImageIcon className="h-4 w-4" />
                  <span>No hay fotos de referencia adjuntas.</span>
                </div>
              ) : referenceUrlsQuery.isLoading ? (
                <div className="grid grid-cols-3 gap-2">
                  {referencePaths.map((p) => (
                    <div key={p} className="aspect-square animate-pulse rounded-xl bg-fg/[0.06]" />
                  ))}
                </div>
              ) : referenceUrls.length === 0 ? (
                <p className="text-xs text-fg-subtle">No se pudieron cargar las fotos.</p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {referenceUrls.map((url, i) => (
                    <a
                      key={url}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square overflow-hidden rounded-xl border border-line bg-fg/[0.04]"
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
              )}
            </Section>
          </div>
        </aside>
      </div>

      {cancelReason && (
        <CancelAppointmentModal
          appointmentId={apt.id}
          clientName={apt.client_name}
          timeZone={timezone}
          initialReason={cancelReason === 'no_show' ? NO_SHOW_CANCEL_REASON : undefined}
          onClose={() => setCancelReason(null)}
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

      {isEditServicesOpen && (
        <EditServicesModal
          apt={apt}
          services={services}
          employees={employees}
          tenantId={tenantId}
          timeZone={timezone}
          currencyCode={currencyCode}
          onClose={() => setIsEditServicesOpen(false)}
          onSuccess={() => {
            void paymentsQuery.refetch()
            onRefresh?.()
          }}
        />
      )}

      {paymentModal && (
        <RecordPaymentModal
          appointmentId={apt.id}
          clientName={apt.client_name}
          amountDue={gate.amountDue}
          appointmentPrice={price}
          currencyCode={currencyCode}
          tenantId={tenantId}
          country={tenantSettings?.country ?? 'PE'}
          payment={paymentModal.mode === 'edit' ? paymentModal.payment : null}
          completeAfter={paymentModal.mode === 'complete'}
          onClose={() => setPaymentModal(null)}
          onSuccess={() => {
            void paymentsQuery.refetch()
            onRefresh?.()
            if (paymentModal.mode === 'complete') onClose()
          }}
        />
      )}

      {dialog}
    </>
  )
}

const STATUS_TONE: Record<string, string> = {
  scheduled: 'bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]',
  confirmed: 'bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]',
  payment_submitted: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  completed: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  cancelled: 'bg-red-500/10 text-red-700 dark:text-red-300',
  no_show: 'bg-red-500/10 text-red-700 dark:text-red-300',
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[status] ?? 'bg-fg/[0.06] text-fg-soft'}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function Section({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex min-h-[32px] items-center justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint?: string
  tone?: 'ok' | 'warn'
}) {
  const toneClass =
    tone === 'warn'
      ? 'text-amber-700 dark:text-amber-300'
      : tone === 'ok'
        ? 'text-emerald-700 dark:text-emerald-300'
        : 'text-fg'
  return (
    <div className="rounded-xl bg-fg/[0.03] px-3 py-2">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className={`mt-0.5 font-semibold ${toneClass}`}>{value}</dd>
      {hint && <dd className="text-xs text-fg-subtle">{hint}</dd>}
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
