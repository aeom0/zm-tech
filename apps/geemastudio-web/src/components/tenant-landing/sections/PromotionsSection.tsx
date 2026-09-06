import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'

interface PromotionsSectionProps {
  data: TenantLandingData
  theme: LandingTheme
}

export function PromotionsSection({ data, theme }: PromotionsSectionProps) {
  const { promos, whatsapp } = data
  if (promos.length === 0) return null

  const cleanPhone = whatsapp?.replace(/\D/g, '') ?? ''

  return (
    <section className="border-t px-5 py-14" style={{ borderColor: theme.colors.divider }}>
      <p className="mb-1 text-[11px] uppercase tracking-[0.2em]" style={{ color: theme.colors.textFaint }}>
        Promociones
      </p>
      <h2 className="mb-5 text-[26px] font-bold tracking-tight" style={{ color: theme.colors.text }}>
        Promociones activas
      </h2>
      <div className="flex flex-col gap-3">
        {promos.map((promo, i) => {
          const message = promo.whatsappMessage ?? promo.title
          const href = cleanPhone ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}` : undefined

          return (
            <div
              key={i}
              className="overflow-hidden rounded-2xl border p-5"
              style={{ borderColor: theme.colors.cardBorder, background: theme.colors.cardBg }}
            >
              {promo.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={promo.imageUrl}
                  alt={promo.title}
                  className="mb-3 aspect-video w-full object-cover"
                  style={{ borderRadius: theme.radius.card }}
                />
              )}
              {promo.badge && (
                <span
                  className="mb-2 inline-block rounded-full px-3 py-1 text-xs font-bold text-white"
                  style={{ background: promo.badgeColor ?? theme.colors.accent }}
                >
                  {promo.badge}
                </span>
              )}
              <div className="mb-1 text-[15px] font-bold" style={{ color: theme.colors.text }}>
                {promo.title}
              </div>
              {promo.description && (
                <p className="mb-3 text-[13px] leading-relaxed" style={{ color: theme.colors.textMuted }}>
                  {promo.description}
                </p>
              )}
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-4 py-2.5 text-center text-[13px] font-semibold no-underline"
                  style={{ background: theme.accentBackground, color: theme.colors.accentOn, borderRadius: theme.radius.button }}
                >
                  {promo.ctaText ?? 'Ver promoción'}
                </a>
              ) : (
                <span
                  className="inline-block px-4 py-2.5 text-center text-[13px] font-semibold opacity-55"
                  style={{ background: theme.accentBackground, color: theme.colors.accentOn, borderRadius: theme.radius.button }}
                >
                  {promo.ctaText ?? 'Ver promoción'}
                </span>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
