/** Quién puede hacer un servicio, incluyendo la cobertura de ese día. Sin días de aviso. */

export interface CoverageWindow {
  coveredId: string
  coveringId: string
  dateFrom: string
  dateTo: string
}

export interface ServiceEligibilityIndex {
  doesAll: ReadonlySet<string>
  serviceIdsByEmployee: ReadonlyMap<string, ReadonlySet<string>>
  coverages: readonly CoverageWindow[]
}

export const EMPTY_ELIGIBILITY: ServiceEligibilityIndex = {
  doesAll: new Set(),
  serviceIdsByEmployee: new Map(),
  coverages: [],
}

export function employeeCanDoService(
  index: ServiceEligibilityIndex,
  employeeId: string,
  serviceId: string,
  day: string,
): boolean {
  if (index.doesAll.has(employeeId)) return true
  if (index.serviceIdsByEmployee.get(employeeId)?.has(serviceId)) return true
  for (const coverage of index.coverages) {
    if (coverage.coveringId !== employeeId) continue
    if (day < coverage.dateFrom || day > coverage.dateTo) continue
    if (index.doesAll.has(coverage.coveredId)) return true
    if (index.serviceIdsByEmployee.get(coverage.coveredId)?.has(serviceId)) return true
  }
  return false
}

/** Sin servicios conocidos, no se filtra: la cita sigue pudiendo asignarse. */
export function employeeCanDoServices(
  index: ServiceEligibilityIndex,
  employeeId: string,
  serviceIds: readonly string[],
  day: string,
): boolean {
  if (serviceIds.length === 0) return true
  return serviceIds.every((id) => employeeCanDoService(index, employeeId, id, day))
}

export function uniqueServiceIds(
  serviceId: string | null | undefined,
  serviceIds: readonly string[] | null | undefined,
  lineServiceIds: readonly string[] | null | undefined,
): string[] {
  const fromLines = (lineServiceIds ?? []).filter(Boolean)
  if (fromLines.length > 0) return [...new Set(fromLines)]
  const fromArray = (serviceIds ?? []).filter(Boolean)
  if (fromArray.length > 0) return [...new Set(fromArray)]
  return serviceId ? [serviceId] : []
}

export function servicesOfPack(serviceIds: readonly string[] | null | undefined): string[] {
  return [...new Set((serviceIds ?? []).filter(Boolean))]
}

export function servicesOfPromo(
  promoId: string,
  items: readonly { promo_id: string; item_type: string; item_id: string }[],
  packs: readonly { id: string; service_ids: string[] }[],
): string[] {
  const ids: string[] = []
  for (const item of items) {
    if (item.promo_id !== promoId) continue
    if (item.item_type === 'service') ids.push(item.item_id)
    if (item.item_type === 'pack') {
      ids.push(...servicesOfPack(packs.find((pack) => pack.id === item.item_id)?.service_ids))
    }
  }
  return [...new Set(ids.filter(Boolean))]
}
