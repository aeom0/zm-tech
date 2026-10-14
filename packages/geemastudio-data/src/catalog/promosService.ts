import type { SupabaseClient } from '@supabase/supabase-js'
import {
  detectCatalogDialect,
  rowToPromoItem,
  rowToPromotion,
  sortCatalogList,
} from './catalogAdapter'
import type { CatalogDialect, PromoItem, PromoItemInput, Promotion, PromotionInput } from './types'

export const ZM_PROMOS_SELECT =
  'id, title, description, badge, emoji, accent_color, promo_price, is_active, valid_until, slot_minutes'

export async function fetchPromos(
  client: SupabaseClient,
  dialectOverride?: CatalogDialect
): Promise<Promotion[]> {
  const dialect = dialectOverride ?? (await detectCatalogDialect(client))

  if (dialect === 'zm') {
    const { data, error } = await client
      .from('promotions')
      .select(ZM_PROMOS_SELECT)
      .order('is_active', { ascending: false })

    if (error) throw new Error(error.message)

    const rawRows = (data ?? []) as Record<string, unknown>[]
    const ids = rawRows.map((r) => String(r.id)).filter(Boolean)

    let itemsByPromo: Record<string, PromoItem[]> = {}
    if (ids.length > 0) {
      const { data: itemRows, error: itemsErr } = await client
        .from('promotion_items')
        .select('id, promotion_id, item_type, item_id, quantity, discounted_price')
        .in('promotion_id', ids)

      if (!itemsErr && itemRows) {
        itemsByPromo = (itemRows as Record<string, unknown>[]).reduce<Record<string, PromoItem[]>>(
          (acc, row) => {
            const pid = String(row.promotion_id)
            if (!acc[pid]) acc[pid] = []
            acc[pid]!.push(rowToPromoItem(row, dialect))
            return acc
          },
          {}
        )
      }
    }

    const promos = rawRows.map((row) =>
      rowToPromotion(row, dialect, itemsByPromo[String(row.id)] ?? [])
    )

    return sortCatalogList(promos, {
      getActive: (p) => p.is_active,
      getOrder: (p) => p.display_order,
      getName: (p) => p.title,
    })
  }

  const { data, error } = await client
    .from('promotions')
    .select(
      `
      id,
      title,
      description,
      badge,
      accent_color,
      promo_price,
      is_active,
      expires_at,
      promotion_items (
        id,
        promo_id,
        item_type,
        item_id,
        quantity,
        discounted_price
      )
    `
    )
    .order('is_active', { ascending: false })
    .order('title', { ascending: true })

  if (error) throw new Error(error.message)

  const promos = ((data ?? []) as Record<string, unknown>[]).map((row) => {
    const itemsRaw = (row.promotion_items as Record<string, unknown>[] | null) ?? []
    const items = itemsRaw.map((it) => rowToPromoItem(it, dialect))
    return rowToPromotion(row, dialect, items)
  })

  return sortCatalogList(promos, {
    getActive: (p) => p.is_active,
    getOrder: (p) => p.display_order,
    getName: (p) => p.title,
  })
}

export async function createPromo(
  client: SupabaseClient,
  promo: PromotionInput,
  items: PromoItemInput[],
  dialectOverride?: CatalogDialect
): Promise<string> {
  const dialect = dialectOverride ?? (await detectCatalogDialect(client))

  if (dialect === 'zm') {
    const payload: Record<string, unknown> = {
      title: promo.title.trim(),
      description: promo.description?.trim() || '',
      badge: promo.badge?.trim() || null,
      emoji: promo.emoji?.trim() || promo.badge?.trim() || null,
      accent_color: promo.accent_color || null,
      promo_price: promo.promo_price,
      is_active: promo.is_active,
      valid_until: promo.expires_at || null,
      slot_minutes: promo.slot_minutes ?? null,
    }

    const { data, error } = await client.from('promotions').insert(payload).select('id').single()
    if (error || !data) throw new Error(error?.message ?? 'Error creando promoción')

    const promoId = String(data.id)

    if (items.length > 0) {
      const rows = items.map((it) => ({
        promotion_id: promoId,
        item_type: it.item_type,
        item_id: it.item_id,
        quantity: it.quantity,
        discounted_price: it.discounted_price,
      }))
      const { error: itemsErr } = await client.from('promotion_items').insert(rows)
      if (itemsErr) {
        await client.from('promotions').delete().eq('id', promoId)
        throw new Error(itemsErr.message)
      }
    }
    return promoId
  }

  const payload: Record<string, unknown> = {
    title: promo.title.trim(),
    description: promo.description?.trim() || null,
    badge: promo.badge?.trim() || null,
    accent_color: promo.accent_color || null,
    promo_price: promo.promo_price,
    is_active: promo.is_active,
    expires_at: promo.expires_at || null,
  }

  const { data, error } = await client.from('promotions').insert(payload).select('id').single()
  if (error || !data) throw new Error(error?.message ?? 'Error creando promoción')

  const promoId = String(data.id)

  if (items.length > 0) {
    const rows = items.map((it) => ({
      promo_id: promoId,
      item_type: it.item_type,
      item_id: it.item_id,
      quantity: it.quantity,
      discounted_price: it.discounted_price,
    }))
    const { error: itemsErr } = await client.from('promotion_items').insert(rows)
    if (itemsErr) {
      await client.from('promotions').delete().eq('id', promoId)
      throw new Error(itemsErr.message)
    }
  }

  return promoId
}

