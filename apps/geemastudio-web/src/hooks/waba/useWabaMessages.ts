'use client'

import { useQuery } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'

export type WabaDirection = 'in' | 'out'

export interface WabaConversation {
  phone: string
  displayName: string | null
  lastMessage: string
  lastDirection: WabaDirection
  lastAt: string
  inbound24h: number
}

export interface WabaMessage {
  id: string
  phone: string
  direction: WabaDirection
  content: string
  msgType: string
  createdAt: string
}

function asDirection(v: unknown): WabaDirection {
  return v === 'out' ? 'out' : 'in'
}

export function useWabaConversations() {
  return useQuery({
    queryKey: ['web_waba_conversations'],
    enabled: !!supabase,
    staleTime: 20_000,
    refetchInterval: 45_000,
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
        const { data: clients } = await supabase
          .from('clients')
          .select('name, phone')
          .limit(3000)

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
      }

      return conversations
    },
  })
}

export function useWabaThread(phone: string | null) {
  return useQuery({
    queryKey: ['web_waba_thread', phone],
    enabled: !!supabase && !!phone,
    staleTime: 10_000,
    refetchInterval: 20_000,
    queryFn: async (): Promise<WabaMessage[]> => {
      if (!supabase || !phone) return []
      const { data, error } = await supabase
        .from('wa_messages')
        .select('id, phone, content, direction, msg_type, created_at')
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
      }))
    },
  })
}
