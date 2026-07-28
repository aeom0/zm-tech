import type { Metadata } from 'next'
import { CotizadorInteractivo } from './CotizadorInteractivo'

export const metadata: Metadata = {
  title: 'Cotizador — ZM Tech',
  description:
    'Elige lo que necesita tu negocio, mira el precio al momento y confírmanos por WhatsApp.',
  robots: { index: true, follow: true },
}

export default function CotizadorPage() {
  return (
    <main className="min-h-screen bg-[#f5f5f5] p-4 font-sans text-[#111] antialiased">
      <div className="mx-auto max-w-105 pb-12">
        <header className="px-0 pb-4 pt-6 text-center">
          <div className="inline-block rounded-xl bg-[#050505] px-[18px] py-2">
            <span className="text-[15px] font-bold tracking-wider text-[#8b5cf6]">ZM</span>
            <span className="text-[15px] font-bold text-white"> Tech</span>
          </div>
          <h1 className="mt-4 text-xl font-semibold text-[#111]">Arma tu propuesta</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-[#666]">
            Marca lo que necesitas, mira cuánto sale y escríbenos por WhatsApp cuando estés listo.
          </p>
        </header>

        <CotizadorInteractivo />
      </div>
    </main>
  )
}
