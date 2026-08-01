/**
 * Tipos RepMAX — aislados de Odental/GeemaStudio.
 * Filas en snake_case como vienen de PostgREST.
 */

export type RepmaxStoreUserRole = "owner" | "cashier" | "inventory";

export interface RepmaxStoreRow {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  custom_domain: string | null;
  plan: "basic" | "pro" | "enterprise" | string | null;
  is_active: boolean | null;
  currency_usd: string | null;
  currency_bs: string | null;
  usd_bs_rate: string | number | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface RepmaxStoreUserRow {
  id: string;
  store_id: string;
  user_id: string;
  role: RepmaxStoreUserRole | string;
  full_name: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

/** Config de UI derivada de la tienda activa */
export interface RepmaxTenantConfig {
  storeId: string | null;
  slug: string;
  storeName: string;
  city: string | null;
  plan: string;
  theme: {
    primaryColor: string;
    accentColor: string;
    darkMode: boolean;
  };
  locale: {
    currencyUsd: string;
    currencyBs: string;
    usdBsRate: number;
    language: "es-VE";
  };
}
