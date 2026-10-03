'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { CATEGORY_ICON_LABELS, getCategoryIconGroups, getDefaultCategoryIcon } from '@zmtech/icons'

import { CategoryIcon } from '@/components/CategoryIcon'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { useServiciosIconSupport } from '@/hooks/servicios/useServicios'

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
    icon?: string | null
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
    icon?: string | null
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
  const [icon, setIcon] = useState<string | null>(initial?.icon ?? null)
  const { data: settings } = useTenantSettings()
  const { data: supportsIcons = false } = useServiciosIconSupport()
  const iconGroups = useMemo(
    () => getCategoryIconGroups(settings?.business_type),
    [settings?.business_type]
  )
  const inheritedIcon =
    categorias.find((c) => c.id === categoryId)?.icon ??
    getDefaultCategoryIcon(settings?.business_type)
  const currentIcon = icon ?? inheritedIcon

  const canSubmit = useMemo(() => {
    if (!name.trim()) return false
    if (!categoryId) return false
    if (!String(price).trim()) return false
    if (!Number.isFinite(duration) || duration <= 0) return false
    return true
  }, [name, categoryId, price, duration])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-scrim/70"
        aria-label="Cerrar"
        onClick={onClose}
      />

      <div className="relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-fg/[0.08] bg-surface pb-[env(safe-area-inset-bottom)] shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-fg/[0.08] px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-fg">{title}</div>
            <div className="mt-0.5 text-xs text-fg-subtle">
              Precio en $ (USD) para el panel web.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-fg/[0.08] bg-fg/[0.04] text-fg-soft transition-colors hover:bg-fg/[0.06] md:h-9 md:w-9"
            aria-label="Cerrar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg-soft">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-fg/[0.10] bg-elevated px-4 py-2.5 text-fg placeholder:text-fg-subtle focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
              placeholder="Ej. Manicure clásica"
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg-soft">Categoría</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl border border-fg/[0.10] bg-elevated px-4 py-2.5 text-fg focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
              >
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg-soft">Precio ($)</label>
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                inputMode="decimal"
                className="w-full rounded-xl border border-fg/[0.10] bg-elevated px-4 py-2.5 text-fg placeholder:text-fg-subtle focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
                placeholder="15,50"
              />
              <div className="mt-1 text-[11px] text-fg-subtle">
                Acepta coma: <span className="text-fg-muted">15,50</span> →{' '}
                <span className="text-fg-muted">15.50</span>
              </div>
            </div>
          </div>

          {supportsIcons && (
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="text-sm font-medium text-fg-soft">Ícono</label>
                {icon && (
                  <button
                    type="button"
                    onClick={() => setIcon(null)}
                    className="text-xs font-semibold text-tenant-text hover:underline"
                  >
                    Usar el de la categoría
                  </button>
                )}
              </div>
              <div className="max-h-44 space-y-3 overflow-y-auto pr-1">
                {[
                  { title: 'Sugeridos para tu negocio', keys: iconGroups.suggested },
                  { title: 'Otros', keys: iconGroups.others },
                ].map((group) =>
                  group.keys.length === 0 ? null : (
                    <div key={group.title}>
                      <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-fg-subtle">
                        {group.title}
                      </div>
                      <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
                        {group.keys.map((key) => {
                          const label = CATEGORY_ICON_LABELS[key]
                          const active = currentIcon === key
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => setIcon(key)}
                              title={label}
                              aria-label={label}
                              aria-pressed={active}
                              className={[
                                'flex h-10 items-center justify-center rounded-xl border transition-colors',
                                active
                                  ? 'bg-[var(--tenant-primary)]/15 border-[var(--tenant-primary)] text-fg'
                                  : 'border-fg/[0.10] bg-elevated text-fg-soft hover:bg-fg/[0.06]',
                              ].join(' ')}
                            >
                              <CategoryIcon name={key} className="h-5 w-5" />
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg-soft">
                Duración (min)
              </label>
              <input
                type="number"
                step={15}
                min={15}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value || '0', 10))}
                className="w-full rounded-xl border border-fg/[0.10] bg-elevated px-4 py-2.5 text-fg placeholder:text-fg-subtle focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-fg-soft">Activo</label>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={[
                  'w-full rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors',
                  isActive
                    ? 'border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/15 text-tenant-text'
                    : 'border-fg/[0.10] bg-fg/[0.03] text-fg-soft',
                ].join(' ')}
              >
                {isActive ? 'Activo' : 'Inactivo'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-fg/[0.08] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-fg/[0.10] bg-transparent px-4 py-2 text-sm font-semibold text-fg-soft transition-colors hover:bg-fg/[0.04]"
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
                ...(supportsIcons && { icon }),
              })
            }
            className="rounded-xl bg-[var(--tenant-primary)] px-4 py-2 text-sm font-semibold text-[var(--tenant-on-primary)] transition-colors hover:bg-[var(--tenant-primary-hover)] disabled:opacity-60"
          >
            {isSaving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
