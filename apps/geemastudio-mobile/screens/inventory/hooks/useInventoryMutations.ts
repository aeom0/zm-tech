import * as Haptics from 'expo-haptics'
import { useMutation } from '@tanstack/react-query'

import { queryClient } from '@/lib/query-client'
import {
  adjustInventoryQuantity,
  createInventoryItem,
  deleteInventoryItem,
  updateInventoryItem,
} from '@geemastudio/data'

import { supabase } from '@/lib/supabase'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'

import type { InventoryCategory } from '../types'

interface UseInventoryMutationsOptions {
  onCreateOrUpdateSuccess?: () => void
}

export function useInventoryMutations(options: UseInventoryMutationsOptions = {}) {
  const { onCreateOrUpdateSuccess } = options
  const { tenantId } = useProfileTenantId()

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string
      category: InventoryCategory
      quantity: number
      min_stock: number
      unit: string
      cost: number | null
    }) => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      await createInventoryItem(supabase, tenantId, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      onCreateOrUpdateSuccess?.()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: {
        name: string
        category: InventoryCategory
        quantity: number
        min_stock: number
        unit: string
        cost: number | null
      }
    }) => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      await updateInventoryItem(supabase, tenantId, id, data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] })
      queryClient.invalidateQueries({ queryKey: ['inventory_movements'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      onCreateOrUpdateSuccess?.()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
  })

  const adjustQuantityMutation = useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) =>
      adjustInventoryQuantity(supabase, id, delta),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      await deleteInventoryItem(supabase, tenantId, id)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
  })

  return {
    createMutation,
    updateMutation,
    adjustQuantityMutation,
    deleteMutation,
  }
}
