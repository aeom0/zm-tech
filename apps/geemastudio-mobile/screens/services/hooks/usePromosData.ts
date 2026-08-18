import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'

import { supabase } from '@/lib/supabase'
import type { Promo, PromotionItem } from '../types'
import { parsePriceInput, priceToDecimalString } from '../types'

export interface PromoItemDraft {
  tempId: string
  item_type: 'service' | 'pack'
  item_id: string
  quantity: number
  discounted_price: string
}

export interface PromoSavePayload {
  title: string
  description: string | null
  badge: string | null
  accent_color: string | null
  is_active: boolean
  expires_at: string | null
  items: PromoItemDraft[]
}

function sumPromoPrice(items: PromoItemDraft[]): string {
  let total = 0
  for (const line of items) {
    const unit = parsePriceInput(line.discounted_price)
    const qty = Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 1
    total += unit * qty
  }
  return priceToDecimalString(total)
}

/** Fila promotion_items: discounted_price puede venir como string desde numeric */
interface PromotionItemRow {
  id: string
  promo_id: string
  item_type: string
  item_id: string
  quantity: number | null
  discounted_price: string | number
}

function rowToPromotionItem(row: PromotionItemRow): PromotionItem {
  const qty = row.quantity != null && row.quantity > 0 ? row.quantity : 1
  const dp =
    typeof row.discounted_price === 'number'
      ? row.discounted_price
      : parseFloat(String(row.discounted_price))
  return {
    id: row.id,
    promo_id: row.promo_id,
    item_type: row.item_type === 'pack' ? 'pack' : 'service',
    item_id: row.item_id,
    quantity: qty,
    discounted_price: Number.isFinite(dp) ? dp : 0,
  }
}

export function usePromosData() {
  const queryClient = useQueryClient()

  const {
    data: promotions = [],
    isLoading: promosLoading,
    isError: promosError,
    refetch: refetchPromos,
  } = useQuery<Promo[]>({
    queryKey: ['promotions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotions')
        .select('id, title, description, badge, accent_color, promo_price, is_active, expires_at')
        .order('title', { ascending: true })
      if (error) {
        throw new Error(error.message)
      }
      return (data ?? []) as Promo[]
    },
  })

  const {
    data: promotionItems = [],
    isLoading: itemsLoading,
    isError: itemsError,
    refetch: refetchItems,
  } = useQuery<PromotionItem[]>({
    queryKey: ['promotion_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('promotion_items')
        .select('id, promo_id, item_type, item_id, quantity, discounted_price')
      if (error) {
        throw new Error(error.message)
      }
      return ((data ?? []) as PromotionItemRow[]).map(rowToPromotionItem)
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: PromoSavePayload) => {
      const promo_price = sumPromoPrice(payload.items)
      const { data: inserted, error: insertError } = await supabase
        .from('promotions')
        .insert({
          title: payload.title.trim(),
          description: payload.description?.trim() || null,
          badge: payload.badge?.trim() || null,
          accent_color: payload.accent_color?.trim() || null,
          promo_price,
          is_active: payload.is_active,
          expires_at: payload.expires_at,
        })
        .select('id')
        .single()
      if (insertError) {
        throw new Error(insertError.message)
      }
      const promoId = inserted?.id as string
      if (payload.items.length > 0) {
        const rows = payload.items.map((line) => ({
          promo_id: promoId,
          item_type: line.item_type,
          item_id: line.item_id,
          quantity: line.quantity > 0 ? line.quantity : 1,
          discounted_price: priceToDecimalString(parsePriceInput(line.discounted_price)),
        }))
        const { error: itemsErr } = await supabase.from('promotion_items').insert(rows)
        if (itemsErr) {
          throw new Error(itemsErr.message)
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['promotions'] })
      void queryClient.invalidateQueries({ queryKey: ['promotion_items'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PromoSavePayload }) => {
      const promo_price = sumPromoPrice(payload.items)
      const { error: upErr } = await supabase
        .from('promotions')
        .update({
          title: payload.title.trim(),
          description: payload.description?.trim() || null,
          badge: payload.badge?.trim() || null,
          accent_color: payload.accent_color?.trim() || null,
          promo_price,
          is_active: payload.is_active,
          expires_at: payload.expires_at,
        })
        .eq('id', id)
      if (upErr) {
        throw new Error(upErr.message)
      }
      const { error: delErr } = await supabase.from('promotion_items').delete().eq('promo_id', id)
      if (delErr) {
        throw new Error(delErr.message)
      }
      if (payload.items.length > 0) {
        const rows = payload.items.map((line) => ({
          promo_id: id,
          item_type: line.item_type,
          item_id: line.item_id,
          quantity: line.quantity > 0 ? line.quantity : 1,
          discounted_price: priceToDecimalString(parsePriceInput(line.discounted_price)),
        }))
        const { error: insErr } = await supabase.from('promotion_items').insert(rows)
        if (insErr) {
          throw new Error(insErr.message)
        }
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['promotions'] })
      void queryClient.invalidateQueries({ queryKey: ['promotion_items'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error: delItemsErr } = await supabase
        .from('promotion_items')
        .delete()
        .eq('promo_id', id)
      if (delItemsErr) {
        throw new Error(delItemsErr.message)
      }
      const { error } = await supabase.from('promotions').delete().eq('id', id)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['promotions'] })
      void queryClient.invalidateQueries({ queryKey: ['promotion_items'] })
    },
    onError: (error: Error) => {
      Alert.alert('No se pudo eliminar', error.message)
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('promotions').update({ is_active }).eq('id', id)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
  })

  const isLoading = promosLoading || itemsLoading
  const isError = promosError || itemsError

  const refetch = async () => {
    await refetchPromos()
    await refetchItems()
  }

  return {
    promotions,
    promotionItems,
    isLoading,
    isError,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleActiveMutation,
  }
}
