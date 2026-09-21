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

export type TenantCssVars = React.CSSProperties & {
  '--tenant-primary': string
  '--tenant-primary-hover': string
  '--tenant-accent': string
}

export function tenantCssVars(
  primaryColor?: string | null,
  accentColor?: string | null
): TenantCssVars {
  const primary = isValidHex(primaryColor) ? primaryColor : DEFAULT_TENANT_PRIMARY
  const accent = isValidHex(accentColor) ? accentColor : DEFAULT_TENANT_ACCENT

  return {
    '--tenant-primary': primary,
    '--tenant-primary-hover': darkenHex(primary, 0.22),
    '--tenant-accent': accent,
  }
}
