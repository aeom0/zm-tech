import type { TenantConfig } from '@zmtech/tenant-config'

export function formatCurrency(amount: number, config: TenantConfig): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0
  const { symbol, code } = config.locale.currency
  const locale = config.locale.language || 'es-VE'

  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount)

  // Algunos tenants pueden querer símbolo separado, mantenemos symbol como fuente de verdad visual
  // y evitamos duplicar si Intl ya lo incluyó igual.
  if (formatted.trim().startsWith(symbol)) {
    return formatted
  }

  return `${symbol} ${formatted.replace(/[^\d.,-]+/g, '').trim()}`
}

/**
 * Normaliza texto de entrada numérica para parsear como float.
 * Acepta coma o punto como separador decimal.
 */
export function normalizeDecimalInput(text: string): string {
  const cleaned = text.replace(/[^0-9.,]/g, '')
  return cleaned.replace(',', '.')
}

/**
 * Filtra texto de entrada para campo de precio:
 * solo dígitos, un separador decimal (coma o punto).
 */
export function filterPriceInput(text: string): string {
  const cleaned = text.replace(/[^0-9.,]/g, '')
  const parts = cleaned.split(/[,.]/)
  if (parts.length <= 2) return cleaned
  return parts[0] + '.' + parts.slice(1).join('')
}
