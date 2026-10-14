'use client'

import { supabase } from '@/lib/supabase'
import {
  fetchTenantSettingsForSession as fetchTenantSettingsForSessionData,
  type TenantSettingsPanelRow,
  type TenantSettingsPatch,
  updateTenantSettingsRow,
  uploadTenantLogo as uploadTenantLogoData,
} from '@geemastudio/data'

export async function fetchTenantSettingsForSession(): Promise<TenantSettingsPanelRow | null> {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return fetchTenantSettingsForSessionData(supabase)
}

export async function updateTenantSettings(
  rowId: string,
  patch: TenantSettingsPatch
): Promise<void> {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return updateTenantSettingsRow(supabase, rowId, patch)
}

export async function uploadTenantLogo(userId: string, file: File): Promise<string> {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return uploadTenantLogoData(supabase, userId, file, file.type || 'image/webp')
}
