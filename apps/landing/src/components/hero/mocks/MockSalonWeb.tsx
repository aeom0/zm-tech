/** Mock genérico — landing web salón / beauty (sin marca) */

const VIOLET = '#7B2D8E'
const GOLD = '#D4AF37'

export default function MockSalonWeb() {
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-[#FAF7FB] text-[8px] leading-snug text-zinc-800 sm:text-[9px]"
      aria-hidden
    >
      {/* Nav */}
      <div className="flex items-center justify-between border-b border-violet-100/80 bg-white/95 px-2.5 py-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[6px] font-bold text-white"
            style={{ backgroundColor: VIOLET }}
          >
            S
          </span>
          <span className="font-semibold tracking-tight" style={{ color: VIOLET }}>
            Salón
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-[7px] text-zinc-500">
          <span className="hidden sm:inline">Servicios</span>
          <span className="hidden sm:inline">Galería</span>
          <span
            className="rounded-full px-2 py-0.5 text-[6.5px] font-semibold text-zinc-900 shadow-sm"
            style={{ backgroundColor: GOLD }}
          >
            Agendar
          </span>
        </div>
      </div>

      {/* Hero */}
      <div
        className="relative flex flex-col items-center justify-center gap-1 overflow-hidden px-4 py-3.5 text-center text-white sm:py-4"
        style={{
          backgroundImage: `linear-gradient(145deg, ${VIOLET} 0%, #5A1F6A 50%, #2e1065 100%)`,
        }}
      >
        <div
          className="pointer-events-none absolute -top-4 -right-4 h-16 w-16 rounded-full opacity-30 blur-2xl"
          style={{ backgroundColor: GOLD }}
        />
        <div
          className="text-[6.5px] font-medium tracking-[0.14em] uppercase"
          style={{ color: GOLD }}
        >
          Belleza · Cuidado
        </div>
        <div className="max-w-[90%] text-[11px] font-bold tracking-tight sm:text-xs">
          Tu cita, ordenada y a tiempo
        </div>
        <div className="max-w-[82%] text-[7px] text-white/70">
          Agenda, recordatorios y pagos en un solo flujo
        </div>
        <div
          className="mt-1 rounded-full px-2.5 py-0.5 text-[7px] font-semibold text-zinc-900 shadow-md"
          style={{ backgroundColor: GOLD }}
        >
          Reservar ahora
        </div>
      </div>

      {/* Services */}
      <div className="grid flex-1 grid-cols-3 gap-1.5 p-2">
        {[
          {
            t: 'Pestañas',
            p: 'desde $25',
            dur: '60 min',
            rating: '4.9',
            tone: '#7B2D8E',
            popular: true,
          },
          { t: 'Uñas', p: 'desde $18', dur: '45 min', rating: '4.8', tone: '#9B4DB0' },
          { t: 'Cejas', p: 'desde $12', dur: '30 min', rating: '4.9', tone: '#D4AF37' },
        ].map((s) => (
          <div
            key={s.t}
            className="flex flex-col overflow-hidden rounded-lg border border-violet-100/90 bg-white shadow-[0_1px_3px_rgba(123,45,142,0.06)]"
          >
            <div
              className="relative h-6 w-full sm:h-7"
              style={{
                backgroundImage: `linear-gradient(135deg, ${s.tone}33, ${s.tone}14)`,
              }}
            >
              <span
                className="absolute top-1 left-1 flex h-2.5 w-2.5 items-center justify-center rounded-full"
                style={{ backgroundColor: `${s.tone}26` }}
              >
                <span className="h-1 w-1 rounded-full" style={{ backgroundColor: s.tone }} />
              </span>
              {s.popular && (
                <span
                  className="absolute top-1 right-1 rounded-full px-1 py-px text-[5px] font-semibold text-zinc-900 shadow-sm"
                  style={{ backgroundColor: GOLD }}
                >
                  Popular
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-0.5 px-1.5 py-1">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate font-semibold text-zinc-800">{s.t}</span>
                <span className="shrink-0 text-[5.5px] text-zinc-400">{s.dur}</span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[6.5px] font-medium" style={{ color: VIOLET }}>
                  {s.p}
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-[5.5px] font-medium text-zinc-500">
                  <span style={{ color: GOLD }}>★</span>
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
