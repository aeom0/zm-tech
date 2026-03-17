"use client";

import { useState } from "react";
import { FEATURES, BUSINESS_TYPES } from "@/lib/constants";
import { FeatureCard } from "@/components/ui/FeatureCard";
import { BusinessTypeTab } from "@/components/ui/BusinessTypeTab";
import { RevealWrapper } from "@/components/ui/RevealWrapper";

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
