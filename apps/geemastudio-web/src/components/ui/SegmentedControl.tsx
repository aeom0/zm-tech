'use client'

import type { ReactNode } from 'react'

/** Control segmentado (rango/periodo/vista): activo con el color del tenant, 44px en mobile. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  className = '',
}: {
  options: readonly { value: T; label: string; icon?: ReactNode }[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
  className?: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex overflow-hidden rounded-full border border-line-strong bg-card ${className}`}
    >
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex min-h-[44px] min-w-[44px] flex-1 cursor-pointer items-center justify-center gap-2 px-4 text-sm font-semibold transition-colors sm:flex-none md:min-h-[40px] ${
              active
                ? 'bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)]'
                : 'text-fg-muted hover:bg-fg/[0.06]'
            }`}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
