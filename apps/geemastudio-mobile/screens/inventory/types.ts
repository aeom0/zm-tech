export type InventoryCategory = 'unas' | 'pestanas_cejas' | 'insumos'

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
