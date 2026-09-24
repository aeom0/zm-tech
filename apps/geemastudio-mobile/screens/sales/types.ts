export type ProductOrderStatus = 'reserved' | 'pedido' | 'paid' | 'delivered' | 'cancelled'
export type PaymentMethod = 'cash' | 'yape_plin' | 'transfer' | 'card'

export interface SellableProduct {
  id: string
  name: string
  price: number | null
  quantity: number
  unit: string
}

export interface ProductForm {
  name: string
  price: string
  quantity: string
  unit: string
}

export interface ProductOrder {
  id: string
  inventory_item_id: string
  quantity: number
  unit_price: number
  client_name: string
  client_phone: string | null
  status: ProductOrderStatus
  payment_method: string | null
  notes: string | null
  created_at: string
  paid_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  inventory_items: { name: string } | { name: string }[] | null
}

export interface ProductOrderForm {
  productId: string
  quantity: string
  clientName: string
  clientPhone: string
  notes: string
}
