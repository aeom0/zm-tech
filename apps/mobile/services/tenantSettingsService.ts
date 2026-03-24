/*
 * MIGRACIÓN REQUERIDA en Supabase Dashboard SQL Editor (proyecto xidjomlxpuosupymcsaj):
 *
 * ALTER TABLE tenant_settings
 *   ADD COLUMN IF NOT EXISTS timezone          text    NOT NULL DEFAULT 'America/Caracas',
 *   ADD COLUMN IF NOT EXISTS client_terminology text   NOT NULL DEFAULT 'cliente',
 *   ADD COLUMN IF NOT EXISTS tagline            text    NOT NULL DEFAULT '',
 *   ADD COLUMN IF NOT EXISTS features_whatsapp  boolean NOT NULL DEFAULT false;
 */
import { supabase } from "@/lib/supabase";
import type { TenantConfig } from "@salonpro/tenant-config";

// Mapea TenantConfig (camelCase) a columnas snake_case de tenant_settings
function mapConfigToRow(config: TenantConfig, userId: string) {
  return {
    id: userId,
    business_name: config.businessName,
    business_type: config.businessType,
    primary_color: config.theme.primaryColor,
    accent_color: config.theme.accentColor,
    currency_code: config.locale.currency.code,
    currency_symbol: config.locale.currency.symbol,
    country: config.locale.country,
    language: config.locale.language,
    timezone: config.locale.timezone,
    client_terminology: config.terminology.client,
    staff_terminology: config.terminology.staff,
    staff_singular_terminology: config.terminology.staffSingular,
    appointment_terminology: config.terminology.appointment,
    business_hours: config.businessHours,
    contact_info: config.contact,
    commission_staff: config.commissions.defaultStaffPercent,
    commission_house: config.commissions.defaultHousePercent,
    tagline: config.tagline ?? "",
    features_whatsapp: config.features?.whatsapp ?? false,
    is_configured: true,
  };
}

/** Fila de `tenant_settings` usada al hidratar TenantConfig (coincide con el SELECT) */
export type TenantSettingsRow = {
  business_name: string;
  business_type: TenantConfig["businessType"];
  primary_color: string;
  accent_color: string;
  currency_code: string;
  currency_symbol: string;
  country: string;
  language: TenantConfig["locale"]["language"];
  timezone: string;
  client_terminology: string;
  staff_terminology: string;
  staff_singular_terminology: string;
  appointment_terminology: string;
  business_hours: TenantConfig["businessHours"];
  contact_info: TenantConfig["contact"];
  commission_staff: number;
  commission_house: number;
  tagline: string;
  features_whatsapp: boolean;
};

// Mapea fila de tenant_settings a TenantConfig (camelCase)
function mapRowToConfig(row: TenantSettingsRow): TenantConfig {
  return {
    businessName: row.business_name,
    businessType: row.business_type,
    tagline: row.tagline ?? "",
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
      timezone: row.timezone ?? "America/Caracas",
      language: row.language,
    },
    terminology: {
      staff: row.staff_terminology,
      staffSingular: row.staff_singular_terminology,
      appointment: row.appointment_terminology,
      client: row.client_terminology ?? "cliente",
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
  };
}

// Guarda o actualiza la configuración del tenant en Supabase
export async function upsertTenantSettings(
  config: TenantConfig,
  userId: string,
): Promise<void> {
  const payload = mapConfigToRow(config, userId);

  const { error } = await supabase.from("tenant_settings").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(error.message);
  }
}

// Obtiene la configuración del tenant desde Supabase
export async function fetchTenantSettings(
  userId: string,
): Promise<TenantConfig | null> {
  // String literal en .select() para que PostgREST infiera el resultado (no GenericStringError)
  const { data, error } = await supabase
    .from("tenant_settings")
    .select(
      "business_name, business_type, primary_color, accent_color, currency_code, currency_symbol, country, language, timezone, client_terminology, staff_terminology, staff_singular_terminology, appointment_terminology, business_hours, contact_info, commission_staff, commission_house, tagline, features_whatsapp",
    )
    .eq("id", userId)
    .maybeSingle<TenantSettingsRow>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return mapRowToConfig(data);
}
