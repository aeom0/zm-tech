'use client'

import type { DateRange, PeriodKey } from '@/hooks/dashboard/useDashboardPeriod'
import { LUNARIS } from '@/lib/theme'

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
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const active = period === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onPeriodChange(t.key)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                active
                  ? 'text-white shadow-lg'
                  : 'border border-white/15 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'
              }`}
              style={
                active
                  ? {
                      background: LUNARIS.gradient.css,
                    }
                  : undefined
              }
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {period === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
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
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
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
              className="rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-white"
            />
          </label>
        </div>
      )}
    </div>
  )
}
