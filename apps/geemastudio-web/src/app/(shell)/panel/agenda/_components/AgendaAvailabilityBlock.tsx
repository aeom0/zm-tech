import { PX_PER_HOUR } from '@/hooks/agenda/types'
import type { AvailabilityBlock } from '@/hooks/agenda/availabilityBlocks'

interface AgendaAvailabilityBlockProps {
  block: AvailabilityBlock
  hourStart: number
  hourEnd: number
}

const TONE_CLASS: Record<AvailabilityBlock['tone'], string> = {
  absence: 'bg-amber-500/10 text-amber-800 dark:text-amber-200',
  covered: 'bg-sky-500/10 text-sky-800 dark:text-sky-200',
  off: 'bg-fg/[0.05] text-fg-subtle',
}

/** Franja no disponible dentro de la columna de una profesional (solo lectura, bajo las citas). */
export function AgendaAvailabilityBlock({
  block,
  hourStart,
  hourEnd,
}: AgendaAvailabilityBlockProps) {
  const from = Math.max(block.startMin, hourStart * 60)
  const to = Math.min(block.endMin, hourEnd * 60)
  if (to <= from) return null
  const top = ((from - hourStart * 60) / 60) * PX_PER_HOUR
  const height = ((to - from) / 60) * PX_PER_HOUR

  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute left-0 right-0 z-0 overflow-hidden px-2 py-1 text-[11px] font-medium ${TONE_CLASS[block.tone]}`}
      style={{
        top,
        height,
        backgroundImage:
          'repeating-linear-gradient(135deg, transparent 0 8px, color-mix(in srgb, currentColor 10%, transparent) 8px 9px)',
      }}
      title={block.label}
    >
      {height >= 24 && <span className="truncate">{block.label}</span>}
    </div>
  )
}
