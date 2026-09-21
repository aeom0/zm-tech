'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '@/lib/supabase'
import { resolveTenantSlugForWrites } from './useWabaStatus'

const BLOCKED_CONFIG_KEY = 'blocked_phone_numbers'

async function fetchBlockedPhones(): Promise<string[]> {
  if (!supabase) throw new Error('Supabase no está configurado')
  const { data, error } = await supabase
    .from('waba_config')
    .select('config_value')
    .eq('config_key', BLOCKED_CONFIG_KEY)
    .maybeSingle()

  if (error) throw new Error(error.message)

  const phones = ((data?.config_value as { phones?: unknown } | null)?.phones ?? []) as unknown[]
  return Array.isArray(phones) ? phones.filter((p): p is string => typeof p === 'string') : []
}

export function useWabaBlockedStatus(phone: string | null) {
  return useQuery({
    queryKey: ['web_waba_blocked', phone],
    enabled: !!supabase && !!phone,
    staleTime: 10_000,
    queryFn: async (): Promise<boolean> => {
      const phones = await fetchBlockedPhones()
      return !!phone && phones.includes(phone)
    },
  })
}

export function useToggleWabaBlock(phone: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (): Promise<boolean> => {
      if (!supabase) throw new Error('Supabase no está configurado')
      if (!phone) throw new Error('Falta el teléfono')

      const currentList = await fetchBlockedPhones()
      const willBlock = !currentList.includes(phone)
      const nextList = willBlock
        ? [...new Set([...currentList, phone])]
        : currentList.filter((p) => p !== phone)

      const tenantId = await resolveTenantSlugForWrites()

      const { error } = await supabase.from('waba_config').upsert(
        {
          tenant_id: tenantId,
          config_key: BLOCKED_CONFIG_KEY,
          label: 'Números bloqueados',
          category: 'haiku',
          config_value: { phones: nextList },
          sort_order: 4,
          is_active: true,
        },
        { onConflict: 'tenant_id,config_key' }
      )
      if (error) throw new Error(error.message)

      return willBlock
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web_waba_blocked', phone] })
    },
  })
}

export function useDeleteWabaThread() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (phone: string) => {
      if (!supabase) throw new Error('Supabase no está configurado')

      const { error: messagesError } = await supabase.from('wa_messages').delete().eq('phone', phone)
      if (messagesError) throw new Error(messagesError.message)

      const { error: sessionError } = await supabase
        .from('whatsapp_sessions')
        .delete()
        .eq('phone', phone)
      if (sessionError) throw new Error(sessionError.message)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['web_waba_conversations'] })
    },
  })
}
