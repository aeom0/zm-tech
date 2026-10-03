'use client'

import { Monitor, Moon, Sun } from 'lucide-react'

import { useTheme, type ThemePreference } from '@/lib/theme-mode'

const OPTIONS: { value: ThemePreference; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Claro', icon: <Sun className="h-4 w-4" /> },
  { value: 'dark', label: 'Oscuro', icon: <Moon className="h-4 w-4" /> },
  { value: 'system', label: 'Sistema', icon: <Monitor className="h-4 w-4" /> },
]

/** Control segmentado de tema; `compact` muestra solo íconos (sidebar). */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme()

  return (
    <div
      role="radiogroup"
      aria-label="Tema de la aplicación"
      className="grid grid-cols-3 gap-1 rounded-xl border border-fg/[0.08] bg-fg/[0.04] p-1"
    >
      {OPTIONS.map((opt) => {
        const active = preference === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            title={opt.label}
            onClick={() => setPreference(opt.value)}
            className={[
              'flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors',
              compact ? 'min-h-[36px] px-2' : 'min-h-[44px] px-3',
              active
                ? 'bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)]'
                : 'text-fg-muted hover:bg-fg/[0.06]',
            ].join(' ')}
          >
            {opt.icon}
            {compact ? null : <span>{opt.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
