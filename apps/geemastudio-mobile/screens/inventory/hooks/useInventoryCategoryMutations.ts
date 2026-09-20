import { Alert } from 'react-native'
import { useMutation } from '@tanstack/react-query'
import * as Haptics from 'expo-haptics'

import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'
import { slugifyCategoryKey } from '@/constants/inventoryCategories'

import { INVENTORY_CATEGORIES_QUERY_KEY, type InventoryCategoryRow } from './useInventoryCategoriesQuery'

export function useInventoryCategoryMutations() {
  const createMutation = useMutation({
    mutationFn: async ({ label, sortOrder }: { label: string; sortOrder: number }) => {
      const key = slugifyCategoryKey(label)
      if (!key) {
        throw new Error('Ingresa un nombre válido.')
      }
      const { error } = await supabase.from('inventory_categories').insert({
        key,
        label: label.trim(),
        sort_order: sortOrder,
      })
      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya existe una categoría con ese nombre.')
        }
        throw new Error(error.message)
      }
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
      const { count, error: countError } = await supabase
        .from('inventory_items')
        .select('id', { count: 'exact', head: true })
        .eq('category', category.key)
      if (countError) {
        throw new Error(countError.message)
      }
      if ((count ?? 0) > 0) {
        throw new Error('Tiene productos asignados. Muévelos a otra categoría antes de eliminarla.')
      }
      const { error } = await supabase.from('inventory_categories').delete().eq('id', category.id)
      if (error) {
        throw new Error(error.message)
      }
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
