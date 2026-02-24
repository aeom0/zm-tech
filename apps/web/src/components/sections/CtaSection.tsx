import { RevealWrapper } from "@/components/ui/RevealWrapper";

export function CtaSection() {
  return (
    <section className="relative px-4 py-24 md:py-32 overflow-hidden">
      {/* Fondo */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0F0A14] via-primary/60 to-[#0F0A14]" />
      <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-primary/20 blur-3xl" />

      <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
        <RevealWrapper variant="up">
          <p className="text-accent font-semibold text-sm uppercase tracking-widest">
            Es el momento
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
            Tu competencia ya se está
            <br />
            <span className="text-accent">digitalizando. ¿Y tú?</span>
          </h2>
        </RevealWrapper>

        <RevealWrapper variant="up" delay={150}>
          <p className="text-lg text-white/70 max-w-xl mx-auto">
            Únete a cientos de negocios que ya gestionan todo desde el celular.
            Empieza hoy, sin riesgos.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
            <a
              href="#precios"
              className="inline-flex items-center justify-center gap-2 bg-accent text-black font-bold px-10 py-5 rounded-full text-lg hover:bg-accent/90 hover:scale-105 hover:shadow-xl hover:shadow-accent/25 transition-all duration-300"
            >
              Comenzar ahora — 14 días gratis
            </a>
          </div>

          <p className="text-white/40 text-sm mt-4">
            Sin tarjeta · Sin contrato · Cancela cuando quieras
          </p>
        </RevealWrapper>
      </div>
    </section>
  );
}
