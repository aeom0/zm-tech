import type { LineItem } from '../logic/calculatePrice'
import type { PriceRange } from '../types'

type ServiceLineItemProps = {
  item: LineItem
  /** Si true, no muestra borde inferior (última fila). */
  isLast?: boolean
  /** Prefijo de precio, ej. "+" para extras. */
  pricePrefix?: string
}

function isPriceRange(precio: number | PriceRange): precio is PriceRange {
  return typeof precio === 'object' && precio !== null && 'min' in precio && 'max' in precio
}

function formatPrecio(precio: number | PriceRange, prefix = ''): string {
  if (isPriceRange(precio)) {
    return `${prefix}$${precio.min}–$${precio.max}`
  }
  return `${prefix}$${precio}`
}

export function ServiceLineItem({ item, isLast = false, pricePrefix = '' }: ServiceLineItemProps) {
  const { service, precioMostrado } = item

  const precioLabel = !service.precioVisible
    ? 'Agendar diagnóstico'
    : formatPrecio(precioMostrado, pricePrefix)

  return (
    <div
      className={`flex items-start justify-between gap-2 py-2.5 ${
        isLast ? '' : 'border-b border-[#f0f0f0]'
      }`}
    >
      <div className="min-w-0">
        <p className="mb-0.5 text-[13px] font-medium text-[#111]">{service.nombre}</p>
        {service.descripcion ? (
          <p className="text-xs leading-snug text-[#666]">{service.descripcion}</p>
        ) : null}
      </div>
      <span
        className={`shrink-0 whitespace-nowrap text-sm font-semibold ${
          service.precioVisible ? 'text-[#1a3c5e]' : 'text-[#0c447c]'
        }`}
      >
        {precioLabel}
      </span>
    </div>
  )
}
