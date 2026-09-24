import { Linking, Alert } from 'react-native'

/** Prefijos E.164 más usados en LATAM (ISO country → dial). */
const DIAL_BY_COUNTRY: Record<string, string> = {
  VE: '58',
  PE: '51',
  CO: '57',
  EC: '593',
  AR: '54',
  CL: '56',
  MX: '52',
  BO: '591',
  PY: '595',
  UY: '598',
  PA: '507',
  DO: '1809',
  CR: '506',
  GT: '502',
  HN: '504',
  NI: '505',
  SV: '503',
  CU: '53',
}

export function digitsOnly(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '')
}

/**
 * Normaliza a dígitos internacionales para wa.me / tel.
 * Si el número ya empieza con el dial del país, no lo duplica.
 */
export function toInternationalDigits(
  phone: string | null | undefined,
  countryCode: string | null | undefined
): string | null {
  const digits = digitsOnly(phone)
  if (!digits) return null

  const dial = DIAL_BY_COUNTRY[(countryCode ?? '').toUpperCase()] ?? ''
  if (!dial) return digits

  if (digits.startsWith(dial)) return digits
  // Números locales PE/VE a veces guardan sin 0 inicial
  if (digits.startsWith('0') && digits.length > dial.length) {
    return dial + digits.slice(1)
  }
  return dial + digits
}

export function buildWhatsAppUrl(
  phone: string | null | undefined,
  countryCode: string | null | undefined,
  message?: string
): string | null {
  const intl = toInternationalDigits(phone, countryCode)
  if (!intl) return null
  const base = `https://wa.me/${intl}`
  if (!message?.trim()) return base
  return `${base}?text=${encodeURIComponent(message.trim())}`
}

export function buildTelUrl(
  phone: string | null | undefined,
  countryCode: string | null | undefined
): string | null {
  const intl = toInternationalDigits(phone, countryCode)
  if (!intl) return null
  return `tel:+${intl}`
}

export async function openExternalUrl(url: string | null, emptyMessage: string): Promise<void> {
  if (!url) {
    Alert.alert('Sin teléfono', emptyMessage)
    return
  }
  try {
    const can = await Linking.canOpenURL(url)
    if (!can) {
      Alert.alert('No se pudo abrir', 'Revisa que la app esté instalada o el número sea válido.')
      return
    }
    await Linking.openURL(url)
  } catch {
    Alert.alert('Error', 'No se pudo abrir el enlace.')
  }
}

export function reengageMessage(clientName: string, businessName?: string): string {
  const saludo = clientName.trim() ? `Hola ${clientName.trim().split(' ')[0]}` : 'Hola'
  const salon = businessName?.trim() ? ` de ${businessName.trim()}` : ''
  return `${saludo}, te escribimos${salon}. ¿Te agendamos tu próxima cita?`
}
