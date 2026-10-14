import { supabase } from '@/lib/supabase'
import {
  findOrCreateClientId as sharedFindOrCreateClientId,
  normalizePersonName,
  normalizePhoneInput,
  splitCountryAndNumber,
} from '@geemastudio/data'

export { normalizePersonName, normalizePhoneInput, splitCountryAndNumber }

/**
 * Busca el cliente por teléfono (país + número normalizado, con respaldo por últimos 9 dígitos)
 * o lo crea. Devuelve el `client_id` a guardar en la cita, o `null` si no hay teléfono usable.
 * No renombra clientes existentes: el nombre de la ficha manda sobre el de la cita.
 */
export async function findOrCreateClientId(args: {
  name: string
  phone: string | null | undefined
  tenantId: string
}): Promise<string | null> {
  return sharedFindOrCreateClientId(supabase, args)
}
