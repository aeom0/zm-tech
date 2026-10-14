/** Métodos de pago de citas. `countries` ausente = disponible en todos los países. */
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

/** Etiquetas de métodos que no se ofrecen al cobrar citas pero existen en `payments` (ventas retail). */
const LEGACY_METHOD_LABELS: Record<string, string> = {
  yape_plin: 'Yape/Plin',
}

/** Métodos de pago ofrecidos según el país del tenant. */
export function paymentMethodsForCountry(country: string) {
  return PAYMENT_METHODS.filter((m) => !m.countries || m.countries.includes(country))
}

export function paymentMethodLabel(method: string): string {
  return (
    PAYMENT_METHODS.find((m) => m.id === method)?.label ?? LEGACY_METHOD_LABELS[method] ?? method
  )
}

export function paymentMethodIcon(method: string): 'dollar-sign' | 'credit-card' | 'smartphone' {
  if (method === 'yape_plin') return 'smartphone'
  return PAYMENT_METHODS.find((m) => m.id === method)?.icon ?? 'dollar-sign'
}
