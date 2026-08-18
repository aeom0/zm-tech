'use client'

import { useState } from 'react'
import { PLANS, COMPARISON_FEATURES, WABA_ADDON_TIERS } from '@/lib/constants'
import { PricingCard } from '@/components/ui/PricingCard'
import { RevealWrapper } from '@/components/ui/RevealWrapper'
import { MessageCircle, ChevronDown, Check } from 'lucide-react'

export function PricingSection() {
  const [annual, setAnnual] = useState(false)
  const [showComparison, setShowComparison] = useState(false)
  const [showAddon, setShowAddon] = useState(false)

  return (
    <section id="precios" className="bg-white px-4 py-20 dark:bg-zinc-950 md:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <RevealWrapper variant="up">
          <div className="mb-12 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-accent">
              Precios
            </span>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100 md:text-5xl">
              Planes para cada etapa
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-500 dark:text-zinc-400">
              14 días gratis en todos los planes. Sin tarjeta de crédito.
            </p>

            {/* Toggle mensual / anual */}
            <div className="mt-8 flex items-center justify-center gap-3">
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  !annual ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600'
                }`}
              >
                Mensual
              </span>
              <button
                onClick={() => setAnnual(!annual)}
                className={`relative h-7 w-14 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
                  annual ? 'bg-primary' : 'bg-zinc-300 dark:bg-zinc-700'
                }`}
                aria-label="Cambiar entre mensual y anual"
                role="switch"
                aria-checked={annual}
              >
                <span
                  className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
                    annual ? 'translate-x-7' : ''
                  }`}
                />
              </button>
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  annual ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-600'
                }`}
              >
                Anual
                <span
                  className={`ml-2 rounded-full px-2 py-0.5 text-xs font-bold transition-all duration-300 ${
                    annual ? 'bg-accent text-black' : 'bg-accent/20 text-accent'
                  }`}
                >
                  −20%
                </span>
              </span>
            </div>
          </div>
        </RevealWrapper>

        {/* Cards */}
        <div className="mb-12 grid grid-cols-1 items-end gap-6 md:grid-cols-3">
          {PLANS.map((plan, i) => (
            <RevealWrapper key={plan.name} variant="up" delay={i * 100}>
              <PricingCard plan={plan} annual={annual} />
            </RevealWrapper>
          ))}
        </div>

        {/* Nota */}
        <p className="mb-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          14 días gratis · Sin tarjeta de crédito · Cancela cuando quieras
        </p>

        {/* Add-on WABA */}
        <RevealWrapper variant="up" delay={150}>
          <div className="mb-8 overflow-hidden rounded-2xl border border-[#25D366]/20 bg-[#25D366]/[0.04] dark:bg-[#25D366]/[0.03]">
            <button
              onClick={() => setShowAddon(!showAddon)}
              className="flex w-full items-center justify-between px-6 py-4 text-sm font-medium"
            >
              <span className="flex items-center gap-2 font-semibold text-[#25D366]">
                <MessageCircle size={15} strokeWidth={2} />
                <span>¿Necesitas más conversaciones de WhatsApp?</span>
              </span>
              <ChevronDown
                size={16}
                strokeWidth={2}
                className={`text-[#25D366] transition-transform duration-300 ${
                  showAddon ? 'rotate-180' : ''
                }`}
              />
            </button>

            {showAddon && (
              <div className="px-6 pb-6">
                <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
                  Packs adicionales disponibles en todos los planes cuando se agota el bundle
                  mensual.
                </p>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {WABA_ADDON_TIERS.map((tier) => (
                    <div
                      key={tier.conversations}
                      className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                        {tier.conversations}
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-[#25D366]">
                        ${tier.price}/mes
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">{tier.label}</p>
                    </div>
                  ))}
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 text-center dark:border-zinc-800 dark:bg-zinc-900">
                    <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">∞</p>
                    <p className="mt-0.5 text-sm font-semibold text-[#25D366]">Incluido</p>
                    <p className="mt-1 text-xs text-zinc-400">Plan Elite</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </RevealWrapper>

        {/* Comparativa desplegable */}
        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <button
            onClick={() => setShowComparison(!showComparison)}
            className="flex w-full items-center justify-between px-6 py-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <span>Ver comparativa completa de planes</span>
            <ChevronDown
              size={16}
              strokeWidth={2}
              className={`transition-transform duration-300 ${showComparison ? 'rotate-180' : ''}`}
            />
          </button>

          {showComparison && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 dark:bg-zinc-900">
                    <th className="px-6 py-3 text-left font-medium text-zinc-500">Función</th>
                    {PLANS.map((p) => (
                      <th
                        key={p.name}
                        className={`px-6 py-3 text-center font-bold ${
                          p.highlighted ? 'text-primary' : 'text-zinc-700 dark:text-zinc-300'
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
                        i % 2 === 0 ? 'bg-white dark:bg-zinc-950' : 'bg-zinc-50 dark:bg-zinc-900'
                      }
                    >
                      <td className="px-6 py-3 text-zinc-700 dark:text-zinc-300">{feat.label}</td>
                      {(['basic', 'pro', 'elite'] as const).map((plan) => {
                        const val = feat[plan]
                        return (
                          <td key={plan} className="px-6 py-3 text-center">
                            {typeof val === 'string' ? (
                              <span className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                                {val}
                              </span>
                            ) : val ? (
                              <Check size={16} strokeWidth={2.5} className="mx-auto text-primary" />
                            ) : (
                              <span className="text-zinc-300 dark:text-zinc-700">—</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
