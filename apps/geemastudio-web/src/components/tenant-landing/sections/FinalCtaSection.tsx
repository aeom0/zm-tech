import { Calendar } from 'lucide-react'
import type { TenantLandingData } from '@/types/tenant-landing'
import type { LandingTheme } from '../theme/types'
import { BookingButton } from '../shared/BookingButton'

interface FinalCtaSectionProps {
  data: TenantLandingData
  theme: LandingTheme
}

export function FinalCtaSection({ data, theme }: FinalCtaSectionProps) {
  const { businessName, whatsapp } = data

  const heading =
    theme.id === 'elegant' ? '¿Lista para tu cita?' : theme.id === 'warm' ? '¿Listo para reservar?' : 'Reserva en 30 segundos'
  const body =
    theme.id === 'elegant' ? 'Reserva en segundos. Sin llamadas, sin cola.' : 'Sin llamadas. Sin esperas. Elige tu servicio y tu hora.'

  if (theme.id === 'elegant') {
    return (
      <section className="px-6 py-14">
        <div
          className="rounded-3xl border px-6 py-8 text-center"
          style={{ borderColor: theme.colors.badgeBorder, background: theme.colors.ctaBg }}
        >
          <Calendar className="mx-auto mb-3" size={36} strokeWidth={1.5} style={{ color: theme.colors.text }} aria-hidden />
          <h2 className="mb-2.5 text-2xl font-extrabold tracking-tight" style={{ color: theme.colors.text }}>
            {heading}
          </h2>
          <p className="mb-6 text-sm leading-relaxed" style={{ color: theme.colors.textMuted }}>
            {body}
          </p>
          <BookingButton
            phone={whatsapp}
            businessName={businessName}
            label="Reservar por WhatsApp"
            className="block py-4 text-center text-[15px] font-bold no-underline"
            style={{ background: theme.accentBackground, color: theme.colors.accentOn, borderRadius: theme.radius.button }}
          />
        </div>
      </section>
    )
  }

  if (theme.id === 'warm') {
    return (
      <section className="px-5 py-14 text-center" style={{ background: theme.colors.ctaBg }}>
        <Calendar className="mx-auto mb-3.5" size={36} strokeWidth={1.5} style={{ color: theme.colors.ctaText }} aria-hidden />
        <h2 className="mb-2.5 text-3xl font-extrabold" style={{ color: theme.colors.ctaText }}>
          {heading}
        </h2>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: theme.colors.ctaTextMuted }}>
          {body}
        </p>
        <BookingButton
          phone={whatsapp}
          businessName={businessName}
          label="Reservar por WhatsApp"
          className="block py-4 text-center text-[15px] font-bold no-underline"
          style={{ background: theme.accentBackground, color: theme.colors.accentOn, borderRadius: '12px' }}
        />
      </section>
    )
  }

  return (
    <div className="px-5 pb-10">
      <div className="mt-10 rounded-3xl px-5 py-8 text-center" style={{ background: theme.colors.ctaBg }}>
        <Calendar className="mx-auto mb-3.5" size={36} strokeWidth={1.5} style={{ color: theme.colors.ctaText }} aria-hidden />
        <h2 className="mb-2.5 text-[26px] font-black tracking-tight" style={{ color: theme.colors.ctaText }}>
          Reserva en
          <br />
          30 segundos
        </h2>
        <p className="mb-6 text-sm leading-relaxed" style={{ color: theme.colors.ctaTextMuted }}>
          {body}
        </p>
        <BookingButton
          phone={whatsapp}
          businessName={businessName}
          label="Reservar por WhatsApp"
          className="block py-4 text-center text-[15px] font-extrabold no-underline"
          style={{ background: theme.accentBackground, color: theme.colors.accentOn, borderRadius: '14px' }}
        />
      </div>
    </div>
  )
}
