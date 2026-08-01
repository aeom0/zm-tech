/** Mock genérico — agenda móvil salón (sin marca) */

const VIOLET = '#7B2D8E'

const SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00'] as const

const BLOCKS: Array<{ row: number; label: string; sub: string; color: string }> = [
  { row: 0, label: 'Ana', sub: 'Pestañas', color: '#7B2D8E' },
  { row: 2, label: 'Luis', sub: 'Uñas', color: '#C9A227' },
  { row: 4, label: 'Mar', sub: 'Cejas', color: '#9B4DB0' },
]

export default function MockAgendaMobile() {
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-[#FAF7FB] text-[6.5px] leading-snug text-zinc-700 sm:text-[7px]"
      aria-hidden
    >
      <div className="border-b border-violet-100/90 bg-white px-1.5 pt-1.5 pb-1.5">
        <div className="flex items-center justify-between">
          <div className="font-semibold text-zinc-900">Agenda</div>
          <span className="text-[5.5px] text-zinc-400">Mar 12</span>
        </div>
        <div className="mt-1 flex gap-0.5">
          {['Todas', 'Pend.', 'Hechas'].map((c, i) => (
            <span
              key={c}
              className={`rounded-full px-1.5 py-0.5 text-[5.5px] font-medium ${
                i === 0 ? 'text-white' : 'bg-violet-50 text-violet-700'
              }`}
              style={i === 0 ? { backgroundColor: VIOLET } : undefined}
            >
              {c}
            </span>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between px-0.5 text-[5.5px] text-zinc-400">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span
              key={d}
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                i === 2 ? 'font-bold text-white shadow-sm' : ''
              }`}
              style={i === 2 ? { backgroundColor: VIOLET } : undefined}
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden px-1 py-0.5">
        {SLOTS.map((t, i) => (
          <div key={t} className="flex h-[15%] border-b border-violet-50">
            <span className="w-5 shrink-0 pt-0.5 text-[5px] text-zinc-400 tabular-nums sm:w-6 sm:text-[5.5px]">
              {t}
            </span>
            <div className="relative flex-1">
              {BLOCKS.filter((b) => b.row === i).map((b) => (
                <div
                  key={b.label}
                  className="absolute inset-x-0.5 top-[10%] flex h-[80%] items-center gap-0.5 overflow-hidden rounded-md px-1 text-white"
                  style={{
                    backgroundColor: b.color,
                    boxShadow: `inset 2px 0 0 rgba(255,255,255,0.25)`,
                  }}
                >
                  <div className="min-w-0 truncate">
                    <span className="font-semibold">{b.label}</span>
                    <span className="ml-0.5 opacity-80">· {b.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex border-t border-zinc-200/90 bg-white py-1 text-[5.5px] text-zinc-400">
        {['Inicio', 'Agenda', 'Serv.', 'Cli.', 'Más'].map((t, i) => (
          <div
            key={t}
            className={`flex flex-1 flex-col items-center gap-0.5 ${
              i === 1 ? 'font-semibold text-violet-700' : ''
            }`}
          >
            <span className={`h-1 w-1 rounded-full ${i === 1 ? 'bg-violet-600' : 'bg-zinc-300'}`} />
            {t}
          </div>
        ))}
      </div>
    </div>
  )
}
