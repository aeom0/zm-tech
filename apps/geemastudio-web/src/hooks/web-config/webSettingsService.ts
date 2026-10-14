'use client'

/**
 * Lectura/escritura de columnas web_* de tenant_settings (CMS "Mi Web" — panel).
 * Delegado al paquete compartido @geemastudio/data.
 */
import { supabase } from '@/lib/supabase'
import {
  fetchWebSettingsForSession as fetchWebSettingsForSessionData,
  slugifyWeb as slugifyWebData,
  updateWebSettings as updateWebSettingsData,
  uploadWebAsset as uploadWebAssetData,
  type WebAssetFolder,
  type WebSettings,
  type WebSettingsPatch,
} from '@geemastudio/data'

export type { WebSettings, WebSettingsPatch, WebAssetFolder }

export async function fetchWebSettings(): Promise<WebSettings | null> {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return fetchWebSettingsForSessionData(supabase)
}

export async function updateWebSettings(rowId: string, patch: WebSettingsPatch): Promise<void> {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return updateWebSettingsData(supabase, rowId, patch)
}

export async function uploadWebAsset(
  tenantSlug: string,
  folder: WebAssetFolder,
  file: File
): Promise<string> {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return uploadWebAssetData(
    supabase,
    tenantSlug || 'tenant',
    folder,
    file,
    file.name,
    file.type || 'image/webp'
  )
}

export function slugifyWeb(input: string): string {
  return slugifyWebData(input)
}
