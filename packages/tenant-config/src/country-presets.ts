import type { TenantConfig, TimeFormatPreference } from './types'

/** Código ISO 3166-1 alpha-2 de países soportados en onboarding. */
export type CountryCode =
  | 'VE'
  | 'PE'
  | 'CO'
  | 'EC'
  | 'AR'
  | 'CL'
  | 'MX'
  | 'BO'
  | 'PY'
  | 'UY'
  | 'PA'
  | 'DO'
  | 'CR'
  | 'GT'
  | 'HN'
  | 'NI'
  | 'SV'
  | 'CU'

export type LocaleLanguage = TenantConfig['locale']['language']

export interface CountryPreset {
  code: CountryCode
  label: string
  /** Emoji bandera (UI). */
  flag: string
  /** Destacar arriba en el selector (p. ej. VE para Geema LATAM). */
  featured?: boolean
  currency: { code: string; symbol: string }
  timezone: string
  language: LocaleLanguage
  timeFormat?: TimeFormatPreference
}

/**
 * País → moneda / TZ / language. Fuente para onboarding y Settings.
 * Ampliar filas al sumar mercados; feriados nacionales van en `salon-holidays.ts`.
 */
export const COUNTRY_PRESETS: readonly CountryPreset[] = [
  {
    code: 'VE',
    label: 'Venezuela',
    flag: '🇻🇪',
    featured: true,
    currency: { code: 'VES', symbol: 'Bs.' },
    timezone: 'America/Caracas',
    language: 'es-VE',
    timeFormat: '24',
  },
  {
    code: 'PE',
    label: 'Perú',
    flag: '🇵🇪',
    currency: { code: 'PEN', symbol: 'S/' },
    timezone: 'America/Lima',
    language: 'es-PE',
    timeFormat: '12',
  },
  {
    code: 'CO',
    label: 'Colombia',
    flag: '🇨🇴',
    currency: { code: 'COP', symbol: '$' },
    timezone: 'America/Bogota',
    language: 'es-CO',
    timeFormat: '12',
  },
  {
    code: 'EC',
    label: 'Ecuador',
    flag: '🇪🇨',
    currency: { code: 'USD', symbol: '$' },
    timezone: 'America/Guayaquil',
    language: 'es',
    timeFormat: '24',
  },
  {
    code: 'AR',
    label: 'Argentina',
    flag: '🇦🇷',
    currency: { code: 'ARS', symbol: '$' },
    timezone: 'America/Argentina/Buenos_Aires',
    language: 'es-AR',
    timeFormat: '24',
  },
  {
    code: 'CL',
    label: 'Chile',
    flag: '🇨🇱',
    currency: { code: 'CLP', symbol: '$' },
    timezone: 'America/Santiago',
    language: 'es-CL',
    timeFormat: '24',
  },
  {
    code: 'MX',
    label: 'México',
    flag: '🇲🇽',
    currency: { code: 'MXN', symbol: '$' },
    timezone: 'America/Mexico_City',
    language: 'es-MX',
    timeFormat: '12',
  },
  {
    code: 'BO',
    label: 'Bolivia',
    flag: '🇧🇴',
    currency: { code: 'BOB', symbol: 'Bs.' },
    timezone: 'America/La_Paz',
    language: 'es',
    timeFormat: '24',
  },
  {
    code: 'PY',
    label: 'Paraguay',
    flag: '🇵🇾',
    currency: { code: 'PYG', symbol: '₲' },
    timezone: 'America/Asuncion',
    language: 'es',
    timeFormat: '24',
  },
  {
    code: 'UY',
    label: 'Uruguay',
    flag: '🇺🇾',
    currency: { code: 'UYU', symbol: '$U' },
    timezone: 'America/Montevideo',
    language: 'es',
    timeFormat: '24',
  },
  {
    code: 'PA',
    label: 'Panamá',
    flag: '🇵🇦',
    currency: { code: 'PAB', symbol: 'B/.' },
    timezone: 'America/Panama',
    language: 'es',
    timeFormat: '12',
  },
  {
    code: 'DO',
    label: 'Rep. Dominicana',
    flag: '🇩🇴',
    currency: { code: 'DOP', symbol: 'RD$' },
    timezone: 'America/Santo_Domingo',
    language: 'es',
    timeFormat: '12',
  },
  {
    code: 'CR',
    label: 'Costa Rica',
    flag: '🇨🇷',
    currency: { code: 'CRC', symbol: '₡' },
    timezone: 'America/Costa_Rica',
    language: 'es',
    timeFormat: '12',
  },
  {
    code: 'GT',
    label: 'Guatemala',
    flag: '🇬🇹',
    currency: { code: 'GTQ', symbol: 'Q' },
    timezone: 'America/Guatemala',
    language: 'es',
    timeFormat: '12',
  },
  {
    code: 'HN',
    label: 'Honduras',
    flag: '🇭🇳',
    currency: { code: 'HNL', symbol: 'L' },
    timezone: 'America/Tegucigalpa',
    language: 'es',
    timeFormat: '12',
  },
  {
    code: 'NI',
    label: 'Nicaragua',
    flag: '🇳🇮',
    currency: { code: 'NIO', symbol: 'C$' },
    timezone: 'America/Managua',
    language: 'es',
    timeFormat: '12',
  },
  {
    code: 'SV',
    label: 'El Salvador',
    flag: '🇸🇻',
    currency: { code: 'USD', symbol: '$' },
    timezone: 'America/El_Salvador',
    language: 'es',
    timeFormat: '12',
  },
  {
    code: 'CU',
    label: 'Cuba',
    flag: '🇨🇺',
    currency: { code: 'CUP', symbol: '$' },
    timezone: 'America/Havana',
    language: 'es',
    timeFormat: '12',
  },
] as const

const BY_CODE = new Map(COUNTRY_PRESETS.map((p) => [p.code, p]))

export function getCountryPreset(code: string | null | undefined): CountryPreset | undefined {
  if (!code) return undefined
  return BY_CODE.get(code.toUpperCase() as CountryCode)
}

/** Locale parcial listo para merge en `updateTenant`. */
export function localeFromCountry(code: string): TenantConfig['locale'] | null {
  const preset = getCountryPreset(code)
  if (!preset) return null
  return {
    country: preset.code,
    currency: { ...preset.currency },
    timezone: preset.timezone,
    language: preset.language,
    timeFormat: preset.timeFormat ?? '24',
  }
}

/** Featured primero, luego el resto alfabético por label. */
export function countriesForPicker(): CountryPreset[] {
  const featured = COUNTRY_PRESETS.filter((c) => c.featured)
  const rest = COUNTRY_PRESETS.filter((c) => !c.featured).slice().sort((a, b) =>
    a.label.localeCompare(b.label, 'es')
  )
  return [...featured, ...rest]
}
