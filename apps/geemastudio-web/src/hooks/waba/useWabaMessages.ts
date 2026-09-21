'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export type WabaDirection = 'in' | 'out'
export type WabaDeliveryStatus = 'sent' | 'delivered' | 'read' | 'failed' | null

export interface WabaConversation {
  phone: string
  displayName: string | null
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
  deliveryStatus: WabaDeliveryStatus
  deliveryError: string | null
}

function asDirection(v: unknown): WabaDirection {
  return v === 'out' ? 'out' : 'in'
}

function asNullableString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null
}

export function useWabaConversations() {
  return useQuery({
    queryKey: ['web_waba_conversations'],
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
            displayName: null,
            lastMessage: content.slice(0, 160),
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
          supabase.from('clients').select('name, phone').limit(3000),
          supabase.from('whatsapp_sessions').select('phone, bot_paused_at').in('phone', phones),
        ])

        const byPhone = new Map<string, string>()
        for (const c of (clients ?? []) as { name?: string; phone?: string }[]) {
          const p = (c.phone ?? '').replace(/\D+/g, '')
          if (p && c.name) byPhone.set(p, c.name)
        }
        for (const conv of conversations) {
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

export function useWabaThread(phone: string | null) {
  return useQuery({
    queryKey: ['web_waba_thread', phone],
    enabled: !!supabase && !!phone,
    staleTime: 5_000,
    refetchInterval: 10_000,
    queryFn: async (): Promise<WabaMessage[]> => {
      if (!supabase || !phone) return []
      const { data, error } = await supabase
        .from('wa_messages')
        .select(
          'id, phone, content, direction, msg_type, created_at, wamid, image_url, audio_url, document_url, document_name, delivery_status, delivery_error'
        )
        .eq('phone', phone)
        .order('created_at', { ascending: true })
        .limit(200)

      if (error) throw new Error(error.message)

      return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: String(row.id),
        phone: String(row.phone ?? ''),
        direction: asDirection(row.direction),
        content: String(row.content ?? ''),
        msgType: String(row.msg_type ?? 'text'),
        createdAt: String(row.created_at ?? ''),
        wamid: asNullableString(row.wamid),
        imageUrl: asNullableString(row.image_url),
        audioUrl: asNullableString(row.audio_url),
        documentUrl: asNullableString(row.document_url),
        documentName: asNullableString(row.document_name),
        deliveryStatus: (asNullableString(row.delivery_status) as WabaDeliveryStatus) ?? null,
        deliveryError: asNullableString(row.delivery_error),
      }))
    },
  })
}
