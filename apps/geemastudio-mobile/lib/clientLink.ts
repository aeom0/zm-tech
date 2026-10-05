import { supabase } from '@/lib/supabase'

/** Prefijos de país de 2 dígitos (misma lista que WABA) para no partir mal `584…` vs `58`. */
const TWO_DIGIT_CC = ['54', '56', '57', '58', '52', '55', '34', '33', '44', '49']

export function normalizePhoneInput(phone: string): string {
  return phone.replace(/[\s\-().]/g, '').trim()
}

export function normalizePersonName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toUpperCase()
}

function splitCountryAndNumber(cleaned: string): { country: string; normalized: string } | null {
  let country = 'PE'
  let number = cleaned

  if (cleaned.startsWith('+')) {
    const withoutPlus = cleaned.slice(1)
    if (withoutPlus.startsWith('51')) {
      number = withoutPlus.slice(2)
    } else {
      const cc2 = withoutPlus.slice(0, 2)
      if (TWO_DIGIT_CC.includes(cc2)) {
        country = cc2
        number = withoutPlus.slice(2)
      } else {
        country = withoutPlus.slice(0, 3)
        number = withoutPlus.slice(3)
      }
    }
  } else if (cleaned.startsWith('51') && cleaned.length >= 11) {
    number = cleaned.slice(2)
  } else {
    const cc2 = cleaned.slice(0, 2)
    if (TWO_DIGIT_CC.includes(cc2) && cleaned.length > 4) {
      country = cc2
      number = cleaned.slice(2)
    }
  }

  return number ? { country, normalized: number } : null
}

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
  const cleanedPhone = normalizePhoneInput(args.phone ?? '')
  const name = normalizePersonName(args.name)
  const parts = cleanedPhone ? splitCountryAndNumber(cleanedPhone) : null
  if (!parts || !name) return null

  const { country, normalized } = parts

  const { data: exact } = await supabase
    .from('clients')
    .select('id')
    .eq('phone_country', country)
    .eq('phone_normalized', normalized)
    .limit(1)
    .maybeSingle()
  if (exact?.id) return exact.id as string

  const digits = cleanedPhone.replace(/\D/g, '')
  const last9 = digits.slice(-9)
  if (last9.length === 9) {
    const { data: rows } = await supabase
      .from('clients')
      .select('id, phone, phone_normalized')
      .or(`phone.ilike.%${last9},phone_normalized.ilike.%${last9}%`)
      .limit(5)
    const match = (rows ?? []).find((row) => {
      const phoneDigits = String(row.phone ?? '').replace(/\D/g, '')
      const normDigits = String(row.phone_normalized ?? '').replace(/\D/g, '')
      return phoneDigits.endsWith(last9) || normDigits.endsWith(last9)
    })
    if (match?.id) return match.id as string
  }

  const { data: created, error } = await supabase
    .from('clients')
    .insert({
      name,
      phone: cleanedPhone,
      phone_country: country,
      phone_normalized: normalized,
      tenant_id: args.tenantId,
    })
    .select('id')
    .single()
  if (error) return null
  return (created?.id as string | undefined) ?? null
}
