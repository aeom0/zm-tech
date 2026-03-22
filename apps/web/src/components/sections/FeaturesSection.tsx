"use client";

import { useState } from "react";
import { FEATURES, BUSINESS_TYPES } from "@/lib/constants";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { BusinessTypeTab } from "@/components/ui/BusinessTypeTab";
import { RevealWrapper } from "@/components/ui/RevealWrapper";
import { WABAPreview } from "@/components/ui/WABAPreview";

export function FeaturesSection() {
  const [activeType, setActiveType] = useState(BUSINESS_TYPES[0].id);

  return (
    <section
      id="funciones"
      className="px-4 py-20 md:py-28 bg-white dark:bg-zinc-950"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <RevealWrapper variant="up">
          <div className="text-center mb-12">
            <span className="text-accent font-semibold text-sm uppercase tracking-widest">
              Funcionalidades
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mt-3 text-zinc-900 dark:text-zinc-100">
              Todo lo que tu negocio necesita
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-4 max-w-xl mx-auto">
              Diseñado para barberías, spas, peluquerías y centros estéticos en
              LATAM.
            </p>
          </div>
        </RevealWrapper>

        {/* Tabs */}
        <RevealWrapper variant="fade" delay={100}>
          <div className="mb-10">
            <BusinessTypeTab
              types={BUSINESS_TYPES}
              active={activeType}
              onChange={setActiveType}
            />
          </div>
        </RevealWrapper>

        {/* Card hero WABA */}
        <RevealWrapper variant="up" delay={100}>
          <div className="mb-8 rounded-2xl bg-zinc-950 dark:bg-zinc-900 border border-zinc-800 overflow-hidden">
            <div className="flex flex-col md:flex-row items-center gap-8 p-8 md:p-10">
              {/* Texto izquierda */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 bg-[#25D366]/10 border border-[#25D366]/20 text-[#25D366] text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
                  <span>💬</span>
                  <span>Nuevo · Bot WhatsApp Business</span>
                </div>
                <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 leading-tight">
                  Tu salón agenda solo,{" "}
                  <span className="text-[#25D366]">24/7</span>, por WhatsApp
                </h3>
                <p className="text-zinc-400 text-sm leading-relaxed max-w-md mx-auto md:mx-0">
                  Los clientes agendan, preguntan y reciben confirmación directo
                  en WhatsApp. Con IA integrada (Claude) para responder
                  preguntas libres sobre servicios y disponibilidad. Sin que la
                  dueña tenga que contestar a las 2am.
                </p>
                <div className="flex flex-wrap gap-3 mt-5 justify-center md:justify-start">
                  <span className="text-xs text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-full">
                    ✓ Todos los planes
                  </span>
                  <span className="text-xs text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-full">
                    ✓ Sin código extra
                  </span>
                  <span className="text-xs text-zinc-400 bg-zinc-800 px-3 py-1.5 rounded-full">
                    ✓ IA incluida
                  </span>
                </div>
              </div>
              {/* Preview derecha */}
              <div className="flex-shrink-0 w-full md:w-auto">
                <WABAPreview />
              </div>
            </div>
          </div>
        </RevealWrapper>

        {/* Grid de features — cada card con delay escalonado */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, i) => (
            <RevealWrapper key={feat.title} variant="up" delay={i * 80}>
              <FeatureCard {...feat} index={i} />
            </RevealWrapper>
          ))}
        </div>

        {/* CTA inferior */}
        <RevealWrapper variant="up" delay={200}>
          <div className="text-center mt-14">
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-4">
              ¿Listo para ordenar tu negocio?
            </p>
            <a
              href="#precios"
              className="inline-flex items-center gap-2 bg-primary text-white font-bold px-8 py-4 rounded-full hover:bg-primary/90 hover:scale-105 transition-all duration-300"
            >
              Ver planes y precios →
            </a>
          </div>
        </RevealWrapper>
      </div>
    </section>
  );
}
