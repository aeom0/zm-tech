'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  DEFAULT_CATEGORY_COLOR,
  detectCatalogDialect,
  isMissingColumnError,
} from './catalogAdapter'
import { supabase } from '@/lib/supabase'

export interface CategoriaRow {
  id: string
  name: string
  /** En dialecto ZM no hay columna; se rellena con default visual. */
  color: string
  icon: string | null
  order: number
}

let iconSupport: Promise<boolean> | null = null

/** true si `service_categories.icon` existe (migración 20260929122656). Cacheado por sesión. */
function categoriasIconSupported(): Promise<boolean> {
  if (!iconSupport) {
    iconSupport = (async () => {
      if (!supabase) return false
      const { error } = await supabase.from('service_categories').select('icon').limit(1)
      if (!error) return true
      if (isMissingColumnError(error)) return false
      iconSupport = null
      throw error
    })()
  }
  return iconSupport
}

function mapZmRow(
  row: { id: string; name: string; order: number; icon?: string | null }
): CategoriaRow {
  return {
    id: row.id,
    name: row.name,
    order: row.order ?? 0,
    color: DEFAULT_CATEGORY_COLOR,
    icon: row.icon ?? null,
  }
}

export function useCategorias() {
  return useQuery({
    queryKey: ['web_categorias'],
    queryFn: async () => {
      if (!supabase) {
        throw new Error(
          'Supabase no está configurado. Revisa NEXT_PUBLIC_SUPABASE_* en apps/web/.env.local'
        )
      }

      const dialect = await detectCatalogDialect(supabase)

      if (dialect === 'zm') {
        const withIcon = (await categoriasIconSupported()) ? ', icon' : ''
        const { data, error } = await supabase
          .from('service_categories')
          .select(`id, name, order${withIcon}`)
          .order('order', { ascending: true })
        if (error) throw error
        return ((data ?? []) as unknown as Array<{
          id: string
          name: string
          order: number
          icon?: string | null
        }>).map(mapZmRow)
      }

      const primary = await supabase
        .from('service_categories')
        .select('id, name, color, icon, order')
        .order('order', { ascending: true })

      if (!primary.error) {
        return ((primary.data ?? []) as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          name: String(row.name),
          color: String(row.color ?? DEFAULT_CATEGORY_COLOR),
          icon: (row.icon as string | null) ?? null,
          order: Number(row.order ?? 0),
        }))
      }

      if (!isMissingColumnError(primary.error)) {
        throw primary.error
      }

      const fallback = await supabase
        .from('service_categories')
        .select('id, name, order')
        .order('order', { ascending: true })
      if (fallback.error) throw fallback.error
      return ((fallback.data ?? []) as Array<{ id: string; name: string; order: number }>).map(
        mapZmRow
      )
    },
  })
}

export function useUpsertCategoria() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (cat: Partial<CategoriaRow> & { name: string; color: string }) => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const dialect = await detectCatalogDialect(supabase)

      if (cat.id) {
        const payload: Record<string, unknown> = { name: cat.name }
        if (dialect === 'geema') {
          payload.color = cat.color
          payload.icon = cat.icon ?? null
        } else if (await categoriasIconSupported()) {
          payload.icon = cat.icon ?? null
        }
        const { error } = await supabase.from('service_categories').update(payload).eq('id', cat.id)
        if (error) throw error
        return
      }

      if (dialect === 'zm') {
        const { error } = await supabase.from('service_categories').insert({
          name: cat.name,
          order: 99,
          ...((await categoriasIconSupported()) && { icon: cat.icon ?? null }),
        })
        if (error) throw error
        return
      }

      const { error } = await supabase.from('service_categories').insert({
        name: cat.name,
        color: cat.color,
        icon: cat.icon ?? null,
        order: 99,
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['web_categorias'] }),
  })
}

export function useDeleteCategoria() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const { error } = await supabase.from('service_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['web_categorias'] })
      qc.invalidateQueries({ queryKey: ['web_servicios'] })
    },
  })
}
