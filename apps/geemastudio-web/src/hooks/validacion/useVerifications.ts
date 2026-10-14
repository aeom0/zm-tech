'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  countPendingVerifications,
  fetchVerifications,
  queryKeys,
  setDepositForfeited,
  type VerificationFilter,
} from '@geemastudio/data'

import { supabase } from '@/lib/supabase'

function requireClient() {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return supabase
}

export function useVerifications(filter: VerificationFilter) {
  return useQuery({
    queryKey: queryKeys.verifications.list(filter),
    enabled: !!supabase,
    refetchInterval: 30_000,
    queryFn: () => fetchVerifications(requireClient(), filter),
  })
}

export function usePendingVerificationsCount(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.agenda.pendingVerificationsCount,
    enabled: enabled && !!supabase,
    refetchInterval: 60_000,
    queryFn: () => countPendingVerifications(requireClient()),
  })
}

/** Marca interna «Adelanto perdido»: no avisa a la clienta. */
export function useDepositForfeitMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: { verificationId: string; forfeited: boolean }) =>
      setDepositForfeited(requireClient(), args.verificationId, args.forfeited),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.verifications.all })
    },
  })
}
