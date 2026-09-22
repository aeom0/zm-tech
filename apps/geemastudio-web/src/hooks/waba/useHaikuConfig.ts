'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { resolveTenantSlugForWrites } from './useWabaStatus'
import { supabase } from '@/lib/supabase'
import {
  DEFAULT_BLOCKED_PHONE_NUMBERS,
  DEFAULT_HAIKU_SETTINGS,
  DEFAULT_HAIKU_SYSTEM_PROMPT_GUIDE,
  DEFAULT_HAIKU_TRIGGER_KEYWORDS,
  DEFAULT_WELCOME_FALLBACK_AD,
  DEFAULT_WELCOME_FALLBACK_ORGANIC,
  DEFAULT_WELCOME_GENERATION_SYSTEM,
  DEFAULT_WELCOME_GREETING_TEMPLATE,
  DEFAULT_WELCOME_SLOT_CONTEXT,
} from '@/app/panel/waba/haiku/_lib/defaultHaikuConfig'

export type HaikuSettings = {
  max_tokens: number
  timeout_ms: number
  rate_limit_per_hour: number
  welcome_greeting_template?: string
  welcome_generation_system?: string
  welcome_max_tokens?: number
  welcome_timeout_ms?: number
  welcome_slot_context?: Record<string, string>
  welcome_fallback_ad?: Record<string, string>
  welcome_fallback_organic?: Record<string, string>
}

export type HaikuTriggerKeywords = {
  recommendation: string[]
  free_question: string[]
  blocked: string[]
}

export type HaikuConfig = {
  systemPrompt: string
  triggerKeywords: HaikuTriggerKeywords
  settings: HaikuSettings
  blockedPhones: string[]
  updatedAtByKey: Record<string, string | null>
}

const KEY_SYSTEM = 'haiku_system_prompt'
const KEY_KEYWORDS = 'haiku_trigger_keywords'
const KEY_SETTINGS = 'haiku_settings'
const KEY_BLOCKED_PHONES = 'blocked_phone_numbers'

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asNumber(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : fallback
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.map((x) => (typeof x === 'string' ? x : '')).filter(Boolean)
}

/** Combina JSON de BD con defaults (clave ausente o string vacío -> default por clave). */
function mergeStrRecord(raw: unknown, fallback: Record<string, string>): Record<string, string> {
  const out = { ...fallback }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
      if (typeof v === 'string' && v.trim()) out[k] = v.trim()
    }
  }
  return out
}

function freshDefaultSettings(): HaikuSettings {
  return {
    max_tokens: DEFAULT_HAIKU_SETTINGS.max_tokens,
    timeout_ms: DEFAULT_HAIKU_SETTINGS.timeout_ms,
    rate_limit_per_hour: DEFAULT_HAIKU_SETTINGS.rate_limit_per_hour,
    welcome_greeting_template: DEFAULT_WELCOME_GREETING_TEMPLATE,
    welcome_generation_system: DEFAULT_WELCOME_GENERATION_SYSTEM,
    welcome_max_tokens: DEFAULT_HAIKU_SETTINGS.welcome_max_tokens,
    welcome_timeout_ms: DEFAULT_HAIKU_SETTINGS.welcome_timeout_ms,
    welcome_slot_context: { ...DEFAULT_WELCOME_SLOT_CONTEXT },
    welcome_fallback_ad: { ...DEFAULT_WELCOME_FALLBACK_AD },
    welcome_fallback_organic: { ...DEFAULT_WELCOME_FALLBACK_ORGANIC },
  }
}

