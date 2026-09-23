import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'

export interface InventoryCategoryRow {
  id: string
  key: string
  label: string
  sort_order: number
}

export const INVENTORY_CATEGORIES_QUERY_KEY = ['inventory_categories'] as const

/** Categorías custom que el owner agregó encima de las base del rubro. */
export function useInventoryCategoriesQuery() {
  const { tenantId, isLoading: isTenantLoading } = useProfileTenantId()

  return useQuery<InventoryCategoryRow[]>({
    queryKey: [...INVENTORY_CATEGORIES_QUERY_KEY, tenantId],
    enabled: !isTenantLoading && !!tenantId,
    queryFn: async () => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('id, key, label, sort_order')
        .eq('tenant_id', tenantId)
        .order('sort_order', { ascending: true })
      if (error) {
        throw new Error(error.message)
      }
      return data ?? []
    },
  })
}