export async function updatePromo(
  client: SupabaseClient,
  id: string,
  promo: Partial<PromotionInput>,
  items?: PromoItemInput[],
  dialectOverride?: CatalogDialect
): Promise<void> {
  const dialect = dialectOverride ?? (await detectCatalogDialect(client))

  if (dialect === 'zm') {
    const patch: Record<string, unknown> = {}
    if (promo.title !== undefined) patch.title = promo.title.trim()
    if (promo.description !== undefined) patch.description = promo.description?.trim() || ''
    if (promo.badge !== undefined) patch.badge = promo.badge?.trim() || null
    if (promo.emoji !== undefined) patch.emoji = promo.emoji?.trim() || null
    if (promo.accent_color !== undefined) patch.accent_color = promo.accent_color || null
    if (promo.promo_price !== undefined) patch.promo_price = promo.promo_price
    if (promo.is_active !== undefined) patch.is_active = promo.is_active
    if (promo.expires_at !== undefined) patch.valid_until = promo.expires_at || null
    if (promo.slot_minutes !== undefined) patch.slot_minutes = promo.slot_minutes ?? null

    if (Object.keys(patch).length > 0) {
      const { error } = await client.from('promotions').update(patch).eq('id', id)
      if (error) throw new Error(error.message)
    }

    if (items !== undefined) {
      await client.from('promotion_items').delete().eq('promotion_id', id)
      if (items.length > 0) {
        const rows = items.map((it) => ({
          promotion_id: id,
          item_type: it.item_type,
          item_id: it.item_id,
          quantity: it.quantity,
          discounted_price: it.discounted_price,
        }))
        const { error: itemsErr } = await client.from('promotion_items').insert(rows)
        if (itemsErr) throw new Error(itemsErr.message)
      }
    }
    return
  }

  const patch: Record<string, unknown> = {}
  if (promo.title !== undefined) patch.title = promo.title.trim()
  if (promo.description !== undefined) patch.description = promo.description?.trim() || null
  if (promo.badge !== undefined) patch.badge = promo.badge?.trim() || null
  if (promo.accent_color !== undefined) patch.accent_color = promo.accent_color || null
  if (promo.promo_price !== undefined) patch.promo_price = promo.promo_price
  if (promo.is_active !== undefined) patch.is_active = promo.is_active
  if (promo.expires_at !== undefined) patch.expires_at = promo.expires_at || null

  if (Object.keys(patch).length > 0) {
    const { error } = await client.from('promotions').update(patch).eq('id', id)
    if (error) throw new Error(error.message)
  }

  if (items !== undefined) {
    await client.from('promotion_items').delete().eq('promo_id', id)
    if (items.length > 0) {
      const rows = items.map((it) => ({
        promo_id: id,
        item_type: it.item_type,
        item_id: it.item_id,
        quantity: it.quantity,
        discounted_price: it.discounted_price,
      }))
      const { error: itemsErr } = await client.from('promotion_items').insert(rows)
      if (itemsErr) throw new Error(itemsErr.message)
    }
  }
}

export async function deletePromo(
  client: SupabaseClient,
  id: string,
  dialectOverride?: CatalogDialect
): Promise<void> {
  const dialect = dialectOverride ?? (await detectCatalogDialect(client))
  const promoCol = dialect === 'zm' ? 'promotion_id' : 'promo_id'
  await client.from('promotion_items').delete().eq(promoCol, id)
  const { error } = await client.from('promotions').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function togglePromoActive(
  client: SupabaseClient,
  id: string,
  isActive: boolean
): Promise<void> {
  const { error } = await client.from('promotions').update({ is_active: isActive }).eq('id', id)
  if (error) throw new Error(error.message)
}

export const fetchPromotions = fetchPromos
export const createPromotion = createPromo
export const updatePromotion = updatePromo
export const deletePromotion = deletePromo
export const togglePromotionActive = togglePromoActive
