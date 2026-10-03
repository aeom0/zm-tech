'use client'

import { onColor } from '@/lib/tenant-theme'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'

import type { CategoriaRow } from '@/hooks/servicios/useCategorias'
import { CategoryIcon } from '@/components/CategoryIcon'
import { supabase } from '@/lib/supabase'

export function CategoriasTab({
  categorias,
  isLoading,
  errorMessage,
  onNew,
  onEdit,
  onDelete,
  deletingId,
}: {
  categorias: CategoriaRow[]
  isLoading: boolean
  errorMessage: string | null
  onNew: () => void
  onEdit: (cat: CategoriaRow) => void
  onDelete: (id: string) => void
  deletingId: string | null
}) {
  const [checkingId, setCheckingId] = useState<string | null>(null)

  const confirmDelete = async (cat: CategoriaRow) => {
    if (!supabase) {
      alert('Supabase no está configurado')
      return
    }

    setCheckingId(cat.id)
    try {
      const { count, error } = await supabase
        .from('services')
        .select('id', { count: 'exact', head: true })
        .eq('category_id', cat.id)

      if (error) {
        const ok = window.confirm(
          `¿Eliminar la categoría "${cat.name}"? (No pude validar servicios asociados)`
        )
        if (ok) onDelete(cat.id)
        return
      }

      if ((count ?? 0) > 0) {
        const ok = window.confirm(
          `Esta categoría tiene ${count} servicio(s). Si la borras, los servicios quedarán sin categoría o fallará por restricciones.\n\n¿Seguro que quieres eliminar "${cat.name}"?`
        )
        if (ok) onDelete(cat.id)
        return
      }

      const ok = window.confirm(`¿Eliminar la categoría "${cat.name}"?`)
      if (ok) onDelete(cat.id)
    } finally {
      setCheckingId(null)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg">Categorías</h2>
          <p className="text-sm text-fg-muted">
            Agrupa servicios para que el filtro quede ordenadito.
          </p>
        </div>
        <button
          type="button"
          onClick={onNew}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--tenant-primary)] px-4 py-2 text-sm font-semibold text-[var(--tenant-on-primary)] transition-colors hover:bg-[var(--tenant-primary-hover)]"
        >
          <Plus className="h-4 w-4" />
          Nueva
        </button>
      </div>

      {errorMessage && (
        <div className="rounded-2xl border border-red-200/40 bg-red-50/30 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-[92px] animate-pulse rounded-2xl border border-fg/[0.08] bg-surface"
            />
          ))}
        </div>
      ) : categorias.length === 0 ? (
        <div className="rounded-2xl border border-fg/[0.08] bg-surface p-8 text-center">
          <div className="text-sm font-semibold text-fg-soft">Aún no tienes categorías</div>
          <div className="mt-1 text-sm text-fg-subtle">
            Crea la primera para empezar a cargar servicios.
          </div>
          <button
            type="button"
            onClick={onNew}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--tenant-primary)] px-4 py-2 text-sm font-semibold text-[var(--tenant-on-primary)] transition-colors hover:bg-[var(--tenant-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            Nueva categoría
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {categorias.map((c) => {
            const busy = deletingId === c.id || checkingId === c.id || deletingId !== null
            return (
              <div key={c.id} className="rounded-2xl border border-fg/[0.08] bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-fg/[0.10]"
                      style={{ backgroundColor: c.color, color: onColor(c.color) }}
                      aria-hidden
                    >
                      <CategoryIcon name={c.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-fg">{c.name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => onEdit(c)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-fg/[0.08] bg-fg/[0.04] text-fg-soft transition-colors hover:bg-fg/[0.06] md:h-9 md:w-9"
                      aria-label={`Editar ${c.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void confirmDelete(c)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-700 transition-colors hover:bg-red-500/15 disabled:opacity-60 dark:text-red-300 md:h-9 md:w-9"
                      aria-label={`Eliminar ${c.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
