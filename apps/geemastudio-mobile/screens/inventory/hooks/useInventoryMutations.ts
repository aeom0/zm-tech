import * as Haptics from 'expo-haptics'
import { useMutation } from '@tanstack/react-query'

import { queryClient } from '@/lib/query-client'
import { supabase } from '@/lib/supabase'

import type { InventoryCategory } from '../types'

interface UseInventoryMutationsOptions {
  onCreateOrUpdateSuccess?: () => void
}

export function useInventoryMutations(options: UseInventoryMutationsOptions = {}) {
  const { onCreateOrUpdateSuccess } = options

  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string
      category: InventoryCategory
      quantity: number
      min_stock: number
      unit: string
      cost: number | null
    }) => {
      const payload = {
        name: data.name,
        type: 'countable',
        category: data.category,
        quantity: data.quantity,
        min_stock: data.min_stock,
        unit: data.unit,
        price: null,
        cost: data.cost,
      }

      const { error } = await supabase.from('inventory_items').insert(payload)
      if (error) {
        throw new Error(error.message)
      }
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
      const payload = {
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        min_stock: data.min_stock,
        unit: data.unit,
        cost: data.cost,
      }

      const { error } = await supabase.from('inventory_items').update(payload).eq('id', id)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      onCreateOrUpdateSuccess?.()
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    },
  })

  const adjustQuantityMutation = useMutation({
    mutationFn: async ({ id, delta }: { id: string; delta: number }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('quantity')
        .eq('id', id)
        .maybeSingle()
      if (error) {
        throw new Error(error.message)
      }
      const current = data?.quantity ?? 0
      const next = Math.max(0, current + delta)
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ quantity: next })
        .eq('id', id)
      if (updateError) {
        throw new Error(updateError.message)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory_items'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] })
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('inventory_items').delete().eq('id', id)
      if (error) {
        throw new Error(error.message)
      }
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
