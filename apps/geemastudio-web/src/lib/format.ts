/**
 * Formato de moneda para el panel web (locale es-VE).
 */
export function formatCurrency(amount: number, symbol = '$'): string {
  return `${symbol} ${amount.toLocaleString('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

/** Fecha corta LATAM (ej. 10 sep 2026). */
export function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-419', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
