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
  const uploadedUrls: string[] = []
  for (const image of args.images) {
    const { publicUrl } = await uploadReferenceImage(
      client,
      args.appointmentId,
      image.source,
      image.contentType
    )
    uploadedUrls.push(publicUrl)
  }

  const newPaths = [...args.currentPaths, ...uploadedUrls]
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
