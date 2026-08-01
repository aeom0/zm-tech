/** Mock genérico — panel de taller / mantenimiento, paleta Industrial Dark (sin marca) */

import { GLASS_CARD, glassShadow, MockBackdrop, MockIcon, type MockIconName } from './mock-ui'

const ACCENT = '#FF6B00'

const NAV: Array<{ label: string; icon: MockIconName }> = [
  { label: 'Órdenes', icon: 'clipboard' },
  { label: 'Técnicos', icon: 'users' },
  { label: 'Refacciones', icon: 'wrench' },
  { label: 'Clientes', icon: 'user' },
  { label: 'Facturación', icon: 'card' },
]

export default function MockTallerDesktop() {
  return (
    <div
      className="relative flex h-full w-full overflow-hidden bg-[#0D0D0D] text-[7.5px] leading-snug text-zinc-400 sm:text-[8.5px]"
      aria-hidden
    >
      <MockBackdrop accent={ACCENT} />

      {/* Sidebar */}
      <aside className="relative z-1 flex w-[17%] shrink-0 flex-col border-r border-white/8 bg-white/3 px-1.5 py-2 backdrop-blur-md">
        <div className="mb-2 flex items-center gap-1 border-b border-white/8 pb-1.5">
          <span
            className="flex h-3 w-3 items-center justify-center rounded text-[6px] font-bold text-white"
            style={{
              backgroundColor: ACCENT,
              boxShadow: `0 1px 2px rgba(0,0,0,0.4), 0 0 8px ${ACCENT}66, inset 0 1px 0 rgba(255,255,255,0.25)`,
            }}
          >
            T
          </span>
          <div className="min-w-0">
            <div className="truncate text-[7px] font-bold tracking-tight text-zinc-100">Taller</div>
            <div className="truncate text-[5.5px] text-zinc-500">Ops</div>
          </div>
        </div>
        {NAV.map((item, i) => (
          <div
            key={item.label}
            className={`mb-0.5 flex items-center gap-1 rounded-md px-1 py-1 ${
              i === 0 ? 'font-semibold text-white' : 'text-zinc-500'
            }`}
            style={
              i === 0
                ? {
                    backgroundColor: `${ACCENT}33`,
                    boxShadow: `inset 0 0 0 1px ${ACCENT}4d, inset 0 1px 0 rgba(255,255,255,0.12)`,
                  }
                : undefined
            }
          >
            <MockIcon name={item.icon} className="h-1.5 w-1.5 shrink-0" />
            <span className="truncate">{item.label}</span>
          </div>
        ))}
      </aside>

      {/* Main */}
      <div className="relative z-1 flex min-w-0 flex-1 flex-col">
        <div className="mock-rise flex items-center justify-between border-t border-b border-white/8 border-t-white/10 bg-white/3 px-2 py-1 backdrop-blur-md">
          <div>
            <div className="text-[6px] tracking-wide text-zinc-500 uppercase">Módulo</div>
            <div className="font-bold tracking-tight text-zinc-50">Órdenes de servicio</div>
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[6px] font-medium text-emerald-400 ring-1 ring-emerald-500/25">
              En vivo
            </span>
            <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/8 ring-1 ring-white/10">
              <MockIcon name="user" className="h-2 w-2 text-zinc-400" />
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-1.5 sm:p-2">
          {/* KPIs */}
          <div className="mock-rise grid grid-cols-4 gap-1 sm:gap-1.5" style={{ animationDelay: '60ms' }}>
            {[
              { label: 'Órdenes abiertas', value: '23', delta: '+4 hoy', up: true, spark: [45, 50, 48, 58, 55, 65] },
              { label: 'Tiempo prom.', value: '2.4h', delta: '-18min', up: true, spark: [70, 65, 60, 58, 52, 48] },
              { label: 'Refacc. bajas', value: '7', delta: 'revisar', up: false, spark: [20, 28, 30, 34, 38, 42] },
              { label: 'Ingresos mes', value: '$9.1k', delta: '+11%', up: true, spark: [38, 42, 40, 50, 46, 60] },
            ].map((k) => (
              <div
                key={k.label}
                className={`${GLASS_CARD} px-1.5 py-1`}
                style={{ boxShadow: glassShadow(ACCENT) }}
              >
                <div className="truncate text-[6px] text-zinc-500">{k.label}</div>
                <div className="text-[10px] font-extrabold tracking-tight text-zinc-50 sm:text-[11px] tabular-nums">
                  {k.value}
                </div>
                <div className="mt-0.5 flex items-end gap-1">
                  <div className="flex h-2 flex-1 items-end gap-[1.5px]" aria-hidden>
                    {k.spark.map((h, i) => (
                      <span
                        key={i}
                        className="flex-1 rounded-[1px]"
                        style={{ height: `${h}%`, backgroundColor: k.up ? `${ACCENT}80` : '#f59e0b80' }}
                      />
                    ))}
                  </div>
                  <span
                    aria-hidden
                    className={`h-0 w-0 shrink-0 border-x-[2.5px] border-x-transparent ${
                      k.up ? 'border-b-[3.5px] border-b-emerald-400' : 'border-t-[3.5px] border-t-amber-400'
                    }`}
                  />
                </div>
                <div className={`text-[6px] font-medium ${k.up ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {k.delta}
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div
            className="mock-rise grid min-h-0 flex-1 grid-cols-5 gap-1 sm:gap-1.5"
            style={{ animationDelay: '120ms' }}
          >
            <div
              className={`${GLASS_CARD} col-span-3 flex flex-col p-1.5`}
              style={{ boxShadow: glassShadow(ACCENT) }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[6.5px] font-bold tracking-tight text-zinc-200">Órdenes completadas</span>
                <span className="text-[5.5px] text-zinc-500">6 semanas</span>
              </div>
              <div className="relative flex flex-1 items-end gap-0.75 px-0.5">
                <div
                  className="pointer-events-none absolute inset-x-0 top-1 bottom-1 flex flex-col justify-between"
                  aria-hidden
                >
                  <div className="border-t border-dashed border-white/8" />
                  <div className="border-t border-dashed border-white/8" />
                  <div className="border-t border-dashed border-white/8" />
                </div>
                <svg
                  className="pointer-events-none absolute inset-0"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <defs>
                    <linearGradient id="taller-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={ACCENT} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={ACCENT} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="8,52 25,35 42,45 58,22 75,40 92,10 92,100 8,100"
                    fill="url(#taller-area)"
                  />
                  <polyline
                    points="8,52 25,35 42,45 58,22 75,40 92,10"
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.8"
                  />
                  {[
                    [8, 52],
                    [25, 35],
                    [42, 45],
                    [58, 22],
                    [75, 40],
                    [92, 10],
                  ].map(([x, y]) => (
                    <circle
                      key={`${x}-${y}`}
                      cx={x}
                      cy={y}
                      r="2"
                      fill={ACCENT}
                      stroke="#0D0D0D"
                      strokeWidth="1"
                    />
                  ))}
                </svg>
                {[48, 65, 55, 78, 60, 90].map((h, i, arr) => {
                  const isLast = i === arr.length - 1
                  return (
                    <div key={i} className="relative flex flex-1 flex-col items-center justify-end">
                      {isLast && (
                        <span className="absolute -top-2 text-[5px] font-semibold text-zinc-400 tabular-nums">
                          {h}%
                        </span>
                      )}
                      <div
                        className="w-[55%] rounded-t-xs"
                        style={{
                          height: `${h}%`,
                          backgroundImage: `linear-gradient(180deg, ${ACCENT}59 0%, ${ACCENT}33 100%)`,
                          minHeight: 4,
                          boxShadow: isLast ? `0 0 8px ${ACCENT}80` : undefined,
                        }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="mt-0.5 flex gap-0.75 px-0.5">
                {['S1', 'S2', 'S3', 'S4', 'S5', 'S6'].map((w) => (
                  <span key={w} className="flex-1 text-center text-[5px] text-zinc-500">
                    {w}
                  </span>
                ))}
              </div>
              <div className="mt-0.5 flex gap-2 text-[5.5px] text-zinc-500">
                <span className="flex items-center gap-0.5">
                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: ACCENT }} /> Completadas
                </span>
                <span className="flex items-center gap-0.5">
                  <span className="h-[1.5px] w-2 rounded-full" style={{ backgroundColor: ACCENT, opacity: 0.7 }} />{' '}
                  Tendencia
                </span>
              </div>
            </div>

            <div
              className={`${GLASS_CARD} col-span-2 flex flex-col p-1.5`}
              style={{ boxShadow: glassShadow(ACCENT) }}
            >
              <span className="mb-1 text-[6.5px] font-bold tracking-tight text-zinc-200">Estado órdenes</span>
              <div className="flex flex-1 items-center gap-2">
                <div className="relative h-10 w-10 shrink-0 sm:h-11 sm:w-11">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        'conic-gradient(#FF6B00 0 46%, #38bdf8 46% 70%, #fbbf24 70% 88%, rgba(255,255,255,0.1) 88% 100%)',
                      boxShadow: `0 1px 2px rgba(0,0,0,0.4), 0 6px 16px -4px ${ACCENT}33`,
                    }}
                  />
                  <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-[#0D0D0D]">
                    <span className="text-[7px] font-extrabold tracking-tight text-zinc-50 sm:text-[7.5px] tabular-nums">
                      23
                    </span>
                  </div>
                </div>
                <div className="min-w-0 space-y-0.5 text-[6px]">
                  {[
                    { l: 'Listo', c: ACCENT },
                    { l: 'En taller', c: '#38bdf8' },
                    { l: 'Esp. refacción', c: '#fbbf24' },
                  ].map((r) => (
                    <div key={r.l} className="flex items-center gap-1 text-zinc-400">
                      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: r.c }} />
                      {r.l}
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-1 space-y-0.5 border-t border-white/8 pt-1">
                <div className="text-[5.5px] font-semibold tracking-wide text-zinc-500 uppercase">
                  Carga técnicos
                </div>
                {[
                  { n: 'J. Pérez', v: 80 },
                  { n: 'M. Ruiz', v: 55 },
                ].map((t) => (
                  <div key={t.n} className="flex items-center gap-1 text-[5.5px] text-zinc-400">
                    <MockIcon name="user" className="h-1.5 w-1.5 shrink-0" />
                    <span className="w-7 shrink-0 truncate">{t.n}</span>
                    <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${t.v}%`, backgroundColor: ACCENT }}
                      />
                    </div>
                    <span className="shrink-0 tabular-nums">{t.v}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
