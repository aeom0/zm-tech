import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert } from 'react-native'

import { supabase } from '@/lib/supabase'
import type { Pack } from '../types'
import { parsePriceInput, priceToDecimalString } from '../types'

export interface PackPayload {
  name: string
  description: string | null
  price: string
  service_ids: string[]
  is_active: boolean
}

/** Fila cruda de packs: service_ids puede venir como array desde Postgres */
interface PackRow {
  id: string
  name: string
  description: string | null
  price: string
  service_ids: string[] | null
  is_active: boolean
}

function rowToPack(row: PackRow): Pack {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    service_ids: Array.isArray(row.service_ids) ? row.service_ids : [],
    is_active: row.is_active,
  }
}

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
      const { data, error } = await supabase
        .from('packs')
        .select('id, name, description, price, service_ids, is_active')
        .order('name', { ascending: true })
      if (error) {
        throw new Error(error.message)
      }
      return ((data ?? []) as PackRow[]).map(rowToPack)
    },
  })

  const createMutation = useMutation({
    mutationFn: async (payload: PackPayload) => {
      const { error } = await supabase.from('packs').insert({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        price: priceToDecimalString(parsePriceInput(payload.price)),
        service_ids: payload.service_ids,
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
      const { error } = await supabase
        .from('packs')
        .update({
          name: payload.name.trim(),
          description: payload.description?.trim() || null,
          price: priceToDecimalString(parsePriceInput(payload.price)),
          service_ids: payload.service_ids,
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
