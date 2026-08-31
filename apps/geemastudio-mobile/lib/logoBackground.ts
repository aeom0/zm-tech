import type { LogoBackgroundStyle } from '@zmtech/tenant-config'

/** Colores fijos de los "chips" de fondo del logo (independientes del tema activo). */
export const LOGO_CHIP_COLORS: Record<Exclude<LogoBackgroundStyle, 'transparent'>, string> = {
  light: '#FFFFFF',
  dark: '#121212',
}

/** Color de fondo a pintar detrás del logo, o null si va sin chip (transparente). */
export function resolveLogoChipColor(style: LogoBackgroundStyle | undefined): string | null {
  if (style === 'light' || style === 'dark') return LOGO_CHIP_COLORS[style]
  return null
}
