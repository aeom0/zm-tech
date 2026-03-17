import type { TenantConfig } from "@salonpro/tenant-config";

export function formatCurrency(amount: number, config: TenantConfig): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const { symbol, code } = config.locale.currency;
  const locale = config.locale.language || "es-VE";

  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);

  // Algunos tenants pueden querer símbolo separado, mantenemos symbol como fuente de verdad visual
  // y evitamos duplicar si Intl ya lo incluyó igual.
  if (formatted.trim().startsWith(symbol)) {
    return formatted;
  }

  return `${symbol} ${formatted.replace(/[^\d.,-]+/g, "").trim()}`;
}

