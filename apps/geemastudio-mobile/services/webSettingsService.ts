/**
 * Lectura/escritura de columnas web_* de tenant_settings (CMS Mi Web).
 * No pasa por TenantConfig — servicio dedicado.
 */
import { supabase } from '@/lib/supabase'
import type {
  WebGalleryItem,
  WebPromo,
  WebReview,
  WebService,
  WebSettings,
  WebSettingsPatch,
  WebTeamMember,
  WebTemplate,
} from '@/types/web-landing'

const WEB_SELECT = `
  id,
  tenant_slug,
  web_enabled,
  web_template,
  slug,
  custom_domain,
  web_hero_tagline,
  web_about,
  web_marquee_text,
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

function mapRow(raw: Record<string, unknown>): WebSettings {
  return {
    rowId: String(raw.id),
    tenantSlug: nullableText(raw.tenant_slug),
    webEnabled: Boolean(raw.web_enabled),
    webTemplate: toTemplate(raw.web_template),
    slug: nullableText(raw.slug),
    customDomain: nullableText(raw.custom_domain),
    heroTagline: nullableText(raw.web_hero_tagline),
    about: nullableText(raw.web_about),
    marqueeText: nullableText(raw.web_marquee_text),
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
    gallery: parseJsonbArray<WebGalleryItem>(raw.web_gallery),
    team: parseJsonbArray<WebTeamMember>(raw.web_team),
    promos: parseJsonbArray<WebPromo>(raw.web_promos),
    services: parseJsonbArray<WebService>(raw.web_services),
    reviews: parseJsonbArray<WebReview>(raw.web_reviews),
  }
}

async function resolveTenantSlug(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle()
  return (data?.tenant_id as string | null | undefined) ?? null
}

async function selectByFilter(
  column: 'id' | 'tenant_slug',
  value: string
): Promise<WebSettings | null> {
  const { data, error } = await supabase
    .from('tenant_settings')
    .select(WEB_SELECT)
    .eq(column, value)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null
  return mapRow(data as unknown as Record<string, unknown>)
}

export async function fetchWebSettings(): Promise<WebSettings | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('No hay sesión activa')

  const byId = await selectByFilter('id', user.id)
  if (byId) return byId

  const tenantSlug = await resolveTenantSlug(user.id)
  if (tenantSlug) return selectByFilter('tenant_slug', tenantSlug)

  return null
}

function patchToColumns(patch: WebSettingsPatch): Record<string, unknown> {
  const out: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (patch.webEnabled !== undefined) out.web_enabled = patch.webEnabled
  if (patch.webTemplate !== undefined) out.web_template = patch.webTemplate
  if (patch.slug !== undefined) out.slug = patch.slug
  if (patch.customDomain !== undefined) out.custom_domain = patch.customDomain
  if (patch.heroTagline !== undefined) out.web_hero_tagline = patch.heroTagline
  if (patch.about !== undefined) out.web_about = patch.about
  if (patch.marqueeText !== undefined) out.web_marquee_text = patch.marqueeText
  if (patch.heroVideoUrl !== undefined) out.web_hero_video_url = patch.heroVideoUrl
  if (patch.salonVideoUrl !== undefined) out.web_salon_video_url = patch.salonVideoUrl
  if (patch.whatsapp !== undefined) out.web_whatsapp = patch.whatsapp
  if (patch.instagram !== undefined) out.web_instagram = patch.instagram
  if (patch.facebook !== undefined) out.web_facebook = patch.facebook
  if (patch.tiktok !== undefined) out.web_tiktok = patch.tiktok
  if (patch.address !== undefined) out.web_address = patch.address
  if (patch.city !== undefined) out.web_city = patch.city
  if (patch.statClients !== undefined) out.web_stat_clients = patch.statClients
  if (patch.statRating !== undefined) out.web_stat_rating = patch.statRating
  if (patch.statYears !== undefined) out.web_stat_years = patch.statYears
  if (patch.mapEmbedUrl !== undefined) out.web_map_embed_url = patch.mapEmbedUrl
  if (patch.gallery !== undefined) out.web_gallery = patch.gallery
  if (patch.team !== undefined) out.web_team = patch.team
  if (patch.promos !== undefined) out.web_promos = patch.promos
  if (patch.services !== undefined) out.web_services = patch.services
  if (patch.reviews !== undefined) out.web_reviews = patch.reviews

  return out
}

export async function updateWebSettings(
  rowId: string,
  patch: WebSettingsPatch
): Promise<void> {
  const payload = patchToColumns(patch)
  const { error } = await supabase.from('tenant_settings').update(payload).eq('id', rowId)
  if (error) throw new Error(error.message)
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
    .slice(0, 48)
}
