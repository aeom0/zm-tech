import type { CSSProperties } from 'react'
import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'
import { ServiceGlyph } from '../shared/ServiceGlyph'

interface ServicesSectionProps {
  data: TenantLandingData
  theme: LandingTheme
}

export function ServicesSection({ data, theme }: ServicesSectionProps) {
  const { services } = data
  if (services.length === 0) return null

  const gradTextStyle: CSSProperties = theme.useGradientText
    ? {
        backgroundImage: theme.accentBackground,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }
    : {}

  return (
    <section className="border-t px-5 py-14" style={{ borderColor: theme.colors.divider }}>
      <p
        className={
          theme.id === 'modern'
            ? 'mb-1.5 text-[11px] font-bold uppercase tracking-[0.15em]'
            : 'mb-1 text-[11px] uppercase tracking-[0.2em]'
        }
        style={{ color: theme.id === 'modern' ? theme.colors.accent : theme.colors.textFaint }}
      >
        Servicios
      </p>
      <h2
        className={
          theme.id === 'modern' ? 'mb-[18px] text-[28px] font-black tracking-tight' : 'mb-5 text-[26px] font-bold tracking-tight'
        }
        style={{ color: theme.colors.text }}
      >
        {theme.id === 'elegant' ? 'Lo que hacemos por ti' : theme.id === 'warm' ? 'Nuestros servicios' : '¿Qué necesitas hoy?'}
      </h2>

      <div className={theme.id === 'elegant' ? 'flex flex-col gap-2.5' : undefined}>
        {services.map((service, i) => {
          if (theme.id === 'warm') {
            return (
              <div
                key={i}
                className="mb-2.5 rounded-2xl border p-5 last:mb-0"
                style={{ borderColor: theme.colors.cardBorder, background: theme.colors.cardBg }}
              >
                <div className="mb-1.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="mb-1 flex items-center gap-2 text-[15px] font-bold" style={{ color: theme.colors.text }}>
                      <ServiceGlyph iconName={service.icon} size={20} className="inline" />
                      <span>{service.name}</span>
                    </div>
                    <div className="text-[13px] leading-relaxed" style={{ color: theme.colors.textMuted }}>
                      {service.description}
                    </div>
                  </div>
                  <span
                    className="flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: theme.colors.secondaryAccentBg, color: theme.colors.secondaryAccent }}
                  >
                    {service.price}
                  </span>
                </div>
                {!!service.duration && (
                  <div className="text-xs" style={{ color: theme.colors.textFaint }}>
                    {service.duration}
                  </div>
                )}
              </div>
            )
          }

          if (theme.id === 'modern') {
            return (
              <div
                key={i}
                className="mb-2.5 flex items-center gap-3.5 rounded-[18px] border p-[18px] last:mb-0"
                style={{ borderColor: theme.colors.cardBorder, background: theme.colors.cardBg }}
              >
                <div
                  className="flex h-[50px] w-[50px] flex-shrink-0 items-center justify-center rounded-[14px]"
                  style={{ background: theme.colors.secondaryAccentBg, color: theme.colors.accent }}
                >
                  <ServiceGlyph iconName={service.icon} size={24} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 text-[15px] font-bold" style={{ color: theme.colors.text }}>
                    {service.name}
                  </div>
                  <div className="text-xs" style={{ color: theme.colors.textMuted }}>
                    {service.description}
                  </div>
                  {!!service.duration && (
                    <div className="mt-1 text-[11px]" style={{ color: theme.colors.textFaint }}>
                      {service.duration}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 whitespace-nowrap text-[17px] font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
                  {service.price}
                </div>
              </div>
            )
          }

          return (
            <div
              key={i}
              className="flex items-center gap-3.5 rounded-[20px] border p-5"
              style={{ borderColor: theme.colors.cardBorder, background: theme.colors.cardBg }}
            >
              <div
                className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-[14px]"
                style={{ background: theme.accentBackground, color: theme.colors.accentOn }}
              >
                <ServiceGlyph iconName={service.icon} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 font-semibold" style={{ color: theme.colors.text }}>
                  {service.name}
                </div>
                <div className="text-[13px]" style={{ color: theme.colors.textMuted }}>
                  {service.description}
                </div>
                {!!service.duration && (
                  <div className="mt-1 text-[11px]" style={{ color: theme.colors.textFaint }}>
                    {service.duration}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 whitespace-nowrap text-[15px] font-bold" style={gradTextStyle}>
                {service.price}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
