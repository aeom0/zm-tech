import { LUNARIS } from '@/lib/theme'
import type { LandingTheme } from './types'

const grad = LUNARIS.gradient.css

export const elegantTheme: LandingTheme = {
  id: 'elegant',
  colors: {
    bg: '#0d0f14',
    bgAlt: '#0d0f14',
    text: '#f0ede8',
    textMuted: 'rgba(240,237,232,0.6)',
    textFaint: 'rgba(240,237,232,0.4)',
    accent: LUNARIS.primary,
    accentOn: '#ffffff',
    border: 'rgba(255,255,255,0.07)',
    cardBg: 'rgba(255,255,255,0.04)',
    cardBorder: 'rgba(255,255,255,0.08)',
    navBg: 'rgba(13,15,20,0.92)',
    ctaBg: `linear-gradient(135deg, ${LUNARIS.badge.bg} 0%, rgba(30,136,229,0.08) 100%)`,
    ctaText: '#f0ede8',
    ctaTextMuted: 'rgba(240,237,232,0.6)',
    secondaryAccent: LUNARIS.primary,
    secondaryAccentBg: LUNARIS.badge.bg,
    badgeBg: LUNARIS.badge.bg,
    badgeBorder: LUNARIS.badge.border,
    badgeText: LUNARIS.badge.text,
    navCtaBg: grad,
    navCtaText: '#ffffff',
    statCardBg: 'transparent',
    statCardBorder: 'transparent',
    footerBg: '#080a0e',
    footerText: '#f0ede8',
    footerTextMuted: 'rgba(240,237,232,0.4)',
    footerBorder: 'rgba(255,255,255,0.06)',
    footerPillBg: 'rgba(255,255,255,0.06)',
    footerPillBorder: 'rgba(255,255,255,0.1)',
    footerPillText: 'rgba(240,237,232,0.65)',
    divider: 'rgba(255,255,255,0.07)',
  },
  accentBackground: grad,
  useGradientText: true,
  radius: { button: '9999px', card: '20px', pill: '9999px' },
  renderBrand: (businessName) => businessName,
}

export const warmTheme: LandingTheme = {
  id: 'warm',
  colors: {
    bg: '#faf7f2',
    bgAlt: '#f0e8da',
    text: '#2a1f1a',
    textMuted: 'rgba(42,31,26,0.65)',
    textFaint: 'rgba(42,31,26,0.45)',
    accent: '#b5451b',
    accentOn: '#faf7f2',
    border: 'rgba(42,31,26,0.1)',
    cardBg: '#ffffff',
    cardBorder: 'rgba(42,31,26,0.08)',
    navBg: '#faf7f2',
    ctaBg: '#2a1f1a',
    ctaText: '#faf7f2',
    ctaTextMuted: 'rgba(250,247,242,0.6)',
    secondaryAccent: '#c9850a',
    secondaryAccentBg: 'rgba(201,133,10,0.12)',
    badgeBg: 'rgba(181,69,27,0.1)',
    badgeBorder: 'transparent',
    badgeText: '#b5451b',
    navCtaBg: '#2a1f1a',
    navCtaText: '#faf7f2',
    statCardBg: '#ffffff',
    statCardBorder: 'rgba(42,31,26,0.08)',
    footerBg: '#1e1410',
    footerText: '#faf7f2',
    footerTextMuted: 'rgba(250,247,242,0.6)',
    footerBorder: 'rgba(250,247,242,0.07)',
    footerPillBg: 'rgba(250,247,242,0.08)',
    footerPillBorder: 'transparent',
    footerPillText: 'rgba(250,247,242,0.7)',
    divider: 'rgba(42,31,26,0.1)',
  },
  accentBackground: '#b5451b',
  useGradientText: false,
  radius: { button: '10px', card: '16px', pill: '9999px' },
  renderBrand: (businessName) => {
    const parts = businessName.trim().split(/\s+/)
    const firstWord = parts[0] ?? businessName
    const restName = parts.slice(1).join(' ')
    return (
      <>
        {firstWord} <span style={{ color: '#b5451b' }}>{restName || ' '}</span>
      </>
    )
  },
}

export const modernTheme: LandingTheme = {
  id: 'modern',
  colors: {
    bg: '#f5f5f7',
    bgAlt: '#ebebed',
    text: '#1d1d1f',
    textMuted: 'rgba(29,29,31,0.55)',
    textFaint: 'rgba(29,29,31,0.45)',
    accent: '#00b87a',
    accentOn: '#ffffff',
    border: 'rgba(0,0,0,0.07)',
    cardBg: '#ffffff',
    cardBorder: 'rgba(0,0,0,0.06)',
    navBg: 'rgba(245,245,247,0.85)',
    ctaBg: '#1d1d1f',
    ctaText: '#f5f5f7',
    ctaTextMuted: 'rgba(245,245,247,0.55)',
    secondaryAccent: '#00b87a',
    secondaryAccentBg: 'rgba(0,184,122,0.1)',
    badgeBg: 'transparent',
    badgeBorder: 'transparent',
    badgeText: '#00b87a',
    navCtaBg: '#1d1d1f',
    navCtaText: '#f5f5f7',
    statCardBg: '#ffffff',
    statCardBorder: 'rgba(0,0,0,0.06)',
    footerBg: '#f5f5f7',
    footerText: '#1d1d1f',
    footerTextMuted: 'rgba(29,29,31,0.5)',
    footerBorder: 'rgba(0,0,0,0.08)',
    footerPillBg: '#ffffff',
    footerPillBorder: 'rgba(0,0,0,0.08)',
    footerPillText: 'rgba(29,29,31,0.6)',
    divider: 'rgba(0,0,0,0.08)',
  },
  accentBackground: '#00b87a',
  useGradientText: false,
  radius: { button: '9999px', card: '18px', pill: '9999px' },
  renderBrand: (businessName) => {
    const words = businessName.trim().split(/\s+/).filter(Boolean)
    const nameHead = words.length > 1 ? words.slice(0, -1).join(' ') : ''
    const nameTail = words.length > 1 ? words[words.length - 1]! : (words[0] ?? businessName)
    return nameHead ? (
      <>
        <span style={{ color: '#1d1d1f' }}>{nameHead} </span>
        <strong style={{ color: '#00b87a' }}>{nameTail}</strong>
      </>
    ) : (
      <strong style={{ color: '#00b87a' }}>{nameTail}</strong>
    )
  },
}
