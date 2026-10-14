import type { SupabaseClient } from '@supabase/supabase-js'

import { isMissingColumnError, sortCatalogList } from './catalogAdapter'

/** Fila de `services` para el catálogo (precio como texto decimal). */
export interface CatalogServiceRow {
  id: string
  name: string
  category_id: string
  price: string
  duration: number
  is_active: boolean
  sort_order: number | null
  /** Clave de @zmtech/icons; null/ausente = hereda el ícono de la categoría. */
  icon?: string | null
}

const SERVICE_COLUMNS = 'id, name, category_id, price, duration, is_active, sort_order'

/**
 * Servicios en el orden del catálogo: activos primero, luego `sort_order` (orden manual)
 * y nombre. Tolera BDs sin `services.icon`.
 */
export async function fetchCatalogServices(
  client: SupabaseClient,
  options: { categoryId?: string } = {}
): Promise<CatalogServiceRow[]> {
  const run = (cols: string) => {
    let q = client
      .from('services')
      .select(cols)
      .order('sort_order', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
    if (options.categoryId) q = q.eq('category_id', options.categoryId)
    return q
  }

  let res = await run(`${SERVICE_COLUMNS}, icon`)
  if (res.error && isMissingColumnError(res.error)) {
    res = await run(SERVICE_COLUMNS)
  }
  if (res.error) throw new Error(res.error.message)

  return sortCatalogList((res.data ?? []) as unknown as CatalogServiceRow[], {
    getActive: (s) => s.is_active,
    getOrder: (s) => s.sort_order,
    getName: (s) => s.name,
  })
}
