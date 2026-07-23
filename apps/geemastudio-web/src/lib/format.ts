/**
 * Formato de moneda para el panel web (locale es-VE).
 */
export function formatCurrency(amount: number, symbol = "$"): string {
  return `${symbol} ${amount.toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
