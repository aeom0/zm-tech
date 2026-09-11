'use client'

import { supabase } from '@/lib/supabase'
import type { TenantSettingsPanelRow, TenantSettingsPatch, WebTemplate } from './types'

const SELECT_CORE =
  'id, business_name, business_type, tagline, primary_color, accent_color, currency_code, currency_symbol, country, language, client_terminology, staff_terminology, staff_singular_terminology, appointment_terminology, logo_url, features_whatsapp, slug, web_enabled, web_template, custom_domain'

const SELECT_WITH_LOGO_BG = `${SELECT_CORE}, logo_bg_light, logo_bg_dark`

function normalizeRow(raw: Record<string, unknown>): TenantSettingsPanelRow {
  const template = raw.web_template
  const webTemplate: WebTemplate =
    template === 'warm' || template === 'modern' || template === 'elegant' ? template : 'elegant'

  return {
    id: String(raw.id),
    business_name: String(raw.business_name ?? ''),
    business_type: String(raw.business_type ?? ''),
    tagline: String(raw.tagline ?? ''),
    primary_color: String(raw.primary_color ?? '#40E0D0'),
    accent_color: String(raw.accent_color ?? '#FFD700'),
    currency_code: String(raw.currency_code ?? 'USD'),
    currency_symbol: String(raw.currency_symbol ?? '$'),
    country: String(raw.country ?? ''),
    language: String(raw.language ?? 'es'),
    client_terminology: String(raw.client_terminology ?? 'cliente'),
    staff_terminology: String(raw.staff_terminology ?? 'Profesionales'),
    staff_singular_terminology: String(raw.staff_singular_terminology ?? 'Profesional'),
    appointment_terminology: String(raw.appointment_terminology ?? 'cita'),
    logo_url: String(raw.logo_url ?? ''),
    logo_bg_light: (raw.logo_bg_light as string | null) ?? null,
    logo_bg_dark: (raw.logo_bg_dark as string | null) ?? null,
    features_whatsapp: Boolean(raw.features_whatsapp),
    slug: (raw.slug as string | null) ?? null,
    web_enabled: Boolean(raw.web_enabled),
    web_template: webTemplate,
    custom_domain: (raw.custom_domain as string | null) ?? null,
  }
}

async function selectByFilter(
  column: 'id' | 'tenant_slug',
  value: string
): Promise<TenantSettingsPanelRow | null> {
  if (!supabase) throw new Error('Supabase no está configurado')

  const withBg = await supabase
    .from('tenant_settings')
    .select(SELECT_WITH_LOGO_BG)
    .eq(column, value)
    .maybeSingle()

  if (!withBg.error && withBg.data) {
    return normalizeRow(withBg.data as unknown as Record<string, unknown>)
  }

  // Columnas logo_bg_* pueden no existir en algunos proyectos
  const core = await supabase
    .from('tenant_settings')
    .select(SELECT_CORE)
    .eq(column, value)
    .maybeSingle()

  if (core.error) throw new Error(core.error.message)
  if (!core.data) return null
  return normalizeRow(core.data as unknown as Record<string, unknown>)
}

export async function fetchTenantSettingsForSession(): Promise<TenantSettingsPanelRow | null> {
  if (!supabase) throw new Error('Supabase no está configurado')

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) throw new Error('No hay sesión activa')

  const byId = await selectByFilter('id', user.id)
  if (byId) return byId

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  const tenantSlug = profile?.tenant_id as string | null | undefined
  if (tenantSlug) {
    return selectByFilter('tenant_slug', tenantSlug)
  }

  return null
}

export async function updateTenantSettings(
  rowId: string,
  patch: TenantSettingsPatch
): Promise<void> {
  if (!supabase) throw new Error('Supabase no está configurado')

  const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }

  const { error } = await supabase.from('tenant_settings').update(payload).eq('id', rowId)
  if (!error) return

  // Reintento sin logo_bg_* si la columna no existe
  const msg = error.message.toLowerCase()
  if (msg.includes('logo_bg') || msg.includes('schema cache') || error.code === 'PGRST204') {
    const { logo_bg_light: _l, logo_bg_dark: _d, ...rest } = payload
    const retry = await supabase.from('tenant_settings').update(rest).eq('id', rowId)
    if (retry.error) throw new Error(retry.error.message)
    return
  }

  throw new Error(error.message)
}

const LOGO_BUCKET = 'tenant-logos'

export async function uploadTenantLogo(userId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado')
  const path = `${userId}/logo.webp`
  const { error } = await supabase.storage.from(LOGO_BUCKET).upload(path, file, {
    contentType: file.type || 'image/webp',
    upsert: true,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(LOGO_BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}
