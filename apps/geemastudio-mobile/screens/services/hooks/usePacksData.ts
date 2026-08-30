import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'

import { supabase } from '@/lib/supabase'
import type { Pack } from '../types'
import { parsePriceInput, priceToDecimalString } from '../types'
import {
  detectCatalogDialect,
  rowToPack,
  serializeServiceIds,
  type PackRawRow,
} from '../lib/catalogAdapter'

export interface PackPayload {
  name: string
  description: string | null
  price: string
  service_ids: string[]
  is_active: boolean
  /** Requerido solo en dialecto ZM (packs.category_id NOT NULL). */
  category_id?: string | null
}

const GEEMA_SELECT = 'id, name, description, price, service_ids, is_active'
const ZM_SELECT =
  'id, title, description, pack_price, pack_price_card, category_id, service_ids, is_active, display_order'

export function usePacksData() {
  const queryClient = useQueryClient()

  const {
    data: packs = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<Pack[]>({
    queryKey: ['packs'],
    queryFn: async () => {
      const dialect = await detectCatalogDialect()
      const { data, error } =
        dialect === 'zm'
          ? await supabase.from('packs').select(ZM_SELECT).order('display_order', { ascending: true })
          : await supabase.from('packs').select(GEEMA_SELECT).order('name', { ascending: true })
      if (error) {
        throw new Error(error.message)
      }
      return ((data ?? []) as PackRawRow[]).map((row) => rowToPack(row, dialect))
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: PackPayload) => {
      const dialect = await detectCatalogDialect()
      if (dialect === 'zm') {
        if (!payload.category_id) {
          throw new Error(
            'No se pudo determinar la categoría del pack. Selecciona al menos un servicio.'
          )
        }
        const { error } = await supabase.from('packs').insert({
          title: payload.name.trim(),
          description: payload.description?.trim() || '',
          pack_price: priceToDecimalString(parsePriceInput(payload.price)),
          service_ids: serializeServiceIds(payload.service_ids, dialect),
          category_id: payload.category_id,
          is_active: payload.is_active,
          emoji: '✨',
          badge: 'PACK',
        })
        if (error) {
          throw new Error(error.message)
        }
        return
      }
      const { error } = await supabase.from('packs').insert({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        price: priceToDecimalString(parsePriceInput(payload.price)),
        service_ids: serializeServiceIds(payload.service_ids, dialect),
        is_active: payload.is_active,
      })
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['packs'] })
      void queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PackPayload }) => {
      const dialect = await detectCatalogDialect()
      if (dialect === 'zm') {
        if (!payload.category_id) {
          throw new Error(
            'No se pudo determinar la categoría del pack. Selecciona al menos un servicio.'
          )
        }
        const { error } = await supabase
          .from('packs')
          .update({
            title: payload.name.trim(),
            description: payload.description?.trim() || '',
            pack_price: priceToDecimalString(parsePriceInput(payload.price)),
            service_ids: serializeServiceIds(payload.service_ids, dialect),
            category_id: payload.category_id,
            is_active: payload.is_active,
          })
          .eq('id', id)
        if (error) {
          throw new Error(error.message)
        }
        return
      }
      const { error } = await supabase
        .from('packs')
        .update({
          name: payload.name.trim(),
          description: payload.description?.trim() || null,
          price: priceToDecimalString(parsePriceInput(payload.price)),
          service_ids: serializeServiceIds(payload.service_ids, dialect),
          is_active: payload.is_active,
        })
        .eq('id', id)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['packs'] })
      void queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('packs').delete().eq('id', id)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['packs'] })
      void queryClient.invalidateQueries({ queryKey: ['promotion_items'] })
      void queryClient.invalidateQueries({ queryKey: ['promotions'] })
    },
    onError: (error: Error) => {
      Alert.alert(
        'No se pudo eliminar',
        error.message || 'El pack puede estar referenciado en una promo.'
      )
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from('packs').update({ is_active }).eq('id', id)
      if (error) {
        throw new Error(error.message)
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['packs'] })
    },
  })

  return {
    packs,
    isLoading,
    isError,
    refetch,
    createMutation,
    updateMutation,
    deleteMutation,
    toggleActiveMutation,
  }
}
