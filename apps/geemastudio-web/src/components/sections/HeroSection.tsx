import { BUSINESS_TYPES } from '@/lib/constants'
import { AppMockup } from '@/components/ui/AppMockup'
import { GradientButton } from '@/components/ui/GradientButton'
import { LUNARIS } from '@/lib/theme'
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Zap } from 'lucide-react'

export function HeroSection() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-[#0F0A14]">
      {/* Gradiente de fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F0A14] via-primary/15 to-[#0F0A14]" />
      <div className="absolute left-0 top-0 h-[600px] w-[600px] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 pb-16 pt-24">
        {/* Layout: columna en mobile, 2 columnas en desktop */}
        <div className="flex flex-col items-center gap-12 lg:flex-row lg:gap-16">
          {/* Columna izquierda — texto */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
              <Zap size={15} strokeWidth={2} className="flex-shrink-0 text-accent" />
              <span>Gestión inteligente para tu negocio</span>
            </div>

            {/* Headline */}
            <h1 className="mb-6 text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              El software que tu{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: LUNARIS.gradient.css,
                }}
              >
                salón merece
              </span>
              <br />
              <span className="text-3xl font-semibold text-white/80 md:text-4xl lg:text-5xl">
                y que tus clientes van a notar.
              </span>
            </h1>

            {/* Subtítulo */}
            <p className="mx-auto mb-10 max-w-xl text-lg leading-relaxed text-white/70 lg:mx-0">
              Agenda, personal, inventario y finanzas en un solo lugar. Sin papeles, WhatsApp con
              citas automáticas y Asistente IA. Todo en orden, siempre.
            </p>

            {/* CTAs */}
            <div className="mb-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
              <GradientButton href="#precios" size="lg">
                Comenzar gratis — 14 días
              </GradientButton>
              <GradientButton href="#demo" size="lg" outline>
                Ver demo en vivo →
              </GradientButton>
            </div>

            {/* Tipos de negocio */}
            <div className="flex flex-wrap justify-center gap-3 lg:justify-start">
              {BUSINESS_TYPES.map((t) => {
                const IconComponent = (LucideIcons as unknown as Record<string, LucideIcon>)[t.icon]
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white/80 backdrop-blur-sm"
                  >
                    {IconComponent && <IconComponent size={14} strokeWidth={2} />}
                    <span>{t.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Columna derecha — mockup animado */}
          <div className="w-full max-w-[300px] flex-shrink-0 lg:max-w-[320px]">
            <AppMockup />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="flex h-10 w-6 items-start justify-center rounded-full border-2 border-white/30 p-1.5">
          <div className="h-3 w-1.5 animate-pulse rounded-full bg-white/50" />
        </div>
      </div>
    </section>
  )
}
