import {
  Smartphone,
  BookOpen,
  TrendingDown,
  CheckCircle,
  Scissors,
} from "lucide-react";
import { RevealWrapper } from "@/components/ui/RevealWrapper";

const PAINS = [
  {
    icon: Smartphone,
    title: "Citas por WhatsApp que se pierden",
    description:
      "Mensajes enterrados entre conversaciones, citas duplicadas sin querer, clientes que no aparecen.",
    color: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
    textColor: "text-red-700 dark:text-red-400",
    iconColor: "text-red-500",
  },
  {
    icon: BookOpen,
    title: "Cuadernos que nadie entiende",
    description:
      "Letra ilegible, tachones, páginas perdidas. No sabes quién atendió qué ni cuánto cobró.",
    color:
      "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900",
    textColor: "text-orange-700 dark:text-orange-400",
    iconColor: "text-orange-500",
  },
  {
    icon: TrendingDown,
    title: "No sabes cuánto ganaste este mes",
    description:
      "El dinero pasa por muchas manos. Al final del mes las cuentas no cierran y el estrés se acumula.",
    color:
      "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900",
    textColor: "text-yellow-700 dark:text-yellow-500",
    iconColor: "text-yellow-500",
  },
];

const SOLUTIONS = [
  { text: "Agenda digital sin conflictos" },
  { text: "Historial de clientes automático" },
  { text: "Finanzas en tiempo real" },
];

export function PainSection() {
  return (
    <section className="px-4 py-20 md:py-28 bg-zinc-50 dark:bg-zinc-900/30">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <RevealWrapper variant="up">
          <div className="text-center mb-14">
            <span className="text-accent font-semibold text-sm uppercase tracking-widest">
              El problema
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mt-3 text-zinc-900 dark:text-zinc-100">
              ¿Cómo gestionas tu negocio hoy?
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-4 max-w-xl mx-auto">
              Si te identificas con alguna de estas situaciones, SalonPro es
              para ti.
            </p>
          </div>
        </RevealWrapper>

        {/* Dos columnas: dolor → solución */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Dolores */}
          <div className="space-y-4">
            {PAINS.map((pain, i) => (
              <RevealWrapper key={pain.title} variant="left" delay={i * 100}>
                <div
                  className={`flex items-start gap-4 p-5 rounded-2xl border ${pain.color}`}
                >
                  <div className={`flex-shrink-0 mt-0.5 ${pain.iconColor}`}>
                    <pain.icon size={28} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className={`font-bold ${pain.textColor}`}>
                      {pain.title}
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
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
              <div className="hidden lg:flex flex-col items-center gap-2 text-zinc-400">
                <div className="w-0.5 h-8 bg-zinc-300 dark:bg-zinc-700" />
                <span className="text-3xl">→</span>
              </div>

              <div className="w-full bg-gradient-to-br from-primary to-primary/80 rounded-2xl p-8 text-white shadow-xl shadow-primary/20">
                <div className="mb-4 text-white/80">
                  <Scissors size={36} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-bold mb-2">Con SalonPro</h3>
                <p className="text-white/80 mb-6 text-sm">
                  Todo organizado, en tu celular, en tiempo real.
                </p>
                <ul className="space-y-3">
                  {SOLUTIONS.map((s) => (
                    <li
                      key={s.text}
                      className="flex items-center gap-3 text-sm"
                    >
                      <CheckCircle
                        size={18}
                        strokeWidth={2}
                        className="text-accent flex-shrink-0"
                      />
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ul>
                <a
                  href="#precios"
                  className="inline-block mt-6 bg-accent text-black font-bold px-6 py-3 rounded-full text-sm hover:bg-accent/90 transition-colors"
                >
                  Probar 14 días gratis
                </a>
              </div>
            </div>
          </RevealWrapper>
        </div>
      </div>
    </section>
  );
}
