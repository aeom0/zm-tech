'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'

import { ClientCard } from './_components/ClientCard'
import { ClientDetailDrawer } from './_components/ClientDetailDrawer'
import { ClientKPIStrip } from './_components/ClientKPIStrip'
import { ClientSegmentBar } from './_components/ClientSegmentBar'
import { useClientsData } from '@/hooks/clientes/useClientsData'
import type { ClientSegment, ClientWithMetrics } from '@/hooks/clientes/types'
import { useDashboardTenant } from '@/hooks/dashboard/useDashboardTenant'
import { resolveDashboardCurrencyCode } from '@/lib/dashboardCurrency'

export default function PanelClientesPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [segment, setSegment] = useState<ClientSegment>('all')
  const [selected, setSelected] = useState<ClientWithMetrics | null>(null)

  const tenantQuery = useDashboardTenant()
  const currencyCode = resolveDashboardCurrencyCode(tenantQuery.data?.currency_code)

  const { filteredClients, kpis, isLoading, isError, errorMessage } = useClientsData(
    searchQuery,
    segment
  )

  const countLabel = useMemo(() => {
    if (isLoading) return 'Cargando…'
    const n = filteredClients.length
    return n === 1 ? '1 cliente' : `${n} clientes`
  }, [filteredClients.length, isLoading])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs text-zinc-500">Panel</div>
          <h1 className="text-2xl font-bold text-white">Clientes</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Base de clientas, segmentos VIP / nuevos / en riesgo e historial de citas.
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email"
            className="w-full rounded-xl border border-white/[0.08] bg-white/[0.04] py-2.5 pl-9 pr-3 text-sm text-white placeholder:text-zinc-500 outline-none focus:border-[#40E0D0]/40"
          />
        </div>
      </div>

      <ClientKPIStrip kpis={kpis} currencyCode={currencyCode} isLoading={isLoading} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ClientSegmentBar active={segment} onChange={setSegment} />
        <div className="text-xs text-zinc-500">{countLabel}</div>
      </div>

      {isError && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {errorMessage ?? 'No se pudieron cargar los clientes'}
        </div>
      )}

      {!isError && isLoading && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
          Cargando clientes…
        </div>
      )}

      {!isError && !isLoading && filteredClients.length === 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
          No hay clientes en este filtro.
        </div>
      )}

      {!isError && !isLoading && filteredClients.length > 0 && (
        <div className="space-y-2">
          {filteredClients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              currencyCode={currencyCode}
              onClick={() => setSelected(client)}
            />
          ))}
        </div>
      )}

      {selected && (
        <ClientDetailDrawer
          client={selected}
          currencyCode={currencyCode}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
