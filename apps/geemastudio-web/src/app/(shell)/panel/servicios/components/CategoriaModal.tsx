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
            <div className="mt-0.5 text-xs text-zinc-500">
              Orden y nombre se reflejan en el selector de servicios.
            </div>
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
              className="w-full rounded-xl border border-white/[0.10] bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
              placeholder="Ej. Uñas"
              autoFocus
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Color</label>
            <div className="flex items-center gap-3">
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                type="color"
                className="h-11 w-14 rounded-xl border border-white/[0.10] bg-zinc-800 p-1"
              />
              <input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 rounded-xl border border-white/[0.10] bg-zinc-800 px-4 py-2.5 text-white placeholder:text-zinc-500 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]"
                placeholder="var(--tenant-primary)"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">
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
                    ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/15 text-white'
                    : 'border-white/[0.10] bg-zinc-800 text-zinc-400 hover:bg-white/[0.06]',
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
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
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
                                ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)]/15 text-white'
                                : 'border-white/[0.10] bg-zinc-800 text-zinc-300 hover:bg-white/[0.06]',
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
                color: color.trim(),
                icon: icon.trim() ? icon.trim() : null,
              })
            }
            className="rounded-xl bg-[var(--tenant-primary)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--tenant-primary-hover)] disabled:opacity-60"
          >
            {isSaving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
