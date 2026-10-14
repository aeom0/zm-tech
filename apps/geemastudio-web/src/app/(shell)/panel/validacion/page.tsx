'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock, Info, Receipt, XCircle } from 'lucide-react'
import {
  VERIFICATION_HISTORY_DAYS,
  type VerificationFilter,
  type VerificationItem,
} from '@geemastudio/data'
import { instanteCitaDesdeTexto, zonaIANASegura } from '@zmtech/tenant-config'

import { FilterChips } from '@/components/ui/FilterChips'
import { FormError } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { StateNote } from '@/components/ui/StateNote'
import { useAuth } from '@/contexts/AuthContext'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import {
  useDepositForfeitMutation,
  useVerifications,
} from '@/hooks/validacion/useVerifications'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'

const FILTERS: { id: VerificationFilter; label: string }[] = [
  { id: 'pending', label: 'Pendientes' },
  { id: 'approved', label: 'Validados' },
  { id: 'rejected', label: 'Rechazados' },
]

export default function PanelValidacionPage() {
  const { isAdmin, isLoading: authLoading } = useAuth()
  const { data: settings } = useTenantSettings()
  const [filter, setFilter] = useState<VerificationFilter>('pending')
  const listQuery = useVerifications(filter)
  const pendingQuery = useVerifications('pending')
  const forfeit = useDepositForfeitMutation()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const timeZone = zonaIANASegura(settings?.timezone)
  const currencyCode = settings?.currency_code ?? 'USD'
  const items = listQuery.data ?? []

  const toggleForfeit = (item: VerificationItem) => {
    setBusyId(item.id)
    setError(null)
    forfeit.mutate(
      { verificationId: item.id, forfeited: !item.depositForfeited },
      {
        onError: (e) => setError(e.message),
        onSettled: () => setBusyId(null),
      }
    )
  }

  if (!authLoading && !isAdmin) {
    return <StateNote kind="warning">Solo el dueño del negocio puede ver los comprobantes.</StateNote>
  }

  return (
    <div className="max-w-3xl space-y-5">
      <PageHeader
        title="Validación de pagos"
        description="Comprobantes que las clientas enviaron por WhatsApp."
      />

      <div className="flex items-start gap-2 rounded-2xl border border-line bg-surface px-4 py-3 text-xs text-fg-muted">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--tenant-primary)]" aria-hidden />
        <p>
          Aprobar o rechazar un comprobante también avisa a la clienta, así que se hace desde
          WhatsApp. Aquí puedes revisar el estado y marcar un adelanto como perdido (marca interna,
          no se le avisa). El historial muestra los últimos {VERIFICATION_HISTORY_DAYS} días.
        </p>
      </div>

      <FilterChips
        ariaLabel="Estado del comprobante"
        options={FILTERS.map((f) =>
          f.id === 'pending' ? { ...f, count: pendingQuery.data?.length ?? undefined } : f
        )}
        value={filter}
        onChange={setFilter}
      />

      <FormError message={error} />

      {listQuery.isLoading ? (
        <StateNote kind="loading">Cargando comprobantes…</StateNote>
      ) : listQuery.error ? (
        <StateNote kind="error">{(listQuery.error as Error).message}</StateNote>
      ) : items.length === 0 ? (
        <StateNote kind="empty" icon={<Receipt className="h-5 w-5" />}>
          {filter === 'pending'
            ? 'No hay comprobantes por validar.'
            : 'Sin comprobantes en este periodo.'}
        </StateNote>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <VerificationCard
              key={item.id}
              item={item}
              timeZone={timeZone}
              currencyCode={currencyCode}
              busy={busyId === item.id}
              onToggleForfeit={() => toggleForfeit(item)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function formatResolved(value: string, timeZone: string): string {
  const iso = value.endsWith('Z') || value.includes('+') ? value : `${value}Z`
  return new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', timeZone })
}

function VerificationCard({
  item,
  timeZone,
  currencyCode,
  busy,
  onToggleForfeit,
}: {
  item: VerificationItem
  timeZone: string
  currencyCode: string
  busy: boolean
  onToggleForfeit: () => void
}) {
  const when = instanteCitaDesdeTexto(item.date, timeZone)
  const dateLabel = Number.isNaN(when.getTime())
    ? item.date
    : when.toLocaleString('es', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
        timeZone,
      })
  const isDeposit = item.kind !== 'post_service_payment'

  return (
    <li className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold text-fg">{item.client_name}</div>
          <div className="truncate text-sm text-fg-muted">{item.serviceName}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-fg">
            {formatDashboardCurrency(item.price, currencyCode)}
          </div>
          <div className="text-xs text-fg-subtle">{isDeposit ? 'Adelanto' : 'Pago final'}</div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
        <span className="text-fg-muted">
          Cita: {dateLabel}
        </span>
        {item.status === 'pending' ? (
          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 dark:text-amber-300">
            <Clock className="h-3.5 w-3.5" aria-hidden /> Pendiente
          </span>
        ) : item.status === 'approved' ? (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Validado
            {item.resolvedAt ? ` · ${formatResolved(item.resolvedAt, timeZone)}` : ''}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold text-red-700 dark:text-red-300">
            <XCircle className="h-3.5 w-3.5" aria-hidden /> Rechazado
            {item.resolvedAt ? ` · ${formatResolved(item.resolvedAt, timeZone)}` : ''}
          </span>
        )}
        {item.depositForfeited && (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 font-semibold text-red-700 dark:text-red-300">
            <AlertTriangle className="h-3 w-3" aria-hidden /> Adelanto perdido
          </span>
        )}
      </div>

      {item.canMarkForfeit && (
        <button
          type="button"
          onClick={onToggleForfeit}
          disabled={busy}
          className={[
            'mt-3 inline-flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition disabled:opacity-50',
            item.depositForfeited
              ? 'text-fg-muted hover:bg-fg/[0.06]'
              : 'text-red-700 hover:bg-red-500/10 dark:text-red-300',
          ].join(' ')}
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          {busy ? 'Guardando…' : item.depositForfeited ? 'Quitar marca' : 'Marcar adelanto perdido'}
        </button>
      )}
    </li>
  )
}
