import type { CSSProperties } from 'react'
import { Scissors } from 'lucide-react'
import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'
import { BookingButton } from '../shared/BookingButton'
import { MarqueeBanner } from '../shared/MarqueeBanner'

interface HeroSectionProps {
  data: TenantLandingData
  theme: LandingTheme
}

function gradTextStyle(theme: LandingTheme): CSSProperties {
  return theme.useGradientText
    ? {
        backgroundImage: theme.accentBackground,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }
    : { color: theme.colors.accent }
}

export function HeroSection({ data, theme }: HeroSectionProps) {
  const { businessName, heroTagline, tagline, whatsapp, instagram, city, heroVideoUrl, marqueeText } = data

  const subtitle =
    heroTagline ??
    tagline ??
    (theme.id === 'elegant'
      ? `Reserva tu cita en segundos. Atención profesional en ${city ?? 'tu ciudad'}.`
      : theme.id === 'warm'
        ? `Servicio artesanal y técnica moderna. Reserva tu turno en ${city ?? 'tu ciudad'}.`
        : `Cortes, color y tratamientos. El equipo más profesional de ${city ?? 'tu ciudad'}.`)

  const hasVideo = !!heroVideoUrl
  const sectionPadding =
    theme.id === 'elegant' ? 'px-6 pb-16 pt-16 text-center' : theme.id === 'warm' ? 'px-5 pb-12 pt-14' : 'px-5 pb-10 pt-12'

  return (
    <>
      <section
        className={`relative overflow-hidden ${sectionPadding}`}
        style={{
          background:
            theme.id === 'warm' && !hasVideo ? 'linear-gradient(to bottom, #faf7f2, #f2ece2)' : undefined,
        }}
      >
        {hasVideo && (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
              src={heroVideoUrl ?? undefined}
            />
            <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.55)' }} />
          </>
        )}
        <div className="relative z-[1]" style={{ color: hasVideo ? '#ffffff' : theme.colors.text }}>
          {theme.id === 'elegant' && (
            <div
              className="mb-5 inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium"
              style={{
                borderColor: theme.colors.badgeBorder,
                background: theme.colors.badgeBg,
                color: theme.colors.badgeText,
              }}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: theme.colors.accent }} aria-hidden />
              Agenda abierta
            </div>
          )}
          {theme.id === 'warm' && (
            <div
              className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold"
              style={{ background: theme.colors.badgeBg, color: theme.colors.badgeText }}
            >
              <Scissors size={14} aria-hidden />
              {city ?? 'Tu ciudad'}
            </div>
          )}
          {theme.id === 'modern' && (
            <div
              className="-mb-3 text-[80px] font-black leading-none tracking-tighter"
              style={{ color: 'rgba(29,29,31,0.07)' }}
              aria-hidden
            >
              01
            </div>
          )}

          {theme.id === 'elegant' && (
            <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight">
              Tu belleza,
              <br />
              <span style={gradTextStyle(theme)}>sin esperar</span>
            </h1>
          )}
          {theme.id === 'warm' && (
            <h1 className="mb-3.5 text-4xl font-extrabold leading-tight tracking-tight">
              {businessName}
              <span style={{ color: theme.colors.accent }}>.</span>
            </h1>
          )}
          {theme.id === 'modern' && (
            <h1 className="relative z-[1] text-[38px] font-black leading-tight tracking-tight">
              {businessName}
              <br />
              <span style={{ color: theme.colors.accent }}>en {city ?? 'tu ciudad'}.</span>
            </h1>
          )}

          <p
            className={
              theme.id === 'elegant'
                ? 'mx-auto mb-7 max-w-[340px] text-base leading-relaxed'
                : theme.id === 'warm'
                  ? 'mb-6 text-base leading-relaxed'
                  : 'mt-3.5 max-w-[320px] text-[15px] leading-relaxed'
            }
            style={{ color: hasVideo ? 'rgba(255,255,255,0.85)' : theme.colors.textMuted }}
          >
            {subtitle}
          </p>

          {theme.id === 'modern' ? (
            <div className="mt-5 flex gap-2.5">
              <BookingButton
                phone={whatsapp}
                businessName={businessName}
                label="Reservar cita"
                className="block flex-1 py-4 text-center text-[15px] font-bold no-underline"
                style={{ background: theme.colors.ctaBg, color: theme.colors.ctaText, borderRadius: '14px' }}
              />
              {instagram && (
                <a
                  href={`https://instagram.com/${instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="whitespace-nowrap border px-4 py-4 text-center text-[15px] font-semibold no-underline"
                  style={{
                    borderRadius: '14px',
                    borderColor: theme.colors.cardBorder,
                    background: theme.colors.cardBg,
                    color: theme.colors.text,
                  }}
                >
                  Ver trabajo
                </a>
              )}
            </div>
          ) : (
            <>
              <BookingButton
                phone={whatsapp}
                businessName={businessName}
                label={theme.id === 'elegant' ? 'Reservar cita ahora' : 'Reservar mi turno'}
                className="mb-2.5 block py-4 text-center text-[15px] font-bold no-underline"
                style={{
                  background: theme.accentBackground,
                  color: theme.colors.accentOn,
                  borderRadius: theme.id === 'elegant' ? '9999px' : '12px',
                }}
              />
              {theme.id === 'elegant' && instagram && (
                <a
                  href={`https://instagram.com/${instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-full border py-3.5 text-center text-[14px] font-semibold no-underline"
                  style={{ borderColor: 'rgba(240,237,232,0.2)', color: theme.colors.text }}
                >
                  Ver nuestro trabajo
                </a>
              )}
            </>
          )}
        </div>
      </section>
      {marqueeText && <MarqueeBanner text={marqueeText} theme={theme} />}
    </>
  )
}
