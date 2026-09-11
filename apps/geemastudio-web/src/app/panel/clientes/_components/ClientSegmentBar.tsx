'use client'

import type { ClientSegment } from '@/hooks/clientes/types'

const SEGMENTS: { id: ClientSegment; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'vip', label: 'VIP' },
  { id: 'regular', label: 'Regulares' },
  { id: 'new', label: 'Nuevos' },
  { id: 'at_risk', label: 'En riesgo' },
]

interface ClientSegmentBarProps {
  active: ClientSegment
  onChange: (segment: ClientSegment) => void
}

export function ClientSegmentBar({ active, onChange }: ClientSegmentBarProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SEGMENTS.map((seg) => {
        const isActive = active === seg.id
        return (
          <button
            key={seg.id}
            type="button"
            onClick={() => onChange(seg.id)}
            className={[
              'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'border-[#40E0D0]/40 bg-[#40E0D0]/15 text-[#40E0D0]'
                : 'border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:border-white/[0.12] hover:bg-white/[0.04]',
            ].join(' ')}
          >
            {seg.label}
          </button>
        )
      })}
    </div>
  )
}
