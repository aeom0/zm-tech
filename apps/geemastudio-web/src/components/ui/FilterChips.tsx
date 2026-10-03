'use client'

import type { ReactNode } from 'react'

import { ScrollFadeRow } from '@/components/ui/ScrollFadeRow'

export interface FilterChipOption<T extends string> {
  id: T
  label: string
  /** Contador opcional a la derecha de la etiqueta. */
  count?: number
  /** Punto de color (por ejemplo, el color de una categoría). */
  color?: string
  icon?: ReactNode
}

/**
 * Chips de filtro unificados: 44px de alto en mobile, activo con color del tenant.
 * `scroll` los deja en una sola fila con scroll horizontal; por defecto hacen wrap
 * para que todas las opciones queden visibles.
 */
export function FilterChips<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  scroll = false,
  background = 'app',
  trailing,
}: {
  options: readonly FilterChipOption<T>[]
  value: T
  onChange: (id: T) => void
  ariaLabel: string
  scroll?: boolean
  background?: 'app' | 'surface'
  trailing?: ReactNode
}) {
  const chips = options.map((opt) => {
    const active = value === opt.id
    return (
      <button
        key={opt.id}
        type="button"
        aria-pressed={active}
        onClick={() => onChange(opt.id)}
        className={[
          'inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-4 text-sm font-medium transition-colors md:min-h-[36px]',
          active
            ? 'border-[var(--tenant-primary)] bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)]'
            : 'border-fg/[0.08] bg-card text-fg-soft hover:bg-fg/[0.06]',
        ].join(' ')}
      >
        {opt.color && (
          <span
            className="h-2.5 w-2.5 rounded-full border border-fg/[0.2]"
            style={{ backgroundColor: opt.color }}
            aria-hidden
          />
        )}
        {opt.icon}
        {opt.label}
        {opt.count !== undefined && (
          <span className={active ? 'opacity-80' : 'text-fg-subtle'}>{opt.count}</span>
        )}
      </button>
    )
  })

  if (scroll) {
    return (
      <ScrollFadeRow
        backgroundColor={`rgb(var(--${background}-rgb))`}
        className="flex items-center gap-2 pb-1"
      >
        {chips}
      </ScrollFadeRow>
    )
  }
  return (
    <div role="group" aria-label={ariaLabel} className="flex flex-wrap items-center gap-2">
      {chips}
      {trailing}
    </div>
  )
}
