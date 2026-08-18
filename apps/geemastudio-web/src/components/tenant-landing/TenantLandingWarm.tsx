import { Calendar, MapPin, Scissors } from 'lucide-react'
import type { TenantLandingProps } from '@/types/tenant-landing'
import { BookingButton } from './shared/BookingButton'
import { ReviewStars } from './shared/ReviewStars'
import { ServiceGlyph } from './shared/ServiceGlyph'
import { WhatsAppFAB } from './shared/WhatsAppFAB'

export function TenantLandingWarm({ data }: TenantLandingProps) {
  const {
    businessName,
    heroTagline,
    tagline,
    services,
    reviews,
    whatsapp,
    instagram,
    address,
    city,
    statClients,
    statRating,
    statYears,
  } = data

  const subtitle =
    heroTagline ??
    tagline ??
    `Servicio artesanal y técnica moderna. Reserva tu turno en ${city ?? 'tu ciudad'}.`

  const parts = businessName.trim().split(/\s+/)
  const firstWord = parts[0] ?? businessName
  const restName = parts.slice(1).join(' ')

  return (
    <div
      className="min-h-screen text-[#2a1f1a]"
      style={{ background: '#faf7f2', fontFamily: 'system-ui, sans-serif' }}
    >
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-[rgba(42,31,26,0.1)] bg-[#faf7f2] px-5 py-4">
        <div className="text-lg font-extrabold">
          {firstWord} <span className="text-[#b5451b]">{restName || '\u00A0'}</span>
        </div>
        <BookingButton
          phone={whatsapp}
          businessName={businessName}
          label="Reservar"
          className="inline-block rounded-[10px] bg-[#2a1f1a] px-[18px] py-2.5 text-[13px] font-semibold text-[#faf7f2] no-underline"
        />
      </nav>

      <section className="bg-gradient-to-b from-[#faf7f2] to-[#f2ece2] px-5 pb-12 pt-14">
        <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[rgba(181,69,27,0.1)] px-3.5 py-1.5 text-xs font-semibold text-[#b5451b]">
          <Scissors size={14} aria-hidden />
          {city ?? 'Tu ciudad'}
        </div>
        <h1 className="mb-3.5 text-4xl font-extrabold leading-tight tracking-tight">
          {businessName}
          <span className="text-[#b5451b]">.</span>
        </h1>
        <p className="mb-6 text-base leading-relaxed text-[rgba(42,31,26,0.65)]">{subtitle}</p>
        <BookingButton
          phone={whatsapp}
          businessName={businessName}
          label="Reservar mi turno"
          className="mb-2.5 block rounded-xl bg-[#2a1f1a] py-4 text-center text-[15px] font-bold text-[#faf7f2] no-underline"
        />
        <div className="mt-8 flex overflow-hidden rounded-2xl border border-[rgba(42,31,26,0.1)] bg-white">
          {[
            { value: statClients, label: 'Clientes' },
            { value: statRating, label: 'Google' },
            { value: statYears, label: 'Años' },
          ].map((stat, i) => (
            <div
              key={i}
              className="flex-1 border-r border-[rgba(42,31,26,0.08)] px-3 py-4 text-center last:border-r-0"
            >
              <div className="text-2xl font-extrabold text-[#b5451b]">{stat.value}</div>
              <div className="mt-1 text-[11px] text-[rgba(42,31,26,0.5)]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-5 h-px bg-[rgba(42,31,26,0.1)]" />

      {services.length > 0 && (
        <section className="px-5 py-14">
          <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-[rgba(42,31,26,0.45)]">
            Servicios
          </p>
          <h2 className="mb-5 text-[26px] font-extrabold">Nuestros servicios</h2>
          {services.map((service, i) => (
            <div
              key={i}
              className="mb-2.5 rounded-2xl border border-[rgba(42,31,26,0.08)] bg-white p-5 last:mb-0"
            >
              <div className="mb-1.5 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-1 flex items-center gap-2 text-[15px] font-bold">
                    <ServiceGlyph
                      iconName={service.icon}
                      size={20}
                      className="inline text-[#b5451b]"
                    />
                    <span>{service.name}</span>
                  </div>
                  <div className="text-[13px] leading-relaxed text-[rgba(42,31,26,0.55)]">
                    {service.description}
                  </div>
                </div>
                <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-[rgba(201,133,10,0.12)] px-3 py-1 text-xs font-bold text-[#c9850a]">
                  {service.price}
                </span>
              </div>
              {!!service.duration && (
                <div className="text-xs text-[rgba(42,31,26,0.4)]">{service.duration}</div>
              )}
            </div>
          ))}
        </section>
      )}

      {reviews.length > 0 && (
        <section className="bg-[#f0e8da] px-5 py-14">
          <p className="mb-1 text-[11px] uppercase tracking-[0.2em] text-[rgba(42,31,26,0.45)]">
            Reseñas
          </p>
          <h2 className="mb-5 text-[26px] font-extrabold">Lo que dicen</h2>
          {reviews.map((review, i) => (
            <div
              key={i}
              className="mb-2.5 rounded-2xl border border-[rgba(42,31,26,0.07)] bg-white p-5 last:mb-0"
            >
              <ReviewStars color="#c9850a" className="mb-2" />
              <p className="text-sm leading-relaxed text-[rgba(42,31,26,0.75)]">
                &ldquo;{review.text}&rdquo;
              </p>
              <div className="mt-3.5 flex items-center gap-2.5">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#b5451b] to-[#c9850a] text-[13px] font-bold text-white">
                  {review.initial}
                </div>
                <div>
                  <div className="text-[13px] font-bold">{review.author}</div>
                  <div className="text-[11px] text-[rgba(42,31,26,0.45)]">{review.role}</div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="bg-[#2a1f1a] px-5 py-14 text-center">
        <Calendar
          className="mx-auto mb-3.5 text-[#faf7f2]"
          size={36}
          strokeWidth={1.5}
          aria-hidden
        />
        <h2 className="mb-2.5 text-3xl font-extrabold text-[#faf7f2]">¿Listo para reservar?</h2>
        <p className="mb-6 text-sm leading-relaxed text-[rgba(250,247,242,0.6)]">
          Sin llamadas. Sin esperas. Elige tu hora en segundos.
        </p>
        <BookingButton
          phone={whatsapp}
          businessName={businessName}
          label="Reservar por WhatsApp"
          className="block rounded-xl bg-[#b5451b] py-4 text-center text-[15px] font-bold text-[#faf7f2] no-underline"
        />
      </section>

      <footer className="bg-[#1e1410] px-5 py-10 text-[rgba(250,247,242,0.6)]">
        <div className="mb-2.5 text-lg font-extrabold text-[#faf7f2]">{businessName}</div>
        {(address || city) && (
          <p className="mb-3.5 flex items-start gap-2 text-sm">
            <MapPin className="mt-0.5 flex-shrink-0 opacity-70" size={14} />
            <span>{[address, city].filter(Boolean).join(' · ')}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-1">
          {whatsapp && (
            <span className="inline-block rounded-full bg-[rgba(250,247,242,0.08)] px-3.5 py-1.5 text-xs text-[rgba(250,247,242,0.7)]">
              WhatsApp
            </span>
          )}
          {instagram && (
            <span className="inline-block rounded-full bg-[rgba(250,247,242,0.08)] px-3.5 py-1.5 text-xs text-[rgba(250,247,242,0.7)]">
              Instagram
            </span>
          )}
        </div>
        <p className="mt-5 border-t border-[rgba(250,247,242,0.07)] pt-4 text-[11px] text-[rgba(250,247,242,0.2)]">
          Creado con{' '}
          <a href="/" className="text-[rgba(250,247,242,0.3)] no-underline hover:underline">
            GeemaStudio
          </a>
        </p>
      </footer>

      <WhatsAppFAB phone={whatsapp} businessName={businessName} />
    </div>
  )
}
