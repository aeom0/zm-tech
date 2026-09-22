'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { resolveTenantSlugForWrites } from './useWabaStatus'
import { supabase } from '@/lib/supabase'

export const PORTFOLIO_SLOTS = 4

export type PortfolioSlot = {
  id?: string
  url: string
  caption: string
}

export type PortfolioCategory = {
  id: string
  name: string
  order: number
}

export type PortfolioService = {
  id: string
  name: string
  short_name: string | null
  category_id: string
  is_active: boolean
}

export function emptySlots(): PortfolioSlot[] {
  return Array.from({ length: PORTFOLIO_SLOTS }, () => ({
    url: '',
    caption: '',
  }))
}

/** Normaliza filas BD → 4 slots por sort_order. */
export function rowsToSlots(
  rows: {
    id: string
    image_url: string
    caption: string | null
    sort_order: number
  }[],
): PortfolioSlot[] {
  const slots = emptySlots()
  for (const row of rows) {
    const i = row.sort_order
    if (i < 0 || i >= PORTFOLIO_SLOTS) continue
    slots[i] = {
      id: row.id,
      url: row.image_url ?? '',
      caption: row.caption ?? '',
    }
  }
  return slots
}

export function usePortfolioCatalog() {
  return useQuery({
    queryKey: ['web_waba_portfolio_catalog'],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const [catsRes, svcsRes] = await Promise.all([
        supabase
          .from('service_categories')
          .select('id, name, order')
          .order('order', { ascending: true }),
        supabase
          .from('services')
          .select('id, name, short_name, category_id, is_active')
          .eq('is_active', true)
          .order('name', { ascending: true }),
      ])
      if (catsRes.error) throw catsRes.error
      if (svcsRes.error) throw svcsRes.error
      return {
        categories: (catsRes.data ?? []) as PortfolioCategory[],
        services: (svcsRes.data ?? []) as PortfolioService[],
      }
    },
  })
}

/** Mapa serviceId → cantidad de fotos (para badges). */
export function usePortfolioImageCounts() {
  return useQuery({
    queryKey: ['web_waba_portfolio_counts'],
    enabled: !!supabase,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const { data, error } = await supabase.from('service_portfolio_images').select('service_id')
      if (error) throw error
      const counts: Record<string, number> = {}
      for (const row of data ?? []) {
        const sid = (row as { service_id: string }).service_id
        counts[sid] = (counts[sid] ?? 0) + 1
      }
      return counts
    },
  })
}

export function useServicePortfolioSlots(serviceId: string | null) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['web_waba_portfolio_slots', serviceId],
    enabled: !!supabase && !!serviceId,
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const { data, error } = await supabase
        .from('service_portfolio_images')
        .select('id, image_url, caption, sort_order')
        .eq('service_id', serviceId!)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return rowsToSlots(
        (data ?? []) as {
          id: string
          image_url: string
          caption: string | null
          sort_order: number
        }[],
      )
    },
  })

  const saveSlotMutation = useMutation({
    mutationFn: async (args: {
      serviceId: string
      sortOrder: number
      url: string
      caption: string
      existingId?: string
    }) => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const { serviceId: sid, sortOrder, url, caption, existingId } = args
      const trimmed = url.trim()

      if (!trimmed) {
        if (existingId) {
          const { error } = await supabase
            .from('service_portfolio_images')
            .delete()
            .eq('id', existingId)
          if (error) throw error
        } else {
          const { error } = await supabase
            .from('service_portfolio_images')
            .delete()
            .eq('service_id', sid)
            .eq('sort_order', sortOrder)
          if (error) throw error
        }
        return
      }

      const tenant_id = await resolveTenantSlugForWrites()

      if (existingId) {
        const { error } = await supabase
          .from('service_portfolio_images')
          .update({
            image_url: trimmed,
            caption: caption.trim(),
          })
          .eq('id', existingId)
        if (error) throw error
        return
      }

      const { error } = await supabase.from('service_portfolio_images').upsert(
        {
          service_id: sid,
          image_url: trimmed,
          caption: caption.trim(),
          sort_order: sortOrder,
          tenant_id,
        },
        { onConflict: 'service_id,sort_order' },
      )
      if (error) throw error
    },
    onSuccess: async (_d, vars) => {
      await qc.invalidateQueries({ queryKey: ['web_waba_portfolio_slots', vars.serviceId] })
      await qc.invalidateQueries({ queryKey: ['web_waba_portfolio_counts'] })
    },
  })

  return {
    query,
    saveSlot: saveSlotMutation.mutateAsync,
    isSaving: saveSlotMutation.isPending,
  }
}

/** Reasigna una foto ya guardada a otro servicio (corrige mal-ubicaciones sin SQL). */
export function useMoveSlotMutation() {
  const qc = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (args: {
      existingId: string
      sourceServiceId: string
      targetServiceId: string
    }) => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const { existingId, targetServiceId } = args

      const { data: targetRows, error: targetErr } = await supabase
        .from('service_portfolio_images')
        .select('sort_order')
        .eq('service_id', targetServiceId)
      if (targetErr) throw targetErr

      const usedOrders = new Set(
        (targetRows ?? []).map((r: { sort_order: number }) => r.sort_order),
      )
      let freeOrder = 0
      while (usedOrders.has(freeOrder) && freeOrder < PORTFOLIO_SLOTS) {
        freeOrder++
      }
      if (freeOrder >= PORTFOLIO_SLOTS) {
        throw new Error('El servicio destino ya tiene 4 fotos.')
      }

      const { error } = await supabase
        .from('service_portfolio_images')
        .update({ service_id: targetServiceId, sort_order: freeOrder })
        .eq('id', existingId)
      if (error) throw error
    },
    onSuccess: async (_d, vars) => {
      await qc.invalidateQueries({
        queryKey: ['web_waba_portfolio_slots', vars.sourceServiceId],
      })
      await qc.invalidateQueries({
        queryKey: ['web_waba_portfolio_slots', vars.targetServiceId],
      })
      await qc.invalidateQueries({ queryKey: ['web_waba_portfolio_counts'] })
    },
  })

  return {
    moveSlot: mutation.mutateAsync,
    isMoving: mutation.isPending,
  }
}
