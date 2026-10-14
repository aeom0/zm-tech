import { Alert } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'

import { queryClient } from '@/lib/query-client'
import { createInventoryCategory, deleteInventoryCategory } from '@geemastudio/data'

import { supabase } from '@/lib/supabase'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'

import {
  INVENTORY_CATEGORIES_QUERY_KEY,
  type InventoryCategoryRow,
} from './useInventoryCategoriesQuery'

export function useInventoryCategoryMutations() {
  const { tenantId } = useProfileTenantId()

  const createMutation = useMutation({
    mutationFn: async ({ label, sortOrder }: { label: string; sortOrder: number }) => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      await createInventoryCategory(supabase, tenantId, label, sortOrder)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_CATEGORIES_QUERY_KEY })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (error: Error) => {
      Alert.alert('No se pudo crear la categoría', error.message)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (category: InventoryCategoryRow) => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      await deleteInventoryCategory(supabase, tenantId, category)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_CATEGORIES_QUERY_KEY })
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
    onError: (error: Error) => {
      Alert.alert('No se pudo eliminar', error.message)
    },
  })

  return { createMutation, deleteMutation }
}
