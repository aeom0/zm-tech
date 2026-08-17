// ============================================================
// Tipos del panel web (dashboard) — alineados con el API Express
// ============================================================

export type SubscriptionPlanWeb = "basic" | "pro" | "enterprise";

export interface StoreWeb {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  plan: SubscriptionPlanWeb;
  usdBsRate: number;
}

export interface DashboardData {
  ventasHoy: number;
  ingresoHoy: number;
  totalProductos: number;
  totalClientes: number;
  stockBajo: number;
  ventasUltimos7Dias: { fecha: string; total: number }[];
  topProductos: { title: string; brand: string; cantidad: number }[];
  metodoPago: { metodo: string; total: number }[];
}

export type PartConditionWeb = "NEW" | "USED";
export type VehicleTypeWeb = "CAR" | "MOTO" | "TRUCK" | "SUV";

import type { MlListingStatus } from "@repmax/repmax-schema/mlListing";
import type { MlBadgeKind } from "@/lib/ml-readiness";

export interface ProductoWeb {
  id: string;
  title: string;
  brand: string;
  model: string;
  priceUsd: number;
  priceBs: number;
  stock: number;
  minStock: number;
  condition: PartConditionWeb;
  vehicleType: VehicleTypeWeb | null;
  isActive: boolean;
  partNumber: string;
  description?: string;
  photos?: string[];
  mlPublishIntent?: boolean;
  mlListingStatus?: MlListingStatus;
  mlBadge?: MlBadgeKind;
  vitrinaLista?: boolean;
}

export type SaleStatusWeb = "COMPLETED" | "CANCELLED" | "REFUNDED";
export type PaymentMethodWeb =
  | "CASH_USD"
  | "CASH_BS"
  | "ZELLE"
  | "PAGO_MOVIL"
  | "TRANSFERENCIA"
  | "MIXED";

export interface VentaWeb {
  id: string;
  invoiceNumber: string;
  totalUsd: number;
  totalBs: number | null;
  paymentMethod: PaymentMethodWeb;
  status: SaleStatusWeb;
  createdAt: string;
  customer: { fullName: string } | null;
}

export interface ClienteWeb {
  id: string;
  fullName: string;
  phone: string;
  cedulaRif: string;
  email: string;
  totalPurchases: number;
  totalSpentUsd: number;
  createdAt: string;
}

export interface AuthMeResponse {
  user: { id: string; email: string };
  store: StoreWeb;
  storeUser: { role: string; fullName: string | null };
}

export interface LoginResponse extends AuthMeResponse {
  token: string;
}
