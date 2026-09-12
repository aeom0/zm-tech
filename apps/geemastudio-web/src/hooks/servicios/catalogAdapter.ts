'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Dialecto de catálogo (BD compartida ZM/Geema).
 * Probe: `packs.title` existe → ZM; si falta → Geema.
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

export const DEFAULT_CATEGORY_COLOR = '#6B7280'

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
      /* ignore */
    }
  }
  return []
}

export function serializeServiceIds(ids: string[], dialect: CatalogDialect): string | string[] {
  return dialect === 'zm' ? JSON.stringify(ids) : ids
}

/** `valid_until` ZM (sin TZ) → ISO estable para UI. */
export function toIsoOrNull(raw: string | null | undefined): string | null {
  if (!raw) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw.trim())
  if (m) return `${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z`
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const d = new Date(normalized)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
