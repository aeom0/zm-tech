/**
 * OdentalPro — tokens de marca.
 *
 * Dirección: Halo soft + Sterile Aqua / teal clínico.
 * Diferenciado de GeemaStudio Lunaris (#40E0D0 turquesa spa).
 *
 * Fuente visual: docs/odentalpro/design/brand.pen — este archivo es el espejo
 * en código de las variables del .pen. Si cambia una, cambia la otra.
 *
 * Cuando exista packages/ui, mover aquí → theme dental exportable.
 */

/** Kit de Pencil sobre el que se dibujó el sistema */
export const PENCIL_KIT = 'Halo' as const

/** Familia tipográfica única de la UI. No usar Inter. */
export const ODENTAL_FONT = 'Geist' as const

/**
 * Colores con par claro/oscuro. El .pen los declara sobre el eje de tema
 * `mode`, así que todo componente debe leer de aquí y nunca hardcodear.
 */
export const ODENTAL_COLORS = {
  primary: { light: '#0D9488', dark: '#2DD4BF' },
  primaryDark: { light: '#0F766E', dark: '#14B8A6' },
  primarySoft: { light: '#CCFBF1', dark: '#10312F' },

  canvas: { light: '#FFFFFF', dark: '#0F1519' },
  surface: { light: '#F7FAFC', dark: '#161F24' },
  border: { light: '#DDE3EA', dark: '#27333A' },

  heading: { light: '#0A1628', dark: '#EDF3F8' },
  text: { light: '#1F2A33', dark: '#E7EEF3' },
  muted: { light: '#5B6B7A', dark: '#93A5B2' },

  /** Texto e iconos sobre relleno primary. Invierte en oscuro porque primary se aclara. */
  onPrimary: { light: '#F6FEFC', dark: '#04211F' },
  /** Anillo de foco, 2px */
  focus: { light: '#1E7F8C', dark: '#63C9D6' },

  success: { light: '#10B981', dark: '#34D399' },
  warningSoft: { light: '#FEF3C7', dark: '#3A2A0B' },
  warningStrong: { light: '#B45309', dark: '#FBBF24' },
  dangerSoft: { light: '#FEE2E2', dark: '#3B1414' },
  dangerStrong: { light: '#B91C1C', dark: '#FCA5A5' },

  /** Navy legible en ambos modos: categorías (implante, prótesis) */
  navyAccent: { light: '#0A1628', dark: '#9BC1E4' },

  /** Relleno translúcido del dock de navegación */
  glass: { light: '#FFFFFFBF', dark: '#161F24BF' },

  shadowAmbient: { light: '#0A162814', dark: '#00000052' },
  shadowDirect: { light: '#0A16281F', dark: '#00000066' },
} as const

/** Hues fijos de marca — no cambian con el modo */
export const ODENTAL_BRAND = {
  navy: '#0A1628',
  slate: '#20343A',
  cream: '#FDFAF5',
  aqua: {
    50: '#EAF7FB',
    100: '#BFEAF2',
    300: '#63C9D6',
    600: '#1E7F8C',
  },
  gradient: {
    /** CTA / hero suave — teal → aqua clínico */
    css: 'linear-gradient(135deg, #0D9488 0%, #1E7F8C 45%, #0A1628 100%)',
    css90: 'linear-gradient(90deg, #0D9488 0%, #63C9D6 100%)',
    stops: ['#0D9488', '#1E7F8C', '#0A1628'] as const,
    glow: 'rgba(13,148,136,0.28)',
  },
} as const

export const ODENTAL_SPACE = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
} as const

/** Radio del hijo siempre menor o igual al del padre */
export const ODENTAL_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 28,
} as const

export const ODENTAL_FONT_SIZE = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 18,
  xl: 22,
  '2xl': 28,
} as const

/** Elevación base: dos capas, ambiente + luz directa */
export const ODENTAL_ELEVATION = {
  card: '0 1px 2px rgba(10,22,40,0.08), 0 4px 12px rgba(10,22,40,0.12)',
} as const

/** Estados del odontograma (numeración FDI) */
export const ODONTOGRAM_STATE_COLORS = {
  healthy: 'canvas',
  treated: 'primary',
  toTreat: 'warningStrong',
  implant: 'navyAccent',
  crown: 'aqua600',
  absent: 'muted',
} as const

export type OdentalColorToken = keyof typeof ODENTAL_COLORS
export type OdentalMode = 'light' | 'dark'

/** Resuelve un token de color al modo activo */
export function colorOdental(token: OdentalColorToken, mode: OdentalMode): string {
  return ODENTAL_COLORS[token][mode]
}
