import { TESTIMONIALS } from '@/lib/constants'
import { TestimonialCard } from '@/components/ui/TestimonialCard'
import { RevealWrapper } from '@/components/ui/RevealWrapper'

const METRICS = [
  { value: 'Beta', label: 'Acceso anticipado abierto' },
  { value: '50', label: 'Primeros negocios con 40% off' },
  { value: '14 días', label: 'Prueba gratuita sin tarjeta' },
  { value: 'LATAM', label: 'Venezuela · Perú · Colombia' },
]

export function SocialProofSection() {
  return (
    <section className="bg-zinc-50 px-4 py-20 dark:bg-zinc-900/30 md:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <RevealWrapper variant="up">
          <div className="mb-14 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-accent">
              Resultados reales
            </span>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100 md:text-5xl">
              Lo que dicen nuestros clientes
            </h2>
          </div>
        </RevealWrapper>

        {/* Métricas */}
        <div className="mb-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          {METRICS.map((m, i) => (
            <RevealWrapper key={m.label} variant="up" delay={i * 80}>
              <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="mb-2 text-4xl font-bold text-primary md:text-5xl">{m.value}</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">{m.label}</p>
              </div>
            </RevealWrapper>
          ))}
        </div>

        {/* Testimonios */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <RevealWrapper key={t.name} variant="up" delay={i * 120}>
              <TestimonialCard {...t} />
            </RevealWrapper>
          ))}
        </div>
      </div>
    </section>
  )
}
