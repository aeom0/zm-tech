'use client'

import type { CatalogService, PriceRange } from '../types'
import { getPublicServiceCopy } from '../catalog/publicCopy'

type SelectableServiceLineItemProps = {
  service: CatalogService
  selected: boolean
  onToggle: (id: string) => void
  isLast?: boolean
}

function isPriceRange(precio: number | PriceRange): precio is PriceRange {
  return typeof precio === 'object' && precio !== null && 'min' in precio && 'max' in precio
}

function formatPrecio(precio: number | PriceRange): string {
  if (isPriceRange(precio)) {
    return `$${precio.min}–$${precio.max}`
  }
  return `$${precio}`
}

export function SelectableServiceLineItem({
  service,
  selected,
  onToggle,
  isLast = false,
}: SelectableServiceLineItemProps) {
  const copy = getPublicServiceCopy(service)

  return (
    <label
      className={`flex cursor-pointer items-start gap-3 py-2.5 ${
        isLast ? '' : 'border-b border-[#f0f0f0]'
      }`}
    >
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onToggle(service.id)}
        className="mt-1 h-4 w-4 shrink-0 accent-[#1a3c5e]"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="mb-0.5 text-[13px] font-medium text-[#111]">{copy.titulo}</p>
            {copy.terminoTecnico ? (
              <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-[#999]">
                {copy.terminoTecnico}
              </p>
            ) : null}
            {copy.descripcion ? (
              <p className="text-xs leading-snug text-[#666]">{copy.descripcion}</p>
            ) : null}
          </div>
          <span className="shrink-0 whitespace-nowrap text-sm font-semibold text-[#1a3c5e]">
            {formatPrecio(service.precio)}
            {service.unidad === 'mensual' || service.unidad === 'mensual-tenant' ? (
              <span className="font-normal text-[#888]">/mes</span>
            ) : null}
          </span>
        </div>
      </div>
    </label>
  )
}
