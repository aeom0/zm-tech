import type { LandingTheme } from '../theme/types'

interface MarqueeBannerProps {
  text: string
  theme: LandingTheme
}

/** Franja de texto en scroll horizontal continuo — sin librerías externas. */
export function MarqueeBanner({ text, theme }: MarqueeBannerProps) {
  const items = Array.from({ length: 8 }, () => text)

  return (
    <div className="overflow-hidden whitespace-nowrap py-2.5" style={{ background: theme.accentBackground }}>
      <style>{`
        @keyframes tenantLandingMarqueeScroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
      `}</style>
      <div
        className="inline-flex items-center gap-8"
        style={{ animation: 'tenantLandingMarqueeScroll 22s linear infinite' }}
      >
        {[...items, ...items].map((t, i) => (
          <span key={i} className="text-sm font-semibold tracking-wide" style={{ color: theme.colors.accentOn }}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
