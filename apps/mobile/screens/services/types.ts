/** Coincide con public.service_categories en SalonPro */
export interface ServiceCategory {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  order: number;
}

export interface Service {
  id: string;
  name: string;
  category_id: string;
  price: string;
  duration: number;
  is_active: boolean;
}

export interface Pack {
  id: string;
  name: string;
  description: string | null;
  price: string;
  service_ids: string[];
  is_active: boolean;
}

export interface Promo {
  id: string;
  title: string;
  description: string | null;
  badge: string | null;
  accent_color: string | null;
  promo_price: string | null;
  is_active: boolean;
  expires_at: string | null;
}

export interface PromotionItem {
  id: string;
  promo_id: string;
  item_type: "service" | "pack";
  item_id: string;
  quantity: number;
  discounted_price: number;
}

/** Normaliza input de precio LATAM (coma decimal) a número */
export function parsePriceInput(raw: string): number {
  const n = parseFloat(raw.replace(",", ".").trim());
  return Number.isFinite(n) ? n : 0;
}

/** Serializa número a string decimal para columnas numeric en Supabase */
export function priceToDecimalString(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return safe.toFixed(2);
}
