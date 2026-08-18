import { Smartphone, BookOpen, TrendingDown, CheckCircle } from 'lucide-react'
import Image from 'next/image'
import { RevealWrapper } from '@/components/ui/RevealWrapper'

const PAINS = [
  {
    icon: Smartphone,
    title: 'Citas por WhatsApp que se pierden',
    description:
      'Mensajes enterrados entre conversaciones, citas duplicadas sin querer, clientes que no aparecen.',
    color: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900',
    textColor: 'text-red-700 dark:text-red-400',
    iconColor: 'text-red-500',
  },
  {
    icon: BookOpen,
    title: 'Cuadernos que nadie entiende',
    description:
      'Letra ilegible, tachones, páginas perdidas. No sabes quién atendió qué ni cuánto cobró.',
    color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900',
    textColor: 'text-orange-700 dark:text-orange-400',
    iconColor: 'text-orange-500',
  },
  {
    icon: TrendingDown,
    title: 'No sabes cuánto ganaste este mes',
    description:
      'El dinero pasa por muchas manos. Al final del mes las cuentas no cierran y el estrés se acumula.',
    color: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900',
    textColor: 'text-yellow-700 dark:text-yellow-500',
    iconColor: 'text-yellow-500',
  },
]

const SOLUTIONS = [
  { text: 'Agenda digital sin conflictos' },
  { text: 'Historial de clientes automático' },
  { text: 'Finanzas en tiempo real' },
]

export function PainSection() {
  return (
    <section className="bg-zinc-50 px-4 py-20 dark:bg-zinc-900/30 md:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <RevealWrapper variant="up">
          <div className="mb-14 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-accent">
              El problema
            </span>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100 md:text-5xl">
              ¿Cómo gestionas tu negocio hoy?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-500 dark:text-zinc-400">
              Si te identificas con alguna de estas situaciones, GeemaStudio es para ti.
            </p>
          </div>
        </RevealWrapper>

        {/* Dos columnas: dolor → solución */}
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          {/* Dolores */}
          <div className="space-y-4">
            {PAINS.map((pain, i) => (
              <RevealWrapper key={pain.title} variant="left" delay={i * 100}>
                <div className={`flex items-start gap-4 rounded-2xl border p-5 ${pain.color}`}>
                  <div className={`mt-0.5 flex-shrink-0 ${pain.iconColor}`}>
                    <pain.icon size={28} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className={`font-bold ${pain.textColor}`}>{pain.title}</h3>
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {pain.description}
                    </p>
                  </div>
                </div>
              </RevealWrapper>
            ))}
          </div>

          {/* Flecha + Solución */}
          <RevealWrapper variant="right">
            <div className="flex flex-col items-center gap-6">
              <div className="hidden flex-col items-center gap-2 text-zinc-400 lg:flex">
                <div className="h-8 w-0.5 bg-zinc-300 dark:bg-zinc-700" />
                <span className="text-3xl">→</span>
              </div>

              <div className="w-full rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-8 text-white shadow-xl shadow-primary/20">
                <div className="mb-4">
                  <Image
                    src="/logo-diamondSparkle.svg"
                    alt="GeemaStudio"
                    width={40}
                    height={46}
                    className="h-10 w-auto opacity-90"
                  />
                </div>
                <h3 className="mb-2 text-2xl font-bold">Con GeemaStudio</h3>
                <p className="mb-6 text-sm text-white/80">
                  Todo organizado, en tu celular, en tiempo real.
                </p>
                <ul className="space-y-3">
                  {SOLUTIONS.map((s) => (
                    <li key={s.text} className="flex items-center gap-3 text-sm">
                      <CheckCircle
                        size={18}
                        strokeWidth={2}
                        className="flex-shrink-0 text-accent"
                      />
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#precios"
                  className="mt-6 inline-block rounded-full bg-accent px-6 py-3 text-sm font-bold text-black transition-colors hover:bg-accent/90"
                >
                  Probar 14 días gratis
                </a>
              </div>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  )
}
