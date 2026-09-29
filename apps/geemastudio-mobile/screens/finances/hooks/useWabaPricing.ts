/**
 * React Query — resumen de costos WABA (pricing_analytics).
 * staleTime alineado con operational_expenses (5 min).
 */
import { useQuery } from '@tanstack/react-query'
import { useTenant } from '@/contexts/TenantContext'
import { getTenantBillingMonthKey } from '../lib/billingMonth'
import { fetchWabaPricingSummary, type WabaPricingSummary } from '../services/wabaPricing'

export type { WabaPricingSummary }

export function useWabaPricing() {
  const { config } = useTenant()
  const timezone = config.locale.timezone
  const monthKey = getTenantBillingMonthKey(timezone)

  return useQuery<WabaPricingSummary>({
    queryKey: ['waba_pricing_summary', monthKey],
    staleTime: 5 * 60 * 1000,
    queryFn: () => fetchWabaPricingSummary(timezone),
  })
}
