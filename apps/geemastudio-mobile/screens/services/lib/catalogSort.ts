/** Orden unificado del catálogo: activos → orden de negocio → nombre A–Z. */

export type CatalogSortAccessors<T> = {
  /** Si se omite (p. ej. categorías), no se separa por activo/inactivo. */
  getActive?: (item: T) => boolean
  /** `null`/`undefined` van al final del bloque (como nullsLast en PostgREST). */
  getOrder?: (item: T) => number | null | undefined
  getName: (item: T) => string
}

function orderRank(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(Number(value))) {
    return Number.POSITIVE_INFINITY
  }
  return Number(value)
}

export function compareCatalogItems<T>(a: T, b: T, accessors: CatalogSortAccessors<T>): number {
  if (accessors.getActive) {
    const aActive = accessors.getActive(a)
    const bActive = accessors.getActive(b)
    if (aActive !== bActive) {
      return aActive ? -1 : 1
    }
  }

  if (accessors.getOrder) {
    const ao = orderRank(accessors.getOrder(a))
    const bo = orderRank(accessors.getOrder(b))
    if (ao !== bo) {
      return ao - bo
    }
  }

  return accessors.getName(a).localeCompare(accessors.getName(b), 'es', { sensitivity: 'base' })
}

export function sortCatalogList<T>(items: readonly T[], accessors: CatalogSortAccessors<T>): T[] {
  return [...items].sort((a, b) => compareCatalogItems(a, b, accessors))
}
