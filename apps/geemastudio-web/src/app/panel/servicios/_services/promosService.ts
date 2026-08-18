import { supabase } from '@/lib/supabase'

export type PromoItem = {
  id: string
  promo_id: string
  item_type: 'service' | 'pack'
  item_id: string
  quantity: number
  discounted_price: number
}

export type Promotion = {
  id: string
  title: string
  description: string | null
  badge: string | null
  accent_color: string | null
  promo_price: number
  is_active: boolean
  expires_at: string | null
  promotion_items?: PromoItem[]
}

export type PromotionInput = Omit<Promotion, 'id' | 'promotion_items'>

/** Filas nuevas sin id ni promo_id (se asigna promo_id al insertar) */
export type PromoItemInput = {
  item_type: 'service' | 'pack'
  item_id: string
  quantity: number
  discounted_price: number
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local'
    )
  }
  return supabase
}

function normalizePromoItem(row: Record<string, unknown>): PromoItem {
  return {
    id: String(row.id),
    promo_id: String(row.promo_id),
    item_type: row.item_type === 'pack' ? 'pack' : 'service',
    item_id: String(row.item_id),
    quantity: Number(row.quantity) || 1,
    discounted_price: Number(row.discounted_price),
  }
}

function normalizePromotion(row: Record<string, unknown>): Promotion {
  const rawItems = row.promotion_items
  const items = Array.isArray(rawItems)
    ? rawItems.map((r) => normalizePromoItem(r as Record<string, unknown>))
    : undefined

  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    badge: row.badge != null ? String(row.badge) : null,
    accent_color: row.accent_color != null ? String(row.accent_color) : null,
    promo_price: Number(row.promo_price),
    is_active: Boolean(row.is_active),
    expires_at: row.expires_at != null ? String(row.expires_at) : null,
    promotion_items: items,
  }
}

export async function fetchPromotions(): Promise<Promotion[]> {
  const sb = requireSupabase()
  const { data, error } = await sb.from('promotions').select('*, promotion_items(*)').order('title')
  if (error) throw error
  return (data ?? []).map((row) => normalizePromotion(row as Record<string, unknown>))
}

export async function createPromotion(
  input: PromotionInput,
  items: PromoItemInput[]
): Promise<Promotion> {
  const sb = requireSupabase()
  const { data: promo, error } = await sb.from('promotions').insert(input).select().single()
  if (error) throw error

  const promoId = String((promo as { id: string }).id)

  if (items.length > 0) {
    const rows = items.map((i) => ({
      promo_id: promoId,
      item_type: i.item_type,
      item_id: i.item_id,
      quantity: i.quantity,
      discounted_price: i.discounted_price,
    }))
    const { error: itemsError } = await sb.from('promotion_items').insert(rows)
    if (itemsError) throw itemsError
  }

  const { data: full, error: fetchErr } = await sb
    .from('promotions')
    .select('*, promotion_items(*)')
    .eq('id', promoId)
    .single()
  if (fetchErr) throw fetchErr
  return normalizePromotion(full as Record<string, unknown>)
}

export async function updatePromotion(
  id: string,
  input: Partial<PromotionInput>,
  items?: PromoItemInput[]
): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb.from('promotions').update(input).eq('id', id)
  if (error) throw error

  if (items !== undefined) {
    const { error: delErr } = await sb.from('promotion_items').delete().eq('promo_id', id)
    if (delErr) throw delErr
    if (items.length > 0) {
      const rows = items.map((i) => ({
        promo_id: id,
        item_type: i.item_type,
        item_id: i.item_id,
        quantity: i.quantity,
        discounted_price: i.discounted_price,
      }))
      const { error: itemsError } = await sb.from('promotion_items').insert(rows)
      if (itemsError) throw itemsError
    }
  }
}

export async function deletePromotion(id: string): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb.from('promotions').delete().eq('id', id)
  if (error) throw error
}

export async function togglePromoActive(id: string, is_active: boolean): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb.from('promotions').update({ is_active }).eq('id', id)
  if (error) throw error
}
