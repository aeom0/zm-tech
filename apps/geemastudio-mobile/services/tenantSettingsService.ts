import { supabase } from '@/lib/supabase'
import type { TenantConfig } from '@zmtech/tenant-config'
import {
  fetchTenantConfig as fetchTenantConfigFromData,
  mapConfigToRow as mapConfigToRowData,
  mapRowToConfig as mapRowToConfigData,
  resolveTenantSlug as resolveTenantSlugData,
  type TenantSettingsRow,
  upsertTenantSettings as upsertTenantSettingsData,
} from '@geemastudio/data'

export type { TenantSettingsRow }

export async function resolveTenantSlug(userId: string): Promise<string | null> {
  return resolveTenantSlugData(supabase, userId)
}

export function mapConfigToRow(config: TenantConfig, userId: string, tenantSlug?: string | null) {
  return mapConfigToRowData(config, userId, tenantSlug)
}

export function mapRowToConfig(row: TenantSettingsRow): TenantConfig {
  return mapRowToConfigData(row)
}

export async function upsertTenantSettings(config: TenantConfig, userId: string): Promise<void> {
  return upsertTenantSettingsData(supabase, config, userId)
}

export async function fetchTenantSettings(userId: string): Promise<TenantConfig | null> {
  return fetchTenantConfigFromData(supabase, userId)
}
