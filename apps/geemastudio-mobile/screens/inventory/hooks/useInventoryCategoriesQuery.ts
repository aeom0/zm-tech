import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export interface InventoryCategoryRow {
  id: string
  key: string
  label: string
  sort_order: number
}

export const INVENTORY_CATEGORIES_QUERY_KEY = ['inventory_categories']

/** Categorías custom que el owner agregó encima de las base del rubro. */
export function useInventoryCategoriesQuery() {
  return useQuery<InventoryCategoryRow[]>({
    queryKey: INVENTORY_CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_categories')
        .select('id, key, label, sort_order')
        .order('sort_order', { ascending: true })
      if (error) {
        throw new Error(error.message)
      }
      return data ?? []
    },
  })
}
