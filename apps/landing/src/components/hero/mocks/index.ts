import type { ComponentType } from 'react'
import type { HeroSceneId } from '@/content/messages'
import MockAgendaMobile from './MockAgendaMobile'
import MockGerencialDesktop from './MockGerencialDesktop'
import MockSalonWeb from './MockSalonWeb'
import MockTallerDesktop from './MockTallerDesktop'
import MockTallerMobile from './MockTallerMobile'
import MockVentasMobile from './MockVentasMobile'

export type { HeroSceneId }

export type HeroScene = {
  id: HeroSceneId
  /** URL mostrada en el chrome del laptop */
  chromeUrl: string
  Laptop: ComponentType
  Phone: ComponentType
  /** alt vive junto a la escena — evita desalineación con arrays paralelos por idioma */
  laptopAlt: { es: string; en: string }
  phoneAlt: { es: string; en: string }
}

/** Escenas del hero: laptop + phone rotan juntos, una por vertical */
export const HERO_SCENES: readonly HeroScene[] = [
  {
    id: 'industrial',
    chromeUrl: 'app.fabrica.com/gerencial',
    Laptop: MockGerencialDesktop,
    Phone: MockVentasMobile,
    laptopAlt: {
      es: 'Panel gerencial genérico — control de ventas e inventario',
      en: 'Generic management dashboard — sales and inventory control',
    },
    phoneAlt: {
      es: 'App de ventas genérica — pedidos y comisiones del día',
      en: 'Generic sales app — daily orders and commissions',
    },
  },
  {
    id: 'beauty',
    chromeUrl: 'salon.ejemplo.com',
    Laptop: MockSalonWeb,
    Phone: MockAgendaMobile,
    laptopAlt: {
      es: 'Sitio web de salón genérico — servicios y reserva',
      en: 'Generic salon website — services and booking',
    },
    phoneAlt: {
      es: 'Agenda móvil genérica — citas del salón',
      en: 'Generic mobile agenda — salon appointments',
    },
  },
  {
    id: 'workshop',
    chromeUrl: 'app.taller.com/ordenes',
    Laptop: MockTallerDesktop,
    Phone: MockTallerMobile,
    laptopAlt: {
      es: 'Panel de taller genérico — órdenes de servicio y técnicos',
      en: 'Generic workshop dashboard — service orders and technicians',
    },
    phoneAlt: {
      es: 'App de técnico genérica — órdenes de servicio del día',
      en: 'Generic technician app — daily service orders',
    },
  },
] as const

export {
  MockAgendaMobile,
  MockGerencialDesktop,
  MockSalonWeb,
  MockTallerDesktop,
  MockTallerMobile,
  MockVentasMobile,
}
