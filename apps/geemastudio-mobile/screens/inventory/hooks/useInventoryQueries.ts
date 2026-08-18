import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

import type { InventoryItem } from '../types'

export function useInventoryItemsQuery() {
  return useQuery<InventoryItem[]>({
    queryKey: ['inventory_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('id, name, type, category, quantity, min_stock, unit, price, cost')
        .order('created_at', { ascending: true })
      if (error) {
        throw new Error(error.message)
      }
      return (data ?? []) as InventoryItem[]
    },
  })
}
