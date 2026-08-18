'use client'

import { X } from 'lucide-react'

import { usePacks } from '@/hooks/servicios/usePacks'
import { useServicios } from '@/hooks/servicios/useServicios'
import type { PromoItemInput } from '../../_services/promosService'

interface Props {
  item: PromoItemInput
  index: number
  onChange: (index: number, item: PromoItemInput) => void
  onRemove: (index: number) => void
}

export function PromoItemRow({ item, index, onChange, onRemove }: Props) {
  const { data: services = [] } = useServicios()
  const { data: packs = [] } = usePacks()

  const options =
    item.item_type === 'service'
      ? services.filter((s) => s.is_active).map((s) => ({ id: s.id, label: s.name }))
      : packs.filter((p) => p.is_active).map((p) => ({ id: p.id, label: p.name }))

  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/5 p-2">
      <select
        value={item.item_type}
        onChange={(e) =>
          onChange(index, {
            ...item,
            item_type: e.target.value as 'service' | 'pack',
            item_id: '',
          })
        }
        className="rounded border-0 bg-white/10 px-2 py-1 text-xs text-white"
      >
        <option value="service">Servicio</option>
        <option value="pack">Pack</option>
      </select>

      <select
        value={item.item_id}
        onChange={(e) => onChange(index, { ...item, item_id: e.target.value })}
        className="min-w-0 flex-1 rounded border-0 bg-white/10 px-2 py-1 text-xs text-white"
      >
        <option value="">Seleccionar...</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>

      <input
        type="text"
        value={String(item.discounted_price).replace('.', ',')}
        onChange={(e) => {
          const parsed = Number.parseFloat(e.target.value.replace(',', '.'))
          onChange(index, {
            ...item,
            discounted_price: Number.isFinite(parsed) ? parsed : 0,
          })
        }}
        placeholder="Precio"
        inputMode="decimal"
        className="w-20 rounded border-0 bg-white/10 px-2 py-1 text-xs text-white"
      />

      <button
        type="button"
        onClick={() => onRemove(index)}
        className="text-white/30 transition-colors hover:text-red-400"
        aria-label="Quitar item"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
