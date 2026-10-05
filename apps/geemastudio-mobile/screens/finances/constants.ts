import { Dimensions } from 'react-native'

import { Spacing } from '@/constants/theme'

export const ABONO_PERCENT = 0.2

export const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

/** `countries` ausente = disponible en todos los países. */
export const PAYMENT_METHODS: {
  id: string
  label: string
  icon: 'dollar-sign' | 'credit-card' | 'smartphone'
  countries?: string[]
}[] = [
  { id: 'cash', label: 'Efectivo', icon: 'dollar-sign' },
  { id: 'card', label: 'Tarjeta', icon: 'credit-card' },
  { id: 'yape', label: 'Yape', icon: 'smartphone', countries: ['PE'] },
  { id: 'plin', label: 'Plin', icon: 'smartphone', countries: ['PE'] },
  { id: 'pago_movil', label: 'Pago Móvil', icon: 'smartphone', countries: ['VE'] },
  { id: 'zelle', label: 'Zelle', icon: 'dollar-sign', countries: ['VE'] },
  { id: 'transfer', label: 'Transferencia', icon: 'smartphone' },
]

/** Métodos de pago ofrecidos según el país del tenant. */
export function paymentMethodsForCountry(country: string) {
  return PAYMENT_METHODS.filter((m) => !m.countries || m.countries.includes(country))
}

export const CHART_HEIGHT = 160
export const CHART_PADDING = { top: 8, right: 24, bottom: 28, left: 8 }

const SCREEN_WIDTH = Dimensions.get('window').width
export const CHART_WIDTH = SCREEN_WIDTH - Spacing.lg * 2 - Spacing.xl * 2
export const CHART_INNER_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right
export const CHART_INNER_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom
