import { RevealWrapper } from '@/components/ui/RevealWrapper'
import { GradientButton } from '@/components/ui/GradientButton'

export function CtaSection() {
  return (
    <section className="relative overflow-hidden px-4 py-24 md:py-32">
      {/* Fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F0A14] via-primary/60 to-[#0F0A14]" />
      <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-10 mx-auto max-w-3xl space-y-8 text-center">
        <RevealWrapper variant="up">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            Es el momento
          </p>
          <h2 className="text-3xl font-bold leading-tight text-white md:text-5xl">
            Tu competencia ya se está
            <br />
            <span className="text-accent">digitalizando. ¿Y tú?</span>
          </h2>
        </RevealWrapper>

        <RevealWrapper variant="up" delay={150}>
          <p className="mx-auto max-w-xl text-lg text-white/70">
            Únete a cientos de negocios que ya gestionan todo desde el celular. Empieza hoy, sin
            riesgos.
          </p>

          <div className="mt-4 flex flex-col justify-center gap-4 sm:flex-row">
            <GradientButton href="#precios" size="lg">
              Comenzar ahora — 14 días gratis
            </GradientButton>
          </div>

          <p className="mt-4 text-sm text-white/40">
            Sin tarjeta · Sin contrato · Cancela cuando quieras
          </p>
        </RevealWrapper>
      </div>
    </section>
  )
}
