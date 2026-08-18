import { Dimensions } from 'react-native'

import { Spacing } from '@/constants/theme'

export const ABONO_PERCENT = 0.2

export const DAYS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export const PAYMENT_METHODS = [
  { id: 'cash', label: 'Efectivo', icon: 'dollar-sign' as const },
  { id: 'card', label: 'Tarjeta', icon: 'credit-card' as const },
  { id: 'yape', label: 'Yape', icon: 'smartphone' as const },
  { id: 'plin', label: 'Plin', icon: 'smartphone' as const },
  { id: 'transfer', label: 'Transferencia', icon: 'smartphone' as const },
]

export const CHART_HEIGHT = 160
export const CHART_PADDING = { top: 8, right: 24, bottom: 28, left: 8 }

const SCREEN_WIDTH = Dimensions.get('window').width
export const CHART_WIDTH = SCREEN_WIDTH - Spacing.lg * 2 - Spacing.xl * 2
export const CHART_INNER_WIDTH = CHART_WIDTH - CHART_PADDING.left - CHART_PADDING.right
export const CHART_INNER_HEIGHT = CHART_HEIGHT - CHART_PADDING.top - CHART_PADDING.bottom
