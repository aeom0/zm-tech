'use client'

import { ChevronRight } from 'lucide-react'

import {
  CLIENT_AT_RISK_DAYS,
  CLIENT_NEW_DAYS,
  CLIENT_VIP_SPEND,
  CLIENT_VIP_VISITS,
  type ClientWithMetrics,
} from '@/hooks/clientes/types'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'
import { formatAppointmentDateShort } from '@/lib/format'

interface ClientCardProps {
  client: ClientWithMetrics
  currencyCode: string
  timezone: string
  onClick: () => void
}

function deriveBadge(client: ClientWithMetrics): { label: string; className: string } | null {
  const days = client.days_since_last_visit ?? Infinity
  if (client.total_visits >= CLIENT_VIP_VISITS || client.total_spent >= CLIENT_VIP_SPEND) {
    return {
      label: 'VIP',
      className: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/25',
    }
  }
  if (days > CLIENT_AT_RISK_DAYS) {
    return {
      label: 'En riesgo',
      className: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/25',
    }
  }
  if (client.total_visits > 0 && days <= CLIENT_NEW_DAYS) {
    return {
      label: 'Nuevo',
      className: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/25',
    }
  }
  return null
}

export function ClientCard({ client, currencyCode, timezone, onClick }: ClientCardProps) {
  const badge = deriveBadge(client)

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-fg/[0.08] bg-card px-4 py-3 text-left transition-colors hover:border-fg/[0.14] hover:bg-fg/[0.04]"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-fg">{client.name}</span>
          {badge && (
            <span
              className={[
                'shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                badge.className,
              ].join(' ')}
            >
              {badge.label}
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-fg-muted">
          {client.phone}
          {client.email ? ` · ${client.email}` : ''}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-fg-subtle">
          <span>{client.total_visits} visitas</span>
          <span>{formatDashboardCurrency(client.total_spent, currencyCode)}</span>
          <span>
            Última:{' '}
            {client.last_visit_date
              ? formatAppointmentDateShort(client.last_visit_date, timezone)
              : 'Sin visitas'}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-fg-subtle" />
    </button>
  )
}
