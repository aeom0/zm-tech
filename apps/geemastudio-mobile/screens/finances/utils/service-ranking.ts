export interface ServiceRankRow {
  id: string
  label: string
  count: number
}

interface RankableLine {
  service_id: string
  pack_id?: string | null
}

/** Cuenta apariciones por servicio/pack y ordena desc. */
export function buildTopServicesRanking(
  lines: RankableLine[],
  serviceNameById: Record<string, string>,
  packNameById: Record<string, string>
): ServiceRankRow[] {
  const counts: Record<string, { label: string; count: number }> = {}

  for (const line of lines) {
    const key = line.pack_id ? `pack:${line.pack_id}` : `svc:${line.service_id}`
    const label = line.pack_id
      ? packNameById[line.pack_id] || 'Pack'
      : serviceNameById[line.service_id] || 'Servicio'
    if (!counts[key]) counts[key] = { label, count: 0 }
    counts[key].count += 1
  }

  return Object.entries(counts)
    .map(([id, v]) => ({ id, label: v.label, count: v.count }))
    .sort((a, b) => b.count - a.count)
}
