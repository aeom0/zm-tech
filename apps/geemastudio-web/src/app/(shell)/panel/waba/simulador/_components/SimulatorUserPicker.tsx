'use client'

import type { SimulatorUser } from '../_hooks/useSimulatorChat'

const OPTIONS: { id: SimulatorUser; label: string; phone: string }[] = [
  { id: 'alberto', label: 'Alberto', phone: '51988800001' },
  { id: 'vanessa', label: 'Vanessa', phone: '51988800002' },
]

export function SimulatorUserPicker({
  user,
  disabled,
  onSelect,
}: {
  user: SimulatorUser | null
  disabled?: boolean
  onSelect: (user: SimulatorUser) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-fg-subtle">Probar como</span>
      <div
        className="inline-flex rounded-xl border border-fg/[0.08] bg-fg/[0.03] p-0.5"
        role="group"
        aria-label="Usuario del simulador"
      >
        {OPTIONS.map((opt) => {
          const active = user === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(opt.id)}
              className={[
                'min-h-10 rounded-[10px] px-3 text-sm font-semibold transition-colors disabled:opacity-60',
                active
                  ? 'bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)] shadow-sm'
                  : 'text-fg-soft hover:bg-fg/[0.06]',
              ].join(' ')}
              title={`Teléfono de prueba ${opt.phone}`}
            >
              {opt.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
