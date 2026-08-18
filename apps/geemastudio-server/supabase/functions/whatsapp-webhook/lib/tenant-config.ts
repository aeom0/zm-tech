// tenant-config.ts — Tipos y loader de configuración WABA por tenant

export type { TenantWabaRecord } from './tenant-resolver.ts'
export { resolveTenantFromPhoneNumberId } from './tenant-resolver.ts'

import type { SupabaseClient } from './supabase.ts'
import type { TenantWabaRecord } from './tenant-resolver.ts'
import { resolveTenantFromPhoneNumberId } from './tenant-resolver.ts'

/** Credenciales para enviar mensajes por la Graph API. */
export interface WaSendConfig {
  phoneNumberId: string
  accessToken: string
}

export function waConfigFromTenant(row: TenantWabaRecord): WaSendConfig {
  return {
    phoneNumberId: row.waba_phone_number_id,
    accessToken: row.waba_access_token,
  }
}

export async function loadTenantByPhoneNumberId(
  supabase: SupabaseClient,
  phoneNumberId: string
): Promise<TenantWabaRecord | null> {
  return resolveTenantFromPhoneNumberId(supabase, phoneNumberId)
}
