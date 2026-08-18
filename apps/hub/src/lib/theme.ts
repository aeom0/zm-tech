/**
 * Espejo runtime de docs/hub/design/tokens.ts (ZM Control).
 * Dark-first; light tokens listos para un toggle futuro.
 */

export type HubMode = 'dark' | 'light'

export const HUB_FONT_DISPLAY = 'Space Grotesk' as const
export const HUB_FONT_BODY = 'Inter' as const

export const HUB_COLORS = {
  bg: { dark: '#050505', light: '#F7F7FA' },
  surface: { dark: '#0F0F14', light: '#FFFFFF' },
  surfaceElevated: { dark: '#1A1A2E', light: '#F0F0F5' },
  border: { dark: 'rgba(255,255,255,0.10)', light: '#E4E4EC' },

  textPrimary: { dark: '#F5F5F7', light: '#0F0F14' },
  textSecondary: { dark: '#8B97A8', light: '#5B6475' },
  textDisabled: { dark: '#55555F', light: '#9AA1AC' },
  textInverse: { dark: '#050505', light: '#FFFFFF' },

  accent: { dark: '#8B5CF6', light: '#7C3AED' },
  accentHover: { dark: '#A78BFA', light: '#6D28D9' },
  accentSoft: { dark: 'rgba(139,92,246,0.14)', light: '#F3E8FF' },
  secondary: { dark: '#3B82F6', light: '#2563EB' },

  success: { dark: '#34D399', light: '#059669' },
  warning: { dark: '#FBBF24', light: '#D97706' },
  danger: { dark: '#F87171', light: '#DC2626' },
  info: { dark: '#60A5FA', light: '#2563EB' },
} as const

export const HUB_SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
} as const

export const HUB_RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  full: 9999,
} as const

/** Default runtime mode until light toggle exists. */
export const HUB_DEFAULT_MODE: HubMode = 'dark'

export function hubColor(token: keyof typeof HUB_COLORS, mode: HubMode = HUB_DEFAULT_MODE): string {
  return HUB_COLORS[token][mode]
}
