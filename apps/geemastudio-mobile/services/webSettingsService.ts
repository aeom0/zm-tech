/**
 * Lectura/escritura de columnas web_* de tenant_settings (CMS Mi Web).
 * Delegado al paquete compartido @geemastudio/data.
 */
import { supabase } from '@/lib/supabase'
import {
  fetchWebSettingsForSession,
  slugifyWeb as slugifyWebData,
  updateWebSettings as updateWebSettingsData,
  type WebSettings,
  type WebSettingsPatch,
} from '@geemastudio/data'

export type { WebSettings, WebSettingsPatch }

export async function fetchWebSettings(): Promise<WebSettings | null> {
  return fetchWebSettingsForSession(supabase)
}

export async function updateWebSettings(rowId: string, patch: WebSettingsPatch): Promise<void> {
  return updateWebSettingsData(supabase, rowId, patch)
}

export function slugifyWeb(input: string): string {
  return slugifyWebData(input)
}
