'use client'

import { useId } from 'react'
import { Check, SlidersHorizontal } from 'lucide-react'

import { onColor } from '@/lib/tenant-theme'

/**
 * Paleta sugerida + color personalizado (input nativo de color detrás de la muestra con
 * gradiente, como el `CustomColorPickerModal` de mobile).
 */
export function ColorChooser({
  colors,
  value,
  onChange,
  label,
  size = 'md',
}: {
  colors: ReadonlyArray<{ label: string; valor: string }>
  value: string
  onChange: (hex: string) => void
  label: string
  size?: 'md' | 'sm'
}) {
  const customId = useId()
  const isCustom = !colors.some((c) => c.valor.toLowerCase() === value.toLowerCase())
  const dim = size === 'md' ? 'h-11 w-11' : 'h-9 w-9'

  const ring = (selected: boolean) =>
    selected ? 'ring-2 ring-white ring-offset-2 ring-offset-zinc-900' : 'hover:scale-105'

  return (
    <fieldset>
      <legend className="mb-2.5 text-sm font-medium text-zinc-300">{label}</legend>
      <div className="flex flex-wrap gap-3">
        {colors.map((c) => {
          const selected = c.valor.toLowerCase() === value.toLowerCase()
          return (
            <button
              key={c.valor}
              type="button"
              onClick={() => onChange(c.valor)}
              aria-label={c.label}
              aria-pressed={selected}
              title={c.label}
              className={`flex ${dim} items-center justify-center rounded-full border border-white/10 transition ${ring(selected)}`}
              style={{ backgroundColor: c.valor }}
            >
              {selected ? <Check className="h-4 w-4" style={{ color: onColor(c.valor) }} aria-hidden /> : null}
            </button>
          )
        })}
        <label
          htmlFor={customId}
          title="Color personalizado"
          className={`relative flex ${dim} cursor-pointer items-center justify-center rounded-full transition ${ring(isCustom)} ${isCustom ? '' : 'bg-geema-gradient'}`}
          style={isCustom ? { backgroundColor: value } : undefined}
        >
          <SlidersHorizontal
            className="h-4 w-4"
            style={{ color: isCustom ? onColor(value) : '#FFFFFF' }}
            aria-hidden
          />
          <input
            id={customId}
            type="color"
            value={value.length === 7 ? value : '#40E0D0'}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            aria-label={`${label}: color personalizado`}
            className="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
          />
        </label>
      </div>
    </fieldset>
  )
}

/** Combinación al azar: primario saturado y acento en un matiz contrastante. */
export function randomBrandPair(): { primary: string; accent: string } {
  const h = Math.floor(Math.random() * 360)
  const offset = 140 + Math.floor(Math.random() * 80)
  return {
    primary: hslToHex(h, 62 + Math.random() * 18, 38 + Math.random() * 12),
    accent: hslToHex((h + offset) % 360, 70 + Math.random() * 15, 55 + Math.random() * 10),
  }
}

function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100
  const lig = l / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = sat * Math.min(lig, 1 - lig)
  const f = (n: number) => lig - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const toHex = (x: number) =>
    Math.round(x * 255)
      .toString(16)
      .padStart(2, '0')
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase()
}
