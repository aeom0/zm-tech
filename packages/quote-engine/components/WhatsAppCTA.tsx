'use client'

import { WhatsAppIcon } from './WhatsAppIcon'
import type { CalculatePriceResult } from '../logic/calculatePrice'

export type LeadPayload = {
  source: 'manual' | 'self-service'
  slug?: string
  clienteNombre?: string
  clienteContacto?: string
  serviceIds: string[]
  result: Pick<CalculatePriceResult, 'subtotal' | 'descuento' | 'total' | 'requiereContactoDirecto'>
}

type WhatsAppCTAProps = {
  url: string
  titulo: string
  subtitulo: string
  /** Texto del botón. Default: tono Guataparo. */
  botonLabel?: string
  contacto?: string
  /** Si true, usa copy de diagnóstico enterprise. */
  requiereContactoDirecto?: boolean
  /** Datos para loguear el lead al hacer clic (fire-and-forget). */
  leadPayload: LeadPayload
}

function logLead(payload: LeadPayload) {
  void fetch('/api/cotizador/lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).catch(() => {
    // Silencioso: el usuario igual llega a WhatsApp
  })
}

export function WhatsAppCTA({
  url,
  titulo,
  subtitulo,
  botonLabel,
  contacto,
  requiereContactoDirecto = false,
  leadPayload,
}: WhatsAppCTAProps) {
  const label =
    botonLabel ??
    (requiereContactoDirecto
      ? 'Agendar diagnóstico por WhatsApp'
      : 'Confirmar propuesta por WhatsApp')

  return (
    <div className="rounded-[14px] bg-[#1a3c5e] p-5 text-center">
      <p className="mb-1.5 text-[17px] font-semibold text-white">{titulo}</p>
      <p className="mb-4 text-[12.5px] leading-normal text-white/65">{subtitulo}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() => logLead(leadPayload)}
        className="mb-3 flex items-center justify-center gap-2 rounded-[10px] bg-[#25D366] px-5 py-3 text-sm font-semibold text-white no-underline"
      >
        <WhatsAppIcon size={18} />
        {label}
      </a>
      {contacto ? <p className="text-[11px] text-white/40">{contacto}</p> : null}
    </div>
  )
}
