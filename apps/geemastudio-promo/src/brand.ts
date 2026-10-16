import { loadFont as loadInter } from '@remotion/google-fonts/Inter'
import { loadFont as loadEmoji } from '@remotion/google-fonts/NotoColorEmoji'

// Paleta Lunaris (misma fuente que apps/geemastudio-web/src/lib/theme.ts)
export const BRAND = {
  gradient: 'linear-gradient(135deg, #40E0D0 0%, #00897B 35%, #1E88E5 65%, #3949AB 100%)',
  primary: '#40E0D0',
  primaryDark: '#00897B',
  blue: '#1E88E5',
  indigo: '#3949AB',
  bg: '#0F0A14',
  text: '#F5F5F5',
  textSecondary: '#B0B0B0',
  whatsapp: '#25D366',
} as const

const { fontFamily: inter } = loadInter('normal', {
  weights: ['400', '500', '600', '700', '800'],
  subsets: ['latin', 'latin-ext'],
})
const { fontFamily: emoji } = loadEmoji()

/** Inter para todo el texto + Noto Color Emoji para el copy de WhatsApp. */
export const FONT = `${inter}, ${emoji}, sans-serif`

// Formato vertical para Reels, TikTok y Stories
export const REEL = { width: 1080, height: 1920, fps: 30 } as const

/** Ancho del teléfono en las escenas con mockup. */
export const PHONE_WIDTH = 640
