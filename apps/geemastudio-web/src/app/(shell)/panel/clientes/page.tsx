'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'

import { ClientCard } from './_components/ClientCard'
import { ClientDetailDrawer } from './_components/ClientDetailDrawer'
import { ClientKPIStrip } from './_components/ClientKPIStrip'
import { ClientSegmentBar } from './_components/ClientSegmentBar'
import { useClientsData } from '@/hooks/clientes/useClientsData'
import type { ClientSegment, ClientWithMetrics } from '@/hooks/clientes/types'
import { useDashboardTenant } from '@/hooks/dashboard/useDashboardTenant'
import { resolveDashboardCurrencyCode } from '@/lib/dashboardCurrency'

function PanelClientesContent() {
  const searchParams = useSearchParams()
  const initialSearch = searchParams.get('search') ?? ''
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [segment, setSegment] = useState<ClientSegment>('all')
  const [selected, setSelected] = useState<ClientWithMetrics | null>(null)

  useEffect(() => {
    const q = searchParams.get('search')
    if (q != null) setSearchQuery(q)
  }, [searchParams])

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
          <div className="text-xs text-fg-subtle">Panel</div>
          <h1 className="text-2xl font-bold text-fg">Clientes</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Base de clientas, segmentos VIP / nuevos / en riesgo e historial de citas.
          </p>
        </div>
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, teléfono o email"
            className="focus:border-[var(--tenant-primary)]/40 w-full rounded-xl border border-fg/[0.08] bg-fg/[0.04] py-2.5 pl-9 pr-3 text-base text-fg outline-none placeholder:text-fg-subtle md:text-sm"
          />
        </div>
      </div>

      <ClientKPIStrip kpis={kpis} currencyCode={currencyCode} isLoading={isLoading} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ClientSegmentBar active={segment} onChange={setSegment} />
        <div className="text-xs text-fg-subtle">{countLabel}</div>
      </div>

      {isError && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {errorMessage ?? 'No se pudieron cargar los clientes'}
        </div>
      )}

      {!isError && isLoading && (
        <div className="rounded-2xl border border-fg/[0.08] bg-card px-4 py-8 text-center text-sm text-fg-subtle">
          Cargando clientes…
        </div>
      )}

      {!isError && !isLoading && filteredClients.length === 0 && (
        <div className="rounded-2xl border border-fg/[0.08] bg-card px-4 py-8 text-center text-sm text-fg-subtle">
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
              timezone={tenantQuery.data?.timezone ?? 'America/Caracas'}
              onClick={() => setSelected(client)}
            />
          ))}
        </div>
      )}

      {selected && (
        <ClientDetailDrawer
          client={selected}
          currencyCode={currencyCode}
          timezone={tenantQuery.data?.timezone ?? 'America/Caracas'}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

export default function PanelClientesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-fg-subtle">Cargando…</div>}>
      <PanelClientesContent />
    </Suspense>
  )
}
