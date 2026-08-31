/*
 * MIGRACIÓN REQUERIDA en Supabase Dashboard SQL Editor (proyecto udelxwwnyivknslueerr):
 *
 * ALTER TABLE tenant_settings
 *   ADD COLUMN IF NOT EXISTS timezone          text    NOT NULL DEFAULT 'America/Caracas',
 *   ADD COLUMN IF NOT EXISTS client_terminology text   NOT NULL DEFAULT 'cliente',
 *   ADD COLUMN IF NOT EXISTS tagline            text    NOT NULL DEFAULT '',
 *   ADD COLUMN IF NOT EXISTS features_whatsapp  boolean NOT NULL DEFAULT false;
 *   ADD COLUMN IF NOT EXISTS time_format       text    NOT NULL DEFAULT '24';
 *   ADD COLUMN IF NOT EXISTS logo_bg_light     text    NOT NULL DEFAULT 'transparent',
 *   ADD COLUMN IF NOT EXISTS logo_bg_dark      text    NOT NULL DEFAULT 'transparent';
 */
import { supabase } from '@/lib/supabase'
import type { TenantConfig, LogoBackgroundStyle } from '@zmtech/tenant-config'

function toLogoBgStyle(value: string | null | undefined): LogoBackgroundStyle {
  return value === 'light' || value === 'dark' ? value : 'transparent'
}

const TENANT_SETTINGS_SELECT =
  'business_name, business_type, business_subtype, service_categories, primary_color, accent_color, currency_code, currency_symbol, country, language, timezone, time_format, client_terminology, staff_terminology, staff_singular_terminology, appointment_terminology, business_hours, contact_info, commission_staff, commission_house, tagline, features_whatsapp, logo_url, logo_bg_light, logo_bg_dark, is_demo, is_configured'

/** Slug operativo del negocio (`profiles.tenant_id` → bridge S2). */
async function resolveTenantSlug(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('tenant_id')
    .eq('id', userId)
    .maybeSingle()
  return data?.tenant_id ?? null
}

// Mapea TenantConfig (camelCase) a columnas snake_case de tenant_settings
function mapConfigToRow(config: TenantConfig, userId: string, tenantSlug?: string | null) {
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
    tagline: config.tagline ?? '',
    features_whatsapp: config.features?.whatsapp ?? false,
    logo_url: config.logo ?? '',
    logo_bg_light: config.logoBgLight ?? 'transparent',
    logo_bg_dark: config.logoBgDark ?? 'transparent',
    is_configured: true,
  }
}

/** Fila de `tenant_settings` usada al hidratar TenantConfig (coincide con el SELECT) */
export type TenantSettingsRow = {
  business_name: string
  business_type: TenantConfig['businessType']
  business_subtype?: string | null
  service_categories?: string[]
  primary_color: string
  accent_color: string
  currency_code: string
  currency_symbol: string
  country: string
  language: TenantConfig['locale']['language']
  timezone: string
  time_format: string
  client_terminology: string
  staff_terminology: string
  staff_singular_terminology: string
  appointment_terminology: string
  business_hours: TenantConfig['businessHours']
  contact_info: TenantConfig['contact']
  commission_staff: number
  commission_house: number
  tagline: string
  features_whatsapp: boolean
  logo_url: string
  logo_bg_light?: string | null
  logo_bg_dark?: string | null
  is_demo?: boolean | null
}

// Mapea fila de tenant_settings a TenantConfig (camelCase)
function mapRowToConfig(row: TenantSettingsRow): TenantConfig {
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
    features: {
      whatsapp: row.features_whatsapp ?? false,
    },
    isDemo: row.is_demo ?? false,
  }
}

// Guarda o actualiza la configuración del tenant en Supabase
export async function upsertTenantSettings(config: TenantConfig, userId: string): Promise<void> {
  const tenantSlug = await resolveTenantSlug(userId)
  const payload = mapConfigToRow(config, userId, tenantSlug)

  const { error } = await supabase.from('tenant_settings').upsert(payload, {
    onConflict: tenantSlug ? 'tenant_slug' : 'id',
  })

  if (error) {
    throw new Error(error.message)
  }
}

// Obtiene la configuración del tenant desde Supabase
export async function fetchTenantSettings(userId: string): Promise<TenantConfig | null> {
  const tenantSlug = await resolveTenantSlug(userId)

  // Bridge S2: fila por tenant_slug (ZM legacy). Fallback: id = auth user (onboarding Geema nuevo).
  let query = supabase.from('tenant_settings').select(TENANT_SETTINGS_SELECT)

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
