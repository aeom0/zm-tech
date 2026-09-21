'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { resolveTenantSlugForWrites } from './useWabaStatus'
import { supabase } from '@/lib/supabase'

export type WabaConfigRow = {
  id: string
  config_key: string
  label: string
  category: string
  config_value: Record<string, unknown>
  is_active: boolean
  sort_order: number
  updated_at: string
  updated_by: string | null
}

/** Config de campañas (Meta Ads + venta emocional CTWA + tardanzas), categoría `campanas` en `waba_config`. */
export function useCampanasConfig() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['web_waba_config', 'campanas'],
    enabled: !!supabase,
    queryFn: async (): Promise<WabaConfigRow[]> => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const { data, error } = await supabase
        .from('waba_config')
        .select('*')
        .eq('category', 'campanas')
        .order('sort_order')
      if (error) throw new Error(error.message)
      return data as WabaConfigRow[]
    },
  })

  const mutation = useMutation({
    mutationFn: async ({ id, config_value }: { id: string; config_value: Record<string, unknown> }) => {
      if (!supabase) throw new Error('Supabase no está configurado')
      // Resuelve el tenant aunque no se use en el UPDATE (RLS ya valida vía current_tenant_id());
      // sirve para fallar rápido y con mensaje claro si la sesión no tiene tenant resuelto.
      await resolveTenantSlugForWrites()
      const { error } = await supabase.from('waba_config').update({ config_value }).eq('id', id)
      if (error) throw new Error(error.message)
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ['web_waba_config', 'campanas'] })
    },
  })

  return { query, mutation }
}
