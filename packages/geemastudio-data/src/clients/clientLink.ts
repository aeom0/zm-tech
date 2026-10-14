import type { SupabaseClient } from '@supabase/supabase-js'

const TWO_DIGIT_CC = ['54', '56', '57', '58', '52', '55', '34', '33', '44', '49']

export function normalizePhoneInput(phone: string): string {
  return phone.replace(/[\s\-().]/g, '').trim()
}

export function normalizePersonName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toUpperCase()
}

export function splitCountryAndNumber(
  cleaned: string
): { country: string; normalized: string } | null {
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

export async function findOrCreateClientId(
  client: SupabaseClient,
  args: {
    name: string
    phone: string | null | undefined
    tenantId: string
  }
): Promise<string | null> {
  const cleanedPhone = normalizePhoneInput(args.phone ?? '')
  const name = normalizePersonName(args.name)
  const parts = cleanedPhone ? splitCountryAndNumber(cleanedPhone) : null
  if (!parts || !name) return null

  const { country, normalized } = parts

  const { data: exact } = await client
    .from('clients')
    .select('id')
    .eq('phone_country', country)
    .eq('phone_normalized', normalized)
    .limit(1)
    .maybeSingle()

  if (exact?.id) return String(exact.id)

  const dial = country === 'PE' ? '51' : country
  const fullPhone = `${dial}${normalized}`

  const { data: created, error } = await client
    .from('clients')
    .insert({
      tenant_id: args.tenantId,
      name,
      phone: fullPhone,
      phone_country: country,
      phone_normalized: normalized,
    })
    .select('id')
    .single()

  if (error || !created) {
    // Si hubo colisión por índice único o carrera, buscar de nuevo
    const { data: retry } = await client
      .from('clients')
      .select('id')
      .eq('phone_country', country)
      .eq('phone_normalized', normalized)
      .limit(1)
      .maybeSingle()
    return retry?.id ? String(retry.id) : null
  }

  return String(created.id)
}
