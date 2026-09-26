import { supabase } from '@/lib/supabase'

export type Producto = {
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

export type ProductoInput = {
  name: string
  description: string | null
  price: number | null
  quantity: number
  min_stock: number
  unit: string
  category: string | null
  image_url: string | null
}

export type ProductOrderStatus = 'reserved' | 'pedido' | 'paid' | 'delivered' | 'cancelled'
export type ProductOrderSource = 'salon' | 'whatsapp' | 'promo'
export type PaymentMethod = 'cash' | 'yape_plin' | 'transfer' | 'card'

export type ProductOrder = {
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

const SELECT =
  'id, name, description, price, quantity, min_stock, unit, category, image_url, is_sellable'
const ORDER_SELECT =
  'id, tenant_id, inventory_item_id, quantity, unit_price, client_name, client_phone, status, payment_method, source, notes, created_at, paid_at, delivered_at, cancelled_at, inventory_items(name)'

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local'
    )
  }
  return supabase
}

async function notifyRetailAdmins(tenantId: string, title: string, body: string): Promise<void> {
  const sb = requireSupabase()
  const { data: admins, error: adminError } = await sb
    .from('profiles')
    .select('id')
    .in('role', ['owner', 'dev'])
    .eq('tenant_id', tenantId)
  if (adminError || !admins?.length) return

  const { error } = await sb.functions.invoke('send-notification', {
    body: {
      user_ids: admins.map((admin) => admin.id),
      title,
      body,
      data: { type: 'retail', url: '/panel/servicios?tab=productos' },
    },
  })
  if (error) console.warn('[productos] push retail:', error.message)
}

function normalize(row: Record<string, unknown>): Producto {
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

/** Productos = inventory_items marcados como vendibles al cliente final. */
export async function fetchProductos(tenantId: string): Promise<Producto[]> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('inventory_items')
    .select(SELECT)
    .eq('tenant_id', tenantId)
    .eq('is_sellable', true)
    .order('name')
  if (error) throw error
  return (data ?? []).map((row) => normalize(row as Record<string, unknown>))
}

export async function createProducto(tenantId: string, input: ProductoInput): Promise<Producto> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('inventory_items')
    .insert({
      tenant_id: tenantId,
      name: input.name.trim(),
      description: input.description?.trim() || null,
      price: input.price,
      quantity: input.quantity,
      min_stock: input.min_stock,
      unit: input.unit.trim() || 'unidad',
      category: input.category?.trim() || null,
      image_url: input.image_url,
      is_sellable: true,
    })
    .select(SELECT)
    .single()
  if (error) throw error
  return normalize(data as Record<string, unknown>)
}

export async function updateProducto(
  tenantId: string,
  id: string,
  input: Partial<ProductoInput>
): Promise<Producto> {
  const sb = requireSupabase()
  const payload: Record<string, unknown> = {}
  if (input.name != null) payload.name = input.name.trim()
  if (input.description !== undefined) payload.description = input.description?.trim() || null
  if (input.price !== undefined) payload.price = input.price
  if (input.quantity != null) payload.quantity = input.quantity
  if (input.min_stock != null) payload.min_stock = input.min_stock
  if (input.unit != null) payload.unit = input.unit.trim() || 'unidad'
  if (input.category !== undefined) payload.category = input.category?.trim() || null
  if (input.image_url !== undefined) payload.image_url = input.image_url

  const { data, error } = await sb
    .from('inventory_items')
    .update(payload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select(SELECT)
    .single()
  if (error) throw error
  return normalize(data as Record<string, unknown>)
}

/** No se borra el insumo: se deja de ofrecer a clientes (is_sellable=false). */
export async function unlistProducto(tenantId: string, id: string): Promise<void> {
  const sb = requireSupabase()
  const { error } = await sb
    .from('inventory_items')
    .update({ is_sellable: false })
    .eq('id', id)
    .eq('tenant_id', tenantId)
  if (error) throw error
}

export async function fetchProductOrders(tenantId: string): Promise<ProductOrder[]> {
  const sb = requireSupabase()
  const { data, error } = await sb
    .from('product_orders')
    .select(ORDER_SELECT)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw error
  return (data ?? []) as ProductOrder[]
}

export async function createProductOrder(
  tenantId: string,
  input: {
    inventory_item_id: string
    quantity: number
    unit_price: number
    client_name: string
    client_phone: string
    source: ProductOrderSource
    notes: string
  }
): Promise<void> {
  const sb = requireSupabase()
  const { data: item, error: itemError } = await sb
    .from('inventory_items')
    .select('quantity')
    .eq('id', input.inventory_item_id)
    .eq('tenant_id', tenantId)
    .maybeSingle()
  if (itemError) throw itemError
  if (!item) throw new Error('Producto no encontrado')

  const { error } = await sb.from('product_orders').insert({
    tenant_id: tenantId,
    inventory_item_id: input.inventory_item_id,
    quantity: input.quantity,
    unit_price: input.unit_price.toFixed(2),
    client_name: input.client_name.trim(),
    client_phone: input.client_phone.trim() || null,
    source: input.source,
    notes: input.notes.trim() || null,
    status: Number(item.quantity) >= input.quantity ? 'reserved' : 'pedido',
  })
  if (error) throw error
  await notifyRetailAdmins(
    tenantId,
    `Nuevo apartado · ${input.client_name.trim() || 'Clienta'}`,
    `${input.quantity} unidad(es) · panel Productos`
  )
}

export async function markProductOrderPaid(
  tenantId: string,
  orderId: string,
  method: PaymentMethod
): Promise<string> {
  const sb = requireSupabase()
  const { data, error } = await sb.rpc('mark_product_order_paid', {
    p_order_id: orderId,
    p_method: method,
    p_notes: null,
  })
  if (error) throw error
  await notifyRetailAdmins(tenantId, 'Venta retail pagada', 'Se registró un pago en Productos.')
  return String(data)
}

export async function updateProductOrderStatus(
  tenantId: string,
  orderId: string,
  status: 'delivered' | 'cancelled'
): Promise<void> {
  const sb = requireSupabase()
  const timestamp = new Date().toISOString()
  const payload =
    status === 'delivered'
      ? { status, delivered_at: timestamp }
      : { status, cancelled_at: timestamp }
  const { error } = await sb
    .from('product_orders')
    .update(payload)
    .eq('id', orderId)
    .eq('tenant_id', tenantId)
    .in('status', status === 'delivered' ? ['paid'] : ['reserved', 'pedido'])
  if (error) throw error
}
