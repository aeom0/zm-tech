'use client'

import { useState } from 'react'

const LENGTH = 6

/**
 * Código numérico de 6 dígitos en casillas. Debajo hay un solo input real (transparente)
 * para que pegar, borrar y el autocompletado del correo (`one-time-code`) funcionen igual
 * que en un campo normal.
 */
export function CodeInput({
  id,
  value,
  onChange,
  tone = 'panel',
  autoFocus = false,
  ariaLabel = 'Código de 6 dígitos',
}: {
  id?: string
  value: string
  onChange: (code: string) => void
  /** panel: tokens del tema; auth: pantallas de acceso (siempre oscuras). */
  tone?: 'panel' | 'auth'
  autoFocus?: boolean
  ariaLabel?: string
}) {
  const [focused, setFocused] = useState(autoFocus)
  const active = Math.min(value.length, LENGTH - 1)

  const box =
    tone === 'auth'
      ? 'border-white/[0.12] bg-zinc-800 text-white'
      : 'border-line-strong bg-surface text-fg'
  const activeBox =
    tone === 'auth' ? 'border-[#40E0D0] ring-2 ring-[#40E0D0]/40' : 'border-[var(--tenant-primary)] ring-2 ring-[var(--tenant-primary)]/30'

  return (
    <div className="relative w-full max-w-xs">
      <div className="grid grid-cols-6 gap-2" aria-hidden>
        {Array.from({ length: LENGTH }, (_, i) => (
          <span
            key={i}
            className={[
              'flex h-12 items-center justify-center rounded-xl border font-mono text-xl font-semibold transition',
              box,
              focused && i === active ? activeBox : '',
            ].join(' ')}
          >
            {value[i] ?? ''}
          </span>
        ))}
      </div>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, LENGTH))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus={autoFocus}
        maxLength={LENGTH}
        aria-label={ariaLabel}
        className="absolute inset-0 h-full w-full cursor-text bg-transparent text-transparent caret-transparent opacity-0"
      />
    </div>
  )
}
