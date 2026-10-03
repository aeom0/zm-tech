'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import { CategoryIcon } from '@/components/CategoryIcon'
import type { CategoriaRow } from '@/hooks/servicios/useCategorias'
import type { ServicioRow } from '@/hooks/servicios/useServicios'
import { useDeleteServicio, useServicios, useToggleServicio } from '@/hooks/servicios/useServicios'
import { ServiceToggle } from './ServiceToggle'
import { ScrollFadeRow } from '@/components/ui/ScrollFadeRow'

function fmtUsd(price: string) {
  const n = Number.parseFloat(String(price))
  if (!Number.isFinite(n)) return `$ ${price}`
  return `$ ${n.toFixed(2)}`
}

export function ServiciosTab({
  categorias,
  onNew,
  onEdit,
}: {
  categorias: CategoriaRow[]
  onNew: (defaults?: Partial<ServicioRow>) => void
  onEdit: (svc: ServicioRow) => void
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | undefined>(undefined)

  const serviciosQuery = useServicios(selectedCategoryId)
  const toggleMutation = useToggleServicio()
  const deleteMutation = useDeleteServicio()

  const categoriasById = useMemo(() => {
    const m = new Map<string, CategoriaRow>()
    categorias.forEach((c) => m.set(c.id, c))
    return m
  }, [categorias])

  const servicios = serviciosQuery.data ?? []
  const errorMessage = (serviciosQuery.error as { message?: string } | null)?.message ?? null

  const chips = useMemo(() => {
    return [
      {
        id: 'all',
        label: 'Todos',
        color: '#52525b',
      },
      ...categorias.map((c) => ({ id: c.id, label: c.name, color: c.color })),
    ]
  }, [categorias])

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-fg">Servicios</h2>
          <p className="text-sm text-fg-muted">
            Carga tu carta de servicios y prende/apaga sin drama.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onNew(selectedCategoryId ? { category_id: selectedCategoryId } : undefined)
          }
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--tenant-primary)] px-4 py-2 text-sm font-semibold text-[var(--tenant-on-primary)] transition-colors hover:bg-[var(--tenant-primary-hover)] disabled:opacity-60"
          disabled={categorias.length === 0}
          title={categorias.length === 0 ? 'Crea una categoría primero' : undefined}
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </button>
      </div>

      {categorias.length > 0 && (
        <ScrollFadeRow backgroundColor="rgb(var(--app-rgb))" className="flex gap-2 pb-1">
          {chips.map((ch) => {
            const isActive = ch.id === 'all' ? !selectedCategoryId : selectedCategoryId === ch.id
            return (
              <button
                key={ch.id}
                type="button"
                onClick={() => setSelectedCategoryId(ch.id === 'all' ? undefined : ch.id)}
                className={[
                  'inline-flex items-center gap-2 whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                  isActive
                    ? 'border-fg/[0.10] bg-fg/[0.06] text-fg'
                    : 'border-fg/[0.06] bg-transparent text-fg-soft hover:border-fg/[0.08] hover:bg-fg/[0.04]',
                ].join(' ')}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-fg/[0.12]"
                  style={{ backgroundColor: ch.color }}
                  aria-hidden
                />
                {ch.label}
              </button>
            )
          })}
        </ScrollFadeRow>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-200/40 bg-red-50/30 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {errorMessage}
        </div>
      )}

      {serviciosQuery.isLoading ? (
        <div className="overflow-hidden rounded-2xl border border-fg/[0.08] bg-surface">
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-fg/[0.04]" />
            ))}
          </div>
        </div>
      ) : categorias.length === 0 ? (
        <div className="rounded-2xl border border-fg/[0.08] bg-surface p-8 text-center">
          <div className="text-sm font-semibold text-fg-soft">Primero crea una categoría</div>
          <div className="mt-1 text-sm text-fg-subtle">
            Los servicios necesitan una categoría para quedar ordenados.
          </div>
        </div>
      ) : servicios.length === 0 ? (
        <div className="rounded-2xl border border-fg/[0.08] bg-surface p-8 text-center">
          <div className="text-sm font-semibold text-fg-soft">Sin servicios por aquí</div>
          <div className="mt-1 text-sm text-fg-subtle">Crea el primero y lo vemos en la lista.</div>
          <button
            type="button"
            onClick={() =>
              onNew(selectedCategoryId ? { category_id: selectedCategoryId } : undefined)
            }
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--tenant-primary)] px-4 py-2 text-sm font-semibold text-[var(--tenant-on-primary)] transition-colors hover:bg-[var(--tenant-primary-hover)]"
          >
            <Plus className="h-4 w-4" />
            Nuevo servicio
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-fg/[0.08] bg-surface md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-fg/[0.08]">
                  <th className="px-4 py-3 text-left font-semibold text-fg-muted">Servicio</th>
                  <th className="px-4 py-3 text-left font-semibold text-fg-muted">Categoría</th>
                  <th className="px-4 py-3 text-right font-semibold text-fg-muted">Precio</th>
                  <th className="px-4 py-3 text-right font-semibold text-fg-muted">Duración</th>
                  <th className="px-4 py-3 text-center font-semibold text-fg-muted">Activo</th>
                  <th className="px-4 py-3 text-right font-semibold text-fg-muted">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {servicios.map((s) => {
                  const cat = categoriasById.get(s.category_id)
                  const isBusy = toggleMutation.isPending || deleteMutation.isPending
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-fg/[0.06] transition-colors last:border-0 hover:bg-fg/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 font-semibold text-fg">
                          <CategoryIcon
                            name={s.icon ?? cat?.icon}
                            className="h-4 w-4 shrink-0 text-fg-muted"
                          />
                          {s.name}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {cat ? (
                          <span className="inline-flex items-center gap-2 text-fg-soft">
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-fg/[0.12]"
                              style={{ backgroundColor: cat.color }}
                              aria-hidden
                            />
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-fg-subtle">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-fg-soft">
                        {fmtUsd(s.price)}
                      </td>
                      <td className="px-4 py-3 text-right text-fg-muted">{s.duration} min</td>
                      <td className="px-4 py-3 text-center">
                        <ServiceToggle
                          checked={s.is_active}
                          disabled={isBusy}
                          onChange={(next) => toggleMutation.mutate({ id: s.id, is_active: next })}
                          label={`Servicio ${s.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(s)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-fg/[0.08] bg-fg/[0.04] text-fg-soft transition-colors hover:bg-fg/[0.06]"
                            aria-label={`Editar ${s.name}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={deleteMutation.isPending}
                            onClick={() => {
                              const ok = window.confirm(`¿Eliminar el servicio "${s.name}"?`)
                              if (ok) deleteMutation.mutate(s.id)
                            }}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-700 transition-colors hover:bg-red-500/15 disabled:opacity-60 dark:text-red-300"
                            aria-label={`Eliminar ${s.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {servicios.map((s) => {
              const cat = categoriasById.get(s.category_id)
              const isBusy = toggleMutation.isPending || deleteMutation.isPending
              return (
                <div key={s.id} className="rounded-2xl border border-fg/[0.08] bg-surface p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-fg">
                        <CategoryIcon
                          name={s.icon ?? cat?.icon}
                          className="h-4 w-4 shrink-0 text-fg-muted"
                        />
                        {s.name}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-fg-muted">
                        {cat ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full border border-fg/[0.12]"
                              style={{ backgroundColor: cat.color }}
                              aria-hidden
                            />
                            {cat.name}
                          </span>
                        ) : (
                          <span>Sin categoría</span>
                        )}
                        <span className="text-fg-subtle">•</span>
                        <span>{s.duration} min</span>
                        <span className="text-fg-subtle">•</span>
                        <span className="font-semibold text-fg-soft">{fmtUsd(s.price)}</span>
                      </div>
                    </div>

                    <ServiceToggle
                      checked={s.is_active}
                      disabled={isBusy}
                      onChange={(next) => toggleMutation.mutate({ id: s.id, is_active: next })}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(s)}
                      className="inline-flex items-center gap-2 rounded-xl border border-fg/[0.08] bg-fg/[0.04] px-3 py-2 text-sm font-semibold text-fg-soft transition-colors hover:bg-fg/[0.06]"
                    >
                      <Pencil className="h-4 w-4" />
                      Editar
                    </button>
                    <button
                      type="button"
                      disabled={deleteMutation.isPending}
                      onClick={() => {
                        const ok = window.confirm(`¿Eliminar el servicio "${s.name}"?`)
                        if (ok) deleteMutation.mutate(s.id)
                      }}
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-700 transition-colors hover:bg-red-500/15 disabled:opacity-60 dark:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}
