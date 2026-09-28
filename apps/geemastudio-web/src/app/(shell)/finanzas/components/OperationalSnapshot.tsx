'use client'

import { useDashboardAppointments } from '@/hooks/dashboard/useDashboardAppointments'
import { useDashboardClients } from '@/hooks/dashboard/useDashboardClients'
import type { PeriodKey } from '@/hooks/dashboard/useDashboardPeriod'
import { useDashboardPeriod } from '@/hooks/dashboard/useDashboardPeriod'
import { useDashboardRevenue } from '@/hooks/dashboard/useDashboardRevenue'
import { useDashboardTopStaff } from '@/hooks/dashboard/useDashboardTopStaff'
import { AppointmentsStatusCard } from '@/app/(shell)/dashboard/_components/AppointmentsStatusCard'
import { ClientsOverviewCard } from '@/app/(shell)/dashboard/_components/ClientsOverviewCard'
import { PeriodSelector } from '@/app/(shell)/dashboard/_components/PeriodSelector'
import { RevenueCard } from '@/app/(shell)/dashboard/_components/RevenueCard'
import { StatsGrid } from '@/app/(shell)/dashboard/_components/StatsGrid'
import { TopStaffCard } from '@/app/(shell)/dashboard/_components/TopStaffCard'

interface OperationalSnapshotProps {
  timezone: string
  currencyCode: string
  tenantLoading: boolean
  clientTerm?: string
}

/** Métricas operativas que antes vivían en la pestaña Dashboard. */
export function OperationalSnapshot({
  timezone,
  currencyCode,
  tenantLoading,
  clientTerm,
}: OperationalSnapshotProps) {
  const { period, setPeriod, dateRange, appointmentsRange, customRange, setCustomRange } =
    useDashboardPeriod(timezone)

  const handlePeriodChange = (p: PeriodKey) => {
    if (p === 'custom') {
      setCustomRange((prev) => prev ?? { ...dateRange })
    }
    setPeriod(p)
  }

  const revenueQ = useDashboardRevenue(dateRange, timezone)
  const appointmentsQ = useDashboardAppointments(appointmentsRange)
  const topStaffQ = useDashboardTopStaff(dateRange, timezone)
  const clientsQ = useDashboardClients(dateRange, timezone)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Operación</h2>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Caja, citas y clientes del período.
          </p>
        </div>
        <PeriodSelector
          period={period}
          onPeriodChange={handlePeriodChange}
          dateRange={dateRange}
          customRange={customRange}
          onCustomRangeChange={(r) => setCustomRange(r)}
        />
      </div>

      <StatsGrid>
        <RevenueCard
          totalRevenue={revenueQ.data?.totalRevenue ?? 0}
          avgPerAppointment={revenueQ.data?.avgPerAppointment ?? 0}
          prevPeriodRevenue={revenueQ.data?.prevPeriodRevenue ?? 0}
          currencyCode={currencyCode}
          isLoading={revenueQ.isLoading || tenantLoading}
        />
        <AppointmentsStatusCard data={appointmentsQ.data} isLoading={appointmentsQ.isLoading} />
        <TopStaffCard
          items={topStaffQ.data}
          currencyCode={currencyCode}
          isLoading={topStaffQ.isLoading || tenantLoading}
        />
        <ClientsOverviewCard
          newCount={clientsQ.data?.newCount ?? 0}
          returningCount={clientsQ.data?.returningCount ?? 0}
          isLoading={clientsQ.isLoading}
          clientTerm={clientTerm}
        />
      </StatsGrid>

      {revenueQ.isError ? (
        <p className="text-sm text-red-400">
          No se pudieron cargar los ingresos. Revisa tu sesión y vuelve a intentar.
        </p>
      ) : null}
    </section>
  )
}
