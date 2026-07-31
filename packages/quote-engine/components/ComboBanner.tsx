import type { Bundle } from '../types'
import type { QuoteLocale } from '../catalog/publicCopy'

type ComboBannerProps = {
  bundle: Bundle
  /** Ahorro absoluto en USD ya calculado. */
  ahorro: number
  /** Suma de los servicios del bundle antes del descuento. */
  subtotalBundle: number
  locale?: QuoteLocale
}

const bundleNamesEn: Record<string, string> = {
  'combo-presencia-local': 'Local Presence Combo',
  'combo-extras-esenciales': 'Essential extras (migration + WhatsApp + SEO)',
  'combo-app-full': 'Full Management App',
}

export function ComboBanner({
  bundle,
  ahorro,
  subtotalBundle,
  locale = 'es',
}: ComboBannerProps) {
  const totalConDescuento = Math.max(0, subtotalBundle - ahorro)
  const nombre =
    locale === 'en' ? (bundleNamesEn[bundle.id] ?? bundle.nombre) : bundle.nombre

  return (
    <div className="mb-4 rounded-lg border border-[#b5cfe4] bg-[#e8f0f7] px-4 py-3">
      <span className="mb-1.5 inline-block rounded-md bg-[#1d9e75] px-2.5 py-0.5 text-[11px] font-semibold text-white">
        {nombre}
      </span>
      <p className="text-[13px] leading-normal text-[#0c447c]">
        {locale === 'en' ? (
          <>
            Full package: <strong>${totalConDescuento} USD</strong> instead of ${subtotalBundle}.
            Save ${ahorro} when you lock everything in from the start.
          </>
        ) : (
          <>
            Paquete completo: <strong>${totalConDescuento} USD</strong> en lugar de $
            {subtotalBundle}. Ahorro de ${ahorro} al cerrar todo desde el inicio.
          </>
        )}
      </p>
    </div>
  )
}
