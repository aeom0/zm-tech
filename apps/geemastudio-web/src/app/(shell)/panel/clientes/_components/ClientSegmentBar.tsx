'use client'

import { FilterChips, type FilterChipOption } from '@/components/ui/FilterChips'
import type { ClientSegment } from '@/hooks/clientes/types'

const SEGMENTS: FilterChipOption<ClientSegment>[] = [
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
    <FilterChips
      ariaLabel="Segmento de clientes"
      options={SEGMENTS}
      value={active}
      onChange={onChange}
    />
  )
}
