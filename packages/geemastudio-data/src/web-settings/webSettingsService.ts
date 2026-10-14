import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  WebAssetFolder,
  WebGalleryItem,
  WebPromo,
  WebReview,
  WebService,
  WebSettings,
  WebSettingsPatch,
  WebTeamMember,
  WebTemplate,
} from './types'

export const WEB_SELECT = `
  id,
  tenant_slug,
  web_enabled,
  web_template,
  slug,
  custom_domain,
  web_hero_tagline,
  web_about,
  web_hero_cta_text,
  web_marquee_text,
  web_marquee_speed,
  web_hero_video_url,
  web_salon_video_url,
  web_whatsapp,
  web_instagram,
  web_facebook,
  web_tiktok,
  web_address,
  web_city,
  web_stat_clients,
  web_stat_rating,
  web_stat_years,
  web_map_embed_url,
  web_promo_banner_url,
  web_promo_banner_alt,
  web_promo_banner_active,
  web_gallery,
  web_team,
  web_promos,
  web_services,
  web_reviews
`.replace(/\s+/g, ' ')

function parseJsonbArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (typeof value === 'string') {
    try {
      const parsed: unknown = JSON.parse(value)
      return Array.isArray(parsed) ? (parsed as T[]) : []
    } catch {
      return []
    }
  }
  return []
}

function toTemplate(value: unknown): WebTemplate {
  return value === 'warm' || value === 'modern' || value === 'elegant' ? value : 'elegant'
}

function nullableText(value: unknown): string | null {
  if (value == null) return null
  const s = String(value).trim()
  return s.length > 0 ? s : null
}

export function mapWebRow(raw: Record<string, unknown>): WebSettings {
  return {
    rowId: String(raw.id),
    tenantSlug: nullableText(raw.tenant_slug),
    webEnabled: Boolean(raw.web_enabled),
    webTemplate: toTemplate(raw.web_template),
    slug: nullableText(raw.slug),
    customDomain: nullableText(raw.custom_domain),
    heroTagline: nullableText(raw.web_hero_tagline),
    about: nullableText(raw.web_about),
    heroCtaText: nullableText(raw.web_hero_cta_text),
    marqueeText: nullableText(raw.web_marquee_text),
    marqueeSpeed: raw.web_marquee_speed ? Number(raw.web_marquee_speed) : 30,
    heroVideoUrl: nullableText(raw.web_hero_video_url),
    salonVideoUrl: nullableText(raw.web_salon_video_url),
    whatsapp: nullableText(raw.web_whatsapp),
    instagram: nullableText(raw.web_instagram),
    facebook: nullableText(raw.web_facebook),
    tiktok: nullableText(raw.web_tiktok),
    address: nullableText(raw.web_address),
    city: nullableText(raw.web_city),
    statClients: String(raw.web_stat_clients ?? '500+'),
    statRating: String(raw.web_stat_rating ?? '4.9'),
    statYears: String(raw.web_stat_years ?? '3+'),
    mapEmbedUrl: nullableText(raw.web_map_embed_url),
    promoBannerUrl: nullableText(raw.web_promo_banner_url),
    promoBannerAlt: nullableText(raw.web_promo_banner_alt),
    promoBannerActive: Boolean(raw.web_promo_banner_active),
    gallery: parseJsonbArray<WebGalleryItem>(raw.web_gallery),
    team: parseJsonbArray<WebTeamMember>(raw.web_team),
    promos: parseJsonbArray<WebPromo>(raw.web_promos),
    services: parseJsonbArray<WebService>(raw.web_services),
    reviews: parseJsonbArray<WebReview>(raw.web_reviews),
  }
}

