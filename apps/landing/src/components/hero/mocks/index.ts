import type { ComponentType } from 'react'
import MockAgendaMobile from './MockAgendaMobile'
import MockGerencialDesktop from './MockGerencialDesktop'
import MockSalonWeb from './MockSalonWeb'
import MockTallerDesktop from './MockTallerDesktop'
import MockTallerMobile from './MockTallerMobile'
import MockVentasMobile from './MockVentasMobile'

export type HeroSceneId = 'industrial' | 'beauty' | 'workshop'

export type HeroScene = {
  id: HeroSceneId
  /** URL mostrada en el chrome del laptop */
  chromeUrl: string
  Laptop: ComponentType
  Phone: ComponentType
}

/** Escenas del hero: laptop + phone rotan juntos, una por vertical */
export const HERO_SCENES: readonly HeroScene[] = [
  {
    id: 'industrial',
    chromeUrl: 'app.fabrica.com/gerencial',
    Laptop: MockGerencialDesktop,
    Phone: MockVentasMobile,
  },
  {
    id: 'beauty',
    chromeUrl: 'salon.ejemplo.com',
    Laptop: MockSalonWeb,
    Phone: MockAgendaMobile,
  },
  {
    id: 'workshop',
    chromeUrl: 'app.taller.com/ordenes',
    Laptop: MockTallerDesktop,
    Phone: MockTallerMobile,
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
