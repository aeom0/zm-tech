import { normalizePhoneInput, splitCountryAndNumber } from '@/lib/clientLink'

/** Resultado de validar un campo: `error` bloquea el guardado, `hint` es solo una sugerencia. */
export interface FieldCheck {
  error?: string
  hint?: string
}

export interface PhoneCheck extends FieldCheck {
  /** Valor canónico para guardar: código de país + número, solo dígitos (ej. 51987654321). */
  phone: string | null
  phoneCountry: string | null
  phoneNormalized: string | null
}

export interface DocumentCheck extends FieldCheck {
  /** Documento limpio (sin espacios, puntos ni guiones, en mayúsculas) o null si está vacío. */
  value: string | null
}

type CountryCode = string

/** Celular nacional por país: formato esperado, ejemplo y código con el que se guarda `phone_country`. */
const NATIONAL_PHONE: Record<
  string,
  { dial: string; country: string; pattern: RegExp; example: string; label: string }
> = {
  PE: {
    dial: '51',
    country: 'PE',
    pattern: /^9\d{8}$/,
    example: '987654321',
    label: 'Celular de Perú: 9 dígitos que empiezan con 9',
  },
  CO: {
    dial: '57',
    country: '57',
    pattern: /^3\d{9}$/,
    example: '3101234567',
    label: 'Celular de Colombia: 10 dígitos que empiezan con 3',
  },
  VE: {
    dial: '58',
    country: '58',
    pattern: /^4(12|14|16|24|26)\d{7}$/,
    example: '4141234567',
    label: 'Celular de Venezuela: 10 dígitos (ej. 414 1234567)',
  },
}

const EMPTY_PHONE: PhoneCheck = { phone: null, phoneCountry: null, phoneNormalized: null }

export function phonePlaceholder(country: CountryCode): string {
  return NATIONAL_PHONE[country]?.example ?? '987654321'
}

/**
 * Valida y normaliza un teléfono. Sin `+` se interpreta como número del país del negocio;
 * con `+` (o con el código de país) se acepta cualquier país. Vacío es válido (el campo es opcional).
 */
export function checkPhone(raw: string, country: CountryCode): PhoneCheck {
  const cleaned = normalizePhoneInput(raw)
  if (!cleaned) return EMPTY_PHONE

  if (/[^\d+]/.test(cleaned) || cleaned.lastIndexOf('+') > 0) {
    return { ...EMPTY_PHONE, error: 'El teléfono solo puede tener números, espacios y el signo +' }
  }

  const rule = NATIONAL_PHONE[country]
  const digits = cleaned.replace(/\D/g, '')
  let parts: { country: string; normalized: string } | null = null

  if (cleaned.startsWith('+')) {
    if (digits.length < 8 || digits.length > 15) {
      return { ...EMPTY_PHONE, error: 'Con +, el número debe tener entre 8 y 15 dígitos' }
    }
    parts = splitCountryAndNumber(cleaned)
  } else if (rule) {
    const national = digits.startsWith(rule.dial) ? digits.slice(rule.dial.length) : digits
    const withoutZero = country === 'VE' ? national.replace(/^0/, '') : national
    if (rule.pattern.test(withoutZero)) {
      parts = { country: rule.country, normalized: withoutZero }
    } else if (digits.length >= 11 && !digits.startsWith(rule.dial)) {
      // Número de otro país escrito sin "+": se acepta si parece internacional.
      parts = splitCountryAndNumber(digits)
    } else {
      return {
        ...EMPTY_PHONE,
        error: `${rule.label}. Para otro país escribe + y el código (ej. +34 612345678)`,
      }
    }
  } else {
    if (digits.length < 7 || digits.length > 15) {
      return { ...EMPTY_PHONE, error: 'El teléfono debe tener entre 7 y 15 dígitos' }
    }
    parts = splitCountryAndNumber(digits)
  }

  if (!parts) return { ...EMPTY_PHONE, error: 'No se reconoce el teléfono' }

  const dial = parts.country === 'PE' ? '51' : parts.country
  return {
    phone: `${dial}${parts.normalized}`,
    phoneCountry: parts.country,
    phoneNormalized: parts.normalized,
    hint: `Se guardará como +${dial} ${parts.normalized}`,
  }
}

/** Quita espacios, puntos y guiones del documento y lo pasa a mayúsculas. */
export function cleanDocument(raw: string): string {
  return raw.replace(/[\s.\-]/g, '').toUpperCase()
}

export function documentPlaceholder(country: CountryCode): string {
  if (country === 'PE') return 'DNI 12345678 o CE 001234567'
  if (country === 'CO') return 'Cédula 1012345678'
  if (country === 'VE') return 'Cédula V12345678'
  return 'Número de documento'
}

/**
 * Valida DNI / CE / cédula según el país del negocio y sugiere el tipo detectado.
 * La BD guarda un solo campo `dni`, sin tipo de documento. Vacío es válido.
 */
export function checkDocument(raw: string, country: CountryCode): DocumentCheck {
  const value = cleanDocument(raw)
  if (!value) return { value: null }

  if (country === 'PE') {
    if (/^\d{8}$/.test(value)) return { value, hint: 'DNI' }
    if (/^\d+$/.test(value) && value.length < 8) {
      return { value, error: 'El DNI tiene 8 dígitos' }
    }
    if (/^[A-Z0-9]{9,12}$/.test(value))
      return { value, hint: 'Carné de extranjería (CE) o pasaporte' }
    return {
      value,
      error: 'DNI de 8 dígitos, o CE/pasaporte de 9 a 12 caracteres (solo letras y números)',
    }
  }

  if (country === 'CO') {
    if (/^\d{6,10}$/.test(value)) return { value, hint: 'Cédula de ciudadanía' }
    if (/^[A-Z0-9]{5,15}$/.test(value)) return { value, hint: 'Cédula de extranjería o pasaporte' }
    return { value, error: 'La cédula tiene entre 6 y 10 dígitos' }
  }

  if (country === 'VE') {
    if (/^[VE]?\d{6,9}$/.test(value)) {
      return { value, hint: value.startsWith('E') ? 'Cédula de extranjero' : 'Cédula de identidad' }
    }
    return { value, error: 'La cédula tiene entre 6 y 9 dígitos (ej. V12345678)' }
  }

  if (/^[A-Z0-9]{5,20}$/.test(value)) return { value }
  return { value, error: 'El documento debe tener entre 5 y 20 letras o números' }
}

/** Valida un correo; vacío es válido. Sugiere el error de tipeo más común (espacios y coma en vez de punto). */
export function checkEmail(raw: string): FieldCheck {
  const value = raw.trim()
  if (!value) return {}
  if (/\s/.test(value)) return { error: 'El correo no puede tener espacios' }
  if (!/^[^@\s,]+@[^@\s,]+\.[A-Za-z]{2,}$/.test(value)) {
    return { error: 'Correo no válido (ej. nombre@correo.com)' }
  }
  return {}
}
