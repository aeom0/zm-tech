import type { ReactNode } from 'react'

export interface LandingTheme {
  id: 'elegant' | 'warm' | 'modern'
  colors: {
    bg: string // page background
    bgAlt: string // alt section background (e.g. reviews section bg)
    text: string
    textMuted: string
    textFaint: string
    accent: string // solid accent color (used for icons, borders, small text)
    accentOn: string // text/icon color rendered ON TOP of an accent-filled surface (usually white)
    border: string
    cardBg: string
    cardBorder: string
    navBg: string
    ctaBg: string // dark CTA band / footer background
    ctaText: string
    ctaTextMuted: string
    /** Secondary accent color (e.g. Warm's gold for prices/stars); equals `accent` when a theme has only one accent. */
    secondaryAccent: string
    /** Subtle background tint for chips/pills using `secondaryAccent`. */
    secondaryAccentBg: string
    badgeBg: string
    badgeBorder: string
    badgeText: string
    navCtaBg: string
    navCtaText: string
    statCardBg: string
    statCardBorder: string
    footerBg: string
    footerText: string
    footerTextMuted: string
    footerBorder: string
    footerPillBg: string
    footerPillBorder: string
    footerPillText: string
    /** Hairline divider color between sections. */
    divider: string
  }
  /** CSS `background` value for buttons/icon chips that should look "filled with the brand accent" (gradient for elegant, solid color for warm/modern) */
  accentBackground: string
  /** true only for elegant: headline/price accents use gradient-clipped text instead of solid accent color */
  useGradientText: boolean
  radius: { button: string; card: string; pill: string }
  /** Renders the business name/brand lockup exactly as each template stylizes it (nav + footer use this) */
  renderBrand: (businessName: string) => ReactNode
}
