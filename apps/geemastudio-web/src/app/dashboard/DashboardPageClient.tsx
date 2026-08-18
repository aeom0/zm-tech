'use client'

import { useDashboardAppointments } from '@/hooks/dashboard/useDashboardAppointments'
import { useDashboardClients } from '@/hooks/dashboard/useDashboardClients'
import type { PeriodKey } from '@/hooks/dashboard/useDashboardPeriod'
import { useDashboardPeriod } from '@/hooks/dashboard/useDashboardPeriod'
import { useDashboardRevenue } from '@/hooks/dashboard/useDashboardRevenue'
import { useDashboardTenant } from '@/hooks/dashboard/useDashboardTenant'
import { useDashboardTopStaff } from '@/hooks/dashboard/useDashboardTopStaff'
import { AppointmentsStatusCard } from './_components/AppointmentsStatusCard'
import { ClientsOverviewCard } from './_components/ClientsOverviewCard'
import { DashboardShell } from './_components/DashboardShell'
import { PeriodSelector } from './_components/PeriodSelector'
import { RevenueCard } from './_components/RevenueCard'
import { StatsGrid } from './_components/StatsGrid'
import { TopStaffCard } from './_components/TopStaffCard'
import { resolveDashboardCurrencyCode } from '@/lib/dashboardCurrency'

export default function DashboardPageClient() {
  const { period, setPeriod, dateRange, customRange, setCustomRange } = useDashboardPeriod()

  const handlePeriodChange = (p: PeriodKey) => {
    if (p === 'custom') {
      setCustomRange((prev) => prev ?? { ...dateRange })
    }
    setPeriod(p)
  }

  const tenantQ = useDashboardTenant()
  const currencyCode = resolveDashboardCurrencyCode(tenantQ.data?.currency_code)
  const businessName = tenantQ.data?.business_name ?? null

  const revenueQ = useDashboardRevenue(dateRange)
  const appointmentsQ = useDashboardAppointments(dateRange)
  const topStaffQ = useDashboardTopStaff(dateRange)
  const clientsQ = useDashboardClients(dateRange)

  return (
    <DashboardShell
      businessName={businessName}
      topSlot={
        <PeriodSelector
          period={period}
          onPeriodChange={handlePeriodChange}
          dateRange={dateRange}
          customRange={customRange}
          onCustomRangeChange={(r) => setCustomRange(r)}
        />
      }
    >
      <StatsGrid>
        <RevenueCard
          totalRevenue={revenueQ.data?.totalRevenue ?? 0}
          avgPerAppointment={revenueQ.data?.avgPerAppointment ?? 0}
          prevPeriodRevenue={revenueQ.data?.prevPeriodRevenue ?? 0}
          currencyCode={currencyCode}
          isLoading={revenueQ.isLoading || tenantQ.isLoading}
        />
        <AppointmentsStatusCard data={appointmentsQ.data} isLoading={appointmentsQ.isLoading} />
        <TopStaffCard
          items={topStaffQ.data}
          currencyCode={currencyCode}
          isLoading={topStaffQ.isLoading || tenantQ.isLoading}
        />
        <ClientsOverviewCard
          newCount={clientsQ.data?.newCount ?? 0}
          returningCount={clientsQ.data?.returningCount ?? 0}
          isLoading={clientsQ.isLoading}
        />
      </StatsGrid>

      {revenueQ.isError ? (
        <p className="mt-6 text-sm text-red-400">
          No se pudieron cargar los ingresos. Revisa tu sesión y vuelve a intentar.
        </p>
      ) : null}
      {!revenueQ.isLoading && revenueQ.data?.payments.length === 0 ? (
        <p className="mt-6 text-center text-sm text-white/45">
          No hay pagos registrados en este período. Cuando muevas caja, aquí verás el resumen.
        </p>
      ) : null}
    </DashboardShell>
  )
}
