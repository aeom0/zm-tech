/** Mock genérico — agenda móvil salón, paleta Lunaris (sin marca) */

import { MockBackdrop, MockIcon, type MockIconName } from './mock-ui'

const TEAL_LIGHT = '#40E0D0'
const TEAL_DEEP = '#00897B'

const SLOTS = ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00'] as const

const TABS: Array<{ label: string; icon: MockIconName }> = [
  { label: 'Inicio', icon: 'home' },
  { label: 'Agenda', icon: 'calendar' },
  { label: 'Serv.', icon: 'sparkles' },
  { label: 'Cli.', icon: 'users' },
  { label: 'Más', icon: 'more' },
]

const BLOCKS: Array<{
  row: number
  label: string
  sub: string
  dur: string
  icon: MockIconName
  from: string
  to: string
}> = [
  {
    row: 0,
    label: 'Ana',
    sub: 'Pestañas',
    dur: '60m',
    icon: 'eye',
    from: TEAL_DEEP,
    to: '#00695c',
  },
  {
    row: 2,
    label: 'Luis',
    sub: 'Uñas',
    dur: '45m',
    icon: 'sparkles',
    from: '#0f9c8c',
    to: '#0d7a6e',
  },
  { row: 4, label: 'Mar', sub: 'Cejas', dur: '30m', icon: 'brow', from: '#14b3a1', to: TEAL_DEEP },
]

/** Fila con hueco libre resaltado como slot reservable */
const FREE_ROW = 3

/** Now-line anclada a la fila 12:00 (índice 2); offset = minutos / 60 */
const NOW = { row: 2, label: '12:40', minuteFrac: 40 / 60 } as const

