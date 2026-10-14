import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchVerifications,
  queryKeys,
  setDepositForfeited,
  VERIFICATION_HISTORY_DAYS,
  type VerificationItem,
} from '@geemastudio/data'

import { supabase } from '@/lib/supabase'
import { useTenant } from '@/contexts/TenantContext'
import type { ValidacionItem, ValidacionFilter } from '../types'

function toValidacionItem(item: VerificationItem): ValidacionItem {
  return {
    id: item.id,
    client_name: item.client_name,
    date: item.date,
    price: item.price,
    serviceName: item.serviceName,
    status: item.status,
    resolvedAt: item.resolvedAt,
    // La aprobación también avisa a la clienta por WhatsApp y se hace desde ese flujo.
    readOnly: true,
    depositForfeited: item.depositForfeited,
    canMarkForfeit: item.canMarkForfeit,
  }
}

export function useValidacionData() {
  const { config } = useTenant()
  const queryClient = useQueryClient()

  const listQuery = (filter: ValidacionFilter) => ({
    queryKey: queryKeys.verifications.list(filter),
    refetchInterval: 30_000,
    queryFn: async (): Promise<ValidacionItem[]> =>
      (await fetchVerifications(supabase, filter)).map(toValidacionItem),
  })

  const pendingQ = useQuery(listQuery('pending'))
  const approvedQ = useQuery(listQuery('approved'))
  const rejectedQ = useQuery(listQuery('rejected'))

  const byFilter = {
    pending: pendingQ,
    approved: approvedQ,
    rejected: rejectedQ,
  }

  // Marca interna «Adelanto perdido»: no avisa a la clienta.
  const forfeitMutation = useMutation({
    mutationFn: ({ verificationId, forfeited }: { verificationId: string; forfeited: boolean }) =>
      setDepositForfeited(supabase, verificationId, forfeited),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.verifications.all })
    },
  })

  return {
    byFilter,
    counts: {
      pending: pendingQ.data?.length ?? 0,
      approved: approvedQ.data?.length ?? 0,
      rejected: rejectedQ.data?.length ?? 0,
    },
    historyDays: VERIFICATION_HISTORY_DAYS,
    refetchAll: () => Promise.all([pendingQ.refetch(), approvedQ.refetch(), rejectedQ.refetch()]),
    forfeitMutation,
    config,
  }
}
