// Servicio para obtener datos de landing por slug o custom_domain (cliente anon)

import { createClient } from '@supabase/supabase-js'
import type {
  BusinessHoursConfig,
  TenantLandingData,
  WebReview,
  WebService,
} from '@/types/tenant-landing'

const supabasePublic = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function getTenantLandingBySlug(slug: string): Promise<TenantLandingData | null> {
  const { data, error } = await supabasePublic
    .from('tenant_settings')
    .select(
      `
      business_name,
      slug,
      web_template,
      custom_domain,
      tagline,
      web_hero_tagline,
      web_about,
      currency_symbol,
      web_whatsapp,
      web_instagram,
      web_address,
      web_city,
      web_stat_clients,
      web_stat_rating,
      web_stat_years,
      web_services,
      web_reviews,
      business_hours,
      web_enabled
    `
    )
    .eq('slug', slug)
    .eq('web_enabled', true)
    .single()

  if (error || !data) return null

  return mapRowToLandingData(data)
}

export async function getTenantLandingByDomain(domain: string): Promise<TenantLandingData | null> {
  const { data, error } = await supabasePublic
    .from('tenant_settings')
    .select(
      `
      business_name,
      slug,
      web_template,
      custom_domain,
      tagline,
      web_hero_tagline,
      web_about,
      currency_symbol,
      web_whatsapp,
      web_instagram,
      web_address,
      web_city,
      web_stat_clients,
      web_stat_rating,
      web_stat_years,
      web_services,
      web_reviews,
      business_hours,
      web_enabled
    `
    )
    .eq('custom_domain', domain)
    .eq('web_enabled', true)
    .single()

  if (error || !data) return null

  return mapRowToLandingData(data)
}

function parseJsonb<T>(val: unknown, fallback: T): T {
  if (val === null || val === undefined) return fallback
  if (Array.isArray(val)) return val as T
  if (typeof val === 'object') return val as T
  if (typeof val === 'string') {
    try {
      return JSON.parse(val) as T
    } catch {
      return fallback
    }
  }
  return fallback
}

function parseBusinessHours(val: unknown): BusinessHoursConfig | null {
  if (val == null) return null
  if (typeof val === 'object' && !Array.isArray(val)) return val as BusinessHoursConfig
  if (typeof val === 'string') {
    try {
      const p = JSON.parse(val) as unknown
      if (p && typeof p === 'object' && !Array.isArray(p)) return p as BusinessHoursConfig
    } catch {
      return null
    }
  }
  return null
}

function mapRowToLandingData(row: Record<string, unknown>): TenantLandingData {
  const taglineRaw = row.tagline != null ? String(row.tagline).trim() : ''

  const tpl = row.web_template
  const webTemplate = tpl === 'elegant' || tpl === 'warm' || tpl === 'modern' ? tpl : 'elegant'

  return {
    businessName: String(row.business_name ?? ''),
    slug: String(row.slug ?? ''),
    webTemplate,
    customDomain: row.custom_domain ? String(row.custom_domain) : null,
    tagline: taglineRaw.length > 0 ? taglineRaw : null,
    heroTagline: row.web_hero_tagline ? String(row.web_hero_tagline) : null,
    about: row.web_about ? String(row.web_about) : null,
    currencySymbol: String(row.currency_symbol ?? '$'),
    whatsapp: row.web_whatsapp ? String(row.web_whatsapp) : null,
    instagram: row.web_instagram ? String(row.web_instagram) : null,
    address: row.web_address ? String(row.web_address) : null,
    city: row.web_city ? String(row.web_city) : null,
    statClients: String(row.web_stat_clients ?? '500+'),
    statRating: String(row.web_stat_rating ?? '4.9'),
    statYears: String(row.web_stat_years ?? '3+'),
    services: parseJsonb<WebService[]>(row.web_services, []),
    reviews: parseJsonb<WebReview[]>(row.web_reviews, []),
    businessHours: parseBusinessHours(row.business_hours),
  }
}
