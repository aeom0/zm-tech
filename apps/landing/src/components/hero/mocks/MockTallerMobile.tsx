/** Mock genérico — app móvil de técnico de taller, paleta Industrial Dark (sin marca) */

import { GLASS_ROW, glassShadow, MockBackdrop, MockIcon, type MockIconName } from './mock-ui'

const ACCENT = '#FF6B00'

const TABS: Array<{ label: string; icon: MockIconName }> = [
  { label: 'Inicio', icon: 'home' },
  { label: 'Órdenes', icon: 'clipboard' },
  { label: 'Refacc.', icon: 'wrench' },
  { label: 'Clientes', icon: 'user' },
  { label: 'Más', icon: 'more' },
]

export default function MockTallerMobile() {
  return (
    <div
      className="relative flex h-full w-full flex-col overflow-hidden bg-[#0D0D0D] text-[6.5px] leading-snug text-zinc-400 sm:text-[7px]"
      aria-hidden
    >
      <MockBackdrop accent={ACCENT} />

      <div
        className="mock-rise relative z-1 px-1.5 pt-1.5 pb-2 text-white"
        style={{
          backgroundImage: `linear-gradient(145deg, #451a03 0%, ${ACCENT} 60%, #7c2d12 100%)`,
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -1px 0 rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[5.5px] text-white/60">Buenos días</div>
            <div className="text-[8px] font-extrabold tracking-tight sm:text-[9px]">
              Órdenes del día
            </div>
          </div>
          <span className="mt-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            <MockIcon name="user" className="h-2 w-2 text-white/80" />
          </span>
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          {(
            [
              {
                label: 'Órdenes hoy',
                value: '6',
                sub: '2 completadas',
                subClass: 'text-emerald-300',
                progress: 33,
              },
              { label: 'Refacciones', value: '3', sub: 'por confirmar', subClass: 'text-white/50' },
            ] as const
          ).map((s) => (
            <div
              key={s.label}
              className="rounded-md bg-white/10 px-1.5 py-1 ring-1 ring-white/15 backdrop-blur-sm"
              style={{
                boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px rgba(0,0,0,0.3)',
              }}
            >
              <div className="text-[5.5px] text-white/60">{s.label}</div>
              <div className="text-[9px] font-extrabold tracking-tight tabular-nums">{s.value}</div>
              <div className={`text-[5px] ${s.subClass}`}>{s.sub}</div>
              {'progress' in s && (
                <div className="mt-0.5 h-0.75 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white/90"
                    style={{ width: `${s.progress}%`, boxShadow: '0 0 4px rgba(255,255,255,0.4)' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-1 flex min-h-0 flex-1 flex-col gap-1 overflow-hidden p-1.5">
        <div className="mock-rise grid grid-cols-2 gap-1" style={{ animationDelay: '60ms' }}>
          {[
            { label: 'Orden', icon: 'clipboard' as const },
            { label: 'Cliente', icon: 'user' as const },
          ].map((a) => (
            <div
              key={a.label}
              className="flex items-center justify-center gap-1 rounded-md border border-white/10 border-t-white/20 bg-white/4 py-1 text-[6px] font-semibold backdrop-blur-sm"
              style={{ color: '#fdba74', boxShadow: glassShadow(ACCENT) }}
            >
              <MockIcon name="plus" className="h-1.5 w-1.5" />
              {a.label}
            </div>
          ))}
        </div>

        <div
          className={`${GLASS_ROW} mock-rise p-1.5`}
          style={{ animationDelay: '110ms', boxShadow: glassShadow(ACCENT) }}
        >
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[6px] font-bold tracking-tight text-zinc-200">
              Órdenes semana
            </span>
            <span className="text-[5.5px] text-zinc-500">L–S</span>
          </div>
          <div className="flex h-8 items-end gap-0.5">
            {[45, 60, 52, 80, 65, 70].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-0.5">
                <div
                  className="w-full rounded-t-xs"
                  style={{
                    height: `${h}%`,
                    backgroundImage: `linear-gradient(180deg, ${ACCENT}e6 0%, ${ACCENT}80 100%)`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="mt-0.5 flex gap-0.5">
            {['L', 'M', 'X', 'J', 'V', 'S'].map((d) => (
              <span key={d} className="flex-1 text-center text-[5px] text-zinc-500">
                {d}
              </span>
            ))}
          </div>
        </div>

        <div
          className="mock-rise min-h-0 flex-1 space-y-0.5 overflow-hidden"
          style={{ animationDelay: '160ms' }}
        >
          <div className="text-[6px] font-semibold tracking-wide text-zinc-500 uppercase">
            Recientes
          </div>
          {[
            {
              n: '#0231 · Camioneta Ford',
              amt: '$180',
              icon: 'check' as const,
              s: 'Listo',
              c: 'bg-emerald-500/10 text-emerald-400',
            },
            {
              n: '#0230 · Torno CNC',
              amt: '$95',
              icon: 'wrench' as const,
              s: 'En taller',
              c: 'bg-sky-500/10 text-sky-400',
            },
            {
              n: '#0229 · Compresor',
              amt: '$60',
              icon: 'clock' as const,
              s: 'Esp. refacción',
              c: 'bg-amber-500/10 text-amber-400',
            },
          ].map((p) => (
            <div
              key={p.n}
              className={`${GLASS_ROW} flex items-center justify-between gap-1 px-1 py-1`}
            >
              <div className="flex min-w-0 items-center gap-1">
                <span
                  className="flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-sm"
                  style={{ backgroundColor: `${ACCENT}26`, color: '#fdba74' }}
                >
                  <MockIcon name={p.icon} className="h-1.5 w-1.5" />
                </span>
                <span className="min-w-0 truncate font-medium text-zinc-300">{p.n}</span>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="text-[5.5px] font-semibold text-zinc-300 tabular-nums">
                  {p.amt}
                </span>
                <span className={`rounded-full px-1 py-px text-[5.5px] font-medium ${p.c}`}>
                  {p.s}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative z-1 flex border-t border-white/8 border-t-white/10 bg-white/3 py-1 text-[5.5px] text-zinc-500 backdrop-blur-md">
        {TABS.map((t, i) => (
          <div
            key={t.label}
            className={`flex flex-1 flex-col items-center gap-0.5 ${i === 0 ? 'font-semibold' : ''}`}
            style={i === 0 ? { color: '#fdba74' } : undefined}
          >
            <MockIcon name={t.icon} className="h-1.5 w-1.5" />
            {t.label}
          </div>
        ))}
      </div>
    </div>
  )
}
