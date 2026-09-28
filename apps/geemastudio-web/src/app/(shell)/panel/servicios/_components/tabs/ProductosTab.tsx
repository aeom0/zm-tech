'use client'

import { ShoppingBag, Plus } from 'lucide-react'
import { useState } from 'react'

import { useProductos } from '@/hooks/servicios/useProductos'
import type { Producto } from '../../_services/productosService'
import { ProductoCard } from '../productos/ProductoCard'
import { ProductoFormModal } from '../productos/ProductoFormModal'
import { VentasTab } from './VentasTab'

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
        <div className="flex gap-2">
          <ViewButton active={view === 'catalogo'} onClick={() => setView('catalogo')}>
            Catálogo
          </ViewButton>
          <ViewButton active={view === 'ventas'} onClick={() => setView('ventas')}>
            Ventas
          </ViewButton>
        </div>
        {view === 'catalogo' ? (
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
        ) : null}
      </div>

      {view === 'ventas' ? (
        <VentasTab />
      ) : isLoading ? (
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

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors',
        active
          ? 'border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]'
          : 'border-white/[0.06] text-white/50 hover:bg-white/[0.04] hover:text-white',
      ].join(' ')}
    >
      {children}
    </button>
  )
}
