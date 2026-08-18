// Título sugerido para MercadoLibre — plan 04 fase B / plan 05 E2.
// Formato: Producto + Marca + compatible con {modelo} {años}

function formatearRangoAnios(yearFrom?: number | string, yearTo?: number | string): string {
  const desde = typeof yearFrom === 'string' ? parseInt(yearFrom, 10) : yearFrom
  const hasta = typeof yearTo === 'string' ? parseInt(yearTo, 10) : yearTo
  if (desde && hasta && desde !== hasta) return `${desde}-${hasta}`
  if (desde) return String(desde)
  if (hasta) return String(hasta)
  return ''
}

export interface SugerenciaTituloMlInput {
  /** Nombre del producto / tipo de pieza (título corto sin compatibilidad). */
  nombreProducto: string
  brand: string
  model: string
  yearFrom?: number | string
  yearTo?: number | string
}

const MARCADOR_COMPATIBLE = ' compatible con '

/**
 * Si el título ya es una sugerencia ML aplicada, devuelve solo el nombre base
 * (todo antes de " compatible con ") para no duplicar al recalcular.
 */
export function extraerNombreBaseMl(titulo: string): string {
  const trimmed = titulo.trim()
  if (!trimmed) return ''
  const idx = trimmed.toLowerCase().indexOf(MARCADOR_COMPATIBLE)
  if (idx > 0) return trimmed.slice(0, idx).trim()
  return trimmed
}

/** Devuelve null si faltan datos mínimos para armar el título. */
export function sugerirTituloMl(input: SugerenciaTituloMlInput): string | null {
  const producto = extraerNombreBaseMl(input.nombreProducto)
  const marca = input.brand.trim()
  const modelo = input.model.trim()
  if (!producto || !marca || !modelo) return null

  const years = formatearRangoAnios(input.yearFrom, input.yearTo)
  const base = `${producto} ${marca} compatible con ${modelo}`
  return years ? `${base} ${years}` : base
}
