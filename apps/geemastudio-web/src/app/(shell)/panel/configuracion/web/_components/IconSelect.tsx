'use client'

import { useState } from 'react'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { ChevronDown } from 'lucide-react'

const LucideMap = LucideIcons as unknown as Record<string, LucideIcon>

const ICON_NAMES = [
  'Sparkles',
  'WandSparkles',
  'Scissors',
  'Brush',
  'Palette',
  'Eye',
  'Hand',
  'Flower2',
  'Flower',
  'Gem',
  'Crown',
  'Heart',
  'HeartPulse',
  'Star',
  'Smile',
  'Droplets',
  'Bath',
  'Sun',
  'Moon',
  'Leaf',
  'Feather',
  'Flame',
  'Wind',
  'Snowflake',
  'Gift',
  'Ribbon',
  'Glasses',
  'Shirt',
  'Camera',
  'Syringe',
  'Stethoscope',
  'Dumbbell',
  'Coffee',
  'Baby',
  'PawPrint',
  'Zap',
  'ShieldCheck',
  'Clock',
] as const

interface IconSelectProps {
  value: string
  onChange: (name: string) => void
}

export function IconSelect({ value, onChange }: IconSelectProps) {
  const [open, setOpen] = useState(false)
  const current = value.trim() || 'Sparkles'
  // Si el servicio ya trae un ícono fuera del catálogo, se conserva como opción.
  const names: string[] = ICON_NAMES.includes(current as (typeof ICON_NAMES)[number])
    ? [...ICON_NAMES]
    : [current, ...ICON_NAMES]
  const CurrentIcon = LucideMap[current] ?? LucideIcons.Sparkles

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 rounded-xl border border-fg/[0.08] bg-fg/[0.04] px-3 py-2.5 text-left text-base text-fg md:text-sm"
      >
        <CurrentIcon className="h-5 w-5 shrink-0" />
        <span className="flex-1">{current}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="mt-2 grid grid-cols-6 gap-1.5 rounded-xl border border-fg/[0.08] bg-card p-2 sm:grid-cols-8">
          {names.map((name) => {
            const Icon = LucideMap[name]
            if (!Icon) return null
            const active = name === current
            return (
              <button
                key={name}
                type="button"
                title={name}
                aria-label={name}
                aria-pressed={active}
                onClick={() => {
                  onChange(name)
                  setOpen(false)
                }}
                className={`flex h-10 items-center justify-center rounded-lg border ${
                  active
                    ? 'border-[var(--tenant-primary)] bg-fg/[0.08] text-fg'
                    : 'border-transparent text-fg-muted hover:bg-fg/[0.06] hover:text-fg'
                }`}
              >
                <Icon className="h-5 w-5" />
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
