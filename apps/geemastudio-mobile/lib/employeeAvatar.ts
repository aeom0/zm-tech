import type { SupabaseClient } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'

export const EMPLOYEE_AVATARS_BUCKET = 'employee-avatars'

/** Sube imagen local (file://) al bucket y devuelve la URL pública. */
export async function subirAvatarEmpleado(
  client: SupabaseClient,
  employeeId: string,
  localUri: string,
  contentType: string = 'image/jpeg'
): Promise<{ publicUrl: string; path: string }> {
  const res = await fetch(localUri)
  const buf = await res.arrayBuffer()
  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const path = `${employeeId}/${Date.now()}.${ext}`

  const { error: upErr } = await client.storage.from(EMPLOYEE_AVATARS_BUCKET).upload(path, buf, {
    contentType,
    upsert: false,
  })

  if (upErr) {
    throw new Error(upErr.message)
  }

  const { data } = client.storage.from(EMPLOYEE_AVATARS_BUCKET).getPublicUrl(path)

  return { publicUrl: data.publicUrl, path }
}

/** Intenta borrar el objeto a partir de una URL pública guardada en `employees.avatar_url`. */
export async function borrarAvatarSiEsStorage(
  client: SupabaseClient,
  publicUrl: string | null | undefined
): Promise<void> {
  if (!publicUrl?.trim()) return
  const marker = `/storage/v1/object/public/${EMPLOYEE_AVATARS_BUCKET}/`
  const i = publicUrl.indexOf(marker)
  if (i === -1) return
  const path = decodeURIComponent(publicUrl.slice(i + marker.length).split('?')[0] ?? '')
  if (!path) return
  await client.storage.from(EMPLOYEE_AVATARS_BUCKET).remove([path])
}

/** Atajo con cliente por defecto del app. */
export async function subirAvatarEmpleadoDefault(
  employeeId: string,
  localUri: string,
  contentType?: string
): Promise<{ publicUrl: string; path: string }> {
  return subirAvatarEmpleado(supabase, employeeId, localUri, contentType)
}
