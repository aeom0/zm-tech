import { supabase } from '@/lib/supabase'
import {
  createProduct as createProductData,
  createProductOrder as createProductOrderData,
  fetchProductOrders as fetchProductOrdersData,
  fetchSellableProducts as fetchSellableProductsData,
  markProductOrderPaid as markProductOrderPaidData,
  unlistProducto as unlistProductoData,
  updateProduct as updateProductData,
  updateProductOrderStatus as updateProductOrderStatusData,
  type PaymentMethod,
  type Producto,
  type ProductoInput,
  type ProductOrder,
  type ProductOrderInput,
  type ProductOrderSource,
  type ProductOrderStatus,
} from '@geemastudio/data'

export type {
  Producto,
  ProductoInput,
  ProductOrderStatus,
  ProductOrderSource,
  PaymentMethod,
  ProductOrder,
  ProductOrderInput,
}

function requireSupabase() {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
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

/** Productos = inventory_items marcados como vendibles al cliente final. */
export async function fetchProductos(tenantId: string): Promise<Producto[]> {
  return fetchSellableProductsData(requireSupabase(), tenantId)
}

export async function createProducto(tenantId: string, input: ProductoInput): Promise<Producto> {
  return createProductData(requireSupabase(), input, tenantId)
}

export async function updateProducto(
  tenantId: string,
  id: string,
  input: Partial<ProductoInput>
): Promise<Producto> {
  return updateProductData(requireSupabase(), id, input, tenantId)
}

/** No se borra el insumo: se deja de ofrecer a clientes (is_sellable=false). */
export async function unlistProducto(tenantId: string, id: string): Promise<void> {
  return unlistProductoData(requireSupabase(), id, tenantId)
}

export async function fetchProductOrders(tenantId: string): Promise<ProductOrder[]> {
  return fetchProductOrdersData(requireSupabase(), tenantId)
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

  await createProductOrderData(
    sb,
    {
      ...input,
      status: Number(item.quantity) >= input.quantity ? 'reserved' : 'pedido',
    },
    tenantId
  )

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
  const result = await markProductOrderPaidData(requireSupabase(), orderId, method)
  await notifyRetailAdmins(tenantId, 'Venta retail pagada', 'Se registró un pago en Productos.')
  return result
}

export async function updateProductOrderStatus(
  tenantId: string,
  orderId: string,
  status: 'delivered' | 'cancelled'
): Promise<void> {
  return updateProductOrderStatusData(requireSupabase(), orderId, status)
}