export function useHaikuConfig() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['web_waba_haiku_config'],
    enabled: !!supabase,
    staleTime: 30_000,
    queryFn: async (): Promise<HaikuConfig> => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const { data, error } = await supabase
        .from('waba_config')
        .select('config_key, config_value, updated_at')
        .in('config_key', [KEY_SYSTEM, KEY_KEYWORDS, KEY_SETTINGS, KEY_BLOCKED_PHONES])

      if (error) throw new Error(error.message)

      const byKey = new Map<string, { v: Record<string, unknown>; updated_at: string | null }>()
      for (const row of (data ?? []) as Record<string, unknown>[]) {
        const k = asString(row.config_key)
        const v = (row.config_value ?? {}) as Record<string, unknown>
        const updatedAt = typeof row.updated_at === 'string' ? row.updated_at : null
        byKey.set(k, { v, updated_at: updatedAt })
      }

      const system = byKey.get(KEY_SYSTEM)?.v ?? {}
      const keywords = byKey.get(KEY_KEYWORDS)?.v ?? {}
      const settings = byKey.get(KEY_SETTINGS)?.v ?? {}
      const blockedPhones = byKey.get(KEY_BLOCKED_PHONES)?.v ?? {}

      const updatedAtByKey: Record<string, string | null> = {
        [KEY_SYSTEM]: byKey.get(KEY_SYSTEM)?.updated_at ?? null,
        [KEY_KEYWORDS]: byKey.get(KEY_KEYWORDS)?.updated_at ?? null,
        [KEY_SETTINGS]: byKey.get(KEY_SETTINGS)?.updated_at ?? null,
        [KEY_BLOCKED_PHONES]: byKey.get(KEY_BLOCKED_PHONES)?.updated_at ?? null,
      }

      const hasSystemRow = updatedAtByKey[KEY_SYSTEM] != null
      const hasKeywordsRow = updatedAtByKey[KEY_KEYWORDS] != null
      const hasSettingsRow = updatedAtByKey[KEY_SETTINGS] != null
      const hasBlockedPhonesRow = updatedAtByKey[KEY_BLOCKED_PHONES] != null

      const systemPromptRaw = asString(system.content, '')

      const triggerKeywordsFromDb: HaikuTriggerKeywords = {
        recommendation:
          'recommendation' in keywords
            ? asStringArray(keywords.recommendation)
            : [...DEFAULT_HAIKU_TRIGGER_KEYWORDS.recommendation],
        free_question:
          'free_question' in keywords
            ? asStringArray(keywords.free_question)
            : [...DEFAULT_HAIKU_TRIGGER_KEYWORDS.free_question],
        blocked:
          'blocked' in keywords
            ? asStringArray(keywords.blocked)
            : [...DEFAULT_HAIKU_TRIGGER_KEYWORDS.blocked],
      }

      const welcomeStored =
        'welcome_greeting_template' in settings ? asString(settings.welcome_greeting_template, '') : ''
      const welcomeGenStored =
        'welcome_generation_system' in settings ? asString(settings.welcome_generation_system, '') : ''

      const settingsRaw: HaikuSettings = {
        max_tokens: asNumber(settings.max_tokens, DEFAULT_HAIKU_SETTINGS.max_tokens),
        timeout_ms: asNumber(settings.timeout_ms, DEFAULT_HAIKU_SETTINGS.timeout_ms),
        rate_limit_per_hour: asNumber(
          settings.rate_limit_per_hour,
          DEFAULT_HAIKU_SETTINGS.rate_limit_per_hour
        ),
        welcome_greeting_template:
          welcomeStored.trim() !== '' ? welcomeStored : DEFAULT_WELCOME_GREETING_TEMPLATE,
        welcome_generation_system:
          welcomeGenStored.trim() !== '' ? welcomeGenStored : DEFAULT_WELCOME_GENERATION_SYSTEM,
        welcome_max_tokens: asNumber(settings.welcome_max_tokens, DEFAULT_HAIKU_SETTINGS.welcome_max_tokens),
        welcome_timeout_ms: asNumber(settings.welcome_timeout_ms, DEFAULT_HAIKU_SETTINGS.welcome_timeout_ms),
        welcome_slot_context: mergeStrRecord(settings.welcome_slot_context, DEFAULT_WELCOME_SLOT_CONTEXT),
        welcome_fallback_ad: mergeStrRecord(settings.welcome_fallback_ad, DEFAULT_WELCOME_FALLBACK_AD),
        welcome_fallback_organic: mergeStrRecord(
          settings.welcome_fallback_organic,
          DEFAULT_WELCOME_FALLBACK_ORGANIC
        ),
      }

      const blockedPhonesRaw = asStringArray((blockedPhones as Record<string, unknown>).phones)

      return {
        systemPrompt: hasSystemRow ? systemPromptRaw : DEFAULT_HAIKU_SYSTEM_PROMPT_GUIDE,
        triggerKeywords: hasKeywordsRow
          ? triggerKeywordsFromDb
          : {
              recommendation: [...DEFAULT_HAIKU_TRIGGER_KEYWORDS.recommendation],
              free_question: [...DEFAULT_HAIKU_TRIGGER_KEYWORDS.free_question],
              blocked: [...DEFAULT_HAIKU_TRIGGER_KEYWORDS.blocked],
            },
        settings: hasSettingsRow ? settingsRaw : freshDefaultSettings(),
        blockedPhones: hasBlockedPhonesRow ? blockedPhonesRaw : [...DEFAULT_BLOCKED_PHONE_NUMBERS],
        updatedAtByKey,
      }
    },
  })

  const upsertMutation = useMutation({
    mutationFn: async ({
      config_key,
      config_value,
      label,
      sort_order,
    }: {
      config_key: string
      config_value: Record<string, unknown>
      label: string
      sort_order: number
    }) => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const tenant_id = await resolveTenantSlugForWrites()

      const { error } = await supabase.from('waba_config').upsert(
        {
          tenant_id,
          config_key,
          label,
          category: 'haiku',
          config_value,
          sort_order,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'tenant_id,config_key' }
      )
      if (error) throw new Error(error.message)
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['web_waba_haiku_config'] })
      void qc.invalidateQueries({ queryKey: ['web_waba_blocked'] })
    },
  })

  return {
    query,
    saveSystemPrompt: (content: string) =>
      upsertMutation.mutateAsync({
        config_key: KEY_SYSTEM,
        label: 'System Prompt Haiku',
        sort_order: 1,
        config_value: { content },
      }),
    saveTriggerKeywords: (value: HaikuTriggerKeywords) =>
      upsertMutation.mutateAsync({
        config_key: KEY_KEYWORDS,
        label: 'Keywords trigger Haiku',
        sort_order: 2,
        config_value: value,
      }),
    saveSettings: (value: HaikuSettings) =>
      upsertMutation.mutateAsync({
        config_key: KEY_SETTINGS,
        label: 'Settings Haiku',
        sort_order: 3,
        config_value: value as Record<string, unknown>,
      }),
    saveBlockedPhones: (phones: string[]) =>
      upsertMutation.mutateAsync({
        config_key: KEY_BLOCKED_PHONES,
        label: 'Números bloqueados',
        sort_order: 4,
        config_value: { phones },
      }),
    upsertMutation,
  }
}
