/** Mock genérico — panel gerencial industrial, dark cinema (sin marca) */

import { GLASS_CARD, glassShadow, MockBackdrop, MockIcon, type MockIconName } from './mock-ui'

const ACCENT = '#6366F1'

const NAV: Array<{ label: string; icon: MockIconName; badge?: string }> = [
  { label: 'Gerencial', icon: 'dashboard' },
  { label: 'Producción', icon: 'layers' },
  { label: 'Inventario', icon: 'box' },
  { label: 'Compras', icon: 'cart', badge: '3' },
  { label: 'Finanzas', icon: 'card' },
]

const SALES_CHART: Array<{ month: string; ventas: number; costos: number }> = [
  { month: 'Feb', ventas: 28, costos: 16 },
  { month: 'Mar', ventas: 52, costos: 24 },
  { month: 'Abr', ventas: 38, costos: 20 },
  { month: 'May', ventas: 72, costos: 32 },
  { month: 'Jun', ventas: 58, costos: 28 },
  { month: 'Jul', ventas: 96, costos: 36 },
]

export default function MockGerencialDesktop() {
  return (
    <div
      className="relative flex h-full w-full overflow-hidden bg-[#0a0a0c] text-[7.5px] leading-snug text-zinc-400 sm:text-[8.5px]"
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
            F
          </span>
          <div className="min-w-0">
            <div className="truncate text-[7px] font-bold tracking-tight text-zinc-100">Fábrica</div>
            <div className="truncate text-[5.5px] text-zinc-500">Ops</div>
          </div>
        </div>
        <div className="mb-0.5 px-1 text-[5px] font-semibold tracking-widest text-zinc-600 uppercase">
          Operación
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
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badge && (
              <span
                className="shrink-0 rounded-full px-0.5 text-[4.5px] font-bold text-white tabular-nums"
                style={{ backgroundColor: `${ACCENT}cc` }}
              >
                {item.badge}
              </span>
            )}
          </div>
        ))}
        <div className="mt-auto flex items-center gap-1 border-t border-white/8 pt-1">
          <span className="flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full bg-white/8 ring-1 ring-white/10">
            <MockIcon name="user" className="h-1.5 w-1.5 text-zinc-400" />
          </span>
          <div className="min-w-0">
            <div className="truncate text-[5.5px] font-semibold text-zinc-300">Admin</div>
            <div className="truncate text-[4.5px] text-zinc-600">Gerencia</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="relative z-1 flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="mock-rise flex items-center justify-between border-t border-b border-white/8 border-t-white/10 bg-white/3 px-2 py-1 backdrop-blur-md">
          <div>
            <div className="text-[6px] tracking-wide text-zinc-500 uppercase">Módulo</div>
            <div className="font-bold tracking-tight text-zinc-50">Panel gerencial</div>
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
              { label: 'Ventas cobradas', value: '$12.4k', delta: '+8%', up: true, spark: [40, 55, 48, 62, 58, 74] },
              { label: 'Margen bruto', value: '38%', delta: '+2pp', up: true, spark: [30, 34, 33, 36, 35, 38] },
              { label: 'Pedidos', value: '86', delta: '12 hoy', up: true, spark: [52, 48, 60, 55, 70, 65] },
              { label: 'Días invent.', value: '14', delta: '-1d', up: false, spark: [22, 20, 18, 19, 16, 14] },
            ].map((k) => (
              <div
                key={k.label}
                className={`${GLASS_CARD} px-1.5 py-1`}
                style={{ boxShadow: glassShadow(ACCENT) }}
              >
                <div className="truncate text-[6px] text-zinc-500">{k.label}</div>
                <div className="text-[10px] font-extrabold tracking-tight text-zinc-50 tabular-nums sm:text-[11px]">
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
              className={`${GLASS_CARD} col-span-2 flex flex-col p-1.5`}
              style={{ boxShadow: glassShadow(ACCENT) }}
            >
              <span className="mb-1 text-[6.5px] font-bold tracking-tight text-zinc-200">Estado pedidos</span>
              <div className="flex flex-1 items-center gap-2">
                <div className="relative h-10 w-10 shrink-0 sm:h-11 sm:w-11">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        'conic-gradient(#6366F1 0 42%, #34d399 42% 68%, #fbbf24 68% 86%, rgba(255,255,255,0.1) 86% 100%)',
                      boxShadow: `0 1px 2px rgba(0,0,0,0.4), 0 6px 16px -4px ${ACCENT}33`,
                    }}
                  />
                  <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-[#0a0a0c]">
                    <span className="text-[7px] font-extrabold tracking-tight text-zinc-50 tabular-nums sm:text-[7.5px]">
                      86
                    </span>
                  </div>
                </div>
                <div className="min-w-0 space-y-0.5 text-[6px]">
                  {[
                    { l: 'Pagado', c: ACCENT },
                    { l: 'En curso', c: '#34d399' },
                    { l: 'Pendiente', c: '#fbbf24' },
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
                  Top productos
                </div>
                {[
                  { n: 'Kit A-12', v: 72 },
                  { n: 'Caja x24', v: 48 },
                ].map((p) => (
                  <div key={p.n} className="flex items-center gap-1 text-[5.5px] text-zinc-400">
                    <MockIcon name="box" className="h-1.5 w-1.5 shrink-0" />
                    <span className="w-7 shrink-0 truncate">{p.n}</span>
                    <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${p.v}%`, backgroundColor: ACCENT }}
                      />
                    </div>
                    <span className="shrink-0 tabular-nums">{p.v}%</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              className={`${GLASS_CARD} col-span-3 flex flex-col p-1.5`}
              style={{ boxShadow: glassShadow(ACCENT) }}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[6.5px] font-bold tracking-tight text-zinc-200">Ventas vs costos</span>
                <span className="flex items-center gap-1.5 text-[5px] text-zinc-500">
                  <span className="flex items-center gap-0.5">
                    <span className="h-1 w-1 rounded-full" style={{ backgroundColor: ACCENT }} /> Ventas
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span className="h-1 w-1 rounded-full bg-white/25" /> Costos
                  </span>
                </span>
              </div>
              <div className="relative flex h-13 w-full shrink-0 items-end gap-1 px-0.5 sm:h-14.5">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between"
                  aria-hidden
                >
                  <div className="border-t border-dashed border-white/8" />
                  <div className="border-t border-dashed border-white/8" />
                  <div className="border-t border-dashed border-white/8" />
                  <div className="border-t border-white/8" />
                </div>
                {SALES_CHART.map((d, i, arr) => {
                  const isLast = i === arr.length - 1
                  return (
                    <div key={d.month} className="relative z-1 flex h-full flex-1 items-end justify-center gap-0.5">
                      {isLast && (
                        <span
                          className="absolute -top-0.5 left-1/2 z-2 -translate-x-1/2 -translate-y-full text-[5px] font-semibold whitespace-nowrap"
                          style={{ color: ACCENT }}
                        >
                          pico
                        </span>
                      )}
                      <div
                        className="w-[42%] rounded-t-xs"
                        style={{
                          height: `${d.ventas}%`,
                          backgroundImage: `linear-gradient(180deg, ${ACCENT} 0%, ${ACCENT}99 100%)`,
                          boxShadow: isLast ? `0 0 10px ${ACCENT}99` : undefined,
                        }}
                      />
                      <div className="w-[42%] rounded-t-xs bg-white/12" style={{ height: `${d.costos}%` }} />
                    </div>
                  )
                })}
              </div>
              <div className="mt-1 flex gap-1 px-0.5">
                {SALES_CHART.map((d) => (
                  <span key={d.month} className="flex-1 text-center text-[5px] text-zinc-500">
                    {d.month}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
