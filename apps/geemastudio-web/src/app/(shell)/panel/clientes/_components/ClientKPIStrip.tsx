'use client'

import type { ClientKPIs } from '@/hooks/clientes/types'
import { formatDashboardCurrency } from '@/lib/dashboardCurrency'

interface ClientKPIStripProps {
  kpis: ClientKPIs | null
  currencyCode: string
  isLoading: boolean
}

const CELLS: { key: keyof ClientKPIs; label: string; currency?: boolean }[] = [
  { key: 'total_clients', label: 'Total' },
  { key: 'active_this_month', label: 'Activos mes' },
  { key: 'vip_count', label: 'VIP' },
  { key: 'at_risk_count', label: 'En riesgo' },
  { key: 'avg_ticket', label: 'Ticket prom.', currency: true },
]

export function ClientKPIStrip({ kpis, currencyCode, isLoading }: ClientKPIStripProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {CELLS.map((cell) => {
        const raw = kpis?.[cell.key] ?? 0
        const value = cell.currency
          ? formatDashboardCurrency(raw, currencyCode)
          : isLoading
            ? '—'
            : String(raw)

        return (
          <div key={cell.key} className="rounded-2xl border border-fg/[0.08] bg-card px-4 py-3">
            <div className="text-xs text-fg-subtle">{cell.label}</div>
            <div className="mt-1 text-xl font-semibold tabular-nums text-fg">{value}</div>
          </div>
        )
      })}
    </div>
  )
}
