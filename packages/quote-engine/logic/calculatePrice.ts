import type { Bundle, CatalogService, PriceRange } from '../types'
import { bundles } from '../catalog/bundles'
import { services } from '../catalog/services'

export interface CalculatePriceInput {
  serviceIds: string[]
}

export interface LineItem {
  service: CatalogService
  /** Precio resuelto para mostrar (fijo o rango). */
  precioMostrado: number | PriceRange
}

export interface CalculatePriceResult {
  lineItems: LineItem[]
  bundleAplicado: Bundle | null
  subtotal: number
  descuento: number
  total: number
  /** true si algún servicio incluido tiene precioVisible: false */
  requiereContactoDirecto: boolean
}

function isPriceRange(precio: number | PriceRange): precio is PriceRange {
  return typeof precio === 'object' && precio !== null && 'min' in precio && 'max' in precio
}

/**
 * Valor numérico usado en sumas.
 * TODO: permitir selección dentro del rango en Fase 3
 */
export function resolveCalculoPrecio(precio: number | PriceRange): number {
  if (isPriceRange(precio)) {
    // TODO: permitir selección dentro del rango en Fase 3
    return precio.min
  }
  return precio
}

function findService(id: string): CatalogService {
  const found = services.find((s) => s.id === id)
  if (!found) {
    throw new Error(`Servicio no encontrado en catálogo: ${id}`)
  }
  return found
}

/**
 * Bundle completo cuyo set de servicios está contenido en serviceIds (exacto o superset).
 * Si hay varios, elige el de mayor descuento absoluto sobre la suma de sus servicios.
 */
function findMatchingBundle(serviceIds: string[], lineById: Map<string, LineItem>): Bundle | null {
  const idSet = new Set(serviceIds)
  const matches = bundles.filter((b) => b.servicios.every((id) => idSet.has(id)))

  if (matches.length === 0) return null

  let best: Bundle | null = null
  let bestSaving = -1

  for (const bundle of matches) {
    const sumaBundle = bundle.servicios.reduce((acc, id) => {
      const item = lineById.get(id)
      if (!item) return acc
      return acc + resolveCalculoPrecio(item.precioMostrado)
    }, 0)

    const saving =
      bundle.tipoDescuento === 'monto' ? bundle.descuento : (sumaBundle * bundle.descuento) / 100

    if (saving > bestSaving) {
      bestSaving = saving
      best = bundle
    }
  }

  return best
}

export function calculatePrice(input: CalculatePriceInput): CalculatePriceResult {
  const uniqueIds = [...new Set(input.serviceIds)]

  const lineItems: LineItem[] = uniqueIds.map((id) => {
    const service = findService(id)
    return {
      service,
      precioMostrado: service.precio,
    }
  })

  const lineById = new Map(lineItems.map((li) => [li.service.id, li]))
  const requiereContactoDirecto = lineItems.some((li) => !li.service.precioVisible)

  // Sin precio público visible: no exponemos total numérico
  if (requiereContactoDirecto) {
    return {
      lineItems,
      bundleAplicado: null,
      subtotal: 0,
      descuento: 0,
      total: 0,
      requiereContactoDirecto: true,
    }
  }

  const subtotal = lineItems.reduce((acc, li) => acc + resolveCalculoPrecio(li.precioMostrado), 0)

  const bundleAplicado = findMatchingBundle(uniqueIds, lineById)

  let descuento = 0
  if (bundleAplicado) {
    const sumaBundle = bundleAplicado.servicios.reduce((acc, id) => {
      const item = lineById.get(id)
      if (!item) return acc
      return acc + resolveCalculoPrecio(item.precioMostrado)
    }, 0)

    descuento =
      bundleAplicado.tipoDescuento === 'monto'
        ? bundleAplicado.descuento
        : (sumaBundle * bundleAplicado.descuento) / 100
  }

  const total = Math.max(0, subtotal - descuento)

  return {
    lineItems,
    bundleAplicado,
    subtotal,
    descuento,
    total,
    requiereContactoDirecto: false,
  }
}
