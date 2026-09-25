import { ICON_SHAPES } from './data'
import type { IconShape } from './types'

/** Phosphor Regular equivale a ~1.5 px sobre 24; igualamos los íconos de trazo a ese grosor. */
export const ICON_STROKE_WIDTH = 1.5

/**
 * Nombre → etiqueta. Los nombres coinciden con lo que ya guarda `service_categories.icon`
 * (scissors, feather, eye, smile, droplet, sun, wind, heart, star, zap), así que los datos
 * existentes siguen funcionando.
 */
export const CATEGORY_ICON_LABELS: Record<string, string> = {
  // Uñas y manos
  hand: 'Manicure',
  'hand-heart': 'Cuidado de manos',
  footprints: 'Pedicure',
  'nail-polish': 'Esmalte',
  paintbrush: 'Pincel',
  droplet: 'Esmaltado',
  gem: 'Gel y acrílico',
  sparkles: 'Nail art',
  // Cabello
  scissors: 'Corte',
  comb: 'Peinado',
  wand: 'Styling',
  flask: 'Tintes',
  pipette: 'Coloración',
  palette: 'Balayage',
  droplets: 'Lavado e hidratación',
  wind: 'Secado',
  'hair-dryer': 'Secador',
  spray: 'Fijadores',
  // Barbería
  razor: 'Afeitado',
  user: 'Caballero',
  ruler: 'Perfilado',
  crown: 'Premium',
  // Pestañas, cejas y rostro
  eyelash: 'Pestañas',
  eye: 'Mirada y cejas',
  feather: 'Extensiones',
  face: 'Facial',
  mask: 'Mascarillas',
  smile: 'Sonrisa',
  'smile-plus': 'Rellenos',
  syringe: 'Inyectables',
  perfume: 'Fragancias',
  // Estética corporal y spa
  sun: 'Depilación y bronceado',
  zap: 'Láser',
  'heart-pulse': 'Tratamientos',
  massage: 'Masajes',
  waves: 'Hidroterapia',
  lotus: 'Spa',
  flower: 'Aromaterapia',
  bathtub: 'Baños',
  towel: 'Toallas',
  leaf: 'Natural',
  sprout: 'Orgánico',
  moon: 'Relajación',
  ear: 'Piercing',
  armchair: 'Sillón',
  // Generales
  heart: 'Favoritos',
  star: 'Destacado',
  package: 'Packs',
}

const PRIORITY_BY_BUSINESS_TYPE: Record<string, string[]> = {
  'spa-nails': ['hand', 'nail-polish', 'footprints', 'gem', 'sparkles', 'paintbrush', 'lotus', 'massage', 'bathtub', 'leaf'],
  barbershop: ['scissors', 'razor', 'comb', 'user', 'ruler', 'spray', 'hair-dryer', 'crown', 'droplets'],
  'hair-salon': ['scissors', 'comb', 'hair-dryer', 'flask', 'pipette', 'palette', 'wand', 'droplets', 'spray', 'sparkles'],
  'full-aesthetic': ['eyelash', 'eye', 'feather', 'face', 'mask', 'syringe', 'smile-plus', 'sun', 'zap', 'heart-pulse', 'massage', 'lotus'],
}

export const CATEGORY_ICON_NAMES = Object.keys(CATEGORY_ICON_LABELS)

export function getDefaultCategoryIcon(businessType?: string | null): string {
  return PRIORITY_BY_BUSINESS_TYPE[businessType ?? '']?.[0] ?? 'sparkles'
}

/** Íconos sugeridos para el rubro del tenant y el resto del catálogo. */
export function getCategoryIconGroups(businessType?: string | null): {
  suggested: string[]
  others: string[]
} {
  const suggested = PRIORITY_BY_BUSINESS_TYPE[businessType ?? ''] ?? []
  return {
    suggested,
    others: CATEGORY_ICON_NAMES.filter((k) => !suggested.includes(k)),
  }
}

export function getCategoryIconShape(name?: string | null): IconShape | null {
  if (!name) return null
  return ICON_SHAPES[name] ?? null
}
