// tenant-resolver.ts — Resuelve fila tenant_settings desde phone_number_id de Meta

import type { SupabaseClient } from './supabase.ts'

export interface TenantWabaRecord {
  id: string
  waba_phone_number_id: string
  waba_access_token: string
  waba_verify_token: string
  waba_business_hours: {
    weekday: number[]
    sunday: number[]
  } | null
  waba_payment_info: {
    methods: { label: string; detail: string }[]
    contact_name: string
  } | null
  waba_admin_phones: string[] | null
  currency_code: string
  timezone: string
  business_name: string
}

export async function resolveTenantFromPhoneNumberId(
  supabase: SupabaseClient,
  phoneNumberId: string
): Promise<TenantWabaRecord | null> {
  const { data, error } = await supabase
    .from('tenant_settings')
    .select(
      [
        'id',
        'waba_phone_number_id',
        'waba_access_token',
        'waba_verify_token',
        'waba_business_hours',
        'waba_payment_info',
        'waba_admin_phones',
        'currency_code',
        'timezone',
        'business_name',
        'features_waba',
      ].join(',')
    )
    .eq('waba_phone_number_id', phoneNumberId)
    .eq('features_waba', true)
    .maybeSingle()

  if (error) {
    console.warn('[WABA] resolveTenant error:', error.message)
    return null
  }
  if (!data) return null

  const row = data as unknown as Record<string, unknown>
  const token = row.waba_access_token
  const verify = row.waba_verify_token
  if (typeof token !== 'string' || !token || typeof verify !== 'string' || !verify) {
    console.warn('[WABA] Tenant sin credenciales WABA completas:', row.id)
    return null
  }

  return {
    id: String(row.id),
    waba_phone_number_id: String(row.waba_phone_number_id ?? ''),
    waba_access_token: token,
    waba_verify_token: verify,
    waba_business_hours:
      (row.waba_business_hours as TenantWabaRecord['waba_business_hours']) ?? null,
    waba_payment_info: (row.waba_payment_info as TenantWabaRecord['waba_payment_info']) ?? null,
    waba_admin_phones: (row.waba_admin_phones as string[] | null) ?? null,
    currency_code: String(row.currency_code ?? 'USD'),
    timezone: String(row.timezone ?? 'America/Caracas'),
    business_name: String(row.business_name ?? 'Salón'),
  }
}
