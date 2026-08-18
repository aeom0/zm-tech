// Export CSV ML — lógica pura (sin módulos nativos; seguro en OTA sin rebuild).
import type { Product } from '../../types/database'
import { urisFotos } from '../../utils/productPhotos'

const MAX_FOTOS = 6

export const ML_EXPORT_COLUMNS = [
  'repmax_id',
  'titulo',
  'descripcion',
  'marca',
  'modelo',
  'numero_parte',
  'color',
  'condicion',
  'anio_desde',
  'anio_hasta',
  'precio_usd',
  'stock',
  'ml_categoria_id',
  'ml_categoria_nombre',
  ...Array.from({ length: MAX_FOTOS }, (_, i) => `url_foto_${i + 1}`),
] as const

function escaparCsv(valor: string): string {
  if (/[",\n\r]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`
  }
  return valor
}

function condicionLabel(condition: Product['condition']): string {
  return condition === 'NEW' ? 'Nuevo' : 'Usado'
}

export interface FilaExportMl {
  product: Product
  listo: boolean
}

/** Filas listas para export (checklist OK + intent ML). */
export function filtrarListosParaExport(filas: FilaExportMl[]): FilaExportMl[] {
  return filas.filter((f) => f.listo && f.product.mlPublishIntent)
}

export function construirCsvExport(filas: FilaExportMl[]): string {
  const lineas: string[] = [ML_EXPORT_COLUMNS.join(',')]

  for (const { product } of filas) {
    const fotos = urisFotos(product.photos).slice(0, MAX_FOTOS)
    const celdas: string[] = [
      product.id,
      product.title,
      product.description ?? '',
      product.brand,
      product.model,
      product.partNumber ?? '',
      product.color ?? '',
      condicionLabel(product.condition),
      product.yearFrom != null ? String(product.yearFrom) : '',
      product.yearTo != null ? String(product.yearTo) : '',
      product.priceUsd.toFixed(2),
      String(product.stock),
      product.mlCategoryId ?? '',
      product.mlCategoryName ?? '',
      ...Array.from({ length: MAX_FOTOS }, (_, i) => fotos[i] ?? ''),
    ]
    lineas.push(celdas.map((c) => escaparCsv(c)).join(','))
  }

  return `\uFEFF${lineas.join('\n')}`
}
