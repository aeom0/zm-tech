'use client'

import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/contexts/AuthContext'
import { useTenantId } from './useTenantId'
import {
  createPayout,
  deletePayout,
  fetchPayoutsForRange,
  type CommissionPayout,
  type PayoutWrite,
} from './payoutsService'

export function usePayouts(periodStart: string, periodEnd: string) {
  const { userId } = useAuth()
  const { tenantId } = useTenantId()
  const queryClient = useQueryClient()

  const query = useQuery<CommissionPayout[]>({
    queryKey: ['commission_payouts', tenantId, periodStart, periodEnd],
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    queryFn: () => fetchPayoutsForRange({ tenantId, periodStart, periodEnd }),
  })

  const payoutsByEmployee = useMemo(() => {
    const map: Record<string, number> = {}
    for (const p of query.data ?? []) {
      map[p.employee_id] = (map[p.employee_id] ?? 0) + Number.parseFloat(String(p.amount))
    }
    return map
  }, [query.data])

  const createMutation = useMutation({
    mutationFn: (data: Omit<PayoutWrite, 'created_by'>) =>
      createPayout({ tenantId, data: { ...data, created_by: userId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['commission_payouts'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePayout(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['commission_payouts'] })
    },
  })

  return {
    payouts: query.data ?? [],
    payoutsByEmployee,
    isLoading: query.isLoading,
    refetch: query.refetch,
    registerPayout: createMutation.mutateAsync,
    isRegistering: createMutation.isPending,
    registerError: createMutation.error as Error | null,
    deletePayoutById: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}
