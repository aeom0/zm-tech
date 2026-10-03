'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { isMissingColumnError } from './catalogAdapter'

export interface ServicioRow {
  id: string
  name: string
  category_id: string
  price: string
  duration: number
  is_active: boolean
  /** Clave de @zmtech/icons; null/ausente = hereda el ícono de la categoría. */
  icon?: string | null
}

/** true si la BD ya tiene `services.icon` (migración 20260929122147). */
export function useServiciosIconSupport() {
  return useQuery({
    queryKey: ['web_servicios_icon_support'],
    staleTime: Infinity,
    queryFn: async () => {
      if (!supabase) return false
      const { error } = await supabase.from('services').select('icon').limit(1)
      if (!error) return true
      if (isMissingColumnError(error)) return false
      throw error
    },
  })
}

export function useServicios(categoryId?: string) {
  return useQuery({
    queryKey: ['web_servicios', categoryId ?? 'all'],
    queryFn: async () => {
      if (!supabase) {
        throw new Error(
          'No se pudo conectar. Intenta de nuevo.'
        )
      }

      const base = 'id, name, category_id, price, duration, is_active'
      const run = (cols: string) => {
        let q = supabase!.from('services').select(cols).order('name', { ascending: true })
        if (categoryId) q = q.eq('category_id', categoryId)
        return q
      }

      let res = await run(`${base}, icon`)
      if (res.error && isMissingColumnError(res.error)) {
        res = await run(base)
      }
      if (res.error) throw res.error
      return (res.data ?? []) as unknown as ServicioRow[]
    },
  })
}

export function useUpsertServicio() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (
      svc: Partial<ServicioRow> & {
        name: string
        category_id: string
        price: string
        duration: number
        is_active?: boolean
        icon?: string | null
      }
    ) => {
      if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')

      const normalizedPrice = String(svc.price).replace(',', '.')
      const payload = {
        name: svc.name,
        category_id: svc.category_id,
        price: normalizedPrice,
        duration: svc.duration,
        is_active: svc.is_active ?? true,
        ...(svc.icon !== undefined && { icon: svc.icon }),
      }

      if (svc.id) {
        const { error } = await supabase.from('services').update(payload).eq('id', svc.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('services').insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['web_servicios'] }),
  })
}

export function useToggleServicio() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
      const { error } = await supabase.from('services').update({ is_active }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['web_servicios'] }),
  })
}

export function useDeleteServicio() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('No se pudo conectar. Intenta de nuevo.')
      const { error } = await supabase.from('services').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['web_servicios'] }),
  })
}
