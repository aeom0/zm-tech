'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  adjustInventoryQuantity,
  createInventoryCategory,
  createInventoryItem,
  deleteInventoryCategory,
  deleteInventoryItem,
  fetchInventoryCategories,
  fetchInventoryItems,
  fetchInventoryMovements,
  queryKeys,
  updateInventoryItem,
  type InventoryCategoryRow,
  type InventoryItemInput,
} from '@geemastudio/data'

import { supabase } from '@/lib/supabase'

function requireClient() {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return supabase
}

function requireTenant(tenantId: string | null | undefined) {
  if (!tenantId) throw new Error('No se pudo identificar el negocio.')
  return tenantId
}

export function useInventoryItems(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.inventory.items(tenantId),
    enabled: !!supabase && !!tenantId,
    queryFn: () => fetchInventoryItems(requireClient(), requireTenant(tenantId)),
  })
}

export function useInventoryMovements(tenantId: string | null | undefined, limit = 20) {
  return useQuery({
    queryKey: queryKeys.inventory.movements(tenantId, limit),
    enabled: !!supabase && !!tenantId,
    queryFn: () => fetchInventoryMovements(requireClient(), requireTenant(tenantId), limit),
  })
}

export function useInventoryCategories(tenantId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.inventory.categories(tenantId),
    enabled: !!supabase && !!tenantId,
    queryFn: () => fetchInventoryCategories(requireClient(), requireTenant(tenantId)),
  })
}

export function useInventoryMutations(tenantId: string | null | undefined) {
  const qc = useQueryClient()
  const refreshItems = () => {
    void qc.invalidateQueries({ queryKey: ['inventory_items'] })
    void qc.invalidateQueries({ queryKey: ['inventory_movements'] })
    void qc.invalidateQueries({ queryKey: ['dashboard_stats'] })
  }

  const save = useMutation({
    mutationFn: ({ id, input }: { id?: string; input: InventoryItemInput }) =>
      id
        ? updateInventoryItem(requireClient(), requireTenant(tenantId), id, input)
        : createInventoryItem(requireClient(), requireTenant(tenantId), input),
    onSuccess: refreshItems,
  })

  const adjust = useMutation({
    mutationFn: ({ id, delta }: { id: string; delta: number }) =>
      adjustInventoryQuantity(requireClient(), id, delta),
    onSuccess: refreshItems,
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteInventoryItem(requireClient(), requireTenant(tenantId), id),
    onSuccess: refreshItems,
  })

  const createCategory = useMutation({
    mutationFn: ({ label, sortOrder }: { label: string; sortOrder: number }) =>
      createInventoryCategory(requireClient(), requireTenant(tenantId), label, sortOrder),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inventory_categories'] }),
  })

  const deleteCategory = useMutation({
    mutationFn: (category: Pick<InventoryCategoryRow, 'id' | 'key'>) =>
      deleteInventoryCategory(requireClient(), requireTenant(tenantId), category),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['inventory_categories'] }),
  })

  return { save, adjust, remove, createCategory, deleteCategory }
}
