import type { CalculatePriceResult } from './calculatePrice'
import type { PriceRange } from '../types'
import type { QuoteLocale } from '../catalog/publicCopy'

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
  /** Si vacío/omitido → saludo genérico */
  clienteNombre?: string
  result: CalculatePriceResult
  waNumber: string // formato: '584144940417'
  locale?: QuoteLocale
}

/**
 * Genera URL wa.me completa con mensaje URL-encoded.
 * Tono validado en propuesta Guataparo: "Confirmar propuesta por WhatsApp".
 */
export function generateWhatsAppMsg(input: GenerateWhatsAppMsgInput): string {
  const { clienteNombre, result, waNumber, locale = 'es' } = input
  const nombre = clienteNombre?.trim()
  const en = locale === 'en'

  const lineasServicios = result.lineItems
    .map((li) => {
      if (!li.service.precioVisible) {
        return en
          ? `• ${li.service.nombre} — quote on request`
          : `• ${li.service.nombre} — a cotizar`
      }
      const monto = formatPrecioLinea(li.precioMostrado)
      return `• ${li.service.nombre} — ${monto}`
    })
    .join('\n')

  const totalLine = result.requiereContactoDirecto
    ? en
      ? 'Total: custom quote (book a discovery call)'
      : 'Total: cotización personalizada (agendar diagnóstico)'
    : result.descuento > 0
      ? en
        ? `Subtotal: ${formatUsd(result.subtotal)}\nDiscount: −${formatUsd(result.descuento)}\nTotal: ${formatUsd(result.total)}`
        : `Subtotal: ${formatUsd(result.subtotal)}\nDescuento: −${formatUsd(result.descuento)}\nTotal: ${formatUsd(result.total)}`
      : `Total: ${formatUsd(result.total)}`

  const saludo = nombre
    ? en
      ? `Hi, I'm ${nombre}.`
      : `Hola, soy ${nombre}.`
    : en
      ? 'Hi, I want more information.'
      : 'Hola, quiero información.'

  const mensaje = [
    saludo,
    '',
    en ? 'I want to confirm this ZM Tech proposal:' : 'Quiero confirmar esta propuesta de ZM Tech:',
    '',
    lineasServicios,
    '',
    totalLine,
    '',
    en ? 'Shall we start?' : '¿Arrancamos?',
  ].join('\n')

  return `https://wa.me/${waNumber}?text=${encodeURIComponent(mensaje)}`
}
