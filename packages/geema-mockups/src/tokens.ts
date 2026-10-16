// Tokens copiados del tema oscuro de geemastudio-mobile (constants/theme.ts)
// y del tenant por defecto (@zmtech/tenant-config). Si la app cambia de
// paleta, actualizar aquí para que la landing y los videos sigan iguales.

export const T = {
  backgroundRoot: '#121212',
  backgroundDefault: '#1E1E1E',
  backgroundSecondary: '#2A2530',
  backgroundTertiary: '#352840',
  border: '#3D3545',
  text: '#F5F5F5',
  textSecondary: '#B0B0B0',
  textMuted: '#707070',
  /** primaryColor del tenant por defecto: tinte de tabs y acciones */
  primary: '#40E0D0',
  /** theme.primary del modo oscuro: horas y enlaces */
  primarySoft: '#4DD9CA',
  gold: '#C7A84D',
  success: '#66BB6A',
  warning: '#C7A84D',
  error: '#EF5350',
  info: '#64B5F6',
  whatsapp: '#25D366',
} as const

export const RADIUS = { xs: 8, sm: 12, md: 18, card: 20, lg: 24, xl: 30, full: 9999 } as const

export const SPACE = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const

/** Tamaño lógico de la pantalla. PhoneFrame la escala al ancho pedido. */
export const SCREEN = { width: 375, height: 812 } as const

export const FONT_STACK =
  'system-ui, -apple-system, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", sans-serif'

/** Mezcla un color hex con alpha (00–ff). */
export function alpha(hex: string, a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255)
    .toString(16)
    .padStart(2, '0')
  return `${hex}${v}`
}
