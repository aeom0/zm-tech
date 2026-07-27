import type { ROIComparisonRow } from '@zmtech/quote-engine'

/**
 * Config de una propuesta. Un archivo por cliente en data/quotes/.
 * Cero JSX nuevo por cliente: solo datos + ids del catálogo.
 */
export type QuoteDefinition = {
  slug: string
  clienteNombre: string
  /** Primer nombre para el CTA ("¿Arrancamos, Morelba?") */
  clienteNombreCorto: string
  mensajeIntro: string
  serviceIds: string[]
  waNumber: string
  meta: {
    title: string
    description: string
  }
  fechaLabel: string
  /** Override de copy de línea (nombre/desc) sin tocar el catálogo. */
  lineCopy?: Record<
    string,
    {
      nombre?: string
      descripcion?: string
    }
  >
  plataforma: {
    tituloSeccion: string
    label: string
    /** id del servicio hero (precio grande). */
    servicioId: string
    nota: string
    features: string[]
  }
  dominioRegalo?: {
    titulo: string
    descripcion: string
  }
  extras: {
    tituloSeccion: string
    /** ids que van en la lista de adicionales (no el hero). */
    serviceIds: string[]
    pricePrefix?: string
  }
  /**
   * Nota de combo comercial cuando el descuento no está (aún) en catalog/bundles.
   * Si calculatePrice aplica un bundle, se usa ComboBanner del engine en su lugar.
   */
  comboNota?: {
    badge: string
    /** Texto plano; el page resalta montos si hace falta vía markup simple. */
    texto: string
    totalCombo: number
    totalSinDescuento: number
  }
  soporteMensual?: {
    tituloSeccion: string
    precio: number
    items: string[]
  }
  roi: {
    tituloSeccion: string
    nota?: string
    filas: ROIComparisonRow[]
    resumenAntes: { valor: string; label: string }
    resumenDespues: { valor: string; label: string }
    payback: { valor: string; label: string }
  }
  cronograma: {
    tituloSeccion: string
    fases: Array<{ week: string; title: string; tags: string[] }>
  }
  pago: {
    tituloSeccion: string
    porcentajeArranque: string
    labelArranque: string
    porcentajeEntrega: string
    labelEntrega: string
    soporteTitulo: string
    soporteSub: string
  }
  cta: {
    titulo: string
    subtitulo: string
    contacto: string
  }
  footer: string
}
