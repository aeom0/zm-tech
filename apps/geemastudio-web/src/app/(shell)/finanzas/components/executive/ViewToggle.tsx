'use client'

import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { GrowthRange } from '@/hooks/finanzas/executiveService'

export type FinanceView = 'resumen' | 'detalle'

export function ViewToggle({
  view,
  onChange,
  className,
}: {
  view: FinanceView
  onChange: (v: FinanceView) => void
  className?: string
}) {
  return (
    <SegmentedControl
      ariaLabel="Vista de finanzas"
      className={className}
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
