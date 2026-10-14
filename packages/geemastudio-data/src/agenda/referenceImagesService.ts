import type { SupabaseClient } from '@supabase/supabase-js'

export const SERVICE_REFERENCES_BUCKET = 'service-references'

export async function uploadReferenceImage(
  client: SupabaseClient,
  appointmentId: string,
  fileOrBufferOrUri: File | Blob | ArrayBuffer | Uint8Array | string,
  contentType: string = 'image/jpeg'
): Promise<{ publicUrl: string; path: string }> {
  let body: BodyInit
  if (typeof fileOrBufferOrUri === 'string') {
    // Si es un URI local (file://, data:, blob: o http)
    const res = await fetch(fileOrBufferOrUri)
    body = await res.arrayBuffer()
  } else {
    body = fileOrBufferOrUri as BodyInit
  }

  const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg'
  const path = `${appointmentId}/${Date.now()}.${ext}`

  const { error: upErr } = await client.storage.from(SERVICE_REFERENCES_BUCKET).upload(path, body, {
    contentType,
    upsert: false,
  })

  if (upErr) {
    throw new Error(upErr.message)
  }

  const { data } = client.storage.from(SERVICE_REFERENCES_BUCKET).getPublicUrl(path)
  return { publicUrl: data.publicUrl, path }
}

export async function addReferenceImages(
  client: SupabaseClient,
  args: {
    appointmentId: string
    images: { source: File | Blob | ArrayBuffer | string; contentType?: string }[]
    currentPaths: string[]
    alreadyReceived: boolean
  }
): Promise<string[]> {
  // El bucket es privado: se guarda la ruta (igual que el bot) y se firma al mostrar.
  const uploadedPaths: string[] = []
  for (const image of args.images) {
    const { path } = await uploadReferenceImage(
      client,
      args.appointmentId,
      image.source,
      image.contentType
    )
    uploadedPaths.push(path)
  }

  const newPaths = [...args.currentPaths, ...uploadedPaths]
  const updatePayload: { reference_image_paths: string[]; reference_received_at?: string } = {
    reference_image_paths: newPaths,
  }
  if (!args.alreadyReceived) {
    updatePayload.reference_received_at = new Date().toISOString()
  }

  const { error } = await client
    .from('appointments')
    .update(updatePayload)
    .eq('id', args.appointmentId)

  if (error) {
    throw new Error(error.message)
  }

  return newPaths
}

const PUBLIC_URL_MARKER = `/storage/v1/object/public/${SERVICE_REFERENCES_BUCKET}/`

/** Ruta dentro del bucket a partir de una ruta o de una URL pública vieja; null si es un link externo. */
export function referenceStoragePath(value: string): string | null {
  if (!/^https?:\/\//i.test(value)) return value.replace(/^\/+/, '')
  const idx = value.indexOf(PUBLIC_URL_MARKER)
  if (idx === -1) return null
  return decodeURIComponent(value.slice(idx + PUBLIC_URL_MARKER.length).split('?')[0])
}

/**
 * URLs para mostrar las fotos de referencia. El bucket `service-references` es privado:
 * las rutas (y URLs públicas guardadas antes) se firman; los links externos pasan tal cual.
 * Mantiene el orden y descarta las que no se pudieron firmar.
 */
export async function resolveReferenceImageUrls(
  client: SupabaseClient,
  values: readonly string[],
  expiresInSeconds: number = 3600
): Promise<string[]> {
  const paths = values.map(referenceStoragePath)
  const toSign = [...new Set(paths.filter((p): p is string => !!p))]
  const signed = new Map<string, string>()
  if (toSign.length > 0) {
    const { data, error } = await client.storage
      .from(SERVICE_REFERENCES_BUCKET)
      .createSignedUrls(toSign, expiresInSeconds)
    if (error) throw new Error(error.message)
    for (const row of data ?? []) {
      if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl)
    }
  }
  return values
    .map((value, i) => {
      const path = paths[i]
      return path ? (signed.get(path) ?? null) : value
    })
    .filter((url): url is string => !!url)
}

export async function markReferencesReviewed(
  client: SupabaseClient,
  appointmentId: string
): Promise<void> {
  const { error } = await client
    .from('appointments')
    .update({ reference_reviewed_at: new Date().toISOString() })
    .eq('id', appointmentId)

  if (error) {
    throw new Error(error.message)
  }
}
