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
      blocks.push({
        startMin: 0,
        endMin: DAY_MINUTES,
        label: by ? `Cubierta por ${by}` : 'Cubierta por otra persona',
        tone: 'covered',
      })
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
      if (real.length === 0) {
        blocks.push({ startMin: 0, endMin: DAY_MINUTES, label: 'No trabaja este día', tone: 'off' })
      } else {
        let cursor = 0
        for (const r of real) {
          if (r.start > cursor) {
            blocks.push({
              startMin: cursor,
              endMin: r.start,
              label: 'Fuera de horario',
              tone: 'off',
            })
          }
          cursor = Math.max(cursor, r.end)
        }
        if (cursor < DAY_MINUTES) {
          blocks.push({
            startMin: cursor,
            endMin: DAY_MINUTES,
            label: 'Fuera de horario',
            tone: 'off',
          })
        }
      }
    }

    result.set(id, blocks)
  }
  return result
}
