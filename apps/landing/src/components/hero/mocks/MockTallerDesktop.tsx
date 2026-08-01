/** Mock genérico — panel de taller / mantenimiento (sin marca) */

const ACCENT = '#059669'

export default function MockTallerDesktop() {
  return (
    <div
      className="flex h-full w-full overflow-hidden bg-[#F3F4F6] text-[7.5px] leading-snug text-zinc-600 sm:text-[8.5px]"
      aria-hidden
    >
      {/* Sidebar */}
      <aside className="flex w-[17%] shrink-0 flex-col border-r border-zinc-200/80 bg-[#0F1D18] px-1.5 py-2 text-zinc-300">
        <div className="mb-2 flex items-center gap-1 border-b border-white/10 pb-1.5">
          <span
            className="flex h-3 w-3 items-center justify-center rounded text-[6px] font-bold text-white"
            style={{ backgroundColor: ACCENT }}
          >
            T
          </span>
          <div className="min-w-0">
            <div className="truncate text-[7px] font-semibold text-white">Taller</div>
            <div className="truncate text-[5.5px] text-zinc-500">Ops</div>
          </div>
        </div>
        {['Órdenes', 'Técnicos', 'Refacciones', 'Clientes', 'Facturación'].map((item, i) => (
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
            <div className="font-semibold text-zinc-800">Órdenes de servicio</div>
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
                label: 'Órdenes abiertas',
                value: '23',
                delta: '+4 hoy',
                up: true,
                spark: [45, 50, 48, 58, 55, 65],
              },
              {
                label: 'Tiempo prom.',
                value: '2.4h',
                delta: '-18min',
                up: true,
                spark: [70, 65, 60, 58, 52, 48],
              },
              {
                label: 'Refacc. bajas',
                value: '7',
                delta: 'revisar',
                up: false,
                spark: [20, 28, 30, 34, 38, 42],
              },
              {
                label: 'Ingresos mes',
                value: '$9.1k',
                delta: '+11%',
                up: true,
                spark: [38, 42, 40, 50, 46, 60],
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
                <span className="text-[6.5px] font-semibold text-zinc-700">
                  Órdenes completadas
                </span>
                <span className="text-[5.5px] text-zinc-400">6 semanas</span>
              </div>
              <div className="relative flex flex-1 items-end gap-[3px] px-0.5">
                {/* grid lines */}
                <div
                  className="pointer-events-none absolute inset-x-0 top-1 bottom-1 flex flex-col justify-between"
                  aria-hidden
                >
                  <div className="border-t border-dashed border-zinc-100" />
                  <div className="border-t border-dashed border-zinc-100" />
                  <div className="border-t border-dashed border-zinc-100" />
                </div>
                {/* línea de tendencia sobre las barras */}
                <svg
                  className="pointer-events-none absolute inset-0"
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <polyline
                    points="8,52 25,35 42,45 58,22 75,40 92,10"
                    fill="none"
                    stroke={ACCENT}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    opacity="0.55"
                  />
                  {[
                    [8, 52],
                    [25, 35],
                    [42, 45],
                    [58, 22],
                    [75, 40],
                    [92, 10],
                  ].map(([x, y]) => (
                    <circle key={`${x}-${y}`} cx={x} cy={y} r="2" fill={ACCENT} />
                  ))}
                </svg>
                {[48, 65, 55, 78, 60, 90].map((h, i, arr) => {
                  const isLast = i === arr.length - 1
                  return (
                    <div key={i} className="relative flex flex-1 flex-col items-center justify-end">
                      {isLast && (
                        <span className="absolute -top-2 text-[5px] font-semibold text-zinc-500">
                          {h}%
                        </span>
                      )}
                      <div
                        className="w-[55%] rounded-t-[2px]"
                        style={{
                          height: `${h}%`,
                          backgroundColor: `${ACCENT}33`,
                          minHeight: 4,
                          boxShadow: isLast ? `0 0 0 1.5px ${ACCENT}66` : undefined,
                        }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="mt-1 flex gap-2 text-[5.5px] text-zinc-400">
                <span className="flex items-center gap-0.5">
                  <span className="h-1 w-1 rounded-full" style={{ backgroundColor: ACCENT }} />{' '}
                  Completadas
                </span>
                <span className="flex items-center gap-0.5">
                  <span
                    className="h-[1.5px] w-2 rounded-full"
                    style={{ backgroundColor: ACCENT, opacity: 0.55 }}
                  />{' '}
                  Tendencia
                </span>
              </div>
            </div>

            <div className="col-span-2 flex flex-col rounded-lg border border-zinc-200/70 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
              <span className="mb-1 text-[6.5px] font-semibold text-zinc-700">Estado órdenes</span>
              <div className="flex flex-1 items-center gap-2">
                <div className="relative h-11 w-11 shrink-0 sm:h-12 sm:w-12">
                  <div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        'conic-gradient(#059669 0 46%, #3b82f6 46% 70%, #f59e0b 70% 88%, #e4e4e7 88% 100%)',
                    }}
                  />
                  <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white">
                    <span className="text-[7px] font-bold text-zinc-900 sm:text-[7.5px]">23</span>
                  </div>
                </div>
                <div className="min-w-0 space-y-0.5 text-[6px]">
                  {[
                    { l: 'Listo', c: '#059669' },
                    { l: 'En taller', c: '#3b82f6' },
                    { l: 'Esp. refacción', c: '#f59e0b' },
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
