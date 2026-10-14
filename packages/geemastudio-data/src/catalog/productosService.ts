import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  PaymentMethod,
  Producto,
  ProductoInput,
  ProductOrder,
  ProductOrderInput,
  ProductOrderStatus,
} from './types'

const PRODUCTO_SELECT =
  'id, name, description, price, quantity, min_stock, unit, category, image_url, is_sellable'

const ORDER_SELECT =
  'id, tenant_id, inventory_item_id, quantity, unit_price, client_name, client_phone, status, payment_method, source, notes, created_at, paid_at, delivered_at, cancelled_at, inventory_items(name)'

function normalizeProducto(row: Record<string, unknown>): Producto {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    description: row.description != null ? String(row.description) : null,
    price: row.price != null ? Number(row.price) : null,
    quantity: Number(row.quantity) || 0,
    min_stock: Number(row.min_stock) || 0,
    unit: String(row.unit ?? 'unidad'),
    category: row.category != null ? String(row.category) : null,
    image_url: row.image_url != null ? String(row.image_url) : null,
    is_sellable: Boolean(row.is_sellable),
  }
}

export async function fetchSellableProducts(
  client: SupabaseClient,
  tenantId?: string | null
): Promise<Producto[]> {
  let query = client
    .from('inventory_items')
    .select(PRODUCTO_SELECT)
    .eq('is_sellable', true)
    .order('name')
  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => normalizeProducto(row as Record<string, unknown>))
}

export async function fetchProductOrders(
  client: SupabaseClient,
  tenantId?: string | null
): Promise<ProductOrder[]> {
  let query = client
    .from('product_orders')
    .select(ORDER_SELECT)
    .order('created_at', { ascending: false })
    .limit(100)
  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
  })) as ProductOrder[]
}

export async function createProduct(
  client: SupabaseClient,
  input: ProductoInput,
  tenantId?: string | null
): Promise<Producto> {
  const payload: Record<string, unknown> = {
    name: input.name.trim(),
    description: input.description?.trim() || null,
    price: input.price,
    quantity: input.quantity,
    min_stock: input.min_stock,
    unit: input.unit.trim() || 'unidad',
    category: input.category?.trim() || null,
    image_url: input.image_url || null,
    is_sellable: input.is_sellable !== undefined ? input.is_sellable : true,
  }
  if (tenantId) {
    payload.tenant_id = tenantId
  }

  const { data, error } = await client
    .from('inventory_items')
    .insert(payload)
    .select(PRODUCTO_SELECT)
    .single()
  if (error) throw new Error(error.message)
  return normalizeProducto(data as Record<string, unknown>)
}

export async function updateProduct(
  client: SupabaseClient,
  id: string,
  input: Partial<ProductoInput>,
  tenantId?: string | null
): Promise<Producto> {
  const patch: Record<string, unknown> = {}
  if (input.name !== undefined) patch.name = input.name.trim()
  if (input.description !== undefined) patch.description = input.description?.trim() || null
  if (input.price !== undefined) patch.price = input.price
  if (input.quantity !== undefined) patch.quantity = input.quantity
  if (input.min_stock !== undefined) patch.min_stock = input.min_stock
  if (input.unit !== undefined) patch.unit = input.unit.trim() || 'unidad'
  if (input.category !== undefined) patch.category = input.category?.trim() || null
  if (input.image_url !== undefined) patch.image_url = input.image_url || null
  if (input.is_sellable !== undefined) patch.is_sellable = input.is_sellable

  let query = client.from('inventory_items').update(patch).eq('id', id)
  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }
  const { data, error } = await query.select(PRODUCTO_SELECT).single()
  if (error) throw new Error(error.message)
  return normalizeProducto(data as Record<string, unknown>)
}

export async function createProductOrder(
  client: SupabaseClient,
  input: ProductOrderInput,
  tenantId: string
): Promise<void> {
  if (!tenantId) throw new Error('No se pudo resolver el negocio')
  const payload: Record<string, unknown> = {
    tenant_id: tenantId,
    inventory_item_id: input.inventory_item_id,
    quantity: input.quantity,
    unit_price: input.unit_price,
    client_name: input.client_name.trim(),
    client_phone: input.client_phone?.trim() || null,
    payment_method: input.payment_method || null,
    source: input.source || 'salon',
    notes: input.notes?.trim() || null,
    status: input.status || 'reserved',
    paid_at: input.status === 'paid' ? new Date().toISOString() : null,
  }

  const { error } = await client.from('product_orders').insert(payload)
  if (error) throw new Error(error.message)
}

export async function updateProductOrderStatus(
  client: SupabaseClient,
  id: string,
  status: ProductOrderStatus,
  paymentMethod?: PaymentMethod | string | null
): Promise<void> {
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { status }

  if (status === 'paid') {
    patch.paid_at = now
    if (paymentMethod) patch.payment_method = paymentMethod
  } else if (status === 'delivered') {
    patch.delivered_at = now
  } else if (status === 'cancelled') {
    patch.cancelled_at = now
  }

  const { error } = await client.from('product_orders').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function unlistProducto(
  client: SupabaseClient,
  id: string,
  tenantId?: string | null
): Promise<void> {
  let query = client.from('inventory_items').update({ is_sellable: false }).eq('id', id)
  if (tenantId) {
    query = query.eq('tenant_id', tenantId)
  }
  const { error } = await query
  if (error) throw new Error(error.message)
}

export async function markProductOrderPaid(
  client: SupabaseClient,
  orderId: string,
  method: PaymentMethod | string,
  notes?: string | null
): Promise<string> {
  const { data, error } = await client.rpc('mark_product_order_paid', {
    p_order_id: orderId,
    p_method: method,
    p_notes: notes || null,
  })
  if (error) throw new Error(error.message)
  return String(data)
}

export const fetchProductos = fetchSellableProducts
export const createProducto = createProduct
export const updateProducto = updateProduct
