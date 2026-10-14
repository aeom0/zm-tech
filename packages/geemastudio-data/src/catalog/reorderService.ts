import type { SupabaseClient } from '@supabase/supabase-js'

/** Orden manual de servicios dentro de su categoría (`services.sort_order`, desde 1). */
export async function reorderServices(
  client: SupabaseClient,
  orderedIds: readonly string[]
): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, index) =>
      client
        .from('services')
        .update({ sort_order: index + 1 })
        .eq('id', id)
    )
  )
  const failed = results.find((r) => r.error)
  if (failed?.error) throw new Error(failed.error.message)
}

/** Orden de categorías (`service_categories.order`, desde 0). */
export async function reorderServiceCategories(
  client: SupabaseClient,
  orderedIds: readonly string[]
): Promise<void> {
  for (let index = 0; index < orderedIds.length; index++) {
    const { error } = await client
      .from('service_categories')
      .update({ order: index })
      .eq('id', orderedIds[index])
    if (error) throw new Error(error.message)
  }
}
