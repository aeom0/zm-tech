'use client'

import { AlertTriangle, Pencil, PackageX } from 'lucide-react'
import { useState } from 'react'

import { useUnlistProducto } from '@/hooks/servicios/useProductos'
import type { Producto } from '../../_services/productosService'
import { SavingIndicator } from '../shared/SavingIndicator'

interface Props {
  producto: Producto
  onEdit: (producto: Producto) => void
}

export function ProductoCard({ producto, onEdit }: Props) {
  const unlist = useUnlistProducto()
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const lowStock = producto.quantity <= producto.min_stock

  async function handleUnlist() {
    if (!window.confirm(`Quitar "${producto.name}" del catálogo de venta? El insumo sigue en inventario.`))
      return
    setSavingState('saving')
    try {
      await unlist.mutateAsync(producto.id)
    } catch {
      setSavingState('error')
      setTimeout(() => setSavingState('idle'), 3000)
    }
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="aspect-square w-full bg-black/30">
        {producto.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element -- URL de Storage, tamaño variable
          <img src={producto.image_url} alt={producto.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-white/30">
            Sin imagen
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-medium text-white">{producto.name}</h3>
            {producto.description ? (
              <p className="mt-0.5 line-clamp-2 text-xs text-white/50">{producto.description}</p>
            ) : null}
            <p className="mt-1 text-sm font-semibold text-[var(--tenant-primary)]">
              {producto.price != null
                ? producto.price.toLocaleString('es-VE', { minimumFractionDigits: 2 })
                : 'Sin precio'}
            </p>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-white/30">
              <span>
                {producto.quantity} {producto.unit} en stock
              </span>
              {lowStock && (
                <span
                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
                  title={`Stock mínimo: ${producto.min_stock}`}
                >
                  <AlertTriangle className="h-3 w-3" />
                  Stock bajo
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <SavingIndicator state={savingState} />
            <button
              type="button"
              onClick={() => onEdit(producto)}
              className="p-1.5 text-white/40 transition-colors hover:text-white"
              aria-label="Editar producto"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleUnlist()}
              disabled={unlist.isPending}
              className="p-1.5 text-white/40 transition-colors hover:text-red-400 disabled:opacity-30"
              aria-label="Quitar del catálogo"
              title="Quitar del catálogo (no borra el insumo del inventario)"
            >
              <PackageX className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
