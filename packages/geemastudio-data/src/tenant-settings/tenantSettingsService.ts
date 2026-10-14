import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantConfig } from '@zmtech/tenant-config'
import {
  toLogoBgStyle,
  type TenantSettingsPanelRow,
  type TenantSettingsPatch,
  type TenantSettingsRow,
  type WebTemplate,
} from './types'

export const TENANT_SETTINGS_SELECT =
  'id, tenant_slug, business_name, business_type, business_subtype, service_categories, primary_color, accent_color, currency_code, currency_symbol, country, language, timezone, time_format, client_terminology, staff_terminology, staff_singular_terminology, appointment_terminology, business_hours, contact_info, commission_staff, commission_house, pos_fee_percent, usar_tasa_manual, tasa_manual_usd_ves, tagline, features_whatsapp, logo_url, logo_bg_light, logo_bg_dark, is_demo, is_configured'

const SELECT_CORE =
  'id, business_name, business_type, tagline, primary_color, accent_color, currency_code, currency_symbol, country, language, timezone, client_terminology, staff_terminology, staff_singular_terminology, appointment_terminology, logo_url, features_whatsapp, slug, web_enabled, web_template, custom_domain'

const SELECT_WITH_POS = `${SELECT_CORE}, pos_fee_percent, usar_tasa_manual, tasa_manual_usd_ves`
const SELECT_WITH_LOGO_BG = `${SELECT_WITH_POS}, logo_bg_light, logo_bg_dark`

/** Slug operativo del negocio (`profiles.tenant_id` → bridge S2). */
export async function resolveTenantSlug(
  client: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data } = await client.from('profiles').select('tenant_id').eq('id', userId).maybeSingle()
  return data?.tenant_id ?? null
}

export function mapConfigToRow(
  config: TenantConfig,
  userId: string,
  tenantSlug?: string | null
): Record<string, unknown> {
  return {
    id: userId,
    ...(tenantSlug ? { tenant_slug: tenantSlug } : {}),
    business_name: config.businessName,
    business_type: config.businessType,
    business_subtype: config.businessSubtype ?? null,
    service_categories: config.serviceCategories ?? [],
    primary_color: config.theme.primaryColor,
    accent_color: config.theme.accentColor,
    currency_code: config.locale.currency.code,
    currency_symbol: config.locale.currency.symbol,
    country: config.locale.country,
    language: config.locale.language,
    timezone: config.locale.timezone,
    time_format: config.locale.timeFormat === '12' ? '12' : '24',
    client_terminology: config.terminology.client,
    staff_terminology: config.terminology.staff,
    staff_singular_terminology: config.terminology.staffSingular,
    appointment_terminology: config.terminology.appointment,
    business_hours: config.businessHours,
    contact_info: config.contact,
    commission_staff: config.commissions.defaultStaffPercent,
    commission_house: config.commissions.defaultHousePercent,
    pos_fee_percent: config.payments?.posFeePercent ?? 5,
    usar_tasa_manual: config.payments?.usarTasaManual ?? false,
    tasa_manual_usd_ves: config.payments?.tasaManualUsdVes ?? null,
    tagline: config.tagline ?? '',
    features_whatsapp: config.features?.whatsapp ?? false,
    logo_url: config.logo ?? '',
    logo_bg_light: config.logoBgLight ?? 'transparent',
    logo_bg_dark: config.logoBgDark ?? 'transparent',
    is_configured: true,
  }
}

export function mapRowToConfig(row: TenantSettingsRow): TenantConfig {
  return {
    businessName: row.business_name,
    businessType: row.business_type,
    businessSubtype: (row.business_subtype as TenantConfig['businessSubtype']) ?? undefined,
    serviceCategories: (row.service_categories as TenantConfig['serviceCategories']) ?? [],
    tagline: row.tagline ?? '',
    logo: row.logo_url ?? '',
    logoBgLight: toLogoBgStyle(row.logo_bg_light),
    logoBgDark: toLogoBgStyle(row.logo_bg_dark),
    theme: {
      primaryColor: row.primary_color,
      accentColor: row.accent_color,
      darkMode: false,
    },
    locale: {
      currency: {
        code: row.currency_code,
        symbol: row.currency_symbol,
      },
      country: row.country,
      timezone: row.timezone ?? 'America/Caracas',
      language: row.language,
      timeFormat: row.time_format === '12' ? '12' : '24',
    },
    terminology: {
      staff: row.staff_terminology,
      staffSingular: row.staff_singular_terminology,
      appointment: row.appointment_terminology,
      client: row.client_terminology ?? 'cliente',
    },
    contact: row.contact_info ?? {},
    businessHours: row.business_hours,
    commissions: {
      defaultStaffPercent: row.commission_staff,
      defaultHousePercent: row.commission_house,
    },
    payments: {
      posFeePercent: row.pos_fee_percent != null ? Number(row.pos_fee_percent) : 5,
      usarTasaManual: row.usar_tasa_manual ?? false,
      tasaManualUsdVes: row.tasa_manual_usd_ves != null ? Number(row.tasa_manual_usd_ves) : null,
    },
    features: {
      whatsapp: row.features_whatsapp ?? false,
    },
    isDemo: row.is_demo ?? false,
  }
}

