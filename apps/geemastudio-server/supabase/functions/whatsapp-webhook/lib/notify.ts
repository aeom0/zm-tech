// notify.ts — Notificación a administradores y upload de media WhatsApp

import type { SupabaseClient } from './supabase.ts'
import type { WaSendConfig } from './tenant-config.ts'

/** Dueño del negocio: `tenant_settings.id` coincide con `profiles.id` del owner. */
export async function notifyAdmins(
  supabase: SupabaseClient,
  tenantId: string,
  title: string,
  body: string,
  data?: Record<string, string>
) {
  const { data: owner } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', tenantId)
    .maybeSingle()

  const userIds = owner?.id ? [owner.id] : []

  if (userIds.length === 0) {
    console.warn('[WABA] notifyAdmins: sin perfil owner para tenant', tenantId)
    return
  }

  await supabase.functions.invoke('send-notification', {
    body: {
      user_ids: userIds,
      title,
      body,
      data,
    },
  })
}

export async function uploadWhatsAppMedia(
  supabase: SupabaseClient,
  accessToken: string,
  mediaId: string,
  bucket: string,
  fileName: string
): Promise<string | null> {
  try {
    const mediaRes = await fetch(`https://graph.facebook.com/v22.0/${mediaId}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const mediaData = await mediaRes.json()
    if (!mediaData.url) return null

    const fileRes = await fetch(mediaData.url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!fileRes.ok) return null
    const fileBuffer = await fileRes.arrayBuffer()

    const { data, error } = await supabase.storage.from(bucket).upload(fileName, fileBuffer, {
      contentType: mediaData.mime_type ?? 'image/jpeg',
      upsert: true,
    })
    if (error) {
      console.error('Storage upload error:', error)
      return null
    }

    const { data: signed } = await supabase.storage
      .from(bucket)
      .createSignedUrl(data.path, 7 * 24 * 60 * 60)
    return signed?.signedUrl ?? null
  } catch (err) {
    console.error('uploadWhatsAppMedia error:', err)
    return null
  }
}

/** Aviso por WA a números admin configurados en tenant (si existen). */
export async function notifyAdminPhonesWa(
  wa: WaSendConfig,
  adminPhones: string[] | null | undefined,
  text: string
): Promise<void> {
  const phones = adminPhones?.filter(Boolean) ?? []
  if (phones.length === 0) return
  for (const p of phones) {
    const to = p.replace(/\D/g, '')
    if (!to) continue
    try {
      await fetch(`https://graph.facebook.com/v22.0/${wa.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${wa.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { body: text.slice(0, 4096) },
        }),
      })
    } catch (e) {
      console.warn('[WABA] notifyAdminPhonesWa falló:', e)
    }
  }
}
