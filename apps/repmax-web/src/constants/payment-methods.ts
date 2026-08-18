import type { PaymentMethodWeb } from "@/types/dashboard";

export const PAYMENT_METHODS_WEB: { value: PaymentMethodWeb; label: string }[] = [
  { value: "CASH_USD", label: "Efectivo USD" },
  { value: "CASH_BS", label: "Efectivo Bs" },
  { value: "ZELLE", label: "Zelle" },
  { value: "PAGO_MOVIL", label: "Pago Móvil" },
  { value: "TRANSFERENCIA", label: "Transferencia" },
  { value: "MIXED", label: "Mixto" },
];
