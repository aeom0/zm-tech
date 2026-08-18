'use client'

import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'

import type { CategoriaRow } from '@/hooks/servicios/useCategorias'
import type { ServicioRow } from '@/hooks/servicios/useServicios'
import { useDeleteServicio, useServicios, useToggleServicio } from '@/hooks/servicios/useServicios'
import { ServiceToggle } from './ServiceToggle'

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
          <h2 className="text-base font-semibold text-white">Servicios</h2>
          <p className="text-sm text-zinc-400">
            Carga tu carta de servicios y prende/apaga sin drama.
          </p>
        </div>
        <button
          type="button"
          onClick={() =>
            onNew(selectedCategoryId ? { category_id: selectedCategoryId } : undefined)
          }
          className="inline-flex items-center gap-2 rounded-xl bg-[#40E0D0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00897B] disabled:opacity-60"
          disabled={categorias.length === 0}
          title={categorias.length === 0 ? 'Crea una categoría primero' : undefined}
        >
          <Plus className="h-4 w-4" />
          Nuevo
        </button>
      </div>

      {categorias.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
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
                    ? 'border-white/[0.10] bg-white/[0.06] text-white'
                    : 'border-white/[0.06] bg-transparent text-zinc-300 hover:border-white/[0.08] hover:bg-white/[0.04]',
                ].join(' ')}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-white/[0.12]"
                  style={{ backgroundColor: ch.color }}
                  aria-hidden
                />
                {ch.label}
              </button>
            )
          })}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-900/40 bg-red-950/30 px-4 py-3 text-sm text-red-300">
          {errorMessage}
        </div>
      )}

      {serviciosQuery.isLoading ? (
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900">
          <div className="space-y-3 p-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-white/[0.04]" />
            ))}
          </div>
        </div>
      ) : categorias.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-8 text-center">
          <div className="text-sm font-semibold text-zinc-300">Primero crea una categoría</div>
          <div className="mt-1 text-sm text-zinc-500">
            Los servicios necesitan una categoría para quedar ordenados.
          </div>
        </div>
      ) : servicios.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-8 text-center">
          <div className="text-sm font-semibold text-zinc-300">Sin servicios por aquí</div>
          <div className="mt-1 text-sm text-zinc-500">Crea el primero y lo vemos en la lista.</div>
          <button
            type="button"
            onClick={() =>
              onNew(selectedCategoryId ? { category_id: selectedCategoryId } : undefined)
            }
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#40E0D0] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#00897B]"
          >
            <Plus className="h-4 w-4" />
            Nuevo servicio
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900 md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.08]">
                  <th className="px-4 py-3 text-left font-semibold text-zinc-400">Servicio</th>
                  <th className="px-4 py-3 text-left font-semibold text-zinc-400">Categoría</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-400">Precio</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-400">Duración</th>
                  <th className="px-4 py-3 text-center font-semibold text-zinc-400">Activo</th>
                  <th className="px-4 py-3 text-right font-semibold text-zinc-400">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {servicios.map((s) => {
                  const cat = categoriasById.get(s.category_id)
                  const isBusy = toggleMutation.isPending || deleteMutation.isPending
                  return (
                    <tr
                      key={s.id}
                      className="border-b border-white/[0.06] transition-colors last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white">{s.name}</div>
                      </td>
                      <td className="px-4 py-3">
                        {cat ? (
                          <span className="inline-flex items-center gap-2 text-zinc-300">
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-white/[0.12]"
                              style={{ backgroundColor: cat.color }}
                              aria-hidden
                            />
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-zinc-200">
                        {fmtUsd(s.price)}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-400">{s.duration} min</td>
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
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-200 transition-colors hover:bg-white/[0.06]"
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
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-60"
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
                <div key={s.id} className="rounded-2xl border border-white/[0.08] bg-zinc-900 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white">{s.name}</div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                        {cat ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className="h-2 w-2 rounded-full border border-white/[0.12]"
                              style={{ backgroundColor: cat.color }}
                              aria-hidden
                            />
                            {cat.name}
                          </span>
                        ) : (
                          <span>Sin categoría</span>
                        )}
                        <span className="text-zinc-600">•</span>
                        <span>{s.duration} min</span>
                        <span className="text-zinc-600">•</span>
                        <span className="font-semibold text-zinc-200">{fmtUsd(s.price)}</span>
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
                      className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06]"
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
                      className="inline-flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/15 disabled:opacity-60"
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
