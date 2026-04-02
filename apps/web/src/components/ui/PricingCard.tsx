import type { Plan } from "@/lib/constants";
import { LUNARIS } from "@/lib/theme";
import { Star, MessageCircle, Check, Sparkles } from "lucide-react";

type Props = {
  plan: Plan;
  annual: boolean;
};

export function PricingCard({ plan, annual }: Props) {
  const price = annual ? plan.annualPrice : plan.monthlyPrice;
  const wabaLabel =
    plan.wabaConversations === "unlimited"
      ? "Conversaciones ilimitadas"
      : `${plan.wabaConversations} conversaciones/mes`;

  return (
    <div
      className={`relative flex flex-col rounded-2xl p-8 transition-all duration-300 ${
        plan.highlighted
          ? "bg-primary text-white ring-4 ring-primary/30 shadow-2xl shadow-primary/20 scale-105"
          : "bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-lg"
      }`}
    >
      {plan.highlighted && (
        <span className="absolute -top-4 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 bg-accent text-black text-xs font-bold px-4 py-1.5 rounded-full">
          <Star size={11} strokeWidth={2.5} className="fill-black" />
          MÁS POPULAR
        </span>
      )}

      {/* Nombre y descripción */}
      <div className="mb-6">
        <h3
          className={`text-xl font-bold ${
            plan.highlighted ? "text-white" : "text-zinc-900 dark:text-zinc-100"
          }`}
        >
          {plan.name}
        </h3>
        <p
          className={`text-sm mt-1 ${
            plan.highlighted ? "text-white/70" : "text-zinc-500"
          }`}
        >
          {plan.description}
        </p>
      </div>

      {/* Precio */}
      <div className="mb-4">
        <div className="flex items-end gap-1">
          <span
            className={`text-5xl font-bold tabular-nums transition-all duration-300 ${
              plan.highlighted
                ? "text-white"
                : "text-zinc-900 dark:text-zinc-100"
            }`}
          >
            ${price}
          </span>
          <span
            className={`text-sm mb-2 ${plan.highlighted ? "text-white/70" : "text-zinc-500"}`}
          >
            /mes
          </span>
        </div>
        <div
          className={`overflow-hidden transition-all duration-300 ${annual ? "max-h-6 opacity-100 mt-1" : "max-h-0 opacity-0"}`}
        >
          <p
            className={`text-xs ${plan.highlighted ? "text-white/60" : "text-zinc-400"}`}
          >
            ${plan.monthlyPrice}/mes si pagas mensual
          </p>
        </div>
      </div>

      {/* Badge WABA — siempre visible */}
      <div
        className={`flex items-center gap-2 text-xs font-semibold px-3 py-2 rounded-xl mb-6 ${
          plan.highlighted
            ? "bg-white/10 text-white"
            : "bg-[#25D366]/10 text-[#25D366] border border-[#25D366]/20"
        }`}
      >
        <MessageCircle size={13} strokeWidth={2} className="flex-shrink-0" />
        <span>{wabaLabel}</span>
      </div>

      {/* Features principales */}
      <ul className="space-y-3 mb-4 flex-1">
        {plan.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5 text-sm">
            <Check
              size={14}
              strokeWidth={2.5}
              className={`mt-0.5 flex-shrink-0 ${
                plan.highlighted ? "text-accent" : "text-primary"
              }`}
            />
            <span
              className={
                plan.highlighted
                  ? "text-white/90"
                  : "text-zinc-600 dark:text-zinc-400"
              }
            >
              {feat}
            </span>
          </li>
        ))}
      </ul>

      {/* Divisor WABA */}
      <div
        className={`flex items-center gap-2 text-xs font-semibold mb-3 ${
          plan.highlighted ? "text-white/50" : "text-zinc-400"
        }`}
      >
        <div
          className={`flex-1 h-px ${
            plan.highlighted ? "bg-white/10" : "bg-zinc-200 dark:bg-zinc-700"
          }`}
        />
        <span>WhatsApp Bot</span>
        <div
          className={`flex-1 h-px ${
            plan.highlighted ? "bg-white/10" : "bg-zinc-200 dark:bg-zinc-700"
          }`}
        />
      </div>

      {/* Features WABA destacadas */}
      <ul className="space-y-2.5 mb-8">
        {plan.wabaFeatures.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5 text-sm">
            <Sparkles
              size={13}
              strokeWidth={2}
              className="mt-0.5 flex-shrink-0 text-[#25D366]"
            />
            <span
              className={
                plan.highlighted
                  ? "text-white/85"
                  : "text-zinc-600 dark:text-zinc-400"
              }
            >
              {feat}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href="#"
        className={`block text-center font-bold py-3.5 rounded-full transition-all duration-200 hover:opacity-90 hover:scale-[1.02] ${
          plan.highlighted
            ? "text-white shadow-lg"
            : plan.ctaSecondary
              ? "border-2 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-primary hover:text-primary"
              : "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700"
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
  );
}
