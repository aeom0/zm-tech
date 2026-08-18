import type { Plan } from '@/lib/constants'
import { LUNARIS } from '@/lib/theme'
import { Star, MessageCircle, Check, Sparkles } from 'lucide-react'

type Props = {
  plan: Plan
  annual: boolean
}

export function PricingCard({ plan, annual }: Props) {
  const price = annual ? plan.annualPrice : plan.monthlyPrice
  const wabaLabel =
    plan.wabaConversations === 'unlimited'
      ? 'Conversaciones ilimitadas'
      : `${plan.wabaConversations} conversaciones/mes`

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 ${
        plan.highlighted
          ? 'scale-105 bg-primary text-white shadow-2xl shadow-primary/20 ring-4 ring-primary/30'
          : 'border border-zinc-200 bg-white shadow-sm hover:shadow-lg dark:border-zinc-800 dark:bg-zinc-900'
      }`}
    >
      {plan.highlighted && (
        <span className="absolute -top-4 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-accent px-4 py-1.5 text-xs font-bold text-black">
          <Star size={11} strokeWidth={2.5} className="fill-black" />
          MÁS POPULAR
        </span>
      )}

      {/* Nombre y descripción */}
      <div className="mb-6">
        <h3
          className={`text-xl font-bold ${
            plan.highlighted ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'
          }`}
        >
          {plan.name}
        </h3>
        <p className={`mt-1 text-sm ${plan.highlighted ? 'text-white/70' : 'text-zinc-500'}`}>
          {plan.description}
        </p>
      </div>

      {/* Precio */}
      <div className="mb-4">
        <div className="flex items-end gap-1">
          <span
            className={`text-5xl font-bold tabular-nums transition-all duration-300 ${
              plan.highlighted ? 'text-white' : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            ${price}
          </span>
          <span className={`mb-2 text-sm ${plan.highlighted ? 'text-white/70' : 'text-zinc-500'}`}>
            /mes
          </span>
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 ${annual ? 'mt-1 max-h-6 opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <p className={`text-xs ${plan.highlighted ? 'text-white/60' : 'text-zinc-400'}`}>
            ${plan.monthlyPrice}/mes si pagas mensual
          </p>
        </div>
      </div>

      {/* Badge WABA — siempre visible */}
      <div
        className={`mb-6 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${
          plan.highlighted
            ? 'bg-white/10 text-white'
            : 'border border-[#25D366]/20 bg-[#25D366]/10 text-[#25D366]'
        }`}
      >
        <MessageCircle size={13} strokeWidth={2} className="flex-shrink-0" />
        <span>{wabaLabel}</span>
      </div>

      {/* Features principales */}
      <ul className="mb-4 flex-1 space-y-3">
        {plan.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5 text-sm">
            <Check
              size={14}
              strokeWidth={2.5}
              className={`mt-0.5 flex-shrink-0 ${
                plan.highlighted ? 'text-accent' : 'text-primary'
              }`}
            />
            <span
              className={plan.highlighted ? 'text-white/90' : 'text-zinc-600 dark:text-zinc-400'}
            >
              {feat}
            </span>
          </li>
        ))}
      </ul>

      {/* Divisor WABA */}
      <div
        className={`mb-3 flex items-center gap-2 text-xs font-semibold ${
          plan.highlighted ? 'text-white/50' : 'text-zinc-400'
        }`}
      >
        <div
          className={`h-px flex-1 ${
            plan.highlighted ? 'bg-white/10' : 'bg-zinc-200 dark:bg-zinc-700'
          }`}
        />
        <span>WhatsApp · Asistente IA</span>
        <div
          className={`h-px flex-1 ${
            plan.highlighted ? 'bg-white/10' : 'bg-zinc-200 dark:bg-zinc-700'
          }`}
        />
      </div>

      {/* Features WABA destacadas */}
      <ul className="mb-8 space-y-2.5">
        {plan.wabaFeatures.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5 text-sm">
            <Sparkles size={13} strokeWidth={2} className="mt-0.5 flex-shrink-0 text-[#25D366]" />
            <span
              className={plan.highlighted ? 'text-white/85' : 'text-zinc-600 dark:text-zinc-400'}
            >
              {feat}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href="#"
        className={`block rounded-full py-3.5 text-center font-bold transition-all duration-200 hover:scale-[1.02] hover:opacity-90 ${
          plan.highlighted
            ? 'text-white shadow-lg'
            : plan.ctaSecondary
              ? 'border-2 border-zinc-300 text-zinc-700 hover:border-primary hover:text-primary dark:border-zinc-700 dark:text-zinc-300'
              : 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700'
        }`}
        style={
          plan.highlighted
            ? {
                background: LUNARIS.gradient.css,
              }
            : {}
        }
      >
        {plan.cta}
      </a>
    </div>
  )
}
