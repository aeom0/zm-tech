import type { Bundle } from '../types'

type ComboBannerProps = {
  bundle: Bundle
  /** Ahorro absoluto en USD ya calculado. */
  ahorro: number
  /** Suma de los servicios del bundle antes del descuento. */
  subtotalBundle: number
}

export function ComboBanner({ bundle, ahorro, subtotalBundle }: ComboBannerProps) {
  const totalConDescuento = Math.max(0, subtotalBundle - ahorro)

  return (
    <div className="mb-4 rounded-lg border border-[#b5cfe4] bg-[#e8f0f7] px-4 py-3">
      <span className="mb-1.5 inline-block rounded-md bg-[#1d9e75] px-2.5 py-0.5 text-[11px] font-semibold text-white">
        {bundle.nombre}
      </span>
      <p className="text-[13px] leading-normal text-[#0c447c]">
        Paquete completo: <strong>${totalConDescuento} USD</strong> en lugar de ${subtotalBundle}.
        Ahorro de ${ahorro} al cerrar todo desde el inicio.
      </p>
    </div>
  )
}
