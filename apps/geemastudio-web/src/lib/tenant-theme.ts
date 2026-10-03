// Deriva la paleta visual del panel a partir de los colores de marca del tenant
// (tenant_settings.primary_color / accent_color). Mismo enfoque que
// apps/geemastudio-mobile/constants/theme.ts, adaptado a CSS custom properties.

export const DEFAULT_TENANT_PRIMARY = '#40E0D0'
export const DEFAULT_TENANT_ACCENT = '#FFD700'

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!m) return null
  const n = Number.parseInt(m[1], 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex([r, g, b]: [number, number, number]): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`
}

function isValidHex(hex: string | null | undefined): hex is string {
  return typeof hex === 'string' && hexToRgb(hex) !== null
}

/** Oscurece un color hex mezclándolo con negro (amount 0-1). */
function darkenHex(hex: string, amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return rgbToHex(rgb.map((c) => c * (1 - amount)) as [number, number, number])
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex) ?? [0, 0, 0]
  const lin = (c: number) => {
    const n = c / 255
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

const ON_LIGHT_BG = '#18181B'
const ON_DARK_BG = '#FFFFFF'

/**
 * Texto legible (casi negro o blanco) sobre un fondo de marca arbitrario.
 * Elige el que da mayor ratio de contraste WCAG, así funciona con cualquier color
 * que elija el tenant (morado oscuro, turquesa claro, amarillo, etc.).
 */
export function onColor(bgHex: string): string {
  const l = relativeLuminance(bgHex)
  const withWhite = 1.05 / (l + 0.05)
  const withDark = (l + 0.05) / (relativeLuminance(ON_LIGHT_BG) + 0.05)
  return withWhite >= withDark ? ON_DARK_BG : ON_LIGHT_BG
}

/** Mezcla `hex` con `target` (0 = hex, 1 = target). */
function mixHex(hex: string, target: [number, number, number], amount: number): string {
  const rgb = hexToRgb(hex)
  if (!rgb) return hex
  return rgbToHex(rgb.map((c, i) => c + (target[i] - c) * amount) as [number, number, number])
}

function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

const LIGHT_SURFACE = '#FFFFFF'
const DARK_SURFACE = '#0F0F0F'
const MIN_TEXT_CONTRAST = 4.5

/**
 * Variante del color de marca apta como TEXTO/ícono sobre una superficie
 * (no como relleno). Ajusta el tono hacia negro (fondo claro) o blanco (fondo
 * oscuro) en pasos pequeños hasta alcanzar contraste WCAG AA, preservando el
 * matiz; si el color ya cumple, se devuelve sin cambios.
 */
export function textSafeColor(hex: string, surface: 'light' | 'dark'): string {
  const bg = surface === 'light' ? LIGHT_SURFACE : DARK_SURFACE
  const target: [number, number, number] = surface === 'light' ? [0, 0, 0] : [255, 255, 255]
  let out = hex
  for (let amount = 0; amount <= 1.0001; amount += 0.05) {
    out = mixHex(hex, target, amount)
    if (contrastRatio(out, bg) >= MIN_TEXT_CONTRAST) return out
  }
  return out
}

export type TenantCssVars = React.CSSProperties & {
  '--tenant-primary': string
  '--tenant-primary-hover': string
  '--tenant-accent': string
  /** Texto/íconos sobre superficies rellenas con `--tenant-primary`. */
  '--tenant-on-primary': string
  /** Texto/íconos sobre superficies rellenas con `--tenant-primary-hover`. */
  '--tenant-on-primary-hover': string
  /** Texto/íconos sobre superficies rellenas con `--tenant-accent`. */
  '--tenant-on-accent': string
  /** Color de marca como texto/ícono sobre superficies claras (AA). */
  '--tenant-text-light': string
  /** Color de marca como texto/ícono sobre superficies oscuras (AA). */
  '--tenant-text-dark': string
}

export function tenantCssVars(
  primaryColor?: string | null,
  accentColor?: string | null
): TenantCssVars {
  const primary = isValidHex(primaryColor) ? primaryColor : DEFAULT_TENANT_PRIMARY
  const accent = isValidHex(accentColor) ? accentColor : DEFAULT_TENANT_ACCENT

  const primaryHover = darkenHex(primary, 0.22)

  return {
    '--tenant-primary': primary,
    '--tenant-primary-hover': primaryHover,
    '--tenant-accent': accent,
    '--tenant-on-primary': onColor(primary),
    '--tenant-on-primary-hover': onColor(primaryHover),
    '--tenant-on-accent': onColor(accent),
    '--tenant-text-light': textSafeColor(primary, 'light'),
    '--tenant-text-dark': textSafeColor(primary, 'dark'),
  }
}
