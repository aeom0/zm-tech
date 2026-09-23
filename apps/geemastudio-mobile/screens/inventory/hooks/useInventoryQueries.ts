import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'

import type { InventoryItem } from '../types'

export function useInventoryItemsQuery() {
  const { tenantId, isLoading: isTenantLoading } = useProfileTenantId()

  return useQuery<InventoryItem[]>({
    queryKey: ['inventory_items', tenantId],
    enabled: !isTenantLoading && !!tenantId,
    queryFn: async () => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, tenant_id, name, type, category, quantity, min_stock, unit, price, cost')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })
      if (error) {
        throw new Error(error.message)
      }
      return (data ?? []) as InventoryItem[]
    },
  })
}
