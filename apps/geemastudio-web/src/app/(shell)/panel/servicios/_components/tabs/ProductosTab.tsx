'use client'

import { ShoppingBag, Plus } from 'lucide-react'
import { useState } from 'react'

import { useProductos } from '@/hooks/servicios/useProductos'
import type { Producto } from '../../_services/productosService'
import { ProductoCard } from '../productos/ProductoCard'
import { ProductoFormModal } from '../productos/ProductoFormModal'
import { VentasTab } from './VentasTab'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { StateNote } from '@/components/ui/StateNote'

export function ProductosTab() {
  const { data: productos = [], isLoading } = useProductos()
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Producto | null>(null)
  const [view, setView] = useState<'catalogo' | 'ventas'>('catalogo')

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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          ariaLabel="Vista de productos"
          value={view}
          onChange={setView}
          options={[
            { value: 'catalogo', label: 'Catálogo' },
            { value: 'ventas', label: 'Ventas' },
          ]}
        />
        {view === 'catalogo' ? (
          <button
            type="button"
            onClick={() => {
              setEditing(null)
              setModalOpen(true)
            }}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--tenant-primary)] px-3 py-1.5 text-sm text-[var(--tenant-on-primary)] transition-colors hover:bg-[var(--tenant-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            Nuevo producto
          </button>
        ) : null}
      </div>

      {view === 'ventas' ? (
        <VentasTab />
      ) : isLoading ? (
        <StateNote kind="loading">Cargando…</StateNote>
      ) : productos.length === 0 ? (
        <div className="py-12 text-center text-fg/30">
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
