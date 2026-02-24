import { BUSINESS_TYPES } from "@/lib/constants";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0F0A14]">
      {/* Gradiente de fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F0A14] via-primary/20 to-[#0F0A14]" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-5xl mx-auto px-4 text-center pt-24 pb-16">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium px-4 py-2 rounded-full mb-8">
          <span>🚀</span>
          <span>Gestión inteligente para tu negocio</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white leading-tight mb-6">
          Tu{" "}
          <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            barbería / salón / spa
          </span>
          <br />
          merece una app profesional
        </h1>

        {/* Subtítulo */}
        <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto mb-10 leading-relaxed">
          Agenda, personal, inventario y finanzas en un solo lugar.
          <br className="hidden md:block" />
          Sin papeles, sin WhatsApp, sin caos.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a
            href="#precios"
            className="inline-flex items-center justify-center gap-2 bg-primary text-white font-bold px-8 py-4 rounded-full text-lg hover:bg-primary/90 hover:scale-105 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
          >
            Comenzar gratis 14 días
          </a>
          <a
            href="#funciones"
            className="inline-flex items-center justify-center gap-2 border-2 border-white/30 text-white font-semibold px-8 py-4 rounded-full text-lg hover:bg-white/10 transition-all duration-300"
          >
            Ver demo →
          </a>
        </div>

        {/* Mockup placeholder */}
        <div className="relative max-w-sm mx-auto mb-14">
          <div className="bg-gradient-to-b from-zinc-800 to-zinc-900 rounded-[2.5rem] p-3 shadow-2xl shadow-black/50 ring-1 ring-white/10">
            <div className="bg-[#0F0A14] rounded-[2rem] overflow-hidden aspect-[9/19]">
              {/* Barra superior */}
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="text-white/40 text-xs">9:41</div>
                <div className="w-20 h-5 bg-zinc-800 rounded-full" />
                <div className="flex gap-1">
                  <div className="w-4 h-3 bg-white/20 rounded-sm" />
                  <div className="w-3 h-3 bg-white/20 rounded-sm" />
                </div>
              </div>
              {/* Header app */}
              <div className="px-4 pt-2 pb-4">
                <div className="h-5 w-32 bg-primary/60 rounded-lg mb-1" />
                <div className="h-3 w-20 bg-white/20 rounded" />
              </div>
              {/* Cards de citas */}
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="mx-3 mb-3 bg-white/5 rounded-2xl p-3 flex items-center gap-3"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex-shrink-0"
                    style={{
                      backgroundColor:
                        i === 1 ? "#E91E8C40" : i === 2 ? "#7B2D8E40" : "#D4AF3740",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="h-3 bg-white/30 rounded mb-1.5 w-3/4" />
                    <div className="h-2.5 bg-white/15 rounded w-1/2" />
                  </div>
                  <div className="h-6 w-14 bg-primary/50 rounded-full flex-shrink-0" />
                </div>
              ))}
              {/* Bottom nav */}
              <div className="absolute bottom-8 left-3 right-3 bg-white/5 rounded-2xl px-4 py-3 flex justify-around">
                {["🏠", "📅", "💅", "⋯", "👤"].map((icon) => (
                  <span key={icon} className="text-lg opacity-60">
                    {icon}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {/* Glow */}
          <div className="absolute inset-0 bg-primary/20 blur-3xl -z-10 scale-75" />
        </div>

        {/* Tipos de negocio */}
        <div className="flex flex-wrap justify-center gap-4">
          {BUSINESS_TYPES.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm px-4 py-2 rounded-full"
            >
              <span>{t.emoji}</span>
              <span>{t.label}</span>
            </div>
          ))}
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
