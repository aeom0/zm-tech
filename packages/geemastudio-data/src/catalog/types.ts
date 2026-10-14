export type CatalogDialect = 'geema' | 'zm'

export interface Pack {
  id: string
  name: string
  description: string | null
  price: number
  service_ids: string[]
  is_active: boolean
  display_order?: number | null
  emoji?: string | null
  badge?: string | null
  category_id?: string | null
  slot_minutes?: number | null
}

export interface PackInput {
  name: string
  description: string | null
  price: number
  service_ids: string[]
  is_active: boolean
  emoji?: string | null
  badge?: string | null
  category_id?: string | null
  slot_minutes?: number | null
}

export interface PromoItem {
  id: string
  promo_id: string
  item_type: 'service' | 'pack'
  item_id: string
  quantity: number
  discounted_price: number
}

export interface PromoItemInput {
  item_type: 'service' | 'pack'
  item_id: string
  quantity: number
  discounted_price: number
}

export interface Promotion {
  id: string
  title: string
  description: string | null
  badge: string | null
  emoji?: string | null
  accent_color: string | null
  promo_price: number
  is_active: boolean
  expires_at: string | null
  slot_minutes?: number | null
  display_order?: number | null
  promotion_items?: PromoItem[]
}

export type PromotionInput = Omit<Promotion, 'id' | 'promotion_items'>
export type Promo = Promotion
export type PromotionItem = PromoItem

export interface Producto {
  id: string
  name: string
  description: string | null
  price: number | null
  quantity: number
  min_stock: number
  unit: string
  category: string | null
  image_url: string | null
  is_sellable: boolean
}

export interface ProductoInput {
  name: string
  description: string | null
  price: number | null
  quantity: number
  min_stock: number
  unit: string
  category: string | null
  image_url: string | null
  is_sellable?: boolean
}

export type ProductOrderStatus = 'reserved' | 'pedido' | 'paid' | 'delivered' | 'cancelled'
export type ProductOrderSource = 'salon' | 'whatsapp' | 'promo'
export type PaymentMethod = 'cash' | 'yape_plin' | 'transfer' | 'card'

export interface ProductOrder {
  id: string
  tenant_id: string
  inventory_item_id: string
  quantity: number
  unit_price: number
  client_name: string
  client_phone: string | null
  status: ProductOrderStatus
  payment_method: string | null
  source: ProductOrderSource
  notes: string | null
  created_at: string
  paid_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  inventory_items: { name: string } | { name: string }[] | null
}

export interface ProductOrderInput {
  inventory_item_id: string
  quantity: number
  unit_price: number
  client_name: string
  client_phone: string | null
  payment_method?: string | null
  source?: ProductOrderSource
  notes?: string | null
  status?: ProductOrderStatus
}
