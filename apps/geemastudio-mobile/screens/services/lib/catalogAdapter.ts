import { supabase } from '@/lib/supabase'

import type { Pack, Promo, PromotionItem } from '../types'

/**
 * Adaptador de catálogo: Packs/Promos comparten esquema Geema y ZM (legacy) mientras
 * dure la migración por tenant (S7 unifica esquema). Este módulo detecta el dialecto
 * de BD una sola vez y expone funciones puras de mapeo fila → tipo de dominio.
 */
export type CatalogDialect = 'geema' | 'zm'

interface SupabaseErrorLike {
  message?: string
  code?: string
}

export function isMissingColumnError(err: SupabaseErrorLike): boolean {
  const m = (err.message ?? '').toLowerCase()
  return (
    m.includes('does not exist') ||
    m.includes('schema cache') ||
    err.code === '42703' ||
    err.code === 'PGRST204'
  )
}

let cachedDialect: CatalogDialect | null = null
let detectPromise: Promise<CatalogDialect> | null = null

/**
 * Sondea una vez por sesión si `packs.title` existe (dialecto ZM) o no (dialecto Geema).
 * El resultado se cachea a nivel de módulo: todas las queries/mutations de packs y
 * promos reutilizan el mismo dialecto sin repetir la sonda.
 */
export async function detectCatalogDialect(): Promise<CatalogDialect> {
  if (cachedDialect) {
    return cachedDialect
  }
  if (!detectPromise) {
    detectPromise = (async () => {
      try {
        const { error } = await supabase.from('packs').select('title').limit(1)
        if (!error) {
          cachedDialect = 'zm'
          return 'zm'
        }
        if (isMissingColumnError(error)) {
          cachedDialect = 'geema'
          return 'geema'
        }
        throw new Error(error.message)
      } catch (err) {
        detectPromise = null
        throw err
      }
    })()
  }
  return detectPromise
}

/** Solo para uso en pruebas manuales; no se llama en el flujo normal de la app. */
export function resetCatalogDialectCache(): void {
  cachedDialect = null
  detectPromise = null
}

/** Acepta array nativo (Geema) o JSON string (ZM); cualquier otro valor cae a []. */
export function parseServiceIds(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((v): v is string => typeof v === 'string')
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === 'string')
      }
    } catch {
      // no era JSON válido: se trata como lista vacía
    }
  }
  return []
}

export function serializeServiceIds(ids: string[], dialect: CatalogDialect): string | string[] {
  return dialect === 'zm' ? JSON.stringify(ids) : ids
}

export interface PackRawRow {
  id: string
  name?: string | null
  title?: string | null
  description?: string | null
  price?: string | number | null
  pack_price?: string | number | null
  pack_price_card?: string | number | null
  category_id?: string | null
  service_ids?: unknown
  is_active: boolean
  emoji?: string | null
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
      pack_price_card: row.pack_price_card != null ? String(row.pack_price_card) : null,
      badge: row.emoji ?? null,
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
}

/**
 * `valid_until` en ZM es timestamp without TZ (`2026-08-31 00:00:00`).
 * Hermes no garantiza parsear el espacio; usamos la fecha de calendario
 * a mediodía UTC para no correr el día por offset Lima.
 */
function toIsoOrNull(raw: string | null | undefined): string | null {
  if (!raw) {
    return null
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim())
  if (m) {
    return `${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z`
  }
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function rowToPromo(row: PromoRawRow, dialect: CatalogDialect): Promo {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    badge: row.badge ?? null,
    accent_color: row.accent_color ?? null,
    promo_price: row.promo_price != null ? String(row.promo_price) : null,
    is_active: row.is_active,
    expires_at: dialect === 'zm' ? toIsoOrNull(row.valid_until) : (row.expires_at ?? null),
  }
}

export interface PromotionItemRawRow {
  id: string
  promo_id?: string
  promotion_id?: string
  item_type: string
  item_id: string
  quantity: number | null
  discounted_price: string | number
}

export function rowToPromotionItem(
  row: PromotionItemRawRow,
  dialect: CatalogDialect
): PromotionItem {
  const qty = row.quantity != null && row.quantity > 0 ? row.quantity : 1
  const dp =
    typeof row.discounted_price === 'number'
      ? row.discounted_price
      : parseFloat(String(row.discounted_price))
  const promoId = dialect === 'zm' ? row.promotion_id : row.promo_id
  return {
    id: row.id,
    promo_id: promoId ?? '',
    item_type: row.item_type === 'pack' ? 'pack' : 'service',
    item_id: row.item_id,
    quantity: qty,
    discounted_price: Number.isFinite(dp) ? dp : 0,
  }
}

/** Total de una promo desde sus ítems: suma de quantity * discounted_price. */
export function getPromoTotalFromItems(items: PromotionItem[], promoId: string): number | null {
  const forPromo = items.filter((i) => i.promo_id === promoId)
  if (forPromo.length === 0) {
    return null
  }
  return forPromo.reduce((sum, i) => sum + i.quantity * i.discounted_price, 0)
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
