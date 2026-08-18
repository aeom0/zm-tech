// Siembra el catálogo starter de una tienda nueva. Reintenta una vez si falla
// (ej. error de red justo después de crear la tienda) y nunca lanza — el
// registro del dueño no debe bloquearse por esto.
import { supabase } from '../utils/supabase'

const RETRY_DELAY_MS = 800

export interface SeedStarterCatalogResult {
  success: boolean
  inserted: number
}

async function callSeedRpc(storeId: string): Promise<number> {
  const { data, error } = await supabase.rpc('repmax_seed_starter_catalog', {
    p_store_id: storeId,
  })
  if (error) throw new Error(error.message)
  return typeof data === 'number' ? data : 0
}

export async function seedStarterCatalog(storeId: string): Promise<SeedStarterCatalogResult> {
  try {
    const inserted = await callSeedRpc(storeId)
    return { success: true, inserted }
  } catch {
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS))
    try {
      const inserted = await callSeedRpc(storeId)
      return { success: true, inserted }
    } catch (secondError) {
      // No relanzamos: tras el reintento, el catálogo starter es best-effort.
      // El dueño sigue con la tienda vacía y carga productos a mano si hace falta.
      console.warn(
        '[catalogSeedService] No se pudo sembrar el catálogo starter tras reintentar:',
        secondError
      )
      return { success: false, inserted: 0 }
    }
  }
}