export async function fetchWebSettings(
  client: SupabaseClient,
  tenantSlug: string | null | undefined,
  userId: string | null | undefined
): Promise<WebSettings | null> {
  let query = client.from('tenant_settings').select(WEB_SELECT)
  if (tenantSlug) {
    query = query.eq('tenant_slug', tenantSlug)
  } else if (userId) {
    query = query.eq('id', userId)
  } else {
    return null
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  return mapWebRow(data as unknown as Record<string, unknown>)
}

export async function fetchWebSettingsForSession(
  client: SupabaseClient
): Promise<WebSettings | null> {
  const {
    data: { user },
  } = await client.auth.getUser()
  if (!user) return null

  const byId = await fetchWebSettings(client, null, user.id)
  if (byId) return byId

  const { data: profile } = await client
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  const slug = profile?.tenant_id as string | null | undefined
  if (slug) {
    return fetchWebSettings(client, slug, null)
  }

  return null
}

export async function updateWebSettings(
  client: SupabaseClient,
  rowId: string,
  patch: WebSettingsPatch
): Promise<void> {
  const payload: Record<string, unknown> = {}

  if (patch.webEnabled !== undefined) payload.web_enabled = patch.webEnabled
  if (patch.webTemplate !== undefined) payload.web_template = patch.webTemplate
  if (patch.slug !== undefined) payload.slug = patch.slug
  if (patch.customDomain !== undefined) payload.custom_domain = patch.customDomain
  if (patch.heroTagline !== undefined) payload.web_hero_tagline = patch.heroTagline
  if (patch.about !== undefined) payload.web_about = patch.about
  if (patch.heroCtaText !== undefined) payload.web_hero_cta_text = patch.heroCtaText
  if (patch.marqueeText !== undefined) payload.web_marquee_text = patch.marqueeText
  if (patch.marqueeSpeed !== undefined) payload.web_marquee_speed = patch.marqueeSpeed
  if (patch.heroVideoUrl !== undefined) payload.web_hero_video_url = patch.heroVideoUrl
  if (patch.salonVideoUrl !== undefined) payload.web_salon_video_url = patch.salonVideoUrl
  if (patch.whatsapp !== undefined) payload.web_whatsapp = patch.whatsapp
  if (patch.instagram !== undefined) payload.web_instagram = patch.instagram
  if (patch.facebook !== undefined) payload.web_facebook = patch.facebook
  if (patch.tiktok !== undefined) payload.web_tiktok = patch.tiktok
  if (patch.address !== undefined) payload.web_address = patch.address
  if (patch.city !== undefined) payload.web_city = patch.city
  if (patch.statClients !== undefined) payload.web_stat_clients = patch.statClients
  if (patch.statRating !== undefined) payload.web_stat_rating = patch.statRating
  if (patch.statYears !== undefined) payload.web_stat_years = patch.statYears
  if (patch.mapEmbedUrl !== undefined) payload.web_map_embed_url = patch.mapEmbedUrl
  if (patch.promoBannerUrl !== undefined) payload.web_promo_banner_url = patch.promoBannerUrl
  if (patch.promoBannerAlt !== undefined) payload.web_promo_banner_alt = patch.promoBannerAlt
  if (patch.promoBannerActive !== undefined)
    payload.web_promo_banner_active = patch.promoBannerActive
  if (patch.gallery !== undefined) payload.web_gallery = patch.gallery
  if (patch.team !== undefined) payload.web_team = patch.team
  if (patch.promos !== undefined) payload.web_promos = patch.promos
  if (patch.services !== undefined) payload.web_services = patch.services
  if (patch.reviews !== undefined) payload.web_reviews = patch.reviews

  const { error } = await client.from('tenant_settings').update(payload).eq('id', rowId)
  if (error) throw new Error(error.message)
}

const WEB_ASSETS_BUCKET = 'web-assets'

export async function uploadWebAsset(
  client: SupabaseClient,
  rowId: string,
  folder: WebAssetFolder,
  file: File | Blob | ArrayBuffer | Uint8Array,
  fileName: string,
  contentType = 'image/webp'
): Promise<string> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${rowId}/${folder}/${Date.now()}-${safeName}`

  const { error } = await client.storage.from(WEB_ASSETS_BUCKET).upload(path, file, {
    contentType,
    upsert: false,
  })

  if (error) throw new Error(error.message)

  const { data } = client.storage.from(WEB_ASSETS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

/** Slugifica texto para URL pública /s/[slug] */
export function slugifyWeb(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
