type QuoteHeroProps = {
  clienteNombre: string
  mensajeIntro: string
  /** Ej: "Propuesta personalizada · Abril 2026" */
  fechaLabel?: string
  /** Firma bajo el intro. Default: "— Equipo ZM Tech" */
  firma?: string
}

export function QuoteHero({
  clienteNombre,
  mensajeIntro,
  fechaLabel = 'Propuesta personalizada',
  firma = '— Equipo ZM Tech',
}: QuoteHeroProps) {
  return (
    <header>
      <div className="px-0 pt-6 pb-4 text-center">
        <div className="inline-block rounded-xl bg-[#050505] px-[18px] py-2">
          <span className="text-[15px] font-bold tracking-wider text-[#8b5cf6]">ZM</span>
          <span className="text-[15px] font-bold text-white"> Tech</span>
        </div>
        <p className="mt-1.5 text-xs text-[#888]">{fechaLabel}</p>
      </div>

      <div className="mb-4 rounded-xl border border-[#b5cfe4] bg-[#e8f0f7] px-[1.1rem] py-4">
        <p className="mb-1.5 text-[11px] font-semibold tracking-wider text-[#0c447c] uppercase">
          Para {clienteNombre}
        </p>
        <p className="text-sm leading-relaxed text-[#1a3c5e]">{mensajeIntro}</p>
        <p className="mt-2 text-xs font-medium text-[#378add]">{firma}</p>
      </div>
    </header>
  )
}
