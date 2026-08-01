/** Mock genérico — app móvil de ventas industrial, dark cinema (sin marca) */

const ACCENT = '#6366F1'

export default function MockVentasMobile() {
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden bg-[#0a0a0c] text-[6.5px] leading-snug text-zinc-400 sm:text-[7px]"
      aria-hidden
    >
      <div
        className="px-1.5 pt-1.5 pb-2 text-white"
        style={{ backgroundImage: `linear-gradient(145deg, #1e1b4b 0%, ${ACCENT} 60%, #4338ca 100%)` }}
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[5.5px] text-white/60">Buenos días</div>
            <div className="text-[8px] font-semibold tracking-tight sm:text-[9px]">Resumen de ventas</div>
          </div>
          <span className="mt-0.5 h-3.5 w-3.5 rounded-full bg-white/15 ring-1 ring-white/25" />
        </div>
        <div className="mt-1.5 grid grid-cols-2 gap-1">
          <div className="rounded-md bg-white/10 px-1.5 py-1 ring-1 ring-white/10">
            <div className="text-[5.5px] text-white/60">Comisión</div>
            <div className="text-[9px] font-bold tracking-tight">$842</div>
            <div className="text-[5px] text-emerald-300">+12% sem.</div>
          </div>
          <div className="rounded-md bg-white/10 px-1.5 py-1 ring-1 ring-white/10">
            <div className="text-[5.5px] text-white/60">Pedidos</div>
            <div className="text-[9px] font-bold tracking-tight">12</div>
            <div className="text-[5px] text-white/50">3 pendientes</div>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden p-1.5">
        <div className="grid grid-cols-2 gap-1">
          {['+ Pedido', '+ Cliente'].map((a) => (
            <div
              key={a}
              className="rounded-md border border-white/10 bg-white/[0.04] py-1 text-center text-[6px] font-semibold"
              style={{ color: '#a5b4fc' }}
            >
              {a}
            </div>
          ))}
        </div>

        <div className="rounded-md border border-white/8 bg-white/[0.03] p-1.5">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[6px] font-semibold text-zinc-300">Ventas semana</span>
            <span className="text-[5.5px] text-zinc-500">L–S</span>
          </div>
          <div className="flex h-9 items-end gap-0.5">
            {[38, 62, 48, 85, 58, 74].map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center justify-end gap-0.5">
                <div className="w-full rounded-t-xs" style={{ height: `${h}%`, backgroundColor: `${ACCENT}b3` }} />
              </div>
            ))}
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-0.5 overflow-hidden">
          <div className="text-[6px] font-semibold text-zinc-500">Recientes</div>
          {[
            { n: '#1842 · Distribuidora Norte', s: 'Pagado', c: 'bg-emerald-500/10 text-emerald-400' },
            { n: '#1841 · Boutique Central', s: 'En ruta', c: 'bg-sky-500/10 text-sky-400' },
            { n: '#1840 · Farma Plaza', s: 'Pendiente', c: 'bg-amber-500/10 text-amber-400' },
          ].map((p) => (
            <div
              key={p.n}
              className="flex items-center justify-between gap-1 rounded-md border border-white/8 bg-white/[0.02] px-1 py-1"
            >
              <span className="min-w-0 truncate font-medium text-zinc-300">{p.n}</span>
              <span className={`shrink-0 rounded-full px-1 py-px text-[5.5px] font-medium ${p.c}`}>{p.s}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex border-t border-white/8 bg-white/[0.02] py-1 text-[5.5px] text-zinc-500">
        {['Inicio', 'Prod.', 'Pagos', 'Pedidos', 'Cli.'].map((t, i) => (
          <div
            key={t}
            className={`flex flex-1 flex-col items-center gap-0.5 ${i === 0 ? 'font-semibold' : ''}`}
            style={i === 0 ? { color: '#a5b4fc' } : undefined}
          >
            <span className="h-1 w-1 rounded-full" style={{ backgroundColor: i === 0 ? ACCENT : '#52525b' }} />
            {t}
          </div>
        ))}
      </div>
    </div>
  )
}
