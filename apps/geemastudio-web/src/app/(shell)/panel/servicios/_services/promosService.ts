import { supabase } from '@/lib/supabase'
import {
  createPromo as createPromoData,
  deletePromo as deletePromoData,
  fetchPromos as fetchPromosData,
  togglePromoActive as togglePromoActiveData,
  updatePromo as updatePromoData,
  type PromoItem,
  type PromoItemInput,
  type Promotion,
  type PromotionInput,
} from '@geemastudio/data'

export type { Promotion, PromotionInput, PromoItem, PromoItemInput }

function requireSupabase() {
  if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
  return supabase
}

export async function fetchPromotions(): Promise<Promotion[]> {
  return fetchPromosData(requireSupabase())
}

export async function createPromotion(
  input: PromotionInput,
  items: PromoItemInput[]
): Promise<void> {
  await createPromoData(requireSupabase(), input, items)
}

export async function updatePromotion(
  id: string,
  input: Partial<PromotionInput>,
  items?: PromoItemInput[]
): Promise<void> {
  return updatePromoData(requireSupabase(), id, input, items)
}

export async function deletePromotion(id: string): Promise<void> {
  return deletePromoData(requireSupabase(), id)
}

export async function togglePromoActive(id: string, is_active: boolean): Promise<void> {
  return togglePromoActiveData(requireSupabase(), id, is_active)
}
