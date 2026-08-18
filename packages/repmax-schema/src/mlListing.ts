// ============================================================
// Contrato MercadoLibre — camelCase, sin `any`
// Tabla: public.repmax_ml_listings (migración 20260811222700)
// ============================================================

export const ML_LISTING_STATUSES = [
  'draft',
  'ready',
  'exported',
  'published_manual',
  'needs_update',
  'published',
  'paused',
  'error',
] as const

export type MlListingStatus = (typeof ML_LISTING_STATUSES)[number]

export type MlAttributeTag = 'required' | 'new_required' | 'conditional_required' | 'optional'

/** Tags que MercadoLibre exige para publicar (fase 1 filtra el resto). */
export const ML_REQUIRED_ATTRIBUTE_TAGS: readonly MlAttributeTag[] = [
  'required',
  'new_required',
  'conditional_required',
] as const

export interface MlAttribute {
  id: string
  name: string
  valueId?: string
  valueName?: string
  tag: MlAttributeTag
}

export interface MlCategoryPrediction {
  domainId: string
  domainName: string
  categoryId: string
  categoryName: string
  attributes: MlAttribute[]
  /** 1, 2, 3 según orden de la API */
  confidenceRank: number
}

export interface RepmaxMlListing {
  id: string
  productId: string
  storeId: string
  mlDomainId: string | null
  mlCategoryId: string | null
  mlCategoryName: string | null
  mlAttributesSnapshot: Record<string, unknown>
  predictionConfidence: number | null
  status: MlListingStatus
  mlItemId: string | null
  lastError: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Campos del producto RepMAX que se cruzan con atributos ML.
 * No es la fila completa de `repmax_products`.
 */
export interface RepmaxProduct {
  partNumber?: string | null
  brand?: string | null
  model?: string | null
  condition?: string | null
  color?: string | null
  title?: string | null
}
