import {
  detectCatalogDialect,
  toIsoOrNull,
  type CatalogDialect,
} from '@/hooks/servicios/catalogAdapter'
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

export type PromoItemInput = {
  item_type: 'service' | 'pack'
  item_id: string
  quantity: number
  discounted_price: number
}

const ZM_PROMOS_SELECT =
  'id, title, description, badge, accent_color, promo_price, is_active, valid_until'

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local'
    )
  }
  return supabase
}

function normalizePromoItem(row: Record<string, unknown>, dialect: CatalogDialect): PromoItem {
  const promoId =
    dialect === 'zm'
      ? String(row.promotion_id ?? row.promo_id ?? '')
      : String(row.promo_id ?? row.promotion_id ?? '')
  return {
    id: String(row.id),
    promo_id: promoId,
    item_type: row.item_type === 'pack' ? 'pack' : 'service',
    item_id: String(row.item_id),
    quantity: Number(row.quantity) || 1,
    discounted_price: Number(row.discounted_price) || 0,
  }
}

function normalizePromotion(
  row: Record<string, unknown>,
  dialect: CatalogDialect,
  items?: PromoItem[]
): Promotion {
  const expires =
    dialect === 'zm'
      ? toIsoOrNull(row.valid_until as string | null)
      : row.expires_at != null
        ? String(row.expires_at)
        : null

  let promoPrice = Number(row.promo_price)
  if ((!Number.isFinite(promoPrice) || promoPrice === 0) && items && items.length > 0) {
    promoPrice = items.reduce((s, i) => s + i.discounted_price * i.quantity, 0)
  }

  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description != null ? String(row.description) : null,
    badge: row.badge != null ? String(row.badge) : null,
    accent_color: row.accent_color != null ? String(row.accent_color) : null,
    promo_price: Number.isFinite(promoPrice) ? promoPrice : 0,
    is_active: Boolean(row.is_active),
    expires_at: expires,
    promotion_items: items,
  }
}

function computePromoPrice(items: PromoItemInput[]): number | null {
  if (items.length === 0) return null
  return items.reduce((s, i) => s + i.discounted_price * (i.quantity > 0 ? i.quantity : 1), 0)
}

async function fetchItemsForPromo(
  sb: NonNullable<typeof supabase>,
  promoId: string,
  dialect: CatalogDialect
): Promise<PromoItem[]> {
  if (dialect === 'zm') {
    const { data, error } = await sb
      .from('promotion_items')
      .select('id, promotion_id, item_type, item_id, quantity, discounted_price, sort_order')
      .eq('promotion_id', promoId)
    if (error) throw error
    return (data ?? []).map((r) => normalizePromoItem(r as Record<string, unknown>, dialect))
  }
  const { data, error } = await sb
    .from('promotion_items')
    .select('id, promo_id, item_type, item_id, quantity, discounted_price')
    .eq('promo_id', promoId)
  if (error) throw error
  return (data ?? []).map((r) => normalizePromoItem(r as Record<string, unknown>, dialect))
}

export async function fetchPromotions(): Promise<Promotion[]> {
  const sb = requireSupabase()
  const dialect = await detectCatalogDialect(sb)

  if (dialect === 'zm') {
    const { data, error } = await sb
      .from('promotions')
      .select(ZM_PROMOS_SELECT)
      .order('display_order', { ascending: true })
    if (error) throw error
    const promos: Promotion[] = []
    for (const row of data ?? []) {
      const items = await fetchItemsForPromo(sb, String((row as { id: string }).id), dialect)
      promos.push(normalizePromotion(row as Record<string, unknown>, dialect, items))
    }
    return promos
  }

  const { data, error } = await sb
    .from('promotions')
    .select('*, promotion_items(*)')
    .order('title')
  if (error) throw error
  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown>
    const rawItems = Array.isArray(raw.promotion_items)
      ? (raw.promotion_items as Record<string, unknown>[]).map((r) =>
          normalizePromoItem(r, 'geema')
        )
      : undefined
    return normalizePromotion(raw, 'geema', rawItems)
  })
}

