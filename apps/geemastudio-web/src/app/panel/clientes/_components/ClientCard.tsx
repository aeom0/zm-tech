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
import { formatDateShort } from '@/lib/format'

interface ClientCardProps {
  client: ClientWithMetrics
  currencyCode: string
  onClick: () => void
}

function deriveBadge(client: ClientWithMetrics): { label: string; className: string } | null {
  const days = client.days_since_last_visit ?? Infinity
  if (client.total_visits >= CLIENT_VIP_VISITS || client.total_spent >= CLIENT_VIP_SPEND) {
    return { label: 'VIP', className: 'bg-amber-500/15 text-amber-300 border-amber-500/25' }
  }
  if (days > CLIENT_AT_RISK_DAYS) {
    return { label: 'En riesgo', className: 'bg-orange-500/15 text-orange-300 border-orange-500/25' }
  }
  if (client.total_visits > 0 && days <= CLIENT_NEW_DAYS) {
    return { label: 'Nuevo', className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25' }
  }
  return null
}

export function ClientCard({ client, currencyCode, onClick }: ClientCardProps) {
  const badge = deriveBadge(client)
  const initial = client.name.charAt(0).toUpperCase() || '?'

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-left transition-colors hover:border-white/[0.14] hover:bg-white/[0.04]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#40E0D0]/25 bg-[#40E0D0]/10 text-sm font-bold text-[#40E0D0]">
        {initial}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-white">{client.name}</span>
          {badge && (
            <span
              className={[
                'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                badge.className,
              ].join(' ')}
            >
              {badge.label}
            </span>
          )}
        </div>
        <div className="mt-0.5 truncate text-xs text-zinc-400">
          {client.phone}
          {client.email ? ` · ${client.email}` : ''}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-zinc-500">
          <span>{client.total_visits} visitas</span>
          <span>{formatDashboardCurrency(client.total_spent, currencyCode)}</span>
          <span>
            Última: {client.last_visit_date ? formatDateShort(client.last_visit_date) : 'Sin visitas'}
          </span>
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
    </button>
  )
}
