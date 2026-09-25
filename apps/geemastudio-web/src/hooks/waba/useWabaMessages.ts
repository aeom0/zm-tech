'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { formatTemplatePreview, isTemplateContent } from '@/app/panel/waba/mensajes/_components/templateLabels'

type CatalogMap = Map<string, string>

/**
 * Mapea payloads de selección (`svc-`, `pack_`, `promo_`, `date_`, etc.) y
 * acciones fijas del dispatcher a etiquetas legibles para el staff.
 * Sin emojis (regla de UI del panel): solo texto.
 */
function resolveWabaContent(raw: string, catalog: CatalogMap): string {
  if (!raw) return raw
  if (raw.startsWith('promo_')) {
    const id = raw.replace('promo_', '')
    return catalog.get(id) ? `Promo: ${catalog.get(id)}` : 'Promo seleccionada'
  }
  if (raw.startsWith('pitem_')) {
    const sMatch = raw.match(/^pitem_(.+)_s_(.+)$/)
    const pMatch = raw.match(/^pitem_(.+)_p_(.+)$/)
    if (sMatch) return catalog.get(sMatch[2]) ? `Agregó: ${catalog.get(sMatch[2])}` : 'Ítem de promo seleccionado'
    if (pMatch) return catalog.get(pMatch[2]) ? `Agregó pack: ${catalog.get(pMatch[2])}` : 'Pack de promo seleccionado'
    return 'Ítem de promo seleccionado'
  }
  if (raw.startsWith('svc-') || raw.startsWith('svc_')) {
    const id = raw.replace(/^svc[-_]/, '')
    return catalog.get(id) ?? 'Servicio seleccionado'
  }
  if (raw.startsWith('pack_')) {
    const id = raw.replace('pack_', '')
    return catalog.get(id) ? `Pack: ${catalog.get(id)}` : 'Pack seleccionado'
  }
  if (raw.startsWith('cat-')) {
    const slug = raw.replace('cat-', '').replace(/-/g, ' ')
    return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : raw
  }
  if (raw.startsWith('subcat_')) {
    const slug = raw.replace(/^subcat_cat-[^_]+__/, '').replace(/_/g, ' ')
    return slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : raw
  }
  if (raw.startsWith('date_')) return `Fecha: ${raw.replace('date_', '')}`
  if (raw.startsWith('time_')) return `Hora: ${raw.replace('time_', '')}`
  if (raw === 'ver_promos') return 'Ver promos'
  if (raw === 'ver_servicios') return 'Ver servicios'
  if (raw === 'agendar' || raw === 'agendar_cita') return 'Agendar cita'
  if (raw === 'confirmar_carrito' || raw === 'confirmar') return 'Confirmar carrito'
  if (raw === 'vaciar_carrito') return 'Vaciar carrito'
  if (raw === 'menu' || raw === 'ver_menu') return 'Menú principal'
  return raw
}

function useWabaCatalog() {
  return useQuery({
    queryKey: ['web_waba_catalog'],
    enabled: !!supabase,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<CatalogMap> => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const [svcs, packs, promos] = await Promise.all([
        supabase.from('services').select('id, name'),
        supabase.from('packs').select('id, title'),
        supabase.from('promotions').select('id, title'),
      ])
      const map: CatalogMap = new Map()
      for (const s of (svcs.data ?? []) as { id: string; name: string }[]) map.set(s.id, s.name)
      for (const p of (packs.data ?? []) as { id: string; title: string }[]) map.set(p.id, p.title)
      for (const pr of (promos.data ?? []) as { id: string; title: string }[]) map.set(pr.id, pr.title)
      return map
    },
  })
}

function labelForPreview(direction: WabaDirection, content: string, catalog: CatalogMap): string {
  if (direction === 'in') return resolveWabaContent(content, catalog)
  return isTemplateContent(content) ? formatTemplatePreview(content) : content
}

