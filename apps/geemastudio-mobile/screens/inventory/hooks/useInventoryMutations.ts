import * as Haptics from 'expo-haptics'
import { useMutation } from '@tanstack/react-query'

import { queryClient } from '@/lib/query-client'
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
      const payload = {
        tenant_id: tenantId,
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
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      const payload = {
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        min_stock: data.min_stock,
        unit: data.unit,
        cost: data.cost,
      }

      const { error } = await supabase
        .from('inventory_items')
        .update(payload)
        .eq('id', id)
        .eq('tenant_id', tenantId)
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
      const { error } = await supabase.rpc('adjust_inventory_quantity', {
        p_item_id: id,
        p_delta: delta,
      })
      if (error) {
        throw new Error(error.message)
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
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
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
