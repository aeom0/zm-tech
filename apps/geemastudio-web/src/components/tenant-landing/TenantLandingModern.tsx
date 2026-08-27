import Link from 'next/link'
import { Calendar, MapPin } from 'lucide-react'
import type { TenantLandingProps } from '@/types/tenant-landing'
import { BookingButton } from './shared/BookingButton'
import { ReviewStars } from './shared/ReviewStars'
import { ServiceGlyph } from './shared/ServiceGlyph'
import { WhatsAppFAB } from './shared/WhatsAppFAB'

export function TenantLandingModern({ data }: TenantLandingProps) {
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
    `Cortes, color y tratamientos. El equipo más profesional de ${city ?? 'tu ciudad'}.`

  const words = businessName.trim().split(/\s+/).filter(Boolean)
  const nameHead = words.length > 1 ? words.slice(0, -1).join(' ') : ''
  const nameTail = words.length > 1 ? words[words.length - 1]! : (words[0] ?? businessName)

  return (
    <div
      className="min-h-screen text-[#1d1d1f]"
      style={{ background: '#f5f5f7', fontFamily: 'system-ui, sans-serif' }}
    >
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-black/[0.07] bg-[rgba(245,245,247,0.85)] px-5 py-4 backdrop-blur-xl">
        <div className="text-[17px] font-extrabold">
          {nameHead ? (
            <>
              <span className="text-[#1d1d1f]">{nameHead} </span>
              <strong className="text-[#00b87a]">{nameTail}</strong>
            </>
          ) : (
            <strong className="text-[#00b87a]">{nameTail}</strong>
          )}
        </div>
        <BookingButton
          phone={whatsapp}
          businessName={businessName}
          label="Reservar →"
          className="inline-block rounded-full bg-[#1d1d1f] px-5 py-2.5 text-[13px] font-semibold text-[#f5f5f7] no-underline"
        />
      </nav>

      <section className="px-5 pb-10 pt-12">
        <div
          className="-mb-3 text-[80px] font-black leading-none tracking-tighter text-[rgba(29,29,31,0.07)]"
          aria-hidden
        >
          01
        </div>
        <h1 className="relative z-[1] text-[38px] font-black leading-tight tracking-tight">
          {businessName}
          <br />
          <span className="text-[#00b87a]">en {city ?? 'tu ciudad'}.</span>
        </h1>
        <p className="mt-3.5 max-w-[320px] text-[15px] leading-relaxed text-[rgba(29,29,31,0.55)]">
          {subtitle}
        </p>
        <div className="mt-5 flex gap-2.5">
          <BookingButton
            phone={whatsapp}
            businessName={businessName}
            label="Reservar cita"
            className="block flex-1 rounded-[14px] bg-[#1d1d1f] py-4 text-center text-[15px] font-bold text-[#f5f5f7] no-underline"
          />
          {instagram && (
            <a
              href={`https://instagram.com/${instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap rounded-[14px] border border-black/10 bg-white px-4 py-4 text-center text-[15px] font-semibold text-[#1d1d1f] no-underline"
            >
              Ver trabajo
            </a>
          )}
        </div>
        <div className="mt-6 grid grid-cols-3 gap-2.5">
          {[
            { value: statClients, label: 'Clientes', accent: false },
            { value: statRating, label: 'Rating', accent: true },
            { value: statYears, label: 'Años', accent: false },
          ].map((stat, i) => (
            <div
              key={i}
              className="rounded-[14px] border border-black/[0.06] bg-white px-3 py-4 text-center"
            >
              <div
                className="text-[22px] font-black tracking-tight"
                style={{ color: stat.accent ? '#00b87a' : '#1d1d1f' }}
              >
                {stat.value}
              </div>
              <div className="mt-1 text-[11px] text-[rgba(29,29,31,0.45)]">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-5 h-px bg-black/[0.08]" />

      {services.length > 0 && (
        <section className="px-5 py-12">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[#00b87a]">
            Servicios
          </div>
          <h2 className="mb-[18px] text-[28px] font-black tracking-tight">¿Qué necesitas hoy?</h2>
          {services.map((service, i) => (
            <div
              key={i}
              className="mb-2.5 flex items-center gap-3.5 rounded-[18px] border border-black/[0.06] bg-white p-[18px] last:mb-0"
            >
              <div className="flex h-[50px] w-[50px] flex-shrink-0 items-center justify-center rounded-[14px] bg-[rgba(0,184,122,0.1)] text-[#00b87a]">
                <ServiceGlyph iconName={service.icon} size={24} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="mb-0.5 text-[15px] font-bold">{service.name}</div>
                <div className="text-xs text-[rgba(29,29,31,0.5)]">{service.description}</div>
                {!!service.duration && (
                  <div className="mt-1 text-[11px] text-[rgba(29,29,31,0.35)]">
                    {service.duration}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0 whitespace-nowrap text-[17px] font-extrabold tracking-tight">
                {service.price}
              </div>
            </div>
          ))}
        </section>
      )}

      {reviews.length > 0 && (
        <section className="bg-[#ebebed] px-5 py-12">
          <div className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-[#00b87a]">
            Reseñas
          </div>
          <h2 className="mb-[18px] text-[28px] font-black tracking-tight">
            Ellas confían
            <br />
            en nosotras.
          </h2>
          {reviews.map((review, i) => (
            <div
              key={i}
              className="mb-2.5 rounded-[18px] border border-black/[0.06] bg-white p-5 last:mb-0"
            >
              <ReviewStars color="#00b87a" className="mb-2" />
              <p className="text-sm leading-relaxed text-[rgba(29,29,31,0.75)]">
                &ldquo;{review.text}&rdquo;
              </p>
              <div className="mt-3.5 flex items-center gap-2.5">
                <div className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full bg-[#00b87a] text-sm font-extrabold text-white">
                  {review.initial}
                </div>
                <div>
                  <div className="text-[13px] font-bold">{review.author}</div>
                  <div className="text-[11px] text-[rgba(29,29,31,0.4)]">{review.role}</div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="px-5 pb-10">
        <div className="mt-10 rounded-3xl bg-[#1d1d1f] px-5 py-8 text-center">
          <Calendar
            className="mx-auto mb-3.5 text-[#f5f5f7]"
            size={36}
            strokeWidth={1.5}
            aria-hidden
          />
          <h2 className="mb-2.5 text-[26px] font-black tracking-tight text-[#f5f5f7]">
            Reserva en
            <br />
            30 segundos
          </h2>
          <p className="mb-6 text-sm leading-relaxed text-[rgba(245,245,247,0.55)]">
            Sin llamadas. Sin esperas. Elige tu servicio y tu hora.
          </p>
          <BookingButton
            phone={whatsapp}
            businessName={businessName}
            label="Reservar por WhatsApp"
            className="block rounded-[14px] bg-[#00b87a] py-4 text-center text-[15px] font-extrabold text-white no-underline"
          />
        </div>
      </div>

      <footer className="border-t border-black/[0.08] bg-[#f5f5f7] px-5 py-10">
        <div className="text-[17px] font-extrabold">
          {nameHead ? (
            <>
              <span className="text-[#1d1d1f]">{nameHead} </span>
              <strong className="text-[#00b87a]">{nameTail}</strong>
            </>
          ) : (
            <strong className="text-[#00b87a]">{nameTail}</strong>
          )}
        </div>
        {(address || city) && (
          <p className="mt-1.5 flex items-start gap-2 text-sm text-[rgba(29,29,31,0.5)]">
            <MapPin className="mt-0.5 flex-shrink-0" size={14} />
            <span>{[address, city].filter(Boolean).join(' · ')}</span>
          </p>
        )}
        <div className="mt-3.5 flex flex-wrap gap-1">
          {whatsapp && (
            <span className="inline-block rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-xs text-[rgba(29,29,31,0.6)]">
              WhatsApp
            </span>
          )}
          {instagram && (
            <span className="inline-block rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-xs text-[rgba(29,29,31,0.6)]">
              {instagram}
            </span>
          )}
        </div>
        <p className="mt-4 border-t border-black/[0.07] pt-3.5 text-[11px] text-[rgba(29,29,31,0.25)]">
          Creado con{' '}
          <Link href="/" className="text-[rgba(29,29,31,0.35)] no-underline hover:underline">
            GeemaStudio
          </Link>
        </p>
      </footer>

      <WhatsAppFAB phone={whatsapp} businessName={businessName} />
    </div>
  )
}
