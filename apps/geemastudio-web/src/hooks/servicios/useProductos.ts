'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createProductOrder,
  createProducto,
  fetchProductos,
  fetchProductOrders,
  markProductOrderPaid,
  unlistProducto,
  updateProductOrderStatus,
  updateProducto,
  type PaymentMethod,
  type ProductOrder,
  type ProductOrderSource,
  type Producto,
  type ProductoInput,
} from '@/app/panel/servicios/_services/productosService'
import { useTenantId } from '../finanzas/useTenantId'

export const PRODUCTOS_KEY = ['productos'] as const

export function useProductos() {
  return useQuery({
    queryKey: PRODUCTOS_KEY,
    queryFn: fetchProductos,
  })
}

export function useProductOrders() {
  const { tenantId } = useTenantId()
  return useQuery({
    queryKey: ['product_orders', tenantId],
    enabled: !!tenantId,
    queryFn: () => fetchProductOrders(tenantId!),
  })
}

export function useCreateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: ProductoInput) => createProducto(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTOS_KEY }),
  })
}

export function useUpdateProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<ProductoInput> }) =>
      updateProducto(id, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTOS_KEY }),
  })
}

export function useUnlistProducto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => unlistProducto(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCTOS_KEY }),
  })
}

export function useCreateProductOrder() {
  const qc = useQueryClient()
  const { tenantId } = useTenantId()
  return useMutation({
    mutationFn: (input: {
      inventory_item_id: string
      quantity: number
      unit_price: number
      client_name: string
      client_phone: string
      source: ProductOrderSource
      notes: string
    }) => {
      if (!tenantId) throw new Error('No se pudo resolver el negocio activo')
      return createProductOrder(tenantId, input)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_orders', tenantId] }),
  })
}

export function useMarkProductOrderPaid() {
  const qc = useQueryClient()
  const { tenantId } = useTenantId()
  return useMutation({
    mutationFn: ({ orderId, method }: { orderId: string; method: PaymentMethod }) =>
      tenantId
        ? markProductOrderPaid(tenantId, orderId, method)
        : Promise.reject(new Error('No se pudo resolver el negocio activo')),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['product_orders', tenantId] }),
  })
}

export function useUpdateProductOrderStatus() {
  const qc = useQueryClient()
  const { tenantId } = useTenantId()
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: 'delivered' | 'cancelled' }) =>
      tenantId
        ? updateProductOrderStatus(tenantId, orderId, status)
        : Promise.reject(new Error('No se pudo resolver el negocio activo')),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['product_orders', tenantId] })
      void qc.invalidateQueries({ queryKey: PRODUCTOS_KEY })
    },
  })
}

export type { PaymentMethod, ProductOrder, ProductOrderSource, Producto, ProductoInput }
