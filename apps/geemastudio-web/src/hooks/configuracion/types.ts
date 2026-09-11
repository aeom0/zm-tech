export type WebTemplate = 'elegant' | 'warm' | 'modern'

/** UI de presencia; se mapea a `web_enabled` (+ slug/dominio) hasta existir columna `web_mode`. */
export type WebPresenceMode = 'none' | 'geema_hosted' | 'own_domain'

export interface TenantSettingsPanelRow {
  id: string
  business_name: string
  business_type: string
  tagline: string
  primary_color: string
  accent_color: string
  currency_code: string
  currency_symbol: string
  country: string
  language: string
  client_terminology: string
  staff_terminology: string
  staff_singular_terminology: string
  appointment_terminology: string
  logo_url: string
  logo_bg_light: string | null
  logo_bg_dark: string | null
  features_whatsapp: boolean
  slug: string | null
  web_enabled: boolean
  web_template: WebTemplate
  custom_domain: string | null
}

export type TenantSettingsPatch = Partial<
  Omit<TenantSettingsPanelRow, 'id' | 'business_type'>
> & {
  business_name?: string
}

export interface MonedaLatam {
  code: string
  symbol: string
  nombre: string
  pais: string
}

export const MONEDAS_LATAM: MonedaLatam[] = [
  { code: 'USD', symbol: '$', nombre: 'Dólar estadounidense', pais: 'EE. UU. / Internacional' },
  { code: 'VES', symbol: 'Bs.', nombre: 'Bolívar venezolano', pais: 'Venezuela' },
  { code: 'ARS', symbol: '$', nombre: 'Peso argentino', pais: 'Argentina' },
  { code: 'BOB', symbol: 'Bs.', nombre: 'Boliviano', pais: 'Bolivia' },
  { code: 'BRL', symbol: 'R$', nombre: 'Real brasileño', pais: 'Brasil' },
  { code: 'CLP', symbol: '$', nombre: 'Peso chileno', pais: 'Chile' },
  { code: 'COP', symbol: '$', nombre: 'Peso colombiano', pais: 'Colombia' },
  { code: 'CRC', symbol: '₡', nombre: 'Colón costarricense', pais: 'Costa Rica' },
  { code: 'CUP', symbol: '$', nombre: 'Peso cubano', pais: 'Cuba' },
  { code: 'DOP', symbol: 'RD$', nombre: 'Peso dominicano', pais: 'Rep. Dominicana' },
  { code: 'GTQ', symbol: 'Q', nombre: 'Quetzal guatemalteco', pais: 'Guatemala' },
  { code: 'HNL', symbol: 'L', nombre: 'Lempira hondureño', pais: 'Honduras' },
  { code: 'MXN', symbol: '$', nombre: 'Peso mexicano', pais: 'México' },
  { code: 'NIO', symbol: 'C$', nombre: 'Córdoba nicaragüense', pais: 'Nicaragua' },
  { code: 'PAB', symbol: 'B/.', nombre: 'Balboa panameño', pais: 'Panamá' },
  { code: 'PEN', symbol: 'S/', nombre: 'Sol peruano', pais: 'Perú' },
  { code: 'PYG', symbol: '₲', nombre: 'Guaraní paraguayo', pais: 'Paraguay' },
  { code: 'SVC', symbol: '₡', nombre: 'Colón salvadoreño', pais: 'El Salvador' },
  { code: 'UYU', symbol: '$U', nombre: 'Peso uruguayo', pais: 'Uruguay' },
]

export const WEB_TEMPLATES: { id: WebTemplate; label: string }[] = [
  { id: 'elegant', label: 'Elegant Dark' },
  { id: 'warm', label: 'Warm & Organic' },
  { id: 'modern', label: 'Modern Minimal' },
]

export function slugify(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

export function presenceFromRow(row: TenantSettingsPanelRow): WebPresenceMode {
  if (row.web_enabled && row.slug) return 'geema_hosted'
  if (row.custom_domain?.trim()) return 'own_domain'
  return 'none'
}

export function applyPresenceMode(
  mode: WebPresenceMode,
  draft: { slug: string; custom_domain: string }
): Pick<TenantSettingsPatch, 'web_enabled' | 'slug' | 'custom_domain'> {
  if (mode === 'geema_hosted') {
    return {
      web_enabled: true,
      slug: slugify(draft.slug) || null,
      custom_domain: draft.custom_domain.trim() || null,
    }
  }
  if (mode === 'own_domain') {
    return {
      web_enabled: false,
      slug: draft.slug.trim() ? slugify(draft.slug) : null,
      custom_domain: draft.custom_domain.trim() || null,
    }
  }
  return {
    web_enabled: false,
    slug: draft.slug.trim() ? slugify(draft.slug) : null,
    custom_domain: null,
  }
}
