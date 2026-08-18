/**
 * Formato de montos del dashboard (datos reales del tenant).
 * `currencyCode` debe ser código ISO 4217 válido para Intl.
 */
export function formatDashboardCurrency(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('es-419', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return new Intl.NumberFormat('es-419', {
      style: 'currency',
      currency: 'PEN',
      minimumFractionDigits: 2,
    }).format(amount)
  }
}

const ISO4217 = /^[A-Z]{3}$/

export function resolveDashboardCurrencyCode(tenantCode: string | null | undefined): string {
  if (tenantCode && ISO4217.test(tenantCode)) return tenantCode
  return 'PEN'
}
