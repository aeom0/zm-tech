/** Mock genérico — landing web salón / beauty, paleta Lunaris (sin marca) */

import { GLASS_CARD, glassShadow, MockBackdrop, MockIcon, type MockIconName } from './mock-ui'

const TEAL_LIGHT = '#40E0D0'
const TEAL_DEEP = '#00897B'

const SERVICES: Array<{
  t: string
  icon: MockIconName
  p: string
  dur: string
  rating: string
  cupos: string
  popular?: boolean
}> = [
  { t: 'Pestañas', icon: 'eye', p: 'desde $25', dur: '60 min', rating: '4.9', cupos: 'Hoy · 3 cupos', popular: true },
  { t: 'Uñas', icon: 'sparkles', p: 'desde $18', dur: '45 min', rating: '4.8', cupos: 'Hoy · 5 cupos' },
  { t: 'Cejas', icon: 'brow', p: 'desde $12', dur: '30 min', rating: '4.9', cupos: 'Mañana · 9 am' },
]

export default function MockSalonWeb() {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#0c1614] text-[8px] leading-snug text-zinc-300 sm:text-[9px]"
      aria-hidden
    >
      <MockBackdrop accent={TEAL_LIGHT} />

      {/* Nav */}
      <div className="mock-rise relative z-1 flex items-center justify-between border-b border-white/8 bg-white/3 px-2.5 py-1.5 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <span
            className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[6px] font-bold text-[#00332d]"
            style={{
              backgroundImage: `linear-gradient(135deg, ${TEAL_LIGHT}, ${TEAL_DEEP})`,
              boxShadow: `0 1px 2px rgba(0,0,0,0.4), 0 0 8px ${TEAL_LIGHT}4d, inset 0 1px 0 rgba(255,255,255,0.35)`,
            }}
          >
            S
          </span>
          <span className="font-bold tracking-tight text-zinc-100">Salón</span>
        </div>
        <div className="flex items-center gap-2.5 text-[7px] text-zinc-400">
          <span className="hidden sm:inline">Servicios</span>
          <span className="hidden sm:inline">Galería</span>
          <span
            className="rounded-full px-2 py-0.5 text-[6.5px] font-semibold text-[#00332d]"
            style={{
              backgroundImage: `linear-gradient(135deg, ${TEAL_LIGHT}, ${TEAL_DEEP})`,
              boxShadow: `0 1px 2px rgba(0,0,0,0.4), 0 4px 10px -2px ${TEAL_DEEP}66, inset 0 1px 0 rgba(255,255,255,0.35)`,
            }}
          >
            Agendar
          </span>
        </div>
      </div>

      {/* Hero */}
      <div
        className="mock-rise relative z-1 flex flex-col items-center justify-center gap-1 overflow-hidden px-4 py-2.5 text-center text-white sm:py-3.5"
        style={{
          animationDelay: '60ms',
          backgroundImage: `linear-gradient(150deg, ${TEAL_DEEP} 0%, #00695c 45%, #0c1614 100%)`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.15)',
        }}
      >
        <div
          className="pointer-events-none absolute -top-4 -left-4 h-16 w-16 rounded-full opacity-30 blur-2xl"
          style={{ backgroundColor: TEAL_LIGHT }}
        />
        <div className="text-[6.5px] font-medium tracking-[0.14em] uppercase" style={{ color: TEAL_LIGHT }}>
          Belleza · Cuidado
        </div>
        <div className="max-w-[90%] text-[11px] font-extrabold tracking-tight sm:text-xs">
          Tu cita, ordenada y a tiempo
        </div>
        <div className="max-w-[82%] text-[7px] text-white/70">
          Agenda, recordatorios y pagos en un solo flujo
        </div>
        <div
          className="mt-1 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[7px] font-semibold text-[#00332d]"
          style={{
            backgroundImage: `linear-gradient(135deg, ${TEAL_LIGHT}, #7ff0e2)`,
            boxShadow: `0 1px 2px rgba(0,0,0,0.4), 0 6px 14px -4px ${TEAL_LIGHT}59, inset 0 1px 0 rgba(255,255,255,0.5)`,
          }}
        >
          <MockIcon name="calendar" className="h-1.5 w-1.5" />
          Reservar ahora
        </div>
        <div className="mt-1 flex items-center gap-2 text-[6px] text-white/75">
          <span className="flex items-center gap-0.5">
            <MockIcon name="star" className="h-1.5 w-1.5 text-yellow-400" />
            4.9
          </span>
          <span className="flex items-center gap-0.5">
            <MockIcon name="users" className="h-1.5 w-1.5" />
            +1.2k citas
          </span>
          <span className="flex items-center gap-0.5">
            <MockIcon name="check" className="h-1.5 w-1.5" />
            Confirmación al instante
          </span>
        </div>
      </div>

      {/* Services */}
      <div className="mock-rise relative z-1 grid flex-1 grid-cols-3 gap-1.5 p-2" style={{ animationDelay: '120ms' }}>
        {SERVICES.map((s) => (
          <div
            key={s.t}
            className={`${GLASS_CARD} flex flex-col overflow-hidden ${s.popular ? 'border-transparent border-t-transparent' : ''}`}
            style={
              s.popular
                ? {
                    boxShadow: `0 0 0 1px ${TEAL_LIGHT}4d, 0 1px 2px rgba(0,0,0,0.4), 0 8px 20px -6px ${TEAL_DEEP}59, inset 0 1px 0 rgba(255,255,255,0.1)`,
                  }
                : { boxShadow: glassShadow(TEAL_DEEP) }
            }
          >
            <div
              className="relative h-6 w-full overflow-hidden sm:h-7"
              style={{ backgroundImage: `linear-gradient(135deg, ${TEAL_DEEP}66, ${TEAL_LIGHT}26 60%, transparent)` }}
            >
              <div
                className="pointer-events-none absolute -top-2 -left-2 h-8 w-8 rounded-full opacity-40 blur-lg"
                style={{ backgroundColor: TEAL_LIGHT }}
              />
              <span
                className="absolute top-1 left-1 flex h-3 w-3 items-center justify-center rounded-full"
                style={{ backgroundColor: `${TEAL_LIGHT}26`, color: TEAL_LIGHT }}
              >
                <MockIcon name={s.icon} className="h-1.5 w-1.5" />
              </span>
              {s.popular && (
                <span
                  className="absolute top-1 right-1 rounded-full px-1 py-px text-[5px] font-semibold text-[#00332d]"
                  style={{ backgroundColor: TEAL_LIGHT, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.4)' }}
                >
                  Popular
                </span>
              )}
            </div>
            <div className="flex flex-1 flex-col gap-0.5 px-1.5 py-1">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate font-bold tracking-tight text-zinc-100">{s.t}</span>
                <span className="flex shrink-0 items-center gap-0.5 text-[5.5px] text-zinc-500">
                  <MockIcon name="clock" className="h-1 w-1" />
                  {s.dur}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[6.5px] font-medium" style={{ color: TEAL_LIGHT }}>
                  {s.p}
                </span>
                <span className="flex shrink-0 items-center gap-0.5 text-[5.5px] font-medium text-zinc-400">
                  <MockIcon name="star" className="h-1 w-1 text-yellow-400" />
                  {s.rating}
                </span>
              </div>
              <div className="mt-auto flex items-center gap-0.5 border-t border-white/5 pt-0.5 text-[5px]" style={{ color: TEAL_LIGHT }}>
                <span className="h-1 w-1 rounded-full" style={{ backgroundColor: TEAL_LIGHT }} />
                {s.cupos}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Social proof */}
      <div className="relative z-1 flex items-center justify-center gap-1 border-t border-white/8 border-t-white/10 bg-white/2 px-2 py-1 text-[6px] text-zinc-400 backdrop-blur-sm">
        <MockIcon name="star" className="h-1.5 w-1.5 text-yellow-400" />
        <span className="font-semibold text-zinc-300">4.9</span>
        <span className="text-zinc-600">·</span>
        <span className="truncate">“Puntualidad impecable, cero esperas”</span>
        <span className="shrink-0 text-zinc-600">— Carla M.</span>
      </div>
    </div>
  )
}
