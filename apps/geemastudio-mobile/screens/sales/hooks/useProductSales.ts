import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchProductOrders, fetchSellableProducts } from '@geemastudio/data'

import { supabase } from '@/lib/supabase'
import { useProfileTenantId } from '@/screens/finances/hooks/useProfileTenantId'

import type { PaymentMethod, ProductOrder, ProductForm, SellableProduct } from '../types'

export const PRODUCT_SALES_KEYS = {
  products: ['sales_products'] as const,
  orders: ['sales_orders'] as const,
}

async function fetchProducts(tenantId: string): Promise<SellableProduct[]> {
  const products = await fetchSellableProducts(supabase, tenantId)
  return products.map((row) => ({
    id: row.id,
    name: row.name,
    price: row.price,
    quantity: row.quantity,
    unit: row.unit,
  }))
}

async function fetchOrders(tenantId: string): Promise<ProductOrder[]> {
  const orders = await fetchProductOrders(supabase, tenantId)
  return orders as unknown as ProductOrder[]
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

  const createProductMutation = useMutation({
    mutationFn: async (form: ProductForm) => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      const price = Number.parseFloat(form.price)
      const quantity = Number.parseInt(form.quantity, 10)
      if (!form.name.trim()) throw new Error('Ingresa el nombre del producto.')
      if (!Number.isFinite(price) || price <= 0) throw new Error('Ingresa un precio válido.')
      if (!Number.isInteger(quantity) || quantity < 0) {
        throw new Error('Ingresa un stock válido.')
      }
      const { error } = await supabase.from('inventory_items').insert({
        tenant_id: tenantId,
        name: form.name.trim(),
        type: 'countable',
        category: 'insumos',
        quantity,
        min_stock: 0,
        unit: form.unit.trim() || 'unidad',
        price: price.toFixed(2),
        is_sellable: true,
      })
      if (error) throw new Error(error.message)
    },
    onSuccess: invalidateSales,
  })

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, form }: { id: string; form: ProductForm }) => {
      if (!tenantId) throw new Error('No se pudo identificar el negocio.')
      const price = Number.parseFloat(form.price)
      const quantity = Number.parseInt(form.quantity, 10)
      if (!form.name.trim()) throw new Error('Ingresa el nombre del producto.')
      if (!Number.isFinite(price) || price <= 0) throw new Error('Ingresa un precio válido.')
      if (!Number.isInteger(quantity) || quantity < 0) {
        throw new Error('Ingresa un stock válido.')
      }
      const { error } = await supabase
        .from('inventory_items')
        .update({
          name: form.name.trim(),
          price: price.toFixed(2),
          quantity,
          unit: form.unit.trim() || 'unidad',
          is_sellable: true,
        })
        .eq('id', id)
        .eq('tenant_id', tenantId)
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
    createProductMutation,
    updateProductMutation,
    payOrderMutation,
    updateOrderMutation,
  }
}
