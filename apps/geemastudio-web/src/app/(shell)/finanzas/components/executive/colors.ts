'use client'

import {
  DEFAULT_TENANT_ACCENT,
  DEFAULT_TENANT_PRIMARY,
} from '@/lib/tenant-theme'

/** Paleta de charts (Recharts no lee CSS vars). Usa marca del tenant si es hex válido. */
export function chartColors(primaryHex?: string | null, accentHex?: string | null) {
  const primary =
    primaryHex && /^#?[0-9a-f]{6}$/i.test(primaryHex.trim())
      ? primaryHex.startsWith('#')
        ? primaryHex
        : `#${primaryHex}`
      : DEFAULT_TENANT_PRIMARY
  const gold =
    accentHex && /^#?[0-9a-f]{6}$/i.test(accentHex.trim())
      ? accentHex.startsWith('#')
        ? accentHex
        : `#${accentHex}`
      : DEFAULT_TENANT_ACCENT

  return {
    primary,
    gold,
    emerald: '#059669',
    rose: '#E11D48',
    zinc: '#71717A',
    ads: '#D97706',
    promo: '#0D9488',
  } as const
}

export type ChartColorSet = ReturnType<typeof chartColors>

export function kindColors(c: ChartColorSet) {
  return {
    service: c.primary,
    pack: c.gold,
    promo: c.promo,
  } as const
}

/** Fallback estático (compat con imports ZM). */
export const COLOR = chartColors()
export const KIND_COLOR = kindColors(COLOR)
