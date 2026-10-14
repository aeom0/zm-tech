'use client'

import {
  detectCatalogDialect as detectCatalogDialectData,
  isMissingColumnError,
  parseServiceIds,
  resetCatalogDialectCache,
  serializeServiceIds,
  toIsoOrNull,
  type CatalogDialect,
} from '@geemastudio/data'
import type { SupabaseClient } from '@supabase/supabase-js'

export type { CatalogDialect }
export {
  isMissingColumnError,
  parseServiceIds,
  resetCatalogDialectCache,
  serializeServiceIds,
  toIsoOrNull,
}

export async function detectCatalogDialect(client: SupabaseClient): Promise<CatalogDialect> {
  return detectCatalogDialectData(client)
}

export const DEFAULT_CATEGORY_COLOR = '#6B7280'
