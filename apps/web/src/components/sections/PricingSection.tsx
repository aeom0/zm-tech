"use client";

import { useState } from "react";
import { PLANS, COMPARISON_FEATURES } from "@/lib/constants";
import { PricingCard } from "@/components/ui/PricingCard";
import { RevealWrapper } from "@/components/ui/RevealWrapper";

export function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  return (
    <section id="precios" className="px-4 py-20 md:py-28 bg-white dark:bg-zinc-950">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <RevealWrapper variant="up">
        <div className="text-center mb-12">
          <span className="text-accent font-semibold text-sm uppercase tracking-widest">
            Precios
          </span>
          <h2 className="text-3xl md:text-5xl font-bold mt-3 text-zinc-900 dark:text-zinc-100">
            Planes para cada etapa
          </h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-4 max-w-xl mx-auto">
            14 días gratis en todos los planes. Sin tarjeta de crédito.
          </p>

          {/* Toggle mensual / anual */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <span
              className={`text-sm font-medium transition-colors duration-300 ${
                !annual ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600"
              }`}
            >
              Mensual
            </span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                annual ? "bg-primary" : "bg-zinc-300 dark:bg-zinc-700"
              }`}
              aria-label="Cambiar entre mensual y anual"
              role="switch"
              aria-checked={annual}
            >
              <span
                className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
                  annual ? "translate-x-7" : ""
                }`}
              />
            </button>
            <span
              className={`text-sm font-medium transition-colors duration-300 ${
                annual ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-600"
              }`}
            >
              Anual
              <span
                className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full transition-all duration-300 ${
                  annual
                    ? "bg-accent text-black"
                    : "bg-accent/20 text-accent"
                }`}
              >
                −20%
              </span>
            </span>
          </div>
        </div>
        </RevealWrapper>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end mb-12">
          {PLANS.map((plan, i) => (
            <RevealWrapper key={plan.name} variant="up" delay={i * 100}>
              <PricingCard plan={plan} annual={annual} />
            </RevealWrapper>
          ))}
        </div>

        {/* Nota */}
        <p className="text-center text-sm text-zinc-500 dark:text-zinc-400 mb-8">
          14 días gratis · Sin tarjeta de crédito · Cancela cuando quieras
        </p>

        {/* Comparativa desplegable */}
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="w-full flex items-center justify-between px-6 py-4 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
          >
            <span>Ver comparativa completa de planes</span>
            <span
              className={`transition-transform duration-300 ${
                showComparison ? "rotate-180" : ""
              }`}
            >
              ▼
            </span>
          </button>

          {showComparison && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900">
                    <th className="text-left px-6 py-3 text-zinc-500 font-medium">
                      Función
                    </th>
                    {PLANS.map((p) => (
                      <th
                        key={p.name}
                        className={`px-6 py-3 font-bold text-center ${
                          p.highlighted ? "text-primary" : "text-zinc-700 dark:text-zinc-300"
                        }`}
                      >
                        {p.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_FEATURES.map((feat, i) => (
                    <tr
                      key={feat.label}
                      className={
                        i % 2 === 0
                          ? "bg-white dark:bg-zinc-950"
                          : "bg-zinc-50 dark:bg-zinc-900"
                      }
                    >
                      <td className="px-6 py-3 text-zinc-700 dark:text-zinc-300">
                        {feat.label}
                      </td>
                      {[feat.basic, feat.pro, feat.elite].map((has, j) => (
                        <td key={j} className="px-6 py-3 text-center">
                          {has ? (
                            <span className="text-primary font-bold">✓</span>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-700">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
