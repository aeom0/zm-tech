import type { SupabaseClient } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

export const SERVICE_REFERENCES_BUCKET = 'service-references'

/** Sube una imagen de referencia local (file://) al bucket y devuelve la URL pública. */
export async function subirImagenReferencia(
  client: SupabaseClient,
  appointmentId: string,
  localUri: string,
  contentType: string = 'image/jpeg'
): Promise<{ publicUrl: string; path: string }> {
  const res = await fetch(localUri)
  const buf = await res.arrayBuffer()
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const path = `${appointmentId}/${Date.now()}.${ext}`

  const { error: upErr } = await client.storage
    .from(SERVICE_REFERENCES_BUCKET)
    .upload(path, buf, {
      contentType,
      upsert: false,
    })

  if (upErr) {
    throw new Error(upErr.message)
  }

  const { data } = client.storage.from(SERVICE_REFERENCES_BUCKET).getPublicUrl(path)

  return { publicUrl: data.publicUrl, path }
}

/** Atajo con cliente por defecto del app. */
export async function subirImagenReferenciaDefault(
  appointmentId: string,
  localUri: string,
  contentType?: string
): Promise<{ publicUrl: string; path: string }> {
  return subirImagenReferencia(supabase, appointmentId, localUri, contentType)
}
