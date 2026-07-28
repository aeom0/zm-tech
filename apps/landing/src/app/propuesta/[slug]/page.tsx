import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  calculatePrice,
  ComboBanner,
  generateWhatsAppMsg,
  QuoteHero,
  ROIComparison,
  resolveCalculoPrecio,
  ServiceLineItem,
  WhatsAppCTA,
  type LineItem,
} from '@zmtech/quote-engine'
import { getQuote } from '@/data/quotes'

type PageProps = {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const { quotesRegistry } = await import('@/data/quotes')
  return Object.keys(quotesRegistry).map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const quote = getQuote(slug)
  if (!quote) {
    return { title: 'Propuesta no encontrada', robots: { index: false, follow: false } }
  }
  return {
    title: quote.meta.title,
    description: quote.meta.description,
    robots: { index: false, follow: false },
  }
}

function CheckIcon() {
  return (
    <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-[#639922] bg-[#27500a]">
      <svg width="8" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">
        <polyline points="1,4 4,7 9,1" stroke="#97c459" strokeWidth="2.5" />
      </svg>
    </div>
  )
}

function GiftIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="#854f0b"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
      aria-hidden="true"
    >
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M12 8v13" />
      <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
      <path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5" />
    </svg>
  )
}

/** Aplica overrides de copy del quote sobre el LineItem del catálogo. */
function applyLineCopy(
  item: LineItem,
  lineCopy: Record<string, { nombre?: string; descripcion?: string }> | undefined,
): LineItem {
  const override = lineCopy?.[item.service.id]
  if (!override) return item
  return {
    ...item,
    service: {
      ...item.service,
      nombre: override.nombre ?? item.service.nombre,
      descripcion: override.descripcion ?? item.service.descripcion,
    },
  }
}