export function normalizePanelRow(raw: Record<string, unknown>): TenantSettingsPanelRow {
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
    timezone: String(raw.timezone ?? 'America/Caracas'),
    client_terminology: String(raw.client_terminology ?? 'cliente'),
    staff_terminology: String(raw.staff_terminology ?? 'Profesionales'),
    staff_singular_terminology: String(raw.staff_singular_terminology ?? 'Profesional'),
    appointment_terminology: String(raw.appointment_terminology ?? 'cita'),
    logo_url: String(raw.logo_url ?? ''),
    logo_bg_light: (raw.logo_bg_light as string | null) ?? null,
    logo_bg_dark: (raw.logo_bg_dark as string | null) ?? null,
    features_whatsapp: Boolean(raw.features_whatsapp),
    pos_fee_percent: raw.pos_fee_percent != null ? Number(raw.pos_fee_percent) : 5,
    usar_tasa_manual: Boolean(raw.usar_tasa_manual),
    tasa_manual_usd_ves: raw.tasa_manual_usd_ves != null ? Number(raw.tasa_manual_usd_ves) : null,
    slug: (raw.slug as string | null) ?? null,
    web_enabled: Boolean(raw.web_enabled),
    web_template: webTemplate,
    custom_domain: (raw.custom_domain as string | null) ?? null,
  }
}

export async function fetchTenantConfig(
  client: SupabaseClient,
  userId: string
): Promise<TenantConfig | null> {
  const tenantSlug = await resolveTenantSlug(client, userId)

  let query = client.from('tenant_settings').select(TENANT_SETTINGS_SELECT)
  if (tenantSlug) {
    query = query.eq('tenant_slug', tenantSlug)
  } else {
    query = query.eq('id', userId)
  }

  const { data, error } = await query.maybeSingle<
    TenantSettingsRow & { is_configured?: boolean | null }
  >()

  if (error) {
    throw new Error(error.message)
  }

  if (!data || data.is_configured === false) {
    return null
  }

  return mapRowToConfig(data)
}

export async function upsertTenantSettings(
  client: SupabaseClient,
  config: TenantConfig,
  userId: string
): Promise<void> {
  const tenantSlug = await resolveTenantSlug(client, userId)
  const payload = mapConfigToRow(config, userId, tenantSlug)

  const { error } = await client.from('tenant_settings').upsert(payload, {
    onConflict: tenantSlug ? 'tenant_slug' : 'id',
  })

  if (error) {
    throw new Error(error.message)
  }
}

async function selectPanelRowByFilter(
  client: SupabaseClient,
  column: 'id' | 'tenant_slug',
  value: string
): Promise<TenantSettingsPanelRow | null> {
  const withBg = await client
    .from('tenant_settings')
    .select(SELECT_WITH_LOGO_BG)
    .eq(column, value)
    .maybeSingle()

  if (!withBg.error && withBg.data) {
    return normalizePanelRow(withBg.data as Record<string, unknown>)
  }

  const withPos = await client
    .from('tenant_settings')
    .select(SELECT_WITH_POS)
    .eq(column, value)
    .maybeSingle()

  if (!withPos.error && withPos.data) {
    return normalizePanelRow(withPos.data as Record<string, unknown>)
  }

  const core = await client
    .from('tenant_settings')
    .select(SELECT_CORE)
    .eq(column, value)
    .maybeSingle()

  if (core.error) throw new Error(core.error.message)
  if (!core.data) return null
  return normalizePanelRow(core.data as Record<string, unknown>)
}

export async function fetchTenantSettingsForSession(
  client: SupabaseClient
): Promise<TenantSettingsPanelRow | null> {
  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser()
  if (userError || !user) throw new Error('No hay sesión activa')

  const byId = await selectPanelRowByFilter(client, 'id', user.id)
  if (byId) return byId

  const { data: profile } = await client
    .from('profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .maybeSingle()

  const tenantSlug = profile?.tenant_id as string | null | undefined
  if (tenantSlug) {
    return selectPanelRowByFilter(client, 'tenant_slug', tenantSlug)
  }

  return null
}

export async function updateTenantSettingsRow(
  client: SupabaseClient,
  rowId: string,
  patch: TenantSettingsPatch
): Promise<void> {
  const payload: Record<string, unknown> = { ...patch, updated_at: new Date().toISOString() }

  const { error } = await client.from('tenant_settings').update(payload).eq('id', rowId)
  if (!error) return

  const msg = error.message.toLowerCase()
  if (msg.includes('logo_bg') || msg.includes('schema cache') || error.code === 'PGRST204') {
    const { logo_bg_light: _l, logo_bg_dark: _d, ...rest } = payload
    const retry = await client.from('tenant_settings').update(rest).eq('id', rowId)
    if (retry.error) throw new Error(retry.error.message)
    return
  }

  throw new Error(error.message)
}

const LOGO_BUCKET = 'tenant-logos'

export async function uploadTenantLogo(
  client: SupabaseClient,
  userId: string,
  file: File | Blob | ArrayBuffer | Uint8Array,
  contentType = 'image/webp'
): Promise<string> {
  const path = `${userId}/logo.webp`
  const { error } = await client.storage.from(LOGO_BUCKET).upload(path, file, {
    contentType,
    upsert: true,
  })
  if (error) throw new Error(error.message)
  const { data } = client.storage.from(LOGO_BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?t=${Date.now()}`
}
