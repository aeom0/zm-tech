'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  createProducto,
  fetchProductos,
  unlistProducto,
  updateProducto,
  type Producto,
  type ProductoInput,
} from '@/app/panel/servicios/_services/productosService'

export const PRODUCTOS_KEY = ['productos'] as const

export function useProductos() {
  return useQuery({
    queryKey: PRODUCTOS_KEY,
    queryFn: fetchProductos,
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

export type { Producto, ProductoInput }
