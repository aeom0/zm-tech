import { useQuery } from '@tanstack/react-query'
import { fetchInventoryItems, fetchInventoryMovements } from '@geemastudio/data'

import { supabase } from '@/lib/supabase'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'

import type { InventoryItem, InventoryMovement } from '../types'

export function useInventoryItemsQuery() {
  const { tenantId, isLoading: isTenantLoading } = useProfileTenantId()

  return useQuery<InventoryItem[]>({
    queryKey: ['inventory_items', tenantId],
    enabled: !isTenantLoading && !!tenantId,
    queryFn: () => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      return fetchInventoryItems(supabase, tenantId)
    },
  })
}

export function useInventoryMovementsQuery(limit = 20) {
  const { tenantId, isLoading: isTenantLoading } = useProfileTenantId()

  return useQuery<InventoryMovement[]>({
    queryKey: ['inventory_movements', tenantId, limit],
    enabled: !isTenantLoading && !!tenantId,
    queryFn: () => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      return fetchInventoryMovements(supabase, tenantId, limit)
    },
  })
}
