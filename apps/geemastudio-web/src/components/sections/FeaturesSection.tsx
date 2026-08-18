'use client'

import { useState } from 'react'
import { FEATURES, BUSINESS_TYPES } from '@/lib/constants'
import { FeatureCard } from '@/components/ui/FeatureCard'
import { BusinessTypeTab } from '@/components/ui/BusinessTypeTab'
import { RevealWrapper } from '@/components/ui/RevealWrapper'
import { WABAPreview } from '@/components/ui/WABAPreview'
import { MessageCircle, Check } from 'lucide-react'

export function FeaturesSection() {
  const [activeType, setActiveType] = useState(BUSINESS_TYPES[0].id)

  return (
    <section id="funciones" className="bg-white px-4 py-20 dark:bg-zinc-950 md:py-28">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <RevealWrapper variant="up">
          <div className="mb-12 text-center">
            <span className="text-sm font-semibold uppercase tracking-widest text-accent">
              Funcionalidades
            </span>
            <h2 className="mt-3 text-3xl font-bold text-zinc-900 dark:text-zinc-100 md:text-5xl">
              Todo lo que tu negocio necesita
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-zinc-500 dark:text-zinc-400">
              Diseñado para barberías, spas, peluquerías y centros estéticos en LATAM.
            </p>
          </div>
        </RevealWrapper>

        {/* Tabs */}
        <RevealWrapper variant="fade" delay={100}>
          <div className="mb-10">
            <BusinessTypeTab types={BUSINESS_TYPES} active={activeType} onChange={setActiveType} />
          </div>
        </RevealWrapper>

        {/* Card hero WABA */}
        <RevealWrapper variant="up" delay={100}>
          <div className="mb-8 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 dark:bg-zinc-900">
            <div className="flex flex-col items-center gap-8 p-8 md:flex-row md:p-10">
              {/* Texto izquierda */}
              <div className="flex-1 text-center md:text-left">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#25D366]/20 bg-[#25D366]/10 px-3 py-1.5 text-xs font-semibold text-[#25D366]">
                  <MessageCircle size={13} strokeWidth={2} />
                  <span>Nuevo · WhatsApp Business + asistente IA</span>
                </div>
                <h3 className="mb-3 text-2xl font-bold leading-tight text-white md:text-3xl">
                  Tu salón agenda solo, <span className="text-[#25D366]">24/7</span>, por WhatsApp
                </h3>
                <p className="mx-auto max-w-md text-sm leading-relaxed text-zinc-400 md:mx-0">
                  Los clientes agendan, preguntan y reciben confirmación directo en WhatsApp. Con IA
                  integrada (Claude) para responder preguntas libres sobre servicios y
                  disponibilidad. Sin que el propietario tenga que contestar a las 2:00.
                </p>
                <div className="mt-5 flex flex-wrap justify-center gap-3 md:justify-start">
                  {['Todos los planes', 'Sin programación', 'IA incluida'].map((label) => (
                    <span
                      key={label}
                      className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3 py-1.5 text-xs text-zinc-400"
                    >
                      <Check size={11} strokeWidth={2.5} />
                      {label}
                    </span>
                  ))}
                </div>
              </div>
              {/* Preview derecha */}
              <div className="w-full flex-shrink-0 md:w-auto">
                <WABAPreview />
              </div>
            </div>
          </div>
        </RevealWrapper>

        {/* Grid de features — cada card con delay escalonado */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feat, i) => (
            <RevealWrapper key={feat.title} variant="up" delay={i * 80}>
              <FeatureCard {...feat} index={i} />
            </RevealWrapper>
          ))}
        </div>

        {/* CTA inferior */}
        <RevealWrapper variant="up" delay={200}>
          <div className="mt-14 text-center">
            <p className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
              ¿Listo para ordenar tu negocio?
            </p>
            <a
              href="#precios"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-bold text-white transition-all duration-300 hover:scale-105 hover:bg-primary/90"
            >
              Ver planes y precios →
            </a>
          </div>
        </RevealWrapper>
      </div>
    </section>
  )
}
