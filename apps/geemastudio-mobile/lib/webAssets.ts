/**
 * Upload/delete de assets del CMS Mi Web en el bucket `web-assets`.
 * Path: {tenantSlug}/{folder}/{timestamp}.webp
 */
import * as ImageManipulator from 'expo-image-manipulator'
import type { SupabaseClient } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'
import type { WebAssetFolder } from '@/types/web-landing'

export const WEB_ASSETS_BUCKET = 'web-assets'
const MAX_WIDTH = 1600

export async function uploadWebAsset(
  tenantSlug: string,
  folder: WebAssetFolder,
  localUri: string,
  client: SupabaseClient = supabase
): Promise<{ publicUrl: string; path: string }> {
  const slug = tenantSlug.trim() || 'tenant'
  const manipulated = await ImageManipulator.manipulateAsync(
    localUri,
    [{ resize: { width: MAX_WIDTH } }],
    { compress: 0.85, format: ImageManipulator.SaveFormat.WEBP }
  )

  const response = await fetch(manipulated.uri)
  const arrayBuffer = await response.arrayBuffer()
  const path = `${slug}/${folder}/${Date.now()}.webp`

  const { error } = await client.storage.from(WEB_ASSETS_BUCKET).upload(path, arrayBuffer, {
    contentType: 'image/webp',
    upsert: false,
  })

  if (error) {
    throw new Error(error.message)
  }

  const { data } = client.storage.from(WEB_ASSETS_BUCKET).getPublicUrl(path)
  return { publicUrl: `${data.publicUrl}?t=${Date.now()}`, path }
}

/** Borra un objeto del bucket si la URL es pública de web-assets. */
export async function deleteWebAssetIfStorage(
  publicUrl: string | null | undefined,
  client: SupabaseClient = supabase
): Promise<void> {
  if (!publicUrl?.trim()) return
  const marker = `/storage/v1/object/public/${WEB_ASSETS_BUCKET}/`
  const i = publicUrl.indexOf(marker)
  if (i === -1) return
  const path = decodeURIComponent(publicUrl.slice(i + marker.length).split('?')[0] ?? '')
  if (!path) return
  await client.storage.from(WEB_ASSETS_BUCKET).remove([path])
}
