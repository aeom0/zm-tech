/** Mock genérico — panel gerencial industrial (sin marca) */

const ACCENT = '#2563EB'

/** Valores 0–100 con contraste claro entre meses */
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
      className="flex h-full w-full overflow-hidden bg-[#F3F4F6] text-[7.5px] leading-snug text-zinc-600 sm:text-[8.5px]"
      aria-hidden
    >
      {/* Sidebar */}
      <aside className="flex w-[17%] shrink-0 flex-col border-r border-zinc-200/80 bg-[#0F1B2E] px-1.5 py-2 text-zinc-300">
        <div className="mb-2 flex items-center gap-1 border-b border-white/10 pb-1.5">
          <span
            className="flex h-3 w-3 items-center justify-center rounded text-[6px] font-bold text-white"
            style={{ backgroundColor: ACCENT }}
          >
            F
          </span>
          <div className="min-w-0">
            <div className="truncate text-[7px] font-semibold text-white">Fábrica</div>
            <div className="truncate text-[5.5px] text-zinc-500">Ops</div>
          </div>
        </div>
        {['Gerencial', 'Producción', 'Inventario', 'Compras', 'Finanzas'].map((item, i) => (
          <div
            key={item}
            className={`mb-0.5 flex items-center gap-1 rounded-md px-1 py-1 ${
              i === 0 ? 'font-medium text-white' : 'text-zinc-400'
            }`}
            style={i === 0 ? { backgroundColor: `${ACCENT}cc` } : undefined}
          >
            <span
              className="h-1 w-1 shrink-0 rounded-full"
              style={{ backgroundColor: i === 0 ? '#fff' : '#71717a' }}
            />
            <span className="truncate">{item}</span>
          </div>
        ))}
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-zinc-200/80 bg-white px-2 py-1">
          <div>
            <div className="text-[6px] tracking-wide text-zinc-400 uppercase">Módulo</div>
            <div className="font-semibold text-zinc-800">Panel gerencial</div>
          </div>
          <div className="flex items-center gap-1">
            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[6px] font-medium text-emerald-700 ring-1 ring-emerald-100">
              En vivo
            </span>
            <span className="h-3.5 w-3.5 rounded-full bg-zinc-200" />
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-1.5 p-1.5 sm:p-2">
          {/* KPIs */}
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
            {[
              {
                label: 'Ventas cobradas',
                value: '$12.4k',
                delta: '+8%',
                up: true,
                spark: [40, 55, 48, 62, 58, 74],
              },
              {
                label: 'Margen bruto',
                value: '38%',
                delta: '+2pp',
                up: true,
                spark: [30, 34, 33, 36, 35, 38],
              },
              {
                label: 'Pedidos',
                value: '86',
                delta: '12 hoy',
                up: true,
                spark: [52, 48, 60, 55, 70, 65],
              },
              {
                label: 'Días invent.',
                value: '14',
                delta: '-1d',
                up: false,
                spark: [22, 20, 18, 19, 16, 14],
              },
            ].map((k) => (
              <div
                key={k.label}
                className="rounded-lg border border-zinc-200/70 bg-white px-1.5 py-1 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              >
                <div className="truncate text-[6px] text-zinc-400">{k.label}</div>
                <div className="text-[10px] font-bold tracking-tight text-zinc-900 sm:text-[11px]">
                  {k.value}
                </div>
                <div className="mt-0.5 flex items-end gap-1">
                  <div className="flex h-2 flex-1 items-end gap-[1.5px]" aria-hidden>
                    {k.spark.map((h, i) => (
                      <span
                        key={i}
                        className="flex-1 rounded-[1px]"
                        style={{
                          height: `${h}%`,
                          backgroundColor: k.up ? `${ACCENT}4d` : '#f59e0b4d',
                        }}
                      />
                    ))}
                  </div>
                  <span
                    aria-hidden
                    className={`h-0 w-0 shrink-0 border-x-[2.5px] border-x-transparent ${
                      k.up
                        ? 'border-b-[3.5px] border-b-emerald-600'
                        : 'border-t-[3.5px] border-t-amber-600'
                    }`}
                  />
                </div>
                <div
                  className={`text-[6px] font-medium ${k.up ? 'text-emerald-600' : 'text-amber-600'}`}
                >
                  {k.delta}
                </div>
              </div>
            ))}
          </div>

          {/* Charts */}
          <div className="grid min-h-0 flex-1 grid-cols-5 gap-1 sm:gap-1.5">
            <div className="col-span-3 flex flex-col rounded-lg border border-zinc-200/70 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[6.5px] font-semibold text-zinc-700">Ventas vs costos</span>
                <span className="text-[5.5px] text-zinc-400">6 meses</span>
              </div>
              {/* Altura fija: sin ella height:% de las barras colapsa y se ven planas */}
              <div className="relative flex h-13 w-full shrink-0 items-end gap-1 px-0.5 sm:h-14.5">
                <div
                  className="pointer-events-none absolute inset-x-0 top-0 bottom-0 flex flex-col justify-between"
                  aria-hidden
                >
                  <div className="border-t border-dashed border-zinc-100" />
                  <div className="border-t border-dashed border-zinc-100" />
                  <div className="border-t border-dashed border-zinc-100" />
                  <div className="border-t border-zinc-100" />
                </div>
                {SALES_CHART.map((d, i, arr) => {
                  const isLast = i === arr.length - 1
                  return (
                    <div
                      key={d.month}
                      className="relative z-1 flex h-full flex-1 items-end justify-center gap-0.5"
                    >
                      {isLast && (
                        <span className="absolute -top-0.5 left-1/2 z-2 -translate-x-1/2 -translate-y-full text-[5px] font-semibold whitespace-nowrap text-blue-600">
                          pico
                        </span>
                      )}
                      <div
                        className="w-[42%] rounded-t-xs"
                        style={{
                          height: `${d.ventas}%`,
                          backgroundColor: ACCENT,
                          boxShadow: isLast ? `0 0 0 1px ${ACCENT}55` : undefined,
                        }}
                      />
                      <div
                        className="w-[42%] rounded-t-xs bg-zinc-300"
                        style={{ height: `${d.costos}%` }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="mt-1 flex gap-1 px-0.5">
                {SALES_CHART.map((d) => (
                  <span key={d.month} className="flex-1 text-center text-[5px] text-zinc-400">
                    {d.month}
                  </span>
                ))}
              </div>
            </div>

            <div className="col-span-2 flex flex-col rounded-lg border border-zinc-200/70 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="mb-1 text-[6.5px] font-semibold text-zinc-700">Estado pedidos</span>
              <div className="flex flex-1 items-center gap-2">
                <div className="relative h-11 w-11 shrink-0 sm:h-12 sm:w-12">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        'conic-gradient(#2563EB 0 42%, #22c55e 42% 68%, #f59e0b 68% 86%, #e4e4e7 86% 100%)',
                    }}
                  />
                  <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white">
                    <span className="text-[7px] font-bold text-zinc-900 sm:text-[7.5px]">86</span>
                  </div>
                </div>
                <div className="min-w-0 space-y-0.5 text-[6px]">
                  {[
                    { l: 'Pagado', c: '#2563EB' },
                    { l: 'En curso', c: '#22c55e' },
                    { l: 'Pendiente', c: '#f59e0b' },
                  ].map((r) => (
                    <div key={r.l} className="flex items-center gap-1 text-zinc-600">
                      <span className="h-1 w-1 rounded-full" style={{ backgroundColor: r.c }} />
                      {r.l}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
