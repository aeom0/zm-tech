import type { LandingTheme } from './types'

/** Colores de marca del tenant (`tenant_settings.primary_color` / `accent_color`). */
export interface LandingBrand {
  primary: string
  accent: string
}

type Rgb = [number, number, number]

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i

export function normalizeHex(value: string | null | undefined): string | null {
  const m = value?.trim().match(HEX)
  if (!m) return null
  const h = m[1]!
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  return `#${full.toLowerCase()}`
}

function toRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as Rgb
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Ratio de contraste WCAG entre dos colores hex. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

function mix(a: string, b: string, t: number): string {
  const [ra, rb] = [toRgb(a), toRgb(b)]
  return toHex([0, 1, 2].map((i) => ra[i]! + (rb[i]! - ra[i]!) * t) as Rgb)
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex)
  return `rgba(${r},${g},${b},${alpha})`
}

/**
 * Acerca `color` al blanco (fondo oscuro) o al negro (fondo claro) hasta alcanzar `min`
 * de contraste sobre `bg`. Conserva el tono: solo cambia la luminosidad.
 */
export function readableOn(bg: string, color: string, min: number): string {
  if (contrastRatio(bg, color) >= min) return color
  const target = luminance(bg) > 0.5 ? '#000000' : '#ffffff'
  for (let t = 0.05; t <= 1; t += 0.05) {
    const candidate = mix(color, target, t)
    if (contrastRatio(bg, candidate) >= min) return candidate
  }
  return target
}

/** Color de texto (blanco u oscuro) legible sobre todos los `fills` dados. */
export function onColor(...fills: string[]): string {
  const dark = '#111111'
  const light = '#ffffff'
  const worst = (text: string) => Math.min(...fills.map((f) => contrastRatio(f, text)))
  return worst(light) >= worst(dark) ? light : dark
}

/**
 * Aplica la marca del tenant sobre una plantilla base: cambia solo los tokens de acento
 * (relleno, texto de acento, badges, CTA) y deja fondos, tipografía y radios de la plantilla.
 * Si algún color no es un hex válido devuelve la plantilla sin cambios.
 */
export function applyBrand(theme: LandingTheme, brand: LandingBrand | null): LandingTheme {
  const primary = normalizeHex(brand?.primary)
  const accent = normalizeHex(brand?.accent)
  if (!primary || !accent) return theme

  const { bg } = theme.colors
  const isElegant = theme.id === 'elegant'
  const textAccent = readableOn(bg, primary, 4.5)
  // Un relleno casi igual al fondo (negro sobre Elegant, blanco sobre Warm) dejaría el botón invisible.
  const solidPrimary = contrastRatio(bg, primary) >= 1.5 ? primary : textAccent
  const solidAccent = contrastRatio(bg, accent) >= 1.5 ? accent : readableOn(bg, accent, 3)
  const fill = isElegant
    ? `linear-gradient(135deg, ${solidPrimary} 0%, ${solidAccent} 100%)`
    : solidPrimary
  const accentOn = onColor(solidPrimary, isElegant ? solidAccent : solidPrimary)

  const colors: LandingTheme['colors'] = {
    ...theme.colors,
    accent: textAccent,
    accentOn,
    badgeText: textAccent,
  }

  if (theme.id === 'warm') {
    colors.secondaryAccent = readableOn(bg, accent, 3)
    colors.secondaryAccentBg = withAlpha(accent, 0.12)
    colors.badgeBg = withAlpha(primary, 0.1)
  } else if (theme.id === 'modern') {
    colors.secondaryAccent = textAccent
    colors.secondaryAccentBg = withAlpha(primary, 0.1)
  } else {
    colors.secondaryAccent = textAccent
    colors.secondaryAccentBg = withAlpha(primary, 0.12)
    colors.badgeBg = withAlpha(primary, 0.12)
    colors.badgeBorder = withAlpha(primary, 0.3)
    colors.navCtaBg = fill
    colors.navCtaText = accentOn
    colors.ctaBg = `linear-gradient(135deg, ${withAlpha(primary, 0.12)} 0%, ${withAlpha(accent, 0.08)} 100%)`
  }

  return {
    ...theme,
    colors,
    accentBackground: fill,
    renderBrand: renderBrandWith(theme, textAccent),
  }
}

function renderBrandWith(theme: LandingTheme, textAccent: string): LandingTheme['renderBrand'] {
  if (theme.id === 'warm') {
    return function WarmBrand(businessName) {
      const parts = businessName.trim().split(/\s+/)
      const firstWord = parts[0] ?? businessName
      const restName = parts.slice(1).join(' ')
      return (
        <>
          {firstWord} <span style={{ color: textAccent }}>{restName || ' '}</span>
        </>
      )
    }
  }
  if (theme.id === 'modern') {
    return function ModernBrand(businessName) {
      const words = businessName.trim().split(/\s+/).filter(Boolean)
      const nameHead = words.length > 1 ? words.slice(0, -1).join(' ') : ''
      const nameTail = words.length > 1 ? words[words.length - 1]! : (words[0] ?? businessName)
      return nameHead ? (
        <>
          <span style={{ color: theme.colors.text }}>{nameHead} </span>
          <strong style={{ color: textAccent }}>{nameTail}</strong>
        </>
      ) : (
        <strong style={{ color: textAccent }}>{nameTail}</strong>
      )
    }
  }
  return theme.renderBrand
}
