import { Alert } from 'react-native'
import { useMutation, useQuery } from '@tanstack/react-query'

import { queryClient } from '@/lib/query-client'
import { useAuth } from '@/contexts/AuthContext'
import {
  deleteExpense,
  fetchExpensesForMonth,
  upsertExpense,
  type ExpenseWrite,
} from '../services/expenses'
import type { OperationalExpense } from '../types'
import { useProfileTenantId } from './useProfileTenantId'

export function useExpenses(expenseMonth: string) {
  const { userId } = useAuth()
  const { tenantId } = useProfileTenantId()

  const query = useQuery<OperationalExpense[]>({
    queryKey: ['operational_expenses', tenantId, expenseMonth],
    enabled: !!tenantId,
    staleTime: 30 * 1000,
    queryFn: () =>
      fetchExpensesForMonth({
        tenantId: tenantId!,
        expenseMonth,
      }),
  })

  const saveMutation = useMutation({
    mutationFn: (opts: { id?: string; data: ExpenseWrite }) =>
      upsertExpense({
        tenantId: tenantId!,
        id: opts.id,
        data: { ...opts.data, created_by: userId },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['operational_expenses'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['executive_financial_summary'],
      })
    },
    onError: (e: Error) => Alert.alert('Error', e.message || 'No se pudo guardar el gasto'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExpense(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['operational_expenses'],
      })
      void queryClient.invalidateQueries({
        queryKey: ['executive_financial_summary'],
      })
    },
    onError: (e: Error) => Alert.alert('Error', e.message || 'No se pudo eliminar el gasto'),
  })

  return {
    expenses: query.data ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    saveExpense: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteExpenseById: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  }
}