export async function createPromotion(
  input: PromotionInput,
  items: PromoItemInput[]
): Promise<Promotion> {
  const sb = requireSupabase()
  const dialect = await detectCatalogDialect(sb)
  const promo_price = computePromoPrice(items)

  if (dialect === 'zm') {
    const { data: promo, error } = await sb
      .from('promotions')
      .insert({
        title: input.title.trim(),
        description: input.description?.trim() || '',
        badge: input.badge?.trim() || 'PROMO',
        accent_color: input.accent_color?.trim() || null,
        promo_price,
        is_active: input.is_active,
        valid_until: input.expires_at,
        emoji: '✨',
        service_ids: '[]',
      })
      .select('id')
      .single()
    if (error) throw error
    const promoId = String((promo as { id: string }).id)
    if (items.length > 0) {
      const rows = items.map((i, idx) => ({
        promotion_id: promoId,
        item_type: i.item_type,
        item_id: i.item_id,
        quantity: i.quantity,
        discounted_price: i.discounted_price,
        sort_order: idx,
      }))
      const { error: itemsError } = await sb.from('promotion_items').insert(rows)
      if (itemsError) throw itemsError
    }
    const fullItems = await fetchItemsForPromo(sb, promoId, dialect)
    const { data: full, error: fetchErr } = await sb
      .from('promotions')
      .select(ZM_PROMOS_SELECT)
      .eq('id', promoId)
      .single()
    if (fetchErr) throw fetchErr
    return normalizePromotion(full as Record<string, unknown>, dialect, fullItems)
  }

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
  const raw = full as Record<string, unknown>
  const rawItems = Array.isArray(raw.promotion_items)
    ? (raw.promotion_items as Record<string, unknown>[]).map((r) => normalizePromoItem(r, 'geema'))
    : undefined
  return normalizePromotion(raw, 'geema', rawItems)
}

export async function updatePromotion(
  id: string,
  input: Partial<PromotionInput>,
  items?: PromoItemInput[]
): Promise<void> {
  const sb = requireSupabase()
  const dialect = await detectCatalogDialect(sb)
  const promo_price = items ? computePromoPrice(items) : undefined

  if (dialect === 'zm') {
    const payload: Record<string, unknown> = {}
    if (input.title != null) payload.title = input.title.trim()
    if (input.description !== undefined) payload.description = input.description?.trim() || ''
    if (input.badge !== undefined) payload.badge = input.badge?.trim() || 'PROMO'
    if (input.accent_color !== undefined) payload.accent_color = input.accent_color?.trim() || null
    if (input.is_active != null) payload.is_active = input.is_active
    if (input.expires_at !== undefined) payload.valid_until = input.expires_at
    if (promo_price !== undefined) payload.promo_price = promo_price

    const { error } = await sb.from('promotions').update(payload).eq('id', id)
    if (error) throw error

    if (items !== undefined) {
      const { error: delErr } = await sb.from('promotion_items').delete().eq('promotion_id', id)
      if (delErr) throw delErr
      if (items.length > 0) {
        const rows = items.map((i, idx) => ({
          promotion_id: id,
          item_type: i.item_type,
          item_id: i.item_id,
          quantity: i.quantity,
          discounted_price: i.discounted_price,
          sort_order: idx,
        }))
        const { error: itemsError } = await sb.from('promotion_items').insert(rows)
        if (itemsError) throw itemsError
      }
    }
    return
  }

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
  const dialect = await detectCatalogDialect(sb)
  const fk = dialect === 'zm' ? 'promotion_id' : 'promo_id'
  const { error: delItems } = await sb.from('promotion_items').delete().eq(fk, id)
  if (delItems) throw delItems
  const { error } = await sb.from('promotions').delete().eq('id', id)
  if (error) throw error
}

export async function togglePromoActive(id: string, is_active: boolean): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb.from('promotions').update({ is_active }).eq('id', id)
  if (error) throw error
}
