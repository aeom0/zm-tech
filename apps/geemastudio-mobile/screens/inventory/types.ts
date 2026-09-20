export type InventoryCategory = string

export interface InventoryCategoryOption {
  key: string
  label: string
  /** false = fija por rubro (no editable/eliminable); true = agregada por el owner. */
  isCustom: boolean
  /** id en `inventory_categories`, solo presente para categorías custom. */
  id?: string
}

export interface InventoryItem {
  id: string
  name: string
  type: string
  category: InventoryCategory
  quantity: number
  min_stock: number
  unit: string
  price: string | null
  cost: string | null
}

export interface InventoryFormState {
  name: string
  category: InventoryCategory
  quantity: string
  minStock: string
  unit: string
  cost: string
}
