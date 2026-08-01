/** Mock genérico — app móvil de ventas industrial (sin marca) */

export default function MockVentasMobile() {
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-[#F4F5F7] text-[6.5px] leading-snug text-zinc-700 sm:text-[7px]"
      aria-hidden
    >
      {/* Header — pt mínimo (island va en el bisel, no sobre la UI) */}
      <div
        className="px-1.5 pt-1.5 pb-2 text-white"
        style={{
          backgroundImage: 'linear-gradient(145deg, #1e3a8a 0%, #2563EB 55%, #1d4ed8 100%)',
        }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[5.5px] text-white/70">Buenos días</div>
            <div className="text-[8px] font-semibold tracking-tight sm:text-[9px]">
              Resumen de ventas
            </div>
          </div>
          <span className="mt-0.5 h-3.5 w-3.5 rounded-full bg-white/20 ring-1 ring-white/30" />
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          <div className="rounded-md bg-white/12 px-1.5 py-1 ring-1 ring-white/10">
            <div className="text-[5.5px] text-white/65">Comisión</div>
            <div className="text-[9px] font-bold tracking-tight">$842</div>
            <div className="text-[5px] text-emerald-200">+12% sem.</div>
          </div>
          <div className="rounded-md bg-white/12 px-1.5 py-1 ring-1 ring-white/10">
            <div className="text-[5.5px] text-white/65">Pedidos</div>
            <div className="text-[9px] font-bold tracking-tight">12</div>
            <div className="text-[5px] text-white/55">3 pendientes</div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden p-1.5">
        <div className="grid grid-cols-2 gap-1">
          {['+ Pedido', '+ Cliente'].map((a) => (
            <div
              key={a}
              className="rounded-md border border-blue-100 bg-white py-1 text-center text-[6px] font-semibold text-blue-800 shadow-[0_1px_2px_rgba(37,99,235,0.06)]"
            >
              {a}
            </div>
          ))}
        </div>

        <div className="rounded-md border border-zinc-200/80 bg-white p-1.5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[6px] font-semibold text-zinc-700">Ventas semana</span>
            <span className="text-[5.5px] text-zinc-400">L–S</span>
          </div>
          <div className="flex h-9 items-end gap-0.5">
            {[38, 62, 48, 85, 58, 74].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-0.5">
                <div
                  className="w-full rounded-t-xs bg-blue-600/85"
                  style={{ height: `${h}%` }}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
          <div className="text-[6px] font-semibold text-zinc-500">Recientes</div>
          {[
            { n: '#1842 · Distribuidora Norte', s: 'Pagado', c: 'bg-emerald-50 text-emerald-700' },
            { n: '#1841 · Boutique Central', s: 'En ruta', c: 'bg-sky-50 text-sky-700' },
            { n: '#1840 · Farma Plaza', s: 'Pendiente', c: 'bg-amber-50 text-amber-700' },
          ].map((p) => (
            <div
              key={p.n}
              className="flex items-center justify-between gap-1 rounded-md border border-zinc-100 bg-white px-1 py-1"
            >
              <span className="min-w-0 truncate font-medium text-zinc-800">{p.n}</span>
              <span className={`shrink-0 rounded-full px-1 py-px text-[5.5px] font-medium ${p.c}`}>
                {p.s}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex border-t border-zinc-200/90 bg-white py-1 text-[5.5px] text-zinc-400">
        {['Inicio', 'Prod.', 'Pagos', 'Pedidos', 'Cli.'].map((t, i) => (
          <div
            key={t}
            className={`flex flex-1 flex-col items-center gap-0.5 ${
              i === 0 ? 'font-semibold text-blue-700' : ''
            }`}
          >
            <span className={`h-1 w-1 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-zinc-300'}`} />
            {t}
          </div>
        ))}
      </div>
    </div>
  )
}
