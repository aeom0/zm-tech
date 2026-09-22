'use client'

import type { GrowthRange } from '@/hooks/finanzas/executiveService'

export type FinanceView = 'resumen' | 'detalle'

function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: readonly { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  ariaLabel: string
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="flex overflow-hidden rounded-full border border-zinc-200 dark:border-zinc-700"
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
            className={`min-h-[44px] min-w-[44px] cursor-pointer px-4 py-2 text-sm font-semibold transition-colors ${
              active
                ? 'bg-[var(--primary)] text-white'
                : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-800'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function ViewToggle({
  view,
  onChange,
}: {
  view: FinanceView
  onChange: (v: FinanceView) => void
}) {
  return (
    <SegmentedControl
      ariaLabel="Vista de finanzas"
      value={view}
      onChange={onChange}
      options={[
        { value: 'resumen', label: 'Resumen' },
        { value: 'detalle', label: 'Detalle' },
      ]}
    />
  )
}

export function RangeToggle({
  range,
  onChange,
}: {
  range: GrowthRange
  onChange: (r: GrowthRange) => void
}) {
  return (
    <SegmentedControl
      ariaLabel="Rango de crecimiento"
      value={range}
      onChange={onChange}
      options={[
        { value: '6m', label: '6m' },
        { value: '12m', label: '12m' },
        { value: 'all', label: 'Todo' },
      ]}
    />
  )
}
