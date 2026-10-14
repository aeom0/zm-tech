import { useQuery } from '@tanstack/react-query'
import { fetchInventoryCategories, type InventoryCategoryRow } from '@geemastudio/data'

import { supabase } from '@/lib/supabase'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'

export type { InventoryCategoryRow }

export const INVENTORY_CATEGORIES_QUERY_KEY = ['inventory_categories'] as const

/** Categorías custom que el owner agregó encima de las base del rubro. */
export function useInventoryCategoriesQuery() {
  const { tenantId, isLoading: isTenantLoading } = useProfileTenantId()

  return useQuery<InventoryCategoryRow[]>({
    queryKey: [...INVENTORY_CATEGORIES_QUERY_KEY, tenantId],
    enabled: !isTenantLoading && !!tenantId,
    queryFn: () => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      return fetchInventoryCategories(supabase, tenantId)
    },
  })
}
