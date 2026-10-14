import type {
  BusinessTypeKey,
  InventoryCategoryDef,
  InventoryCategoryOption,
  InventoryCategoryRow,
} from './types'

/**
 * Categorías base de inventario por rubro. No editables ni eliminables — el owner
 * puede sumar categorías propias encima (tabla `inventory_categories`).
 */
const DEFAULT_CATEGORIES_BY_BUSINESS_TYPE: Record<BusinessTypeKey, InventoryCategoryDef[]> = {
  'spa-nails': [
    { key: 'unas', label: 'Uñas' },
    { key: 'pestanas_cejas', label: 'Pestañas y Cejas' },
    { key: 'insumos', label: 'Insumos' },
  ],
  barbershop: [
    { key: 'cabello', label: 'Cabello' },
    { key: 'barba', label: 'Barba y Afeitado' },
    { key: 'insumos', label: 'Insumos' },
  ],
  'hair-salon': [
    { key: 'color_tratamientos', label: 'Color y Tratamientos' },
    { key: 'cuidado_capilar', label: 'Cuidado Capilar' },
    { key: 'insumos', label: 'Insumos' },
  ],
  'full-aesthetic': [
    { key: 'rostro', label: 'Rostro' },
    { key: 'cuerpo', label: 'Cuerpo' },
    { key: 'insumos', label: 'Insumos' },
  ],
}

export function getDefaultInventoryCategories(
  businessType: BusinessTypeKey | string
): InventoryCategoryDef[] {
  return (
    DEFAULT_CATEGORIES_BY_BUSINESS_TYPE[businessType as BusinessTypeKey] ??
    DEFAULT_CATEGORIES_BY_BUSINESS_TYPE['spa-nails']
  )
}

/** Slug estable para la `key` de una categoría custom (sin acentos ni espacios). */
export function slugifyCategoryKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

/** Base del rubro + custom del owner, sin duplicar keys. */
export function mergeInventoryCategories(
  businessType: BusinessTypeKey | string,
  custom: readonly InventoryCategoryRow[]
): InventoryCategoryOption[] {
  const base = getDefaultInventoryCategories(businessType).map((c) => ({
    ...c,
    isCustom: false,
  }))
  const baseKeys = new Set(base.map((c) => c.key))
  const extra = custom
    .filter((c) => !baseKeys.has(c.key))
    .map((c) => ({ key: c.key, label: c.label, isCustom: true, id: c.id }))
  return [...base, ...extra]
}

export function isLowStock(item: { quantity: number; min_stock: number }): boolean {
  return Number(item.quantity) <= Number(item.min_stock)
}