export default function MockAgendaMobile() {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#0c1614] text-[6.5px] leading-snug text-zinc-300 sm:text-[7px]"
      aria-hidden
    >
      <MockBackdrop accent={TEAL_LIGHT} />

      <div className="mock-rise relative z-1 border-b border-white/8 bg-white/3 px-1.5 pt-1.5 pb-1.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="font-bold tracking-tight text-zinc-50">Agenda</div>
          <span className="flex items-center gap-0.5 text-[5.5px] text-zinc-500">
            <MockIcon name="calendar" className="h-1.5 w-1.5" />
            Mar 12
          </span>
        </div>
        <div className="mt-1 flex items-center gap-0.5">
          {['Todas', 'Pend.', 'Hechas'].map((c, i) => (
            <span
              key={c}
              className={`rounded-full px-1.5 py-0.5 text-[5.5px] font-medium ${
                i === 0 ? 'text-[#00332d]' : 'bg-white/5 text-zinc-400 ring-1 ring-white/8'
              }`}
              style={
                i === 0
                  ? {
                      backgroundImage: `linear-gradient(135deg, ${TEAL_LIGHT}, ${TEAL_DEEP})`,
                      boxShadow: `0 1px 2px rgba(0,0,0,0.4), 0 3px 8px -2px ${TEAL_DEEP}59, inset 0 1px 0 rgba(255,255,255,0.35)`,
                    }
                  : undefined
              }
            >
              {c}
            </span>
          ))}
          <span className="ml-auto text-[5px] text-zinc-500 tabular-nums">6 citas · 82% ocup.</span>
        </div>
        <div className="mt-1.5 flex justify-between px-0.5 text-[5.5px] text-zinc-500">
          {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d, i) => (
            <span
              key={d}
              className={`flex h-3.5 w-3.5 items-center justify-center rounded-full ${
                i === 2 ? 'font-bold text-[#00332d]' : ''
              }`}
              style={
                i === 2
                  ? {
                      backgroundImage: `linear-gradient(135deg, ${TEAL_LIGHT}, ${TEAL_DEEP})`,
                      boxShadow: `0 1px 2px rgba(0,0,0,0.4), 0 3px 8px -2px ${TEAL_DEEP}59, inset 0 1px 0 rgba(255,255,255,0.35)`,
                    }
                  : undefined
              }
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      <div
        className="mock-rise relative z-1 min-h-0 flex-1 overflow-hidden px-1 py-0.5"
        style={{ animationDelay: '70ms' }}
      >
        {SLOTS.map((t, i) => (
          <div key={t} className="relative flex h-[15%] border-b border-white/5">
            <span className="w-5 shrink-0 pt-0.5 text-[5px] text-zinc-500 tabular-nums sm:w-6 sm:text-[5.5px]">
              {t}
            </span>
            <div className="relative flex-1">
              {i === FREE_ROW && (
                <div className="absolute inset-x-0.5 top-[10%] flex h-[80%] items-center justify-center gap-0.5 rounded-md border border-dashed border-white/10 text-[5px] text-zinc-600">
                  <MockIcon name="plus" className="h-1 w-1" />
                  Disponible
                </div>
              )}
              {BLOCKS.filter((b) => b.row === i).map((b) => (
                <div
                  key={b.label}
                  className="absolute inset-x-0.5 top-[10%] flex h-[80%] items-center gap-0.5 overflow-hidden rounded-md px-1 text-white"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${b.from}, ${b.to})`,
                    boxShadow: `inset 2px 0 0 rgba(255,255,255,0.3), inset 0 1px 0 rgba(255,255,255,0.18), 0 1px 2px rgba(0,0,0,0.4), 0 4px 10px -3px ${b.from}66`,
                  }}
                >
                  <MockIcon name={b.icon} className="h-1.5 w-1.5 shrink-0 text-white/80" />
                  <div className="min-w-0 flex-1 truncate">
                    <span className="font-bold tracking-tight">{b.label}</span>
                    <span className="ml-0.5 font-normal opacity-80">· {b.sub}</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-white/15 px-0.5 text-[4.5px] font-medium text-white/80 tabular-nums">
                    {b.dur}
                  </span>
                </div>
              ))}
            </div>
            {/* Now-line anclada a la fila del slot (no % mágico del contenedor) */}
            {i === NOW.row && (
              <div
                className="pointer-events-none absolute inset-x-0 z-2 flex items-center gap-0.5 px-0.5"
                style={{ top: `${NOW.minuteFrac * 100}%` }}
                aria-hidden
              >
                <span
                  className="w-5 shrink-0 text-[4.5px] font-semibold tabular-nums sm:w-6"
                  style={{ color: TEAL_LIGHT }}
                >
                  {NOW.label}
                </span>
                <span
                  className="h-1 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: TEAL_LIGHT, boxShadow: `0 0 4px ${TEAL_LIGHT}` }}
                />
                <div className="h-px flex-1 opacity-70" style={{ backgroundColor: TEAL_LIGHT }} />
              </div>
            )}
          </div>
        ))}

        {/* FAB dentro del área de agenda → queda siempre encima del tab bar */}
        <div
          className="absolute right-1.5 bottom-1.5 z-2 flex h-4 w-4 items-center justify-center rounded-full text-[#00332d]"
          style={{
            backgroundImage: `linear-gradient(135deg, ${TEAL_LIGHT}, ${TEAL_DEEP})`,
            boxShadow: `0 2px 6px rgba(0,0,0,0.5), 0 0 10px ${TEAL_LIGHT}4d, inset 0 1px 0 rgba(255,255,255,0.4)`,
          }}
        >
          <MockIcon name="plus" className="h-2 w-2" />
        </div>
      </div>

      <div className="relative z-1 flex border-t border-white/8 border-t-white/10 bg-white/3 py-1 text-[5.5px] text-zinc-500 backdrop-blur-md">
        {TABS.map((t, i) => (
          <div
            key={t.label}
            className={`flex flex-1 flex-col items-center gap-0.5 ${i === 1 ? 'font-semibold' : ''}`}
            style={i === 1 ? { color: TEAL_LIGHT } : undefined}
          >
            <MockIcon name={t.icon} className="h-1.5 w-1.5" />
            {t.label}
          </div>
        ))}
      </div>
    </div>
  )
}