export type WabaDirection = 'in' | 'out'
export type WabaDeliveryStatus = 'accepted' | 'sent' | 'delivered' | 'read' | 'failed' | null

export interface WabaConversation {
  phone: string
  /** True si `phone` es un BSUID de Meta (`PE.1123884010210027`), no un teléfono. */
  isBsuid: boolean
  displayName: string | null
  /** @usuario de WhatsApp (Meta username), si Meta lo mandó. */
  waUsername: string | null
  /** Teléfono E.164 real, resuelto desde la ficha del cliente aunque el hilo sea BSUID. */
  displayPhone: string | null
  lastMessage: string
  lastDirection: WabaDirection
  lastAt: string
  inbound24h: number
  botPaused: boolean
}

export interface WabaMessage {
  id: string
  phone: string
  direction: WabaDirection
  content: string
  msgType: string
  createdAt: string
  wamid: string | null
  imageUrl: string | null
  audioUrl: string | null
  documentUrl: string | null
  documentName: string | null
  /** URL de la imagen citada (swipe-reply del cliente), si aplica. */
  replyImageUrl: string | null
  replyToWamid: string | null
  deliveryStatus: WabaDeliveryStatus
  deliveryError: string | null
}

function asDirection(v: unknown): WabaDirection {
  return v === 'out' ? 'out' : 'in'
}

function asNullableString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

function isBsuid(value: string): boolean {
  return /^[A-Z]{2}\./.test(value.trim())
}

function normalizePhone(value: string): string {
  if (isBsuid(value)) return value.trim()
  return value.replace(/\D+/g, '')
}

export function useWabaConversations() {
  const catalogQuery = useWabaCatalog()

  return useQuery({
    queryKey: ['web_waba_conversations', catalogQuery.data ? 'catalog-ready' : 'catalog-pending'],
    enabled: !!supabase,
    staleTime: 5_000,
    refetchInterval: 10_000,
    queryFn: async (): Promise<WabaConversation[]> => {
      if (!supabase) throw new Error('Supabase no está configurado')

      const { data, error } = await supabase
        .from('wa_messages')
        .select('phone, content, direction, created_at')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw new Error(error.message)

      const catalog = catalogQuery.data ?? new Map()
      const now = Date.now()
      const dayMs = 24 * 60 * 60 * 1000
      const map = new Map<string, WabaConversation>()

      for (const row of (data ?? []) as Record<string, unknown>[]) {
        const phone = typeof row.phone === 'string' ? row.phone : ''
        if (!phone) continue
        const direction = asDirection(row.direction)
        const content = typeof row.content === 'string' ? row.content : ''
        const createdAt = typeof row.created_at === 'string' ? row.created_at : ''

        const existing = map.get(phone)
        if (!existing) {
          map.set(phone, {
            phone,
            isBsuid: isBsuid(phone),
            displayName: null,
            waUsername: null,
            displayPhone: isBsuid(phone) ? null : normalizePhone(phone),
            lastMessage: labelForPreview(direction, content, catalog).slice(0, 160),
            lastDirection: direction,
            lastAt: createdAt,
            inbound24h: 0,
            botPaused: false,
          })
        }
        if (direction === 'in' && createdAt) {
          const ts = Date.parse(createdAt)
          if (!Number.isNaN(ts) && now - ts <= dayMs) {
            const c = map.get(phone)
            if (c) c.inbound24h += 1
          }
        }
      }

      const conversations = [...map.values()]

      if (conversations.length > 0) {
        const phones = conversations.map((c) => c.phone)

        const [{ data: clients }, { data: sessions }] = await Promise.all([
          supabase.from('clients').select('name, phone, wa_user_id, wa_username').limit(5000),
          supabase.from('whatsapp_sessions').select('phone, bot_paused_at').in('phone', phones),
        ])

        const byPhone = new Map<string, string>()
        const byWaUserId = new Map<
          string,
          { name: string | null; username: string | null; phone: string | null }
        >()

        for (const c of (clients ?? []) as Record<string, unknown>[]) {
          const name = typeof c.name === 'string' ? c.name : ''
          const rawPhone = typeof c.phone === 'string' ? c.phone : ''
          const waUserId = typeof c.wa_user_id === 'string' ? c.wa_user_id : ''
          const waUsername = typeof c.wa_username === 'string' && c.wa_username ? c.wa_username : null

          if (waUserId) {
            byWaUserId.set(waUserId.trim(), {
              name: name || null,
              username: waUsername,
              phone: rawPhone ? normalizePhone(rawPhone) : null,
            })
          }

          const digits = rawPhone.replace(/\D+/g, '')
          if (digits && name) byPhone.set(digits, name)
        }

        for (const conv of conversations) {
          if (conv.isBsuid) {
            const match = byWaUserId.get(conv.phone.trim())
            if (match) {
              conv.displayName = match.name
              conv.waUsername = match.username
              conv.displayPhone = match.phone
            }
            continue
          }

          const digits = conv.phone.replace(/\D+/g, '')
          if (digits && byPhone.has(digits)) {
            conv.displayName = byPhone.get(digits) ?? null
          } else if (digits.length >= 9) {
            const suffix = digits.slice(-9)
            for (const [k, name] of byPhone) {
              if (k.endsWith(suffix)) {
                conv.displayName = name
                break
              }
            }
          }
        }

        const pausedPhones = new Set(
          ((sessions ?? []) as { phone?: string; bot_paused_at?: string | null }[])
            .filter((s) => !!s.bot_paused_at)
            .map((s) => s.phone)
        )
        for (const conv of conversations) {
          conv.botPaused = pausedPhones.has(conv.phone)
        }
      }

      return conversations
    },
  })
}

