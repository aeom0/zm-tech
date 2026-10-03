import { TIME_OFF_KIND_LABELS, trimTime } from '@geemastudio/shared-schema'

import type { DayAvailability } from '@/hooks/personal/availabilityService'

export type AvailabilityBlockTone = 'absence' | 'off' | 'covered'

export interface AvailabilityBlock {
  startMin: number
  endMin: number
  label: string
  tone: AvailabilityBlockTone
}

const DAY_MINUTES = 24 * 60

function toMinutes(time: string): number {
  const [h, m] = trimTime(time).split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

/** Recorta [start, end) para que no pise intervalos ya ocupados por un bloque más importante. */
function gapsOutside(
  start: number,
  end: number,
  occupied: { startMin: number; endMin: number }[]
): { start: number; end: number }[] {
  let free = [{ start, end }]
  for (const block of occupied) {
    const next: { start: number; end: number }[] = []
    for (const piece of free) {
      if (block.endMin <= piece.start || block.startMin >= piece.end) {
        next.push(piece)
        continue
      }
      if (block.startMin > piece.start) next.push({ start: piece.start, end: block.startMin })
      if (block.endMin < piece.end) next.push({ start: block.endMin, end: piece.end })
    }
    free = next
  }
  return free.filter((piece) => piece.end > piece.start)
}

/**
 * Bloques no disponibles por profesional para un día: cubierta por otra, ausencias (todo el día
 * o por tramo) y fuera de su horario propio. Mismas reglas que `get_available_slots`.
 */
export function buildDayBlocks(
  data: DayAvailability,
  employeeIds: string[],
  nameById: Map<string, string>
): Map<string, AvailabilityBlock[]> {
  const result = new Map<string, AvailabilityBlock[]>()
  for (const id of employeeIds) {
    const blocks: AvailabilityBlock[] = []

    const cover = data.coverages.find((c) => c.covered_employee_id === id)
    if (cover) {
      const by = nameById.get(cover.covering_employee_id)
      // Cubierta todo el día: no se pinta horario ni ausencia encima.
      blocks.push({
        startMin: 0,
        endMin: DAY_MINUTES,
        label: by ? `Cubierta por ${by}` : 'Cubierta por otra persona',
        tone: 'covered',
      })
      result.set(id, blocks)
      continue
    }

    for (const t of data.timeOff.filter((x) => x.employee_id === id)) {
      const label = TIME_OFF_KIND_LABELS[t.kind] ?? 'Ausencia'
      if (t.start_time && t.end_time) {
        blocks.push({
          startMin: toMinutes(t.start_time),
          endMin: toMinutes(t.end_time),
          label,
          tone: 'absence',
        })
      } else {
        blocks.push({ startMin: 0, endMin: DAY_MINUTES, label, tone: 'absence' })
      }
    }

    const own = data.shifts.filter((s) => s.employee_id === id)
    if (own.length > 0) {
      const real = own
        .filter((s) => s.start_time && s.end_time)
        .map((s) => ({ start: toMinutes(s.start_time), end: toMinutes(s.end_time) }))
        .sort((a, b) => a.start - b.start)
      const raw: { start: number; end: number }[] = []
      if (real.length === 0) {
        raw.push({ start: 0, end: DAY_MINUTES })
      } else {
        let cursor = 0
        for (const r of real) {
          if (r.start > cursor) raw.push({ start: cursor, end: r.start })
          cursor = Math.max(cursor, r.end)
        }
        if (cursor < DAY_MINUTES) raw.push({ start: cursor, end: DAY_MINUTES })
      }
      const label = real.length === 0 ? 'No trabaja este día' : 'Fuera de horario'
      for (const piece of raw) {
        for (const gap of gapsOutside(piece.start, piece.end, blocks)) {
          blocks.push({ startMin: gap.start, endMin: gap.end, label, tone: 'off' })
        }
      }
    }

    result.set(id, blocks)
  }
  return result
}
