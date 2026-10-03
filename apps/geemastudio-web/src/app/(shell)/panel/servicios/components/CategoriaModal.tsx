'use client'

import { useMemo, useState } from 'react'
import { CATEGORY_ICON_LABELS, getCategoryIconGroups } from '@zmtech/icons'
import { X } from 'lucide-react'

import { CategoryIcon } from '@/components/CategoryIcon'

import type { CategoriaRow } from '@/hooks/servicios/useCategorias'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { DEFAULT_TENANT_PRIMARY } from '@/lib/tenant-theme'

export function CategoriaModal({
  open,
  initial,
  isSaving,
  onClose,
  onSave,
}: {
  open: boolean
  initial: CategoriaRow | null
  isSaving: boolean
  onClose: () => void
  onSave: (payload: { id?: string; name: string; color: string; icon?: string | null }) => void
}) {
  if (!open) return null

  // Remount al abrir/cambiar fila → estado inicial sin effect
  return (
    <CategoriaModalForm
      key={initial?.id ?? 'new'}
      initial={initial}
      isSaving={isSaving}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

function CategoriaModalForm({
  initial,
  isSaving,
  onClose,
  onSave,
}: {
  initial: CategoriaRow | null
  isSaving: boolean
  onClose: () => void
  onSave: (payload: { id?: string; name: string; color: string; icon?: string | null }) => void
}) {
  const title = initial ? 'Editar categoría' : 'Nueva categoría'

  const [name, setName] = useState(initial?.name ?? '')
  const { data: settings } = useTenantSettings()
  const [color, setColor] = useState(
    initial?.color ?? settings?.primary_color ?? DEFAULT_TENANT_PRIMARY
  )
  const [icon, setIcon] = useState(initial?.icon ?? '')
  const iconGroups = useMemo(
    () => getCategoryIconGroups(settings?.business_type),
    [settings?.business_type]
  )

  const canSubmit = useMemo(() => name.trim().length > 0 && !!color, [name, color])

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
              Orden y nombre se reflejan en el selector de servicios.
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
              placeholder="Ej. Uñas"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg-soft">Color</label>
            <div className="flex items-center gap-3">
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                type="color"
                className="h-11 w-14 rounded-xl border border-fg/[0.10] bg-elevated p-1"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 rounded-xl border border-fg/[0.10] bg-elevated px-4 py-2.5 text-fg placeholder:text-fg-subtle focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
                placeholder="var(--tenant-primary)"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-fg-soft">
              Icono (opcional)
            </label>
            <div className="max-h-56 space-y-3 overflow-y-auto pr-1">
              <button
                type="button"
                onClick={() => setIcon('')}
                aria-pressed={!icon}
                className={[
                  'rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors',
                  !icon
                    ? 'bg-[var(--tenant-primary)]/15 border-[var(--tenant-primary)] text-fg'
                    : 'border-fg/[0.10] bg-elevated text-fg-muted hover:bg-fg/[0.06]',
                ].join(' ')}
              >
                Sin ícono
              </button>
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
                        const active = icon === key
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
                color: color.trim(),
                icon: icon.trim() ? icon.trim() : null,
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
