// ============================================================
// Checklist “Listo para ML” — validación local (sin API OAuth)
// ============================================================

import type { MlListingStatus } from '@repmax/repmax-schema/mlListing'

export interface ItemChecklistMl {
  id: string
  label: string
  ok: boolean
}

export interface ResultadoListoMl {
  listo: boolean
  items: ItemChecklistMl[]
}

export type MlBadgeKind = 'none' | 'incompleto' | 'listo' | 'exportado' | 'en_ml' | 'actualizar'

export interface DatosListoMl {
  title: string
  partNumber: string
  description?: string
  priceUsd: number
  stock: number
  portadaUri?: string | null
}

const PATRON_TELEFONO = /(\+?\d[\d\s\-().]{7,}\d|whatsapp|wa\.me)/i

function descripcionSinTelefono(desc: string): boolean {
  const t = desc.trim()
  if (!t) return true
  return !PATRON_TELEFONO.test(t)
}

/** Evalúa si la ficha cumple el mínimo para export / publicación ML manual. */
export function evaluarListoMl(datos: DatosListoMl): ResultadoListoMl {
  const tituloOk = datos.title.trim().length >= 8
  const parteOk = datos.partNumber.trim().length >= 2
  const precioOk = datos.priceUsd > 0
  const stockOk = datos.stock >= 0
  const portadaOk = Boolean(datos.portadaUri)
  const descOk = descripcionSinTelefono(datos.description ?? '')

  const items: ItemChecklistMl[] = [
    { id: 'portada', label: 'Foto de portada', ok: portadaOk },
    { id: 'titulo', label: 'Título (Producto + Marca + compatible…)', ok: tituloOk },
    { id: 'parte', label: 'Número de parte', ok: parteOk },
    { id: 'precio', label: 'Precio mayor a 0', ok: precioOk },
    { id: 'stock', label: 'Stock definido', ok: stockOk },
    { id: 'desc', label: 'Descripción sin teléfono ni WhatsApp', ok: descOk },
  ]

  return { listo: items.every((i) => i.ok), items }
}

export interface ConfigBadgeMl {
  kind: MlBadgeKind
  label: string
  color: string
  bg: string
}

export const ML_BADGE_CONFIG: Record<Exclude<MlBadgeKind, 'none'>, ConfigBadgeMl> = {
  incompleto: {
    kind: 'incompleto',
    label: 'ML incompleto',
    color: '#F59E0B',
    bg: '#F59E0B22',
  },
  listo: {
    kind: 'listo',
    label: 'Listo ML',
    color: '#22C55E',
    bg: '#22C55E22',
  },
  exportado: {
    kind: 'exportado',
    label: 'Exportado',
    color: '#3B82F6',
    bg: '#3B82F622',
  },
  en_ml: {
    kind: 'en_ml',
    label: 'En ML',
    color: '#FFE600',
    bg: '#FFE60033',
  },
  actualizar: {
    kind: 'actualizar',
    label: 'Actualizar ML',
    color: '#EF4444',
    bg: '#EF444422',
  },
}

/** Badge de inventario según intención + estado del listing. */
export function resolverBadgeMl(
  mlPublishIntent: boolean,
  listingStatus?: MlListingStatus | null,
  listo?: boolean
): MlBadgeKind {
  if (!mlPublishIntent) return 'none'

  if (listingStatus === 'exported') return 'exportado'
  if (listingStatus === 'published_manual' || listingStatus === 'published') return 'en_ml'
  if (listingStatus === 'needs_update') return 'actualizar'
  if (listingStatus === 'ready' && listo) return 'listo'
  if (!listo) return 'incompleto'
  return 'listo'
}

export type FiltroMlInventario = 'all' | 'para_ml' | 'listo' | 'incompleto' | 'exportado' | 'en_ml'

export function productoPasaFiltroMl(
  filtro: FiltroMlInventario,
  mlPublishIntent: boolean,
  badge: MlBadgeKind
): boolean {
  if (filtro === 'all') return true
  if (filtro === 'para_ml') return mlPublishIntent
  return badge === filtro
}
