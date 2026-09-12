'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Dialecto de catálogo (misma BD compartida ZM/Geema).
 * ZM: `service_categories` solo tiene id, name, order (+ tenant_id).
 * Geema: añade color, icon.
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

/** Sondea si `service_categories.color` existe (Geema) o no (ZM). */
export async function detectCatalogDialect(client: SupabaseClient): Promise<CatalogDialect> {
  if (cachedDialect) return cachedDialect
  if (!detectPromise) {
    detectPromise = (async () => {
      try {
        const { error } = await client.from('service_categories').select('color').limit(1)
        if (!error) {
          cachedDialect = 'geema'
          return 'geema'
        }
        if (isMissingColumnError(error)) {
          cachedDialect = 'zm'
          return 'zm'
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