export const WABA_THREAD_PAGE_SIZE = 50

/** Últimos `limit` mensajes del hilo, en orden cronológico. Subir `limit` trae los anteriores. */
export function useWabaThread(phone: string | null, limit: number = WABA_THREAD_PAGE_SIZE) {
  const catalogQuery = useWabaCatalog()
  const catalogReady = !!catalogQuery.data

  return useQuery({
    queryKey: ['web_waba_thread', phone, catalogReady, limit],
    enabled: !!supabase && !!phone,
    staleTime: 5_000,
    refetchInterval: 10_000,
    placeholderData: keepPreviousData,
    queryFn: async (): Promise<WabaMessage[]> => {
      if (!supabase || !phone) return []
      const { data, error } = await supabase
        .from('wa_messages')
        .select(
          'id, phone, content, direction, msg_type, created_at, wamid, image_url, audio_url, document_url, document_name, reply_image_url, reply_to_wamid, delivery_status, delivery_error'
        )
        .eq('phone', phone)
        .order('created_at', { ascending: false })
        .limit(limit)

      if (error) throw new Error(error.message)

      const catalog = catalogQuery.data ?? new Map()

      return ((data ?? []) as Record<string, unknown>[]).reverse().map((row) => {
        const direction = asDirection(row.direction)
        const rawContent = String(row.content ?? '')
        const content = direction === 'in' ? resolveWabaContent(rawContent, catalog) : rawContent
        return {
          id: String(row.id),
          phone: String(row.phone ?? ''),
          direction,
          content,
          msgType: String(row.msg_type ?? 'text'),
          createdAt: String(row.created_at ?? ''),
          wamid: asNullableString(row.wamid),
          imageUrl: asNullableString(row.image_url),
          audioUrl: asNullableString(row.audio_url),
          documentUrl: asNullableString(row.document_url),
          documentName: asNullableString(row.document_name),
          replyImageUrl: asNullableString(row.reply_image_url),
          replyToWamid: asNullableString(row.reply_to_wamid),
          deliveryStatus: (asNullableString(row.delivery_status) as WabaDeliveryStatus) ?? null,
          deliveryError: asNullableString(row.delivery_error),
        }
      })
    },
  })
}
