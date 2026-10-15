import type { SupabaseClient } from '@supabase/supabase-js'
import {
  formatAppointmentWallclock,
  inicioDiaHoyEnZonaIANA,
  instanteCitaDesdeTexto,
} from '@zmtech/tenant-config'

import type {
  PromoBroadcast,
  PromoBroadcastCreateInput,
  PromoBroadcastItem,
  PromoRecipient,
  PromoSegmentInput,
  PromoSendResult,
} from './types'

/** Plantilla aprobada en Meta: header imagen + {{1}} nombre + {{2}} texto. */
export const PROMO_TEMPLATE = 'promo_zm_v1'
export const PROMO_BODY_MAX = 600
export const PROMO_IMAGES_BUCKET = 'promo-images'

const MAX_ROWS = 10000
const DAY_MS = 1000 * 60 * 60 * 24

/** Meta rechaza saltos de línea y espacios repetidos en parámetros de plantilla. */
export function normalizePromoBody(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Normaliza un destino (teléfono o BSUID) para comparar contra las listas de bloqueo
 * y bajas: BSUID tal cual; teléfono a los últimos 9 dígitos. Igual que la Edge Function.
 */
export function normalizePromoDestination(dest: string): string {
  const s = String(dest ?? '')
  if (s.startsWith('PE.')) return s
  return s.replace(/\D/g, '').slice(-9)
}

function phonesOf(config: unknown): string[] {
  const raw = (config as { phones?: unknown[] } | null)?.phones
  return Array.isArray(raw)
    ? raw.filter((p): p is string => typeof p === 'string').map(normalizePromoDestination)
    : []
}

/** Clientas que atendieron algún servicio de la categoría; null si no hay forma de filtrar. */
async function clientIdsForCategory(
  client: SupabaseClient,
  tenantId: string,
  categoryName: string
): Promise<string[] | null> {
  const { data: cats } = await client
    .from('service_categories')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('name', categoryName)
    .limit(1)
  const catId = cats?.[0]?.id
  if (!catId) return null

  const { data: services } = await client
    .from('services')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('category_id', catId)
    .eq('is_active', true)
  const serviceIds = (services ?? []).map((s) => s.id as string)
  if (serviceIds.length === 0) return null

  const { data: lines } = await client
    .from('appointment_services')
    .select('appointment_id')
    .eq('tenant_id', tenantId)
    .in('service_id', serviceIds)
  const aptIds = [...new Set((lines ?? []).map((l) => l.appointment_id as string))]
  if (aptIds.length === 0) return null

  const { data: apts } = await client
    .from('appointments')
    .select('client_id')
    .in('id', aptIds)
    .in('status', ['completed', 'pending', 'confirmed'])
    .not('client_id', 'is', null)
  const ids = [...new Set((apts ?? []).map((a) => a.client_id as string))]
  return ids.length > 0 ? ids : null
}

/**
 * Clientas con destino WA, sin las bloqueadas ni las que pidieron baja (STOP).
 * Con `inactiveOnly`: sin cita futura y 30+ días desde la última completada; las que
 * nunca vinieron solo entran si llegaron por un anuncio.
 */
export async function fetchPromoSegment(
  client: SupabaseClient,
  input: PromoSegmentInput
): Promise<PromoRecipient[]> {
  const { tenantId, timeZone, categoryName, inactiveOnly } = input

  const [completed, future, adSessions, blocked, optOut] = await Promise.all([
    client
      .from('appointments')
      .select('client_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'completed')
      .not('client_id', 'is', null)
      .limit(MAX_ROWS),
    client
      .from('appointments')
      .select('client_id')
      .eq('tenant_id', tenantId)
      .gte('date', formatAppointmentWallclock(new Date(), timeZone))
      .not('client_id', 'is', null)
      .limit(MAX_ROWS),
    client
      .from('whatsapp_sessions')
      .select('phone')
      .eq('tenant_id', tenantId)
      .not('from_ad_at', 'is', null)
      .limit(MAX_ROWS),
    client
      .from('waba_config')
      .select('config_value')
      .eq('tenant_id', tenantId)
      .eq('config_key', 'blocked_phone_numbers')
      .eq('is_active', true)
      .maybeSingle(),
    client
      .from('waba_config')
      .select('config_value')
      .eq('tenant_id', tenantId)
      .eq('config_key', 'marketing_opt_out')
      .eq('is_active', true)
      .maybeSingle(),
  ])

  const futureClientIds = new Set((future.data ?? []).map((a) => a.client_id as string))
  const hasLinkedClients = (completed.data?.length ?? 0) + futureClientIds.size > 0
  const adDestinations = new Set(
    (adSessions.data ?? [])
      .map((s) => s.phone)
      .filter((p): p is string => typeof p === 'string')
      .map(normalizePromoDestination)
  )
  const excluded = new Set([
    ...phonesOf(blocked.data?.config_value),
    ...phonesOf(optOut.data?.config_value),
  ])

  let query = client
    .from('clients')
    .select('id, name, phone, wa_user_id')
    .eq('tenant_id', tenantId)
    .or('phone.not.is.null,wa_user_id.not.is.null')
    .order('name', { ascending: true })
    .limit(MAX_ROWS)

  if (categoryName && hasLinkedClients) {
    // Sin clientas vinculadas a la categoría no se filtra: se muestran todas.
    const ids = await clientIdsForCategory(client, tenantId, categoryName)
    if (ids) query = query.in('id', ids)
  }

  const { data: clients, error } = await query
  if (error) throw new Error(error.message)
  if (!clients?.length) return []

  const { data: lastApts } = await client
    .from('appointments')
    .select('client_id, date')
    .in(
      'client_id',
      clients.map((c) => c.id as string)
    )
    .eq('status', 'completed')
    .order('date', { ascending: false })
    .limit(MAX_ROWS)

  const lastVisit: Record<string, string> = {}
  for (const apt of lastApts ?? []) {
    const id = apt.client_id as string | null
    if (id && !lastVisit[id]) lastVisit[id] = apt.date as string
  }

  const today = inicioDiaHoyEnZonaIANA(timeZone).getTime()
  const result: PromoRecipient[] = []
  for (const c of clients) {
    const id = c.id as string
    const dest =
      (typeof c.phone === 'string' && c.phone.trim()) ||
      (typeof c.wa_user_id === 'string' && c.wa_user_id.trim()) ||
      ''
    if (!dest) continue
    const key = normalizePromoDestination(dest)
    if (excluded.has(key)) continue

    const last = lastVisit[id] ?? null
    const days = last
      ? Math.floor((today - instanteCitaDesdeTexto(last, timeZone).getTime()) / DAY_MS)
      : null
    if (inactiveOnly) {
      if (futureClientIds.has(id)) continue
      const isInactive = days == null ? adDestinations.has(key) : days >= 30
      if (!isInactive) continue
    }

    result.push({
      id,
      name: c.name as string,
      phone: dest,
      last_appointment_date: last,
      days_since_last_visit: days,
      category_name: categoryName,
    })
  }
  return result
}

/** Sube la imagen al bucket público y devuelve su URL (la Edge Function la pasa a Meta). */
export async function uploadPromoImage(
  client: SupabaseClient,
  args: { tenantId: string; body: Blob | ArrayBuffer | FormData; contentType: string; extension?: string }
): Promise<string> {
  const ext = args.extension ?? 'jpg'
  const path = `${args.tenantId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await client.storage
    .from(PROMO_IMAGES_BUCKET)
    .upload(path, args.body, { contentType: args.contentType, cacheControl: '3600' })
  if (error || !data) throw new Error(error?.message ?? 'No se pudo subir la imagen')
  return client.storage.from(PROMO_IMAGES_BUCKET).getPublicUrl(data.path).data.publicUrl
}

/** Crea la campaña en borrador con sus destinatarias. Si fallan las destinatarias, borra la campaña. */
export async function createPromoBroadcast(
  client: SupabaseClient,
  input: PromoBroadcastCreateInput
): Promise<PromoBroadcast> {
  const bodyText = normalizePromoBody(input.bodyText)
  if (!input.tenantId) throw new Error('No se pudo resolver el negocio')
  if (!bodyText) throw new Error('Escribe el texto de la promo')
  if (bodyText.length > PROMO_BODY_MAX) {
    throw new Error(`El texto supera ${PROMO_BODY_MAX} caracteres`)
  }
  if (!input.imageUrl) throw new Error('Sube una imagen para la promo')
  if (input.recipients.length === 0) throw new Error('Selecciona al menos una clienta')

  const { data: broadcast, error } = await client
    .from('promo_broadcasts')
    .insert({
      title: input.title.trim() || 'Promo',
      template: PROMO_TEMPLATE,
      body_text: bodyText,
      image_url: input.imageUrl,
      created_by: input.createdBy,
      status: 'draft',
      tenant_id: input.tenantId,
    })
    .select('*')
    .single()
  if (error || !broadcast) throw new Error(error?.message ?? 'No se pudo crear la campaña')

  const { error: itemsError } = await client.from('promo_broadcast_items').insert(
    input.recipients.map((r) => ({
      broadcast_id: broadcast.id,
      client_id: r.id,
      client_name: r.name,
      phone: r.phone,
      tenant_id: input.tenantId,
    }))
  )
  if (itemsError) {
    await client.from('promo_broadcast_items').delete().eq('broadcast_id', broadcast.id)
    await client.from('promo_broadcasts').delete().eq('id', broadcast.id)
    throw new Error(itemsError.message)
  }

  return broadcast as PromoBroadcast
}

/** Dispara el envío (Edge Function `send-promo-whatsapp`, solo owner/dev). */
export async function sendPromoBroadcast(
  client: SupabaseClient,
  broadcastId: string
): Promise<PromoSendResult> {
  const { data, error } = await client.functions.invoke('send-promo-whatsapp', {
    body: { broadcast_id: broadcastId },
  })
  if (error) throw new Error(error.message ?? 'No se pudo enviar la promo')
  return data as PromoSendResult
}

export async function fetchPromoBroadcast(
  client: SupabaseClient,
  broadcastId: string
): Promise<PromoBroadcast | null> {
  const { data, error } = await client
    .from('promo_broadcasts')
    .select('*')
    .eq('id', broadcastId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as PromoBroadcast | null) ?? null
}

/**
 * Espera a que la campaña termine (`done`/`failed`). Con `waitForDraft` también espera
 * mientras siga en borrador (la respuesta del envío se perdió pero la función corre).
 */
export async function waitForPromoBroadcast(
  client: SupabaseClient,
  broadcastId: string,
  opts: {
    onTick?: (broadcast: PromoBroadcast) => void
    waitForDraft?: boolean
    intervalMs?: number
    draftTimeoutMs?: number
  } = {}
): Promise<PromoBroadcast> {
  const interval = opts.intervalMs ?? 2000
  const draftTimeout = opts.draftTimeoutMs ?? 60_000
  const startedAt = Date.now()
  for (;;) {
    const broadcast = await fetchPromoBroadcast(client, broadcastId)
    if (!broadcast) throw new Error('No se encontró la campaña')
    opts.onTick?.(broadcast)
    const stillStarting =
      opts.waitForDraft && broadcast.status === 'draft' && Date.now() - startedAt < draftTimeout
    if (broadcast.status !== 'sending' && !stillStarting) return broadcast
    await new Promise((r) => setTimeout(r, interval))
  }
}

export async function listPromoBroadcasts(
  client: SupabaseClient,
  tenantId: string
): Promise<PromoBroadcast[]> {
  const { data, error } = await client
    .from('promo_broadcasts')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as PromoBroadcast[]
}

export async function listFailedPromoItems(
  client: SupabaseClient,
  broadcastId: string
): Promise<PromoBroadcastItem[]> {
  const { data, error } = await client
    .from('promo_broadcast_items')
    .select('*')
    .eq('broadcast_id', broadcastId)
    .eq('status', 'failed')
  if (error) throw new Error(error.message)
  return (data ?? []) as PromoBroadcastItem[]
}

/** Path dentro del bucket a partir de la URL pública; null si no es del bucket. */
export function promoImagePath(imageUrl: string | null): string | null {
  if (!imageUrl) return null
  const marker = `/${PROMO_IMAGES_BUCKET}/`
  const idx = imageUrl.indexOf(marker)
  return idx === -1 ? null : imageUrl.slice(idx + marker.length)
}

/** Borra la campaña, sus destinatarias (no hay FK con cascada) y su imagen. */
export async function deletePromoBroadcast(
  client: SupabaseClient,
  broadcast: Pick<PromoBroadcast, 'id' | 'image_url'>
): Promise<void> {
  const path = promoImagePath(broadcast.image_url)
  if (path) {
    // Una imagen huérfana no bloquea el borrado.
    await client.storage.from(PROMO_IMAGES_BUCKET).remove([path])
  }
  const { error: itemsError } = await client
    .from('promo_broadcast_items')
    .delete()
    .eq('broadcast_id', broadcast.id)
  if (itemsError) throw new Error(itemsError.message)
  const { error } = await client.from('promo_broadcasts').delete().eq('id', broadcast.id)
  if (error) throw new Error(error.message)
}
