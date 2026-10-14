import { supabase } from '@/lib/supabase'
import {
  detectCatalogDialect as detectCatalogDialectData,
  isMissingColumnError,
  parseServiceIds,
  resetCatalogDialectCache as resetCatalogDialectCacheData,
  serializeServiceIds,
  toIsoOrNull,
  type CatalogDialect,
} from '@geemastudio/data'

import type { Pack, Promo, PromotionItem } from '../types'

export type { CatalogDialect }
export { isMissingColumnError, parseServiceIds, serializeServiceIds, toIsoOrNull }

export async function detectCatalogDialect(): Promise<CatalogDialect> {
  return detectCatalogDialectData(supabase)
}

export function resetCatalogDialectCache(): void {
  resetCatalogDialectCacheData()
}

export interface PackRawRow {
  id: string
  name?: string | null
  title?: string | null
  description?: string | null
  price?: string | number | null
  pack_price?: string | number | null
  category_id?: string | null
  service_ids?: unknown
  is_active: boolean
  display_order?: number | null
  emoji?: string | null
  slot_minutes?: number | null
}

export function rowToPack(row: PackRawRow, dialect: CatalogDialect): Pack {
  if (dialect === 'zm') {
    return {
      id: row.id,
      name: row.title ?? '',
      description: row.description ?? null,
      price: row.pack_price != null ? String(row.pack_price) : '0.00',
      service_ids: parseServiceIds(row.service_ids),
      is_active: row.is_active,
      category_id: row.category_id ?? null,
      display_order: row.display_order ?? null,
      badge: row.emoji ?? null,
      slot_minutes: row.slot_minutes ?? null,
    }
  }
  return {
    id: row.id,
    name: row.name ?? '',
    description: row.description ?? null,
    price: row.price != null ? String(row.price) : '0.00',
    service_ids: parseServiceIds(row.service_ids),
    is_active: row.is_active,
    badge: row.emoji ?? null,
  }
}

export interface PromoRawRow {
  id: string
  title: string
  description?: string | null
  badge?: string | null
  accent_color?: string | null
  promo_price?: string | number | null
  is_active: boolean
  expires_at?: string | null
  valid_until?: string | null
  display_order?: number | null
  slot_minutes?: number | null
}

export function rowToPromotion(row: PromoRawRow, dialect: CatalogDialect): Promo {
  const expires =
    dialect === 'zm'
      ? toIsoOrNull(row.valid_until)
      : row.expires_at != null
        ? String(row.expires_at)
        : null

  let promoPrice: string | null = null
  if (row.promo_price != null && row.promo_price !== '') {
    const n = Number(row.promo_price)
    if (Number.isFinite(n) && n >= 0) {
      promoPrice = n.toFixed(2)
    }
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    badge: row.badge ?? null,
    accent_color: row.accent_color ?? null,
    promo_price: promoPrice,
    is_active: row.is_active,
    expires_at: expires,
    slot_minutes: row.slot_minutes ?? null,
    display_order: row.display_order ?? null,
  }
}

export const rowToPromo = rowToPromotion

export interface PromotionItemRawRow {
  id: string
  promo_id?: string | null
  promotion_id?: string | null
  item_type: 'service' | 'pack'
  item_id: string
  quantity?: number | null
  discounted_price?: string | number | null
}

export type PromoItemRawRow = PromotionItemRawRow

export function rowToPromotionItem(
  row: PromotionItemRawRow,
  dialect: CatalogDialect
): PromotionItem {
  const promoId =
    dialect === 'zm'
      ? (row.promotion_id ?? row.promo_id ?? '')
      : (row.promo_id ?? row.promotion_id ?? '')

  return {
    id: row.id,
    promo_id: promoId,
    item_type: row.item_type === 'pack' ? 'pack' : 'service',
    item_id: row.item_id,
    quantity: Number(row.quantity) || 1,
    discounted_price: Number(row.discounted_price) || 0,
  }
}

export const rowToPromoItem = rowToPromotionItem

/** Total de una promo desde sus ítems: suma de quantity * discounted_price. */
export function getPromoTotalFromItems(items: PromotionItem[], promoId: string): number | null {
  const forPromo = items.filter((i) => i.promo_id === promoId)
  if (forPromo.length === 0) {
    return null
  }
  return forPromo.reduce((sum, i) => sum + i.quantity * (Number(i.discounted_price) || 0), 0)
}

/**
 * Superpone el total calculado desde `promotion_items` sobre `promo_price`.
 * Necesario en ZM: `promo_price` casi siempre es NULL en prod (el total real vive
 * en los ítems). Si no hay ítems para una promo, se conserva su `promo_price` original.
 */
export function applyPromoTotals(promos: Promo[], items: PromotionItem[]): Promo[] {
  return promos.map((promo) => {
    const total = getPromoTotalFromItems(items, promo.id)
    if (total == null) {
      return promo
    }
    return { ...promo, promo_price: total.toFixed(2) }
  })
}
