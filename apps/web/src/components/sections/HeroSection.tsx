import { BUSINESS_TYPES } from "@/lib/constants";
import { AppMockup } from "@/components/ui/AppMockup";
import { GradientButton } from "@/components/ui/GradientButton";
import { LUNARIS } from "@/lib/theme";
import * as LucideIcons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Zap } from "lucide-react";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#0F0A14]">
      {/* Gradiente de fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F0A14] via-primary/15 to-[#0F0A14]" />
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-4 pt-24 pb-16">
        {/* Layout: columna en mobile, 2 columnas en desktop */}
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
          {/* Columna izquierda — texto */}
          <div className="flex-1 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium px-4 py-2 rounded-full mb-8">
              <Zap
                size={15}
                strokeWidth={2}
                className="text-accent flex-shrink-0"
              />
              <span>Gestión inteligente para tu negocio</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              El software que tu{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: LUNARIS.gradient.css,
                }}
              >
                salón merece
              </span>
              <br />
              <span className="text-white/80 text-3xl md:text-4xl lg:text-5xl font-semibold">
                y que tus clientes van a notar.
              </span>
            </h1>

            {/* Subtítulo */}
            <p className="text-lg text-white/70 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
              Agenda, personal, inventario y finanzas en un solo lugar. Sin
              papeles, WhatsApp con citas automáticas y Asistente IA, sin caos.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-10">
              <GradientButton href="#precios" size="lg">
                Comenzar gratis — 14 días
              </GradientButton>
              <GradientButton href="#demo" size="lg" outline>
                Ver demo en vivo →
              </GradientButton>
            </div>

            {/* Tipos de negocio */}
            <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
              {BUSINESS_TYPES.map((t) => {
                const IconComponent = (
                  LucideIcons as unknown as Record<string, LucideIcon>
                )[t.icon];
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm px-4 py-2 rounded-full"
                  >
                    {IconComponent && (
                      <IconComponent size={14} strokeWidth={2} />
                    )}
                    <span>{t.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Columna derecha — mockup animado */}
          <div className="flex-shrink-0 w-full max-w-[300px] lg:max-w-[320px]">
            <AppMockup />
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1.5">
          <div className="w-1.5 h-3 rounded-full bg-white/50 animate-pulse" />
        </div>
      </div>
    </section>
  );
}
