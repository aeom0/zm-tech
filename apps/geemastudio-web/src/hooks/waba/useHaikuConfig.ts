'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { resolveTenantSlugForWrites } from './useWabaStatus'
import { supabase } from '@/lib/supabase'

const KEY_SYSTEM = 'haiku_system_prompt'

/** Prompt genérico multi-tenant (no hardcodear salón). */
export const DEFAULT_HAIKU_SYSTEM_PROMPT = [
  'Eres la asistente virtual del salón (WhatsApp).',
  'Hablás en español LATAM neutro, cálida y profesional.',
  'No uses apodos afectivos excesivos ni mexicanismos.',
  'Ayudá a responder dudas de servicios, precios y a guiar a agendar.',
  'Si no sabés algo, pedí que escriban *agendar* o que contacten al salón.',
].join('\n')

export function useHaikuSystemPrompt() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['web_waba_haiku_prompt'],
    enabled: !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<{ content: string; updatedAt: string | null; fromDb: boolean }> => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const { data, error } = await supabase
        .from('waba_config')
        .select('config_value, updated_at')
        .eq('config_key', KEY_SYSTEM)
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data) {
        return { content: DEFAULT_HAIKU_SYSTEM_PROMPT, updatedAt: null, fromDb: false }
      }
      const value = (data.config_value ?? {}) as Record<string, unknown>
      const content =
        typeof value.content === 'string' && value.content.trim()
          ? value.content
          : DEFAULT_HAIKU_SYSTEM_PROMPT
      return {
        content,
        updatedAt: typeof data.updated_at === 'string' ? data.updated_at : null,
        fromDb: true,
      }
    },
  })

  const save = useMutation({
    mutationFn: async (content: string) => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const tenant_id = await resolveTenantSlugForWrites()
      const { error } = await supabase.from('waba_config').upsert(
        {
          tenant_id,
          config_key: KEY_SYSTEM,
          config_value: { content },
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,config_key' }
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['web_waba_haiku_prompt'] })
    },
  })

  return { query, save }
}
