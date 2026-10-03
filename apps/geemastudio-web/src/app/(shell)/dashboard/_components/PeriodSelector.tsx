'use client'

import { SegmentedControl } from '@/components/ui/SegmentedControl'
import type { DateRange, PeriodKey } from '@/hooks/dashboard/useDashboardPeriod'

const TABS: { key: PeriodKey; label: string }[] = [
  { key: 'week', label: 'Semana' },
  { key: 'month', label: 'Mes' },
  { key: 'custom', label: 'Personalizado' },
]

interface PeriodSelectorProps {
  period: PeriodKey
  onPeriodChange: (p: PeriodKey) => void
  dateRange: DateRange
  customRange: DateRange | null
  onCustomRangeChange: (range: DateRange) => void
}

export function PeriodSelector({
  period,
  onPeriodChange,
  dateRange,
  customRange,
  onCustomRangeChange,
}: PeriodSelectorProps) {
  return (
    <div className="space-y-3">
      <SegmentedControl
        ariaLabel="Periodo"
        options={TABS.map((t) => ({ value: t.key, label: t.label }))}
        value={period}
        onChange={onPeriodChange}
      />

      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 dark:text-zinc-400">
          <label className="flex items-center gap-2">
            <span className="shrink-0">Desde</span>
            <input
              type="date"
              value={customRange?.from ?? dateRange.from}
              onChange={(e) =>
                onCustomRangeChange({
                  from: e.target.value,
                  to: customRange?.to ?? dateRange.to,
                })
              }
              className="min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
          <label className="flex items-center gap-2">
            <span className="shrink-0">Hasta</span>
            <input
              type="date"
              value={customRange?.to ?? dateRange.to}
              onChange={(e) =>
                onCustomRangeChange({
                  from: customRange?.from ?? dateRange.from,
                  to: e.target.value,
                })
              }
              className="min-h-[44px] rounded-lg border border-zinc-200 bg-white px-3 py-2 text-base text-zinc-900 md:min-h-0 md:text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
            />
          </label>
        </div>
      )}
    </div>
  )
}
