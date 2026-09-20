import type { TenantConfig } from '@zmtech/tenant-config'

interface CategoryDef {
  key: string
  label: string
}

/**
 * Categorías base de inventario por rubro. No editables ni eliminables desde
 * la app — el owner puede sumar categorías propias encima (tabla
 * `inventory_categories`), pero estas siempre están presentes.
 */
const DEFAULT_CATEGORIES_BY_BUSINESS_TYPE: Record<TenantConfig['businessType'], CategoryDef[]> = {
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
  businessType: TenantConfig['businessType']
): CategoryDef[] {
  return (
    DEFAULT_CATEGORIES_BY_BUSINESS_TYPE[businessType] ??
    DEFAULT_CATEGORIES_BY_BUSINESS_TYPE['spa-nails']
  )
}

/** Slug estable para usar como `key` de una categoría custom (sin acentos ni espacios). */
export function slugifyCategoryKey(label: string): string {
  return label
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
