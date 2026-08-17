// Detecta productos vendidos que están publicados en ML (modo manual).
import type { CartItem } from '../types/database';

export interface ItemAlertaMlStock {
  productId: string;
  title: string;
  partNumber?: string;
  mlItemId?: string;
}

const ESTADOS_EN_ML = new Set(['published_manual', 'published']);

export function itemsVentaConMl(cartItems: CartItem[]): ItemAlertaMlStock[] {
  const out: ItemAlertaMlStock[] = [];
  const seen = new Set<string>();

  for (const item of cartItems) {
    const status = item.product.mlListingStatus;
    if (!status || !ESTADOS_EN_ML.has(status)) continue;
    if (seen.has(item.product.id)) continue;
    seen.add(item.product.id);
    out.push({
      productId: item.product.id,
      title: item.product.title,
      partNumber: item.product.partNumber,
      mlItemId: item.product.mlItemId,
    });
  }

  return out;
}
