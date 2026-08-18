// ============================================================
// Tipos espejo del schema de Supabase / PostgreSQL local
// ============================================================

import type { MlListingStatus } from '@repmax/repmax-schema/mlListing';
import type { DetallesPago } from '@zmtech/tasas';

export type VehicleType = 'CAR' | 'MOTO' | 'TRUCK' | 'SUV';
export type PartCondition = 'NEW' | 'USED';
export type PaymentMethod =
  | 'CASH_USD' | 'CASH_BS' | 'ZELLE'
  | 'PAGO_MOVIL' | 'TRANSFERENCIA' | 'MIXED';
export type SaleStatus = 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
export type CashSessionStatus = 'OPEN' | 'CLOSED';
export type StoreUserRole = 'owner' | 'cashier' | 'inventory';
export type SubscriptionPlan = 'basic' | 'pro' | 'enterprise';

// Elegidos durante el onboarding mobile (ver types/onboarding.ts)
export type StoreType = 'repuesteria' | 'taller' | 'ambos';
export type VehicleFocus = 'CARS' | 'MOTOS' | 'BOTH';
export type ThemeKey = 'turbo' | 'acero' | 'terreno';
export type CountryCode = 'VE' | 'CO' | 'PE' | 'EC' | 'DO';

export interface Store {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  phone?: string;
  address?: string;
  city?: string;
  customDomain?: string;
  plan: SubscriptionPlan;
  isActive: boolean;
  currencyUsd: string;
  currencyBs: string;
  usdBsRate: number;
  // Si true, el checkout usa usdBsRate fijado a mano en vez de la tasa BCV en
  // vivo (ver migracion 20260818130000_repmax_stores_tasa_manual.sql)
  usarTasaManual: boolean;
  // Subconjunto de BRANDS (constants/brands.ts) con el que trabaja la tienda.
  // Vacío = todas (ver migracion 20260818231537_repmax_stores_preferred_brands.sql)
  preferredBrands: string[];
  // Preferencias capturadas en el onboarding — ver migracion
  // 20260808120000_repmax_store_onboarding_fields.sql
  storeType: StoreType;
  vehicleFocus: VehicleFocus;
  themeKey: ThemeKey;
  countryCode: CountryCode;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleCatalogEntry {
  id: string;
  storeId: string;
  brand: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
  vehicleType?: VehicleType;
  createdAt: string;
}

export interface StoreUser {
  id: string;
  storeId: string;
  userId: string;
  role: StoreUserRole;
  fullName?: string;
  isActive: boolean;
  createdAt: string;
}

export interface AuthUser {
  id: string;
  email: string;
}

export interface Product {
  id: string;
  storeId: string;
  title: string;
  description?: string;
  brand: string;
  model: string;
  yearFrom?: number;
  yearTo?: number;
  vehicleType?: VehicleType;
  condition: PartCondition;
  partNumber?: string;
  /** EAN / UPC / Code128 / payload QR. Único por tienda. */
  barcode?: string;
  color?: string;
  priceUsd: number;
  priceBs?: number;
  stock: number;
  minStock: number;
  photos?: string[];
  mlPublishIntent?: boolean;
  /** Estado del listing ML (embed PostgREST). */
  mlListingStatus?: MlListingStatus;
  mlItemId?: string;
  mlCategoryId?: string;
  mlCategoryName?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  storeId: string;
  fullName: string;
  phone?: string;
  cedulaRif?: string;
  email?: string;
  notes?: string;
  totalPurchases: number;
  totalSpentUsd: number;
  createdAt: string;
}

export interface Sale {
  id: string;
  storeId: string;
  sessionId?: string;
  customerId?: string;
  cashierId?: string;
  invoiceNumber?: string;
  totalUsd: number;
  totalBs?: number;
  usdBsRate?: number;
  paymentMethod: PaymentMethod;
  paymentDetails?: DetallesPago;
  status: SaleStatus;
  notes?: string;
  createdAt: string;
  // Relaciones opcionales
  customer?: Customer;
  items?: SaleItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId?: string;
  productSnapshot: Partial<Product>;
  quantity: number;
  unitPriceUsd: number;
  subtotalUsd: number;
}

export interface CashSession {
  id: string;
  storeId: string;
  cashierId?: string;
  status: CashSessionStatus;
  openingAmountUsd: number;
  closingAmountUsd?: number;
  totalSalesUsd?: number;
  totalByPaymentMethod: Partial<Record<PaymentMethod, number>>;
  openedAt: string;
  closedAt?: string;
  notes?: string;
}

// Estado local del carrito POS (no persiste en DB)
export interface CartItem {
  product: Product;
  quantity: number;
  subtotalUsd: number;
}
