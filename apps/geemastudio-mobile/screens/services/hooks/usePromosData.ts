import { useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'

import { supabase } from '@/lib/supabase'
import type { Promo, PromotionItem } from '../types'
import { parsePriceInput, priceToDecimalString } from '../types'
import {
  applyPromoTotals,
  detectCatalogDialect,
  isMissingColumnError,
  rowToPromo,
  rowToPromotionItem,
  type CatalogDialect,
  type PromoRawRow,
  type PromotionItemRawRow,
} from '../lib/catalogAdapter'

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

/** Suma quantity * discounted_price de los ítems, o null si no hay ítems. */
function computePromoPriceField(items: PromoItemDraft[]): string | null {
  if (items.length === 0) {
    return null
  }
  let total = 0
  for (const line of items) {
    const unit = parsePriceInput(line.discounted_price)
    const qty = Number.isFinite(line.quantity) && line.quantity > 0 ? line.quantity : 1
    total += unit * qty
  }
  return priceToDecimalString(total)
}

const GEEMA_PROMOS_SELECT =
  'id, title, description, badge, accent_color, promo_price, is_active, expires_at'
const ZM_PROMOS_SELECT =
  'id, title, description, badge, accent_color, promo_price, is_active, valid_until'
const GEEMA_ITEMS_SELECT = 'id, promo_id, item_type, item_id, quantity, discounted_price'
const ZM_ITEMS_SELECT =
  'id, promotion_id, item_type, item_id, quantity, discounted_price, sort_order'

async function fetchPromotions(dialect: CatalogDialect): Promise<PromoRawRow[]> {
  if (dialect !== 'zm') {
    const { data, error } = await supabase
      .from('promotions')
      .select(GEEMA_PROMOS_SELECT)
      .order('title', { ascending: true })
    if (error) {
      throw new Error(error.message)
    }
    return (data ?? []) as PromoRawRow[]
  }
  const primary = await supabase
    .from('promotions')
    .select(ZM_PROMOS_SELECT)
    .order('display_order', { ascending: true })
  if (!primary.error) {
    return (primary.data ?? []) as PromoRawRow[]
  }
  if (!isMissingColumnError(primary.error)) {
    throw new Error(primary.error.message)
  }
  const fallback = await supabase
    .from('promotions')
    .select(ZM_PROMOS_SELECT)
    .order('title', { ascending: true })
  if (fallback.error) {
    throw new Error(fallback.error.message)
  }
  return (fallback.data ?? []) as PromoRawRow[]
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
      const dialect = await detectCatalogDialect()
      const rows = await fetchPromotions(dialect)
      return rows.map((row) => rowToPromo(row, dialect))
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
      const dialect = await detectCatalogDialect()
      const { data, error } =
        dialect === 'zm'
          ? await supabase.from('promotion_items').select(ZM_ITEMS_SELECT)
          : await supabase.from('promotion_items').select(GEEMA_ITEMS_SELECT)
      if (error) {
        throw new Error(error.message)
      }
      return ((data ?? []) as PromotionItemRawRow[]).map((row) => rowToPromotionItem(row, dialect))
    },
  })

  // ZM: promo_price casi siempre es NULL en prod; el total real vive en promotion_items.
  const promotionsWithTotals = useMemo(
    () => applyPromoTotals(promotions, promotionItems),
    [promotions, promotionItems]
  )

  const createMutation = useMutation({
    mutationFn: async (payload: PromoSavePayload) => {
      const dialect = await detectCatalogDialect()
      const promo_price = computePromoPriceField(payload.items)
      if (dialect === 'zm') {
        const { data: inserted, error: insertError } = await supabase
          .from('promotions')
          .insert({
            title: payload.title.trim(),
            description: payload.description?.trim() || '',
            badge: payload.badge?.trim() || 'PROMO',
            accent_color: payload.accent_color?.trim() || null,
            promo_price,
            is_active: payload.is_active,
            valid_until: payload.expires_at,
            emoji: '✨',
            service_ids: '[]',
          })
          .select('id')
          .single()
        if (insertError) {
          throw new Error(insertError.message)
        }
        const promoId = inserted?.id as string
        if (payload.items.length > 0) {
          const rows = payload.items.map((line, idx) => ({
            promotion_id: promoId,
            item_type: line.item_type,
            item_id: line.item_id,
            quantity: line.quantity > 0 ? line.quantity : 1,
            discounted_price: priceToDecimalString(parsePriceInput(line.discounted_price)),
            sort_order: idx,
          }))
          const { error: itemsErr } = await supabase.from('promotion_items').insert(rows)
          if (itemsErr) {
            throw new Error(itemsErr.message)
          }
        }
        return
      }
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
      const dialect = await detectCatalogDialect()
      const promo_price = computePromoPriceField(payload.items)
      if (dialect === 'zm') {
        const { error: upErr } = await supabase
          .from('promotions')
          .update({
            title: payload.title.trim(),
            description: payload.description?.trim() || '',
            badge: payload.badge?.trim() || 'PROMO',
            accent_color: payload.accent_color?.trim() || null,
            promo_price,
            is_active: payload.is_active,
            valid_until: payload.expires_at,
          })
          .eq('id', id)
        if (upErr) {
          throw new Error(upErr.message)
        }
        const { error: delErr } = await supabase
          .from('promotion_items')
          .delete()
          .eq('promotion_id', id)
        if (delErr) {
          throw new Error(delErr.message)
        }
        if (payload.items.length > 0) {
          const rows = payload.items.map((line, idx) => ({
            promotion_id: id,
            item_type: line.item_type,
            item_id: line.item_id,
            quantity: line.quantity > 0 ? line.quantity : 1,
            discounted_price: priceToDecimalString(parsePriceInput(line.discounted_price)),
            sort_order: idx,
          }))
          const { error: insErr } = await supabase.from('promotion_items').insert(rows)
          if (insErr) {
            throw new Error(insErr.message)
          }
        }
        return
      }
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
      const dialect = await detectCatalogDialect()
      const fkColumn = dialect === 'zm' ? 'promotion_id' : 'promo_id'
      const { error: delItemsErr } = await supabase
        .from('promotion_items')
        .delete()
        .eq(fkColumn, id)
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
    promotions: promotionsWithTotals,
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
