import { useMemo } from 'react'
import { Alert } from 'react-native'
import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient } from '@/lib/query-client'
import { useAuth } from '@/contexts/AuthContext'
import {
  createPayout,
  deletePayout,
  fetchPayoutsForRange,
  type PayoutWrite,
} from '../services/payouts'
import type { CommissionPayout } from '../types'
import { useProfileTenantId } from './useProfileTenantId'

export function usePayouts(periodStart: string, periodEnd: string) {
  const { userId } = useAuth()
  const { tenantId } = useProfileTenantId()

  const query = useQuery<CommissionPayout[]>({
    queryKey: ['commission_payouts', tenantId, periodStart, periodEnd],
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    queryFn: () =>
      fetchPayoutsForRange({ tenantId: tenantId!, periodStart, periodEnd }),
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
      createPayout({ tenantId: tenantId!, data: { ...data, created_by: userId } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['commission_payouts'] })
    },
    onError: (e: Error) => Alert.alert('Error', e.message || 'No se pudo registrar el pago'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePayout(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['commission_payouts'] })
    },
    onError: (e: Error) => Alert.alert('Error', e.message || 'No se pudo eliminar el pago'),
  })

  return {
    payouts: query.data ?? [],
    payoutsByEmployee,
    isLoading: query.isLoading,
    refetch: query.refetch,
    registerPayout: createMutation.mutateAsync,
    isRegistering: createMutation.isPending,
    deletePayoutById: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}
