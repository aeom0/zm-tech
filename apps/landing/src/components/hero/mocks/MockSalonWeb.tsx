/** Mock genérico — landing web salón / beauty, paleta Lunaris (sin marca) */

const TEAL_LIGHT = '#40E0D0'
const TEAL_DEEP = '#00897B'

export default function MockSalonWeb() {
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-[#0c1614] text-[8px] leading-snug text-zinc-300 sm:text-[9px]"
      aria-hidden
    >
      {/* Nav */}
      <div className="flex items-center justify-between border-b border-white/8 bg-white/[0.02] px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[6px] font-bold text-[#00332d]"
            style={{ backgroundImage: `linear-gradient(135deg, ${TEAL_LIGHT}, ${TEAL_DEEP})` }}
          >
            S
          </span>
          <span className="font-semibold tracking-tight text-zinc-100">Salón</span>
        </div>
        <div className="flex items-center gap-2.5 text-[7px] text-zinc-400">
          <span className="hidden sm:inline">Servicios</span>
          <span className="hidden sm:inline">Galería</span>
          <span
            className="rounded-full px-2 py-0.5 text-[6.5px] font-semibold text-[#00332d]"
            style={{ backgroundImage: `linear-gradient(135deg, ${TEAL_LIGHT}, ${TEAL_DEEP})` }}
          >
            Agendar
          </span>
        </div>
      </div>

      {/* Hero */}
      <div
        className="relative flex flex-col items-center justify-center gap-1 overflow-hidden px-4 py-3.5 text-center text-white sm:py-4"
        style={{ backgroundImage: `linear-gradient(150deg, ${TEAL_DEEP} 0%, #00695c 45%, #0c1614 100%)` }}
      >
        <div
          className="pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full opacity-30 blur-2xl"
          style={{ backgroundColor: TEAL_LIGHT }}
        />
        <div className="text-[6.5px] font-medium tracking-[0.14em] uppercase" style={{ color: TEAL_LIGHT }}>
          Belleza · Cuidado
        </div>
        <div className="max-w-[90%] text-[11px] font-bold tracking-tight sm:text-xs">
          Tu cita, ordenada y a tiempo
        </div>
        <div className="max-w-[82%] text-[7px] text-white/70">
          Agenda, recordatorios y pagos en un solo flujo
        </div>
        <div
          className="mt-1 rounded-full px-2.5 py-0.5 text-[7px] font-semibold text-[#00332d] shadow-md"
          style={{ backgroundImage: `linear-gradient(135deg, ${TEAL_LIGHT}, #7ff0e2)` }}
        >
          Reservar ahora
        </div>
      </div>

      {/* Services */}
      <div className="grid flex-1 grid-cols-3 gap-1.5 p-2">
        {[
          { t: 'Pestañas', p: 'desde $25', dur: '60 min', rating: '4.9', popular: true },
          { t: 'Uñas', p: 'desde $18', dur: '45 min', rating: '4.8' },
          { t: 'Cejas', p: 'desde $12', dur: '30 min', rating: '4.9' },
        ].map((s) => (
          <div
            key={s.t}
            className="flex flex-col overflow-hidden rounded-lg border border-white/8 bg-white/[0.03]"
          >
            <div
              className="relative h-6 w-full sm:h-7"
              style={{ backgroundImage: `linear-gradient(135deg, ${TEAL_LIGHT}33, ${TEAL_DEEP}22)` }}
            >
              <span
                className="absolute top-1 left-1 flex h-2.5 w-2.5 items-center justify-center rounded-full"
                style={{ backgroundColor: `${TEAL_LIGHT}26` }}
              >
                <span className="h-1 w-1 rounded-full" style={{ backgroundColor: TEAL_LIGHT }} />
              </span>
              {s.popular && (
                <span
                  className="absolute top-1 right-1 rounded-full px-1 py-px text-[5px] font-semibold text-[#00332d]"
                  style={{ backgroundColor: TEAL_LIGHT }}
                >
                  Popular
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-0.5 px-1.5 py-1">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate font-semibold text-zinc-100">{s.t}</span>
                <span className="shrink-0 text-[5.5px] text-zinc-500">{s.dur}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[6.5px] font-medium" style={{ color: TEAL_LIGHT }}>
                  {s.p}
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-[5.5px] font-medium text-zinc-400">
                  <span style={{ color: '#facc15' }}>★</span>
                  {s.rating}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
