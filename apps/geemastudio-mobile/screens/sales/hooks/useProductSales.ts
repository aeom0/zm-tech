import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'

import type { PaymentMethod, ProductOrder, SellableProduct } from '../types'

export const PRODUCT_SALES_KEYS = {
  products: ['sales_products'] as const,
  orders: ['sales_orders'] as const,
}

async function fetchProducts(tenantId: string): Promise<SellableProduct[]> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, price, quantity, unit')
    .eq('tenant_id', tenantId)
    .eq('is_sellable', true)
    .order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    price: row.price == null ? null : Number(row.price),
    quantity: Number(row.quantity) || 0,
    unit: row.unit,
  }))
}

async function fetchOrders(tenantId: string): Promise<ProductOrder[]> {
  const { data, error } = await supabase
    .from('product_orders')
    .select(
      'id, inventory_item_id, quantity, unit_price, client_name, client_phone, status, payment_method, notes, created_at, paid_at, delivered_at, cancelled_at, inventory_items(name)'
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    unit_price: Number(row.unit_price),
  })) as ProductOrder[]
}

export function useProductSales() {
  const { tenantId, isLoading: isTenantLoading } = useProfileTenantId()
  const queryClient = useQueryClient()
  const enabled = !isTenantLoading && !!tenantId

  const productsQuery = useQuery({
    queryKey: [...PRODUCT_SALES_KEYS.products, tenantId],
    enabled,
    queryFn: () => fetchProducts(tenantId!),
  })

  const ordersQuery = useQuery({
    queryKey: [...PRODUCT_SALES_KEYS.orders, tenantId],
    enabled,
    queryFn: () => fetchOrders(tenantId!),
  })

  const invalidateSales = () => {
    void queryClient.invalidateQueries({ queryKey: PRODUCT_SALES_KEYS.products })
    void queryClient.invalidateQueries({ queryKey: PRODUCT_SALES_KEYS.orders })
    void queryClient.invalidateQueries({ queryKey: ['inventory_items'] })
    void queryClient.invalidateQueries({ queryKey: ['inventory_movements'] })
  }

  const createOrderMutation = useMutation({
    mutationFn: async (input: {
      inventory_item_id: string
      quantity: number
      unit_price: number
      client_name: string
      client_phone: string | null
      notes: string | null
    }) => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      const product = productsQuery.data?.find((item) => item.id === input.inventory_item_id)
      if (!product) throw new Error('Producto no encontrado.')
      const { error } = await supabase.from('product_orders').insert({
        tenant_id: tenantId,
        ...input,
        source: 'salon',
        status: product.quantity >= input.quantity ? 'reserved' : 'pedido',
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: invalidateSales,
  })

  const payOrderMutation = useMutation({
    mutationFn: async ({ orderId, method }: { orderId: string; method: PaymentMethod }) => {
      const { data, error } = await supabase.rpc('mark_product_order_paid', {
        p_order_id: orderId,
        p_method: method,
        p_notes: null,
      })
      if (error) throw new Error(error.message)
      return String(data)
    },
    onSuccess: invalidateSales,
  })

  const updateOrderMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string
      status: 'delivered' | 'cancelled'
    }) => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      const field = status === 'delivered' ? 'delivered_at' : 'cancelled_at'
      const { error } = await supabase
        .from('product_orders')
        .update({ status, [field]: new Date().toISOString() })
        .eq('id', orderId)
        .eq('tenant_id', tenantId)
        .in('status', status === 'delivered' ? ['paid'] : ['reserved', 'pedido'])
      if (error) throw new Error(error.message)
    },
    onSuccess: invalidateSales,
  })

  return {
    productsQuery,
    ordersQuery,
    createOrderMutation,
    payOrderMutation,
    updateOrderMutation,
  }
}
