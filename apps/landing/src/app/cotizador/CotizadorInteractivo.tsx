'use client'

import { useMemo, useState } from 'react'
import {
  calculatePrice,
  ComboBanner,
  generateWhatsAppMsg,
  resolveCalculoPrecio,
  SelectableServiceLineItem,
  services,
  WhatsAppCTA,
  WhatsAppIcon,
  type CatalogService,
  type ServiceTier,
} from '@zmtech/quote-engine'

const WA_NUMBER = '584144940417'

const NIVEL_LABELS: Record<0 | 1 | 2 | 3, string> = {
  0: 'Nivel 0 · Presencia digital',
  1: 'Nivel 1 · Landing / Sitio web',
  2: 'Nivel 2 · App / Gestión',
  3: 'Nivel 3 · SaaS multi-tenant',
}

function serviciosPublicos(): CatalogService[] {
  return services.filter(
    (s) => s.nivel >= 0 && s.nivel <= 3 && s.precioVisible === true,
  )
}

function groupByNivel(list: CatalogService[]): Array<{ nivel: 0 | 1 | 2 | 3; items: CatalogService[] }> {
  const levels: Array<0 | 1 | 2 | 3> = [0, 1, 2, 3]
  return levels
    .map((nivel) => ({
      nivel,
      items: list.filter((s) => s.nivel === (nivel as ServiceTier)),
    }))
    .filter((g) => g.items.length > 0)
}

function diagnosticoWaUrl(): string {
  const msg = [
    'Hola, quiero agendar un diagnóstico.',
    '',
    'Necesito algo a nivel enterprise / suite completa (Nivel 4).',
  ].join('\n')
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`
}

export function CotizadorInteractivo() {
  const catalogo = useMemo(() => serviciosPublicos(), [])
  const grupos = useMemo(() => groupByNivel(catalogo), [catalogo])

  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [nombre, setNombre] = useState('')

  const result = useMemo(
    () => calculatePrice({ serviceIds: selectedIds }),
    [selectedIds],
  )

  const waUrl = useMemo(
    () =>
      selectedIds.length === 0
        ? `https://wa.me/${WA_NUMBER}`
        : generateWhatsAppMsg({
            clienteNombre: nombre,
            result,
            waNumber: WA_NUMBER,
          }),
    [nombre, result, selectedIds.length],
  )

  const bundleSubtotal =
    result.bundleAplicado?.servicios.reduce((acc, id) => {
      const item = result.lineItems.find((li) => li.service.id === id)
      if (!item) return acc
      return acc + resolveCalculoPrecio(item.precioMostrado)
    }, 0) ?? 0

  function toggle(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const hasSelection = selectedIds.length > 0

  return (
    <div>
      {grupos.map((grupo) => (
        <section key={grupo.nivel} className="mb-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#666]">
            {NIVEL_LABELS[grupo.nivel]}
          </p>
          <div className="rounded-xl border border-[#e5e5e5] bg-white px-4 py-1">
            {grupo.items.map((service, i) => (
              <SelectableServiceLineItem
                key={service.id}
                service={service}
                selected={selectedIds.includes(service.id)}
                onToggle={toggle}
                isLast={i === grupo.items.length - 1}
              />
            ))}
          </div>
        </section>
      ))}

      {/* Nivel 4 — sin checkbox */}
      <section className="mb-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#666]">
          Nivel 4 · Suite empresarial
        </p>
        <div className="rounded-xl border border-[#b5cfe4] bg-[#e8f0f7] p-4">
          <p className="mb-1 text-[13px] font-semibold text-[#0c447c]">
            ¿Necesitas algo a este nivel?
          </p>
          <p className="mb-3 text-xs leading-normal text-[#1a3c5e]">
            Suite completa, normativa SENIAT/BCV, app de ventas y retainer enterprise se
            cotizan con diagnóstico — no aparecen en el selector.
          </p>
          <a
            href={diagnosticoWaUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-[10px] bg-[#1a3c5e] px-4 py-2.5 text-sm font-semibold text-white no-underline"
          >
            <WhatsAppIcon size={16} />
            Agendar diagnóstico
          </a>
        </div>
      </section>

      {result.bundleAplicado ? (
        <ComboBanner
          bundle={result.bundleAplicado}
          ahorro={result.descuento}
          subtotalBundle={bundleSubtotal}
        />
      ) : null}

      {/* Resumen en vivo */}
      <div className="mb-4 rounded-xl border border-[#e5e5e5] bg-white px-4 py-3">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#666]">
          Tu total
        </p>
        {!hasSelection ? (
          <p className="text-sm text-[#888]">Selecciona al menos un servicio para ver el precio.</p>
        ) : (
          <div className="space-y-1 text-sm text-[#333]">
            {result.descuento > 0 ? (
              <>
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>${result.subtotal} USD</span>
                </div>
                <div className="flex justify-between text-[#0f6e56]">
                  <span>Descuento</span>
                  <span>−${result.descuento} USD</span>
                </div>
              </>
            ) : null}
            <div className="flex items-baseline justify-between pt-1">
              <span className="font-semibold text-[#111]">Total</span>
              <span className="text-[1.6rem] font-semibold text-[#1a3c5e]">
                ${result.total}
                <span className="ml-1 text-sm font-normal text-[#888]">USD</span>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="cotizador-nombre" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-[#666]">
          Tu nombre (opcional)
        </label>
        <input
          id="cotizador-nombre"
          type="text"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="¿Cómo te llamas?"
          className="w-full rounded-[10px] border border-[#e5e5e5] bg-white px-3 py-2.5 text-sm text-[#111] outline-none placeholder:text-[#aaa] focus:border-[#1a3c5e]"
          autoComplete="name"
        />
      </div>

      {hasSelection ? (
        <WhatsAppCTA
          url={waUrl}
          titulo="¿Listo para arrancar?"
          subtitulo="Te llega el detalle por WhatsApp. Respondemos rápido en horario laboral VE."
          contacto="albertoorta.1@gmail.com · +58 414 494 0417"
          leadPayload={{
            source: 'self-service',
            clienteNombre: nombre.trim() || undefined,
            serviceIds: selectedIds,
            result: {
              subtotal: result.subtotal,
              descuento: result.descuento,
              total: result.total,
              requiereContactoDirecto: result.requiereContactoDirecto,
            },
          }}
        />
      ) : (
        <div className="rounded-[14px] bg-[#1a3c5e]/p-5 text-center opacity-60">
          <p className="text-sm text-white/80">Elige servicios para activar WhatsApp</p>
        </div>
      )}

      <p className="mt-6 text-center text-[11px] text-[#bbb]">
        Cotizador ZM Tech · zmtech-landing.vercel.app
      </p>
    </div>
  )
}
