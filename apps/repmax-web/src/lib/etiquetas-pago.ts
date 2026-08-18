// ============================================================
// Etiquetas en español para métodos de pago (POS / dashboard)
// ============================================================

import type { PaymentMethodWeb } from '@/types/dashboard'

const MAPA: Record<PaymentMethodWeb, string> = {
  CASH_USD: 'Efectivo USD',
  ZELLE: 'Zelle',
  PAGO_MOVIL: 'Pago Móvil',
  CASH_BS: 'Efectivo Bs',
  TRANSFERENCIA: 'Transferencia',
  MIXED: 'Mixto',
}

/** Convierte el código del enum a texto para la UI */
export function etiquetaMetodoPago(codigo: string): string {
  if (codigo in MAPA) {
    return MAPA[codigo as PaymentMethodWeb]
  }
  return codigo
}
