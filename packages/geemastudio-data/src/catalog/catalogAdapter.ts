import type { SupabaseClient } from '@supabase/supabase-js'
import type { CatalogDialect, Pack, Promotion, PromoItem } from './types'

export interface SupabaseErrorLike {
  message?: string
  code?: string
}

export function isMissingColumnError(err: SupabaseErrorLike): boolean {
  const m = (err.message ?? '').toLowerCase()
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    m.includes('could not find') ||
    err.code === '42703' ||
    err.code === 'PGRST204'
  )
}

let cachedDialect: CatalogDialect | null = null
let detectPromise: Promise<CatalogDialect> | null = null

export async function detectCatalogDialect(client: SupabaseClient): Promise<CatalogDialect> {
  if (cachedDialect) return cachedDialect
  if (!detectPromise) {
    detectPromise = (async () => {
      try {
        const { error } = await client.from('packs').select('title').limit(1)
        if (!error) {
          cachedDialect = 'zm'
          return 'zm'
        }
        if (isMissingColumnError(error)) {
          cachedDialect = 'geema'
          return 'geema'
        }
        throw new Error(error.message ?? 'Error detectando dialecto de catálogo')
      } catch (err) {
        detectPromise = null
        throw err
      }
    })()
  }
  return detectPromise
}

export function resetCatalogDialectCache(): void {
  cachedDialect = null
  detectPromise = null
}

export function parseServiceIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === 'string')
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === 'string')
      }
    } catch {
      // no es JSON válido
    }
  }
  return []
}

export function serializeServiceIds(ids: string[], dialect: CatalogDialect): string | string[] {
  return dialect === 'zm' ? JSON.stringify(ids) : ids
}

export function toIsoOrNull(raw: string | null | undefined): string | null {
  if (!raw) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim())
  if (m) return `${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z`
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export type CatalogSortAccessors<T> = {
  getActive?: (item: T) => boolean
  getOrder?: (item: T) => number | null | undefined
  getName: (item: T) => string
}

function orderRank(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(Number(value))) {
    return Number.POSITIVE_INFINITY
  }
  return Number(value)
}

export function compareCatalogItems<T>(a: T, b: T, accessors: CatalogSortAccessors<T>): number {
  if (accessors.getActive) {
    const aActive = accessors.getActive(a)
    const bActive = accessors.getActive(b)
    if (aActive !== bActive) {
      return aActive ? -1 : 1
    }
  }

  if (accessors.getOrder) {
    const ao = orderRank(accessors.getOrder(a))
    const bo = orderRank(accessors.getOrder(b))
    if (ao !== bo) {
      return ao - bo
    }
  }

  return accessors.getName(a).localeCompare(accessors.getName(b), 'es', { sensitivity: 'base' })
}

export function sortCatalogList<T>(items: readonly T[], accessors: CatalogSortAccessors<T>): T[] {
  return [...items].sort((a, b) => compareCatalogItems(a, b, accessors))
}

export function rowToPack(row: Record<string, unknown>, dialect: CatalogDialect): Pack {
  if (dialect === 'zm') {
    return {
      id: String(row.id),
      name: String(row.title ?? row.name ?? ''),
      description: row.description != null ? String(row.description) : null,
      price: Number(row.pack_price ?? row.price) || 0,
      service_ids: parseServiceIds(row.service_ids),
      is_active: Boolean(row.is_active),
      display_order: row.display_order != null ? Number(row.display_order) : null,
      emoji: row.emoji != null ? String(row.emoji) : null,
      badge: row.emoji != null ? String(row.emoji) : null,
      category_id: row.category_id != null ? String(row.category_id) : null,
      slot_minutes: Number(row.slot_minutes) > 0 ? Number(row.slot_minutes) : null,
    }
  }
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    description: row.description != null ? String(row.description) : null,
    price: Number(row.price) || 0,
    service_ids: parseServiceIds(row.service_ids),
    is_active: Boolean(row.is_active),
    display_order: row.display_order != null ? Number(row.display_order) : null,
  }
}

export function rowToPromoItem(row: Record<string, unknown>, dialect: CatalogDialect): PromoItem {
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

export function rowToPromotion(
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
  if (!Number.isFinite(promoPrice) || promoPrice < 0) {
    promoPrice = 0
  }

  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    description: row.description != null ? String(row.description) : null,
    badge: row.badge != null ? String(row.badge) : null,
    emoji: row.emoji != null ? String(row.emoji) : null,
    accent_color: row.accent_color != null ? String(row.accent_color) : null,
    promo_price: promoPrice,
    is_active: Boolean(row.is_active),
    expires_at: expires,
    slot_minutes: Number(row.slot_minutes) > 0 ? Number(row.slot_minutes) : null,
    display_order: row.display_order != null ? Number(row.display_order) : null,
    promotion_items: items,
  }
}

export const rowToPromotionItem = rowToPromoItem
export const rowToPromo = rowToPromotion

/** Total de una promo desde sus ítems: suma de quantity * discounted_price. */
export function getPromoTotalFromItems(items: PromoItem[], promoId: string): number | null {
  const forPromo = items.filter((i) => i.promo_id === promoId)
  if (forPromo.length === 0) {
    return null
  }
  return forPromo.reduce((sum, i) => sum + i.quantity * (Number(i.discounted_price) || 0), 0)
}

/**
 * Superpone el total calculado desde `promotion_items` sobre `promo_price`.
 * Si no hay ítems para una promo, se conserva su `promo_price` original.
 */
export function applyPromoTotals(promos: Promotion[], items: PromoItem[]): Promotion[] {
  return promos.map((promo) => {
    const total = getPromoTotalFromItems(items, promo.id)
    if (total == null) {
      return promo
    }
    return { ...promo, promo_price: Number(total.toFixed(2)) }
  })
}
