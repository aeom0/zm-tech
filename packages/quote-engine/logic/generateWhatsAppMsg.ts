import type { CalculatePriceResult } from './calculatePrice'
import type { PriceRange } from '../types'

function isPriceRange(precio: number | PriceRange): precio is PriceRange {
  return typeof precio === 'object' && precio !== null && 'min' in precio && 'max' in precio
}

function formatUsd(n: number): string {
  return `$${n} USD`
}

function formatPrecioLinea(precio: number | PriceRange): string {
  if (isPriceRange(precio)) {
    return `$${precio.min}–$${precio.max} USD`
  }
  return formatUsd(precio)
}

export interface GenerateWhatsAppMsgInput {
  clienteNombre: string
  result: CalculatePriceResult
  waNumber: string // formato: '584144940417'
}

/**
 * Genera URL wa.me completa con mensaje URL-encoded.
 * Tono validado en propuesta Guataparo: "Confirmar propuesta por WhatsApp".
 */
export function generateWhatsAppMsg(input: GenerateWhatsAppMsgInput): string {
  const { clienteNombre, result, waNumber } = input

  const lineasServicios = result.lineItems
    .map((li) => {
      if (!li.service.precioVisible) {
        return `• ${li.service.nombre} — a cotizar`
      }
      const monto = formatPrecioLinea(li.precioMostrado)
      return `• ${li.service.nombre} — ${monto}`
    })
    .join('\n')

  const totalLine = result.requiereContactoDirecto
    ? 'Total: cotización personalizada (agendar diagnóstico)'
    : result.descuento > 0
      ? `Subtotal: ${formatUsd(result.subtotal)}\nDescuento: −${formatUsd(result.descuento)}\nTotal: ${formatUsd(result.total)}`
      : `Total: ${formatUsd(result.total)}`

  const mensaje = [
    `Hola, soy ${clienteNombre}.`,
    '',
    'Quiero confirmar esta propuesta de ZM Tech:',
    '',
    lineasServicios,
    '',
    totalLine,
    '',
    '¿Arrancamos?',
  ].join('\n')

  return `https://wa.me/${waNumber}?text=${encodeURIComponent(mensaje)}`
}
