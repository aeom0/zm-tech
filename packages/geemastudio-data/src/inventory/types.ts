export type BusinessTypeKey = 'spa-nails' | 'barbershop' | 'hair-salon' | 'full-aesthetic'

export interface InventoryCategoryDef {
  key: string
  label: string
}

export interface InventoryCategoryOption extends InventoryCategoryDef {
  /** false = fija por rubro (no editable/eliminable); true = agregada por el owner. */
  isCustom: boolean
  /** id en `inventory_categories`, solo para categorías custom. */
  id?: string
}

export interface InventoryCategoryRow {
  id: string
  key: string
  label: string
  sort_order: number
}

export interface InventoryItem {
  id: string
  tenant_id: string
  name: string
  type: string
  category: string
  quantity: number
  min_stock: number
  unit: string
  price: string | null
  cost: string | null
}

export interface InventoryItemInput {
  name: string
  category: string
  quantity: number
  min_stock: number
  unit: string
  cost: number | null
}

export interface InventoryMovement {
  id: string
  item_id: string | null
  delta: number
  quantity_before: number
  quantity_after: number
  reason: string
  created_at: string
}
