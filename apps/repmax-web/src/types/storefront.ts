// ============================================================
// Tipos públicos del storefront (sin autenticación)
// ============================================================

export interface StorePublic {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  plan: "basic" | "pro" | "enterprise";
  usdBsRate: number;
}

export interface ProductPublic {
  id: string;
  title: string;
  description: string | null;
  brand: string;
  model: string;
  yearFrom: number | null;
  yearTo: number | null;
  vehicleType: "CAR" | "MOTO" | "TRUCK" | "SUV" | null;
  condition: "NEW" | "USED";
  partNumber: string | null;
  priceUsd: number;
  priceBs: number | null;
  usdBsRate: number;
  stock: number;
  photos: string[] | null;
}
