'use client'

import { ShoppingBag, Plus } from 'lucide-react'
import { useState } from 'react'

import { useProductos } from '@/hooks/servicios/useProductos'
import type { Producto } from '../../_services/productosService'
import { ProductoCard } from '../productos/ProductoCard'
import { ProductoFormModal } from '../productos/ProductoFormModal'

export function ProductosTab() {
  const { data: productos = [], isLoading } = useProductos()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)

  function handleEdit(producto: Producto) {
    setEditing(producto)
    setModalOpen(true)
  }

  function handleClose() {
    setModalOpen(false)
    setEditing(null)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">
          {productos.length} producto{productos.length !== 1 ? 's' : ''} en venta
        </p>
        <button
          type="button"
          onClick={() => {
            setEditing(null)
            setModalOpen(true)
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-[var(--tenant-primary)] px-3 py-1.5 text-sm text-white transition-colors hover:bg-[var(--tenant-primary-hover)]"
        >
          <Plus className="h-4 w-4" />
          Nuevo producto
        </button>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-white/30">Cargando...</div>
      ) : productos.length === 0 ? (
        <div className="py-12 text-center text-white/30">
          <ShoppingBag className="mx-auto mb-2 h-10 w-10 opacity-40" />
          <p className="text-sm">Todavía no hay productos en venta</p>
          <p className="mt-1 text-xs">Agrega el primero con foto, precio y stock</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {productos.map((producto) => (
            <ProductoCard key={producto.id} producto={producto} onEdit={handleEdit} />
          ))}
        </div>
      )}

      <ProductoFormModal open={modalOpen} producto={editing} onClose={handleClose} />
    </div>
  )
}
