'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'

import type { CategoriaRow } from '@/hooks/servicios/useCategorias'
import type { ServicioRow } from '@/hooks/servicios/useServicios'

export function ServicioModal({
  open,
  categorias,
  initial,
  defaultCategoryId,
  isSaving,
  onClose,
  onSave,
}: {
  open: boolean
  categorias: CategoriaRow[]
  initial: ServicioRow | null
  defaultCategoryId?: string
  isSaving: boolean
  onClose: () => void
  onSave: (payload: {
    id?: string
    name: string
    category_id: string
    price: string
    duration: number
    is_active: boolean
  }) => void
}) {
  if (!open) return null

  return (
    <ServicioModalForm
      key={initial?.id ?? `new-${defaultCategoryId ?? 'none'}`}
      categorias={categorias}
      initial={initial}
      defaultCategoryId={defaultCategoryId}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

function ServicioModalForm({
  categorias,
  initial,
  defaultCategoryId,
  isSaving,
  onClose,
  onSave,
}: {
  categorias: CategoriaRow[]
  initial: ServicioRow | null
  defaultCategoryId?: string
  isSaving: boolean
  onClose: () => void
  onSave: (payload: {
    id?: string
    name: string
    category_id: string
    price: string
    duration: number
    is_active: boolean
  }) => void
}) {
  const title = initial ? 'Editar servicio' : 'Nuevo servicio'

  const [name, setName] = useState(initial?.name ?? '')
  const [categoryId, setCategoryId] = useState(
    initial?.category_id ?? defaultCategoryId ?? categorias[0]?.id ?? ''
  )
  const [price, setPrice] = useState(initial?.price ?? '')
  const [duration, setDuration] = useState(initial?.duration ?? 60)
  const [isActive, setIsActive] = useState(initial?.is_active ?? true)

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false
    if (!categoryId) return false
    if (!String(price).trim()) return false
    if (!Number.isFinite(duration) || duration <= 0) return false
    return true
  }, [name, categoryId, price, duration])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/70"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-2xl border border-white/[0.08] bg-zinc-900 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-white">{title}</div>
            <div className="mt-0.5 text-xs text-zinc-500">Precio en $ (USD) para el panel web.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-300 transition-colors hover:bg-white/[0.06]"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-white/[0.10] bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#40E0D0]"
              placeholder="Ej. Manicure clásica"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-white/[0.10] bg-zinc-800 px-4 py-2.5 text-white focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#40E0D0]"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Precio ($)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-white/[0.10] bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#40E0D0]"
                placeholder="15,50"
              />
              <div className="mt-1 text-[11px] text-zinc-500">
                Acepta coma: <span className="text-zinc-400">15,50</span> →{' '}
                <span className="text-zinc-400">15.50</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                Duración (min)
              </label>
              <input
                type="number"
                step={15}
                min={15}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value || '0', 10))}
                className="w-full rounded-xl border border-white/[0.10] bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#40E0D0]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Activo</label>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={[
                  'w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'border-[#40E0D0]/30 bg-[#40E0D0]/15 text-[#40E0D0]'
                    : 'border-white/[0.10] bg-white/[0.03] text-zinc-300',
                ].join(' ')}
              >
                {isActive ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/[0.08] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/[0.10] bg-transparent px-4 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.04]"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!canSubmit || isSaving}
            onClick={() =>
              onSave({
                id: initial?.id,
                name: name.trim(),
                category_id: categoryId,
                price: String(price),
                duration,
                is_active: isActive,
              })
            }
            className="rounded-xl bg-[#40E0D0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00897B] disabled:opacity-60"
          >
            {isSaving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
