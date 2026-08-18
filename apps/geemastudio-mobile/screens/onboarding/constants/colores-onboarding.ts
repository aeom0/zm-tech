/**
 * Paletas sugeridas del onboarding (paso 2: marca; paso 3: color empleado en agenda).
 * Un solo origen de verdad para los hex.
 */

export interface ColorPresetOnboarding {
  label: string
  valor: string
}

/** Seis sugeridos para color principal de marca y para color en calendario del personal. */
export const COLORES_PRIMARIOS: readonly ColorPresetOnboarding[] = [
  { label: 'Verde azulado', valor: '#0B7B72' },
  { label: 'Turquesa', valor: '#40E0D0' },
  { label: 'Azul', valor: '#1A237E' },
  { label: 'Magenta', valor: '#FF00FF' },
  { label: 'Naranja', valor: '#E65100' },
  { label: 'Rojo', valor: '#B71C1C' },
]

export const COLORES_ACENTO: readonly ColorPresetOnboarding[] = [
  { label: 'Dorado', valor: '#D4AF37' },
  { label: 'Amarillo', valor: '#F9A825' },
  { label: 'Plateado', valor: '#9E9E9E' },
  { label: 'Blanco', valor: '#FFFFFF' },
  { label: 'Cobre', valor: '#BF6516' },
]
