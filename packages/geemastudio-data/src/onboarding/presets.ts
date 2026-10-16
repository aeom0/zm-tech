import type { OnboardingBusinessType } from './types'

export interface OnboardingColorPreset {
  label: string
  valor: string
}

/** Color principal de marca y color del personal en la agenda (web y móvil). */
export const ONBOARDING_PRIMARY_COLORS: readonly OnboardingColorPreset[] = [
  { label: 'Verde azulado', valor: '#0B7B72' },
  { label: 'Turquesa', valor: '#40E0D0' },
  { label: 'Azul', valor: '#1A237E' },
  { label: 'Magenta', valor: '#FF00FF' },
  { label: 'Naranja', valor: '#E65100' },
  { label: 'Rojo', valor: '#B71C1C' },
]

export const ONBOARDING_ACCENT_COLORS: readonly OnboardingColorPreset[] = [
  { label: 'Dorado', valor: '#D4AF37' },
  { label: 'Amarillo', valor: '#F9A825' },
  { label: 'Plateado', valor: '#9E9E9E' },
  { label: 'Blanco', valor: '#FFFFFF' },
  { label: 'Cobre', valor: '#BF6516' },
]

/** Categorías de servicio sugeridas por rubro (paso Servicios). */
export const ONBOARDING_CATEGORIES: Record<OnboardingBusinessType, readonly string[]> = {
  'spa-nails': ['Uñas', 'Pestañas', 'Cejas y Rostro', 'Depilación'],
  barbershop: ['Cortes', 'Barba y Bigote', 'Tratamientos', 'Color y Tintura'],
  'hair-salon': ['Cortes', 'Color', 'Tratamientos', 'Peinados'],
  'full-aesthetic': [
    'Tratamientos Faciales',
    'Tratamientos Corporales',
    'Uñas',
    'Cabello',
    'Depilación',
  ],
}