export default async function PropuestaPage({ params }: PageProps) {
  const { slug } = await params
  const quote = getQuote(slug)
  if (!quote) notFound()

  const result = calculatePrice({ serviceIds: quote.serviceIds })
  const waUrl = generateWhatsAppMsg({
    clienteNombre: quote.clienteNombre,
    result,
    waNumber: quote.waNumber,
  })

  const lineById = new Map(
    result.lineItems.map((li) => [li.service.id, applyLineCopy(li, quote.lineCopy)]),
  )

  const heroItem = lineById.get(quote.plataforma.servicioId)
  const heroPrecio = heroItem ? resolveCalculoPrecio(heroItem.precioMostrado) : 0

  const extrasItems = quote.extras.serviceIds
    .map((id) => lineById.get(id))
    .filter((li): li is LineItem => Boolean(li))

  const bundleSaving = result.descuento
  const bundleSubtotal =
    result.bundleAplicado?.servicios.reduce((acc, id) => {
      const item = lineById.get(id)
      if (!item) return acc
      return acc + resolveCalculoPrecio(item.precioMostrado)
    }, 0) ?? 0

  return (
    <main className="min-h-screen bg-[#f5f5f5] p-4 font-sans text-[#111] antialiased">
      <div className="mx-auto max-w-105 pb-12">
        <QuoteHero
          clienteNombre={quote.clienteNombre}
          mensajeIntro={quote.mensajeIntro}
          fechaLabel={quote.fechaLabel}
        />

        {/* 01 · Plataforma */}
        <p className="mb-2 mt-[1.1rem] text-[11px] font-semibold uppercase tracking-wider text-[#666]">
          {quote.plataforma.tituloSeccion}
        </p>
        <div className="mb-2 rounded-xl bg-[#1a3c5e] p-5">
          <p className="mb-1 text-[11px] uppercase tracking-widest text-white/60">
            {quote.plataforma.label}
          </p>
          {result.requiereContactoDirecto && !heroItem?.service.precioVisible ? (
            <p className="mb-1 text-2xl font-semibold text-white">Agendar diagnóstico</p>
          ) : (
            <p className="mb-1 text-[2.5rem] font-semibold leading-none text-white">
              <sup className="mt-2 inline-block align-top text-base">$</sup>
              {heroPrecio}{' '}
              <span className="text-base font-normal text-white/50">USD</span>
            </p>
          )}
          <p className="mb-4 text-xs text-white/65">{quote.plataforma.nota}</p>
          {quote.plataforma.features.map((feature) => (
            <div key={feature} className="mb-1.5 flex items-start gap-2">
              <CheckIcon />
              <span className="text-[13px] text-white/90">{feature}</span>
            </div>
          ))}
        </div>

        {/* Dominio regalo */}
        {quote.dominioRegalo ? (
          <div className="mb-4 flex gap-2.5 rounded-[10px] border border-[#d4a843] bg-[#faf3e0] px-4 py-3.5">
            <GiftIcon />
            <div>
              <p className="mb-0.5 text-[13px] font-semibold text-[#633806]">
                {quote.dominioRegalo.titulo}
              </p>
              <p className="text-xs leading-normal text-[#854f0b]">
                {quote.dominioRegalo.descripcion}
              </p>
            </div>
          </div>
        ) : null}

        {/* 02 · Extras */}
        <p className="mb-2 mt-[1.1rem] text-[11px] font-semibold uppercase tracking-wider text-[#666]">
          {quote.extras.tituloSeccion}
        </p>
        <div className="mb-2 rounded-xl border border-[#e5e5e5] bg-white px-4 py-3">
          {extrasItems.map((item, i) => (
            <ServiceLineItem
              key={item.service.id}
              item={item}
              isLast={i === extrasItems.length - 1}
              pricePrefix={quote.extras.pricePrefix}
            />
          ))}
        </div>

        {result.bundleAplicado ? (
          <ComboBanner
            bundle={result.bundleAplicado}
            ahorro={bundleSaving}
            subtotalBundle={bundleSubtotal}
          />
        ) : null}

        {/* 03 · Soporte mensual */}
        {quote.soporteMensual ? (
          <>
            <p className="mb-2 mt-[1.1rem] text-[11px] font-semibold uppercase tracking-wider text-[#666]">
              {quote.soporteMensual.tituloSeccion}
            </p>
            <div className="mb-4 rounded-xl border border-[#97c459] bg-[#e8f9ef] p-[1.1rem]">
              <div className="mb-3 flex items-baseline gap-1.5">
                <span className="text-[2rem] font-semibold text-[#0f6e56]">
                  ${quote.soporteMensual.precio}
                </span>
                <span className="text-[13px] text-[#1d9e75]">/ mes</span>
              </div>
              {quote.soporteMensual.items.map((item) => (
                <div key={item} className="mb-1.5 flex items-start gap-1.5">
                  <span className="mt-0.5 text-[11px] text-[#1d9e75]">→</span>
                  <span className="text-[13px] text-[#085041]">{item}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <ROIComparison
          tituloSeccion={quote.roi.tituloSeccion}
          nota={quote.roi.nota}
          filas={quote.roi.filas}
          resumenAntes={quote.roi.resumenAntes}
          resumenDespues={quote.roi.resumenDespues}
          payback={quote.roi.payback}
        />

        {/* 05 · Cronograma */}
        <p className="mb-2 mt-[1.1rem] text-[11px] font-semibold uppercase tracking-wider text-[#666]">
          {quote.cronograma.tituloSeccion}
        </p>
        <div className="mb-4 rounded-xl border border-[#e5e5e5] bg-white px-4 py-3">
          {quote.cronograma.fases.map((phase, i, arr) => (
            <div
              key={phase.week}
              className={`grid grid-cols-[72px_1fr] gap-3 py-2.5 ${
                i < arr.length - 1 ? 'border-b border-[#f0f0f0]' : ''
              }`}
            >
              <div>
                <p className="text-xs font-semibold text-[#1a3c5e]">{phase.week}</p>
                <p className="text-[11px] text-[#999]">{phase.title}</p>
              </div>
              <div className="flex flex-wrap gap-1">
                {phase.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded border border-[#e5e5e5] bg-[#f5f5f5] px-1.5 py-0.5 text-[11px] text-[#666]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 06 · Pago */}
        <p className="mb-2 mt-[1.1rem] text-[11px] font-semibold uppercase tracking-wider text-[#666]">
          {quote.pago.tituloSeccion}
        </p>
        <div className="mb-2 grid grid-cols-2 gap-2">
          <div className="rounded-[10px] bg-[#f5f5f5] p-3 text-center">
            <p className="text-[1.1rem] font-semibold text-[#1a3c5e]">
              {quote.pago.porcentajeArranque}
            </p>
            <p className="mt-1 text-[11px] text-[#888]">{quote.pago.labelArranque}</p>
          </div>
          <div className="rounded-[10px] bg-[#f5f5f5] p-3 text-center">
            <p className="text-[1.1rem] font-semibold text-[#1a3c5e]">
              {quote.pago.porcentajeEntrega}
            </p>
            <p className="mt-1 text-[11px] text-[#888]">{quote.pago.labelEntrega}</p>
          </div>
        </div>
        <div className="mb-5 rounded-[10px] bg-[#f5f5f5] p-3 text-center">
          <p className="text-base font-semibold text-[#1a3c5e]">{quote.pago.soporteTitulo}</p>
          <p className="mt-1 text-[11px] text-[#888]">{quote.pago.soporteSub}</p>
        </div>

        <WhatsAppCTA
          url={waUrl}
          titulo={quote.cta.titulo}
          subtitulo={quote.cta.subtitulo}
          contacto={quote.cta.contacto}
          requiereContactoDirecto={result.requiereContactoDirecto}
          leadPayload={{
            source: 'manual',
            slug: quote.slug,
            clienteNombre: quote.clienteNombre,
            serviceIds: quote.serviceIds,
            result: {
              subtotal: result.subtotal,
              descuento: result.descuento,
              total: result.total,
              requiereContactoDirecto: result.requiereContactoDirecto,
            },
          }}
        />

        <p className="mt-6 text-center text-[11px] text-[#bbb]">{quote.footer}</p>
      </div>
    </main>
  )
}
