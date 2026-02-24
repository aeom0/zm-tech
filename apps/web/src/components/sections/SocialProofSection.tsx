import { TESTIMONIALS } from "@/lib/constants";
import { TestimonialCard } from "@/components/ui/TestimonialCard";

const METRICS = [
  { value: "500+", label: "Negocios activos" },
  { value: "98%", label: "Satisfacción" },
  { value: "40%", label: "Menos ausencias" },
  { value: "2h", label: "Ahorradas por semana" },
];

export function SocialProofSection() {
  return (
    <section className="px-4 py-20 md:py-28 bg-zinc-50 dark:bg-zinc-900/30">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-14">
          <span className="text-accent font-semibold text-sm uppercase tracking-widest">
            Resultados reales
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mt-3 text-zinc-900 dark:text-zinc-100">
            Lo que dicen nuestros clientes
          </h2>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {METRICS.map((m) => (
            <div
              key={m.label}
              className="text-center p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm"
            >
              <p className="text-4xl md:text-5xl font-bold text-primary mb-2">
                {m.value}
              </p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Testimonios */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </div>
      </div>
    </section>
  );
}
