import { useQuery } from '@tanstack/react-query'

import { fetchMonthlyFinancialSummary } from '../services/expenses'
import type { MonthlyFinancialRow } from '../types'
import { useProfileTenantId } from './useProfileTenantId'

export type GrowthRange = '6m' | '12m' | 'all'

export function useExecutiveSummary(from: string, to: string) {
  const { tenantId } = useProfileTenantId()

  return useQuery<MonthlyFinancialRow[]>({
    queryKey: ['executive_financial_summary', tenantId, from, to],
    enabled: !!tenantId,
    staleTime: 60 * 1000,
    queryFn: () =>
      fetchMonthlyFinancialSummary({
        tenantId: tenantId!,
        from,
        to,
      }),
  })
}
