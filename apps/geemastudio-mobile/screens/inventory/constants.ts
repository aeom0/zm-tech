import type { InventoryCategory } from './types'

export const CATEGORY_LABELS: Record<InventoryCategory, string> = {
  unas: 'Uñas',
  pestanas_cejas: 'Pestañas y Cejas',
  insumos: 'Insumos',
}

export const INVENTORY_CATEGORIES: InventoryCategory[] = ['unas', 'pestanas_cejas', 'insumos']
