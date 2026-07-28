export type ROIComparisonRow = {
  label: string
  valor: string
  /** 'negativo' = costo/dolor actual; 'positivo' = beneficio con ZM Tech */
  variante: 'negativo' | 'positivo'
}

export type ROIComparisonProps = {
  tituloSeccion?: string
  nota?: string
  filas: ROIComparisonRow[]
  resumenAntes?: { valor: string; label: string }
  resumenDespues?: { valor: string; label: string }
  payback?: { valor: string; label: string }
}

export function ROIComparison({
  tituloSeccion = '04 · Lo que cambia',
  nota,
  filas,
  resumenAntes,
  resumenDespues,
  payback,
}: ROIComparisonProps) {
  return (
    <section className="mb-4">
      <p className="mt-[1.1rem] mb-2 text-[11px] font-semibold tracking-wider text-[#666] uppercase">
        {tituloSeccion}
      </p>

      <div className="mb-3 rounded-xl border border-[#e5e5e5] bg-white px-4 py-3">
        {nota ? <p className="mb-2 text-xs text-[#999]">{nota}</p> : null}
        {filas.map((row, i) => (
          <div
            key={`${row.label}-${i}`}
            className={`flex items-center justify-between py-1.5 ${
              i < filas.length - 1 ? 'border-b border-[#f0f0f0]' : ''
            }`}
          >
            <span className="text-xs text-[#555]">{row.label}</span>
            <span
              className={`text-[13px] font-semibold ${
                row.variante === 'negativo' ? 'text-[#a32d2d]' : 'text-[#0f6e56]'
              }`}
            >
              {row.valor}
            </span>
          </div>
        ))}
      </div>

      {resumenAntes || resumenDespues ? (
        <div className="mb-2 grid grid-cols-2 gap-2">
          {resumenAntes ? (
            <div className="rounded-[10px] bg-[#fef2f2] p-3 text-center">
              <p className="text-[1.4rem] font-semibold text-[#e24b4a]">{resumenAntes.valor}</p>
              <p className="mt-1 text-[11px] text-[#888]">{resumenAntes.label}</p>
            </div>
          ) : null}
          {resumenDespues ? (
            <div className="rounded-[10px] bg-[#f0faf4] p-3 text-center">
              <p className="text-[1.4rem] font-semibold text-[#1d9e75]">{resumenDespues.valor}</p>
              <p className="mt-1 text-[11px] text-[#888]">{resumenDespues.label}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {payback ? (
        <div className="rounded-[10px] bg-[#e8f0f7] p-3 text-center">
          <p className="text-[1.3rem] font-semibold text-[#1a3c5e]">{payback.valor}</p>
          <p className="mt-1 text-[11px] text-[#666]">{payback.label}</p>
        </div>
      ) : null}
    </section>
  )
}
