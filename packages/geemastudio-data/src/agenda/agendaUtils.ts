import type { Promo, PromotionItem } from '../catalog/types'
import type { AgendaPack, AgendaService, AgendaServiceLine, AgendaStatusFilter } from './types'

export function matchesStatusFilter(status: string, filter: AgendaStatusFilter): boolean {
  if (filter === 'all') return status !== 'cancelled'
  if (filter === 'cancelled') return status === 'cancelled' || status === 'no_show'
  return status === filter
}

export function splitPackTotalEqually(packTotal: number, lineCount: number): number[] {
  if (lineCount <= 0 || !Number.isFinite(packTotal)) return []
  const cents = Math.round(packTotal * 100)
  const base = Math.floor(cents / lineCount)
  const remainder = cents - base * lineCount
  const out: number[] = []
  for (let i = 0; i < lineCount; i++) {
    const c = base + (i < remainder ? 1 : 0)
    out.push(c / 100)
  }
  return out
}

export function lineUnitPrice(line: AgendaServiceLine, services: AgendaService[]): number {
  if (typeof line.priceOverride === 'number' && Number.isFinite(line.priceOverride)) {
    return line.priceOverride
  }
  const svc = services.find((s) => s.id === line.serviceId)
  const parsed = svc ? (typeof svc.price === 'number' ? svc.price : parseFloat(svc.price)) : 0
  return Number.isFinite(parsed) ? parsed : 0
}

export function lineDuration(line: AgendaServiceLine, services: AgendaService[]): number {
  const svc = services.find((s) => s.id === line.serviceId)
  return svc?.duration ?? 0
}

export function computeServiceLinesTotals(
  lines: AgendaServiceLine[],
  services: AgendaService[]
): { totalPrice: number; totalDuration: number } {
  return lines.reduce(
    (acc, line) => ({
      totalPrice: acc.totalPrice + lineUnitPrice(line, services),
      totalDuration: acc.totalDuration + lineDuration(line, services),
    }),
    { totalPrice: 0, totalDuration: 0 }
  )
}

export function addPackServiceLines(
  pack: AgendaPack,
  defaultEmployeeId: string
): AgendaServiceLine[] {
  const ids = pack.service_ids ?? []
  if (ids.length === 0) return []
  const packTotal = typeof pack.price === 'number' ? pack.price : parseFloat(pack.price)
  const safeTotal = Number.isFinite(packTotal) ? packTotal : 0
  const shares = splitPackTotalEqually(safeTotal, ids.length)
  return ids.map((serviceId, idx) => ({
    serviceId,
    employeeId: defaultEmployeeId,
    packId: pack.id,
    priceOverride: shares[idx] ?? 0,
  }))
}

export function addPromoServiceLines(
  promo: { id: string },
  promotionItems: PromotionItem[],
  packs: AgendaPack[],
  defaultEmployeeId: string
): AgendaServiceLine[] {
  const items = promotionItems.filter((i) => i.promo_id === promo.id)
  const lines: AgendaServiceLine[] = []

  for (const item of items) {
    const quantity = item.quantity > 0 ? item.quantity : 1

    if (item.item_type === 'service') {
      for (let i = 0; i < quantity; i++) {
        lines.push({
          serviceId: item.item_id,
          employeeId: defaultEmployeeId,
          promoId: promo.id,
          priceOverride: item.discounted_price,
        })
      }
      continue
    }

    const pack = packs.find((p) => p.id === item.item_id)
    const packServiceIds = pack?.service_ids ?? []
    if (packServiceIds.length === 0) continue

    for (let i = 0; i < quantity; i++) {
      const shares = splitPackTotalEqually(item.discounted_price, packServiceIds.length)
      packServiceIds.forEach((serviceId, idx) => {
        lines.push({
          serviceId,
          employeeId: defaultEmployeeId,
          packId: pack!.id,
          promoId: promo.id,
          priceOverride: shares[idx] ?? 0,
        })
      })
    }
  }

  return lines
}
