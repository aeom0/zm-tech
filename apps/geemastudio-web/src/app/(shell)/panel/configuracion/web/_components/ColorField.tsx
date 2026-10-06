'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'

const SUGGESTED = [
  '#E11D48',
  '#F97316',
  '#EAB308',
  '#22C55E',
  '#14B8A6',
  '#3B82F6',
  '#8B5CF6',
  '#D946EF',
  '#EC4899',
  '#78716C',
]

const HEX_RE = /^#[0-9a-fA-F]{6}$/

interface ColorFieldProps {
  value: string
  onChange: (value: string) => void
  inputClass: string
}

/** Color opcional: vacío = el de la marca (`--tenant-primary`). */
export function ColorField({ value, onChange, inputClass }: ColorFieldProps) {
  const [showHex, setShowHex] = useState(false)
  const current = value.trim()
  const isHex = HEX_RE.test(current)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange('')}
          aria-pressed={!current}
          className={`rounded-full border px-3 py-1 text-xs ${
            !current
              ? 'border-[var(--tenant-primary)] text-fg'
              : 'border-fg/[0.12] text-fg-subtle hover:text-fg'
          }`}
        >
          Por defecto
        </button>
        {SUGGESTED.map((hex) => {
          const active = current.toLowerCase() === hex.toLowerCase()
          return (
            <button
              key={hex}
              type="button"
              onClick={() => onChange(hex)}
              aria-label={`Color ${hex}`}
              aria-pressed={active}
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 ${
                active ? 'border-fg' : 'border-transparent'
              }`}
              style={{ background: hex }}
            >
              {active ? <Check className="h-3.5 w-3.5 text-white" /> : null}
            </button>
          )
        })}
        <label
          className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-fg/[0.2]"
          title="Elegir otro color"
          style={{
            background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)',
          }}
        >
          <input
            type="color"
            value={isHex ? current : '#8b5cf6'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label="Elegir otro color"
          />
        </label>
        <button
          type="button"
          onClick={() => setShowHex((v) => !v)}
          className="text-xs text-fg-subtle underline-offset-2 hover:underline"
        >
          {showHex ? 'Ocultar hex' : 'Escribir hex'}
        </button>
      </div>
      {showHex ? (
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#RRGGBB"
        />
      ) : null}
    </div>
  )
}
