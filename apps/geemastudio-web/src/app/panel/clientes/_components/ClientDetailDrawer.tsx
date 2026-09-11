'use client'

import { X } from 'lucide-react'

import { useClientDetail } from '@/hooks/clientes/useClientDetail'
import type { ClientWithMetrics } from '@/hooks/clientes/types'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'
import { formatDateShort } from '@/lib/format'

const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Programada',
  completed: 'Completada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
  payment_submitted: 'Pago enviado',
}

interface ClientDetailDrawerProps {
  client: ClientWithMetrics
  currencyCode: string
  onClose: () => void
}

export function ClientDetailDrawer({ client, currencyCode, onClose }: ClientDetailDrawerProps) {
  const { data: history = [], isLoading, isError, error } = useClientDetail(client.id)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Cerrar detalle"
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-white/[0.08] bg-zinc-950 shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.08] px-5 py-4">
          <div className="min-w-0">
            <div className="text-xs text-zinc-500">Cliente</div>
            <h2 className="truncate text-lg font-bold text-white">{client.name}</h2>
            <p className="mt-1 text-sm text-zinc-400">{client.phone}</p>
            {client.email ? <p className="text-sm text-zinc-500">{client.email}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-300 hover:bg-white/[0.08]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-3 gap-2 border-b border-white/[0.08] px-5 py-3">
          <Metric label="Visitas" value={String(client.total_visits)} />
          <Metric
            label="Gastado"
            value={formatDashboardCurrency(client.total_spent, currencyCode)}
          />
          <Metric
            label="Última"
            value={
              client.last_visit_date ? formatDateShort(client.last_visit_date) : '—'
            }
          />
        </div>

        {client.notes ? (
          <div className="border-b border-white/[0.08] px-5 py-3">
            <div className="text-xs text-zinc-500">Notas</div>
            <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{client.notes}</p>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <h3 className="mb-3 text-sm font-semibold text-white">Historial de citas</h3>

          {isLoading && <p className="text-sm text-zinc-500">Cargando historial…</p>}
          {isError && (
            <p className="text-sm text-red-300">
              {(error as Error)?.message ?? 'No se pudo cargar el historial'}
            </p>
          )}
          {!isLoading && !isError && history.length === 0 && (
            <p className="text-sm text-zinc-500">Sin citas registradas.</p>
          )}

          <ul className="space-y-3">
            {history.map((apt) => (
              <li
                key={apt.id}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3 py-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-sm font-medium text-white">
                      {formatDateShort(apt.date)}
                    </div>
                    <div className="mt-0.5 text-xs text-zinc-500">
                      {STATUS_LABEL[apt.status] ?? apt.status}
                      {apt.employee_name ? ` · ${apt.employee_name}` : ''}
                    </div>
                  </div>
                  <div className="text-right text-sm tabular-nums text-zinc-200">
                    {formatDashboardCurrency(apt.total_paid || parseFloat(apt.price ?? '0'), currencyCode)}
                  </div>
                </div>
                {apt.services.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {apt.services.map((svc, idx) => (
                      <span
                        key={`${apt.id}-${idx}`}
                        className="rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[11px] text-zinc-300"
                      >
                        {svc.name}
                      </span>
                    ))}
                  </div>
                )}
                {apt.pending_amount > 0 && (
                  <div className="mt-2 text-xs text-amber-300">
                    Pendiente: {formatDashboardCurrency(apt.pending_amount, currencyCode)}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] text-zinc-500">{label}</div>
      <div className="mt-0.5 truncate text-sm font-semibold text-white">{value}</div>
    </div>
  )
}
