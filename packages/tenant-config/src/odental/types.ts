/**
 * Tipos y contexto de tenant para OdentalPro.
 * Aislado de los presets GeemaStudio — no modificar types.ts del package raíz.
 */

export type OdentalRole = 'dev' | 'dentist-owner' | 'assistant' | 'specialist'

export type OdentalBusinessSubtype = 'general' | 'orthodontics' | 'pediatric' | 'implants'

/** Fila odental_tenant_settings (snake_case como viene de Supabase) */
export interface OdentalTenantSettingsRow {
  id: string
  slug: string
  clinic_name: string
  business_subtype: OdentalBusinessSubtype | string | null
  theme_override: Record<string, unknown> | null
  currency_code: string | null
  timezone: string | null
  created_at: string | null
}

/** Fila odental_employees */
export interface OdentalEmployeeRow {
  id: string
  tenant_id: string
  role: OdentalRole | string
  specialty: string | null
  full_name: string
  auth_user_id: string | null
  created_at: string | null
}

/** Config de UI derivada del preset fijo dental-clinic + fila remota */
export interface OdentalTenantConfig {
  preset: 'dental-clinic'
  tenantId: string | null
  slug: string
  clinicName: string
  businessSubtype: OdentalBusinessSubtype | string
  theme: {
    primaryColor: string
    accentColor: string
    darkMode: boolean
  }
  locale: {
    currencyCode: string
    timezone: string
    language: 'es-VE'
  }
  terminology: {
    staff: string
    staffSingular: string
    appointment: string
    client: string
  }
}

export interface OdentalJwtClaims {
  tenantId: string | null
  role: OdentalRole | null
  employeeId: string | null
}
