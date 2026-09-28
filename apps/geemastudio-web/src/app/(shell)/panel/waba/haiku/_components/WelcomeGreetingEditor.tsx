'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronRight, Save } from 'lucide-react'

import type { HaikuSettings } from '@/hooks/waba/useHaikuConfig'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function tryParseRecord(raw: string): Record<string, string> | null {
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    for (const v of Object.values(parsed as Record<string, unknown>)) {
      if (typeof v !== 'string') return null
    }
    return parsed as Record<string, string>
  } catch {
    return null
  }
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-zinc-500">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-white/[0.08] bg-[#0F0F0F] px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-[var(--tenant-primary)]/40"
      />
    </label>
  )
}

export function WelcomeGreetingEditor({
  value,
  onSave,
}: {
  value: HaikuSettings
  onSave: (next: HaikuSettings) => Promise<void>
}) {
  const [draft, setDraft] = useState(value)
  const [dirty, setDirty] = useState(false)
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [advancedOpen, setAdvancedOpen] = useState(false)

  const [slotContextDraft, setSlotContextDraft] = useState(
    JSON.stringify(value.welcome_slot_context ?? {}, null, 2)
  )
  const [fallbackAdDraft, setFallbackAdDraft] = useState(
    JSON.stringify(value.welcome_fallback_ad ?? {}, null, 2)
  )
  const [fallbackOrganicDraft, setFallbackOrganicDraft] = useState(
    JSON.stringify(value.welcome_fallback_organic ?? {}, null, 2)
  )
  const [jsonErrors, setJsonErrors] = useState<{
    slot?: string
    ad?: string
    organic?: string
  }>({})

  useEffect(() => {
    if (dirty) return
    setDraft(value)
    if (!advancedOpen) {
      setSlotContextDraft(JSON.stringify(value.welcome_slot_context ?? {}, null, 2))
      setFallbackAdDraft(JSON.stringify(value.welcome_fallback_ad ?? {}, null, 2))
      setFallbackOrganicDraft(JSON.stringify(value.welcome_fallback_organic ?? {}, null, 2))
    }
  }, [value, dirty, advancedOpen])

  const buildPayloadWithJson = (): HaikuSettings | null => {
    const slot = tryParseRecord(slotContextDraft)
    const ad = tryParseRecord(fallbackAdDraft)
    const organic = tryParseRecord(fallbackOrganicDraft)

    const errors: typeof jsonErrors = {}
    if (!slot) errors.slot = 'JSON inválido: debe ser un objeto de strings'
    if (!ad) errors.ad = 'JSON inválido: debe ser un objeto de strings'
    if (!organic) errors.organic = 'JSON inválido: debe ser un objeto de strings'
    setJsonErrors(errors)
    if (!slot || !ad || !organic) return null

    return {
      ...draft,
      welcome_slot_context: slot,
      welcome_fallback_ad: ad,
      welcome_fallback_organic: organic,
    }
  }

  const handleSave = async () => {
    setError(null)
    const next = buildPayloadWithJson()
    if (!next) return
    setState('saving')
    try {
      await onSave(next)
      setDirty(false)
      setState('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
      setState('error')
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      <div className="border-b border-white/[0.08] p-5">
        <h2 className="text-base font-bold text-white">Saludo de bienvenida</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Plantilla y ajustes numéricos para el primer contacto (clienta nueva). El bloque
          avanzado controla tono por franja horaria y textos de respaldo si la IA falla.
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <NumberField
            label="max_tokens (chat)"
            value={draft.max_tokens}
            onChange={(n) => {
              setDraft({ ...draft, max_tokens: n })
              setDirty(true)
            }}
          />
          <NumberField
            label="timeout_ms (chat)"
            value={draft.timeout_ms}
            onChange={(n) => {
              setDraft({ ...draft, timeout_ms: n })
              setDirty(true)
            }}
          />
          <NumberField
            label="rate_limit_per_hour"
            value={draft.rate_limit_per_hour}
            onChange={(n) => {
              setDraft({ ...draft, rate_limit_per_hour: n })
              setDirty(true)
            }}
          />
          <NumberField
            label="welcome_max_tokens"
            value={draft.welcome_max_tokens ?? 0}
            onChange={(n) => {
              setDraft({ ...draft, welcome_max_tokens: n })
              setDirty(true)
            }}
          />
          <NumberField
            label="welcome_timeout_ms"
            value={draft.welcome_timeout_ms ?? 0}
            onChange={(n) => {
              setDraft({ ...draft, welcome_timeout_ms: n })
              setDirty(true)
            }}
          />
        </div>

        <label className="block">
          <span className="mb-1 block text-xs text-zinc-500">Plantilla de referencia</span>
          <textarea
            value={draft.welcome_greeting_template ?? ''}
            onChange={(e) => {
              setDraft({ ...draft, welcome_greeting_template: e.target.value })
              setDirty(true)
            }}
            rows={4}
            className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#0F0F0F] px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-[var(--tenant-primary)]/40"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-zinc-500">System prompt — solo saludo</span>
          <textarea
            value={draft.welcome_generation_system ?? ''}
            onChange={(e) => {
              setDraft({ ...draft, welcome_generation_system: e.target.value })
              setDirty(true)
            }}
            rows={8}
            className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#0F0F0F] px-3 py-2.5 font-mono text-sm text-zinc-100 outline-none focus:border-[var(--tenant-primary)]/40"
          />
        </label>

        <div className="rounded-xl border border-white/[0.08]">
          <button
            type="button"
            onClick={() => setAdvancedOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-zinc-300"
          >
            {advancedOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Avanzado — tono por franja y respaldos (JSON)
          </button>

          {advancedOpen && (
            <div className="space-y-3 border-t border-white/[0.08] p-4">
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-500">welcome_slot_context</span>
                <textarea
                  value={slotContextDraft}
                  onChange={(e) => setSlotContextDraft(e.target.value)}
                  onBlur={() => setDirty(true)}
                  rows={6}
                  className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#0F0F0F] px-3 py-2.5 font-mono text-xs text-zinc-100 outline-none focus:border-[var(--tenant-primary)]/40"
                />
                {jsonErrors.slot && <p className="mt-1 text-xs text-red-300">{jsonErrors.slot}</p>}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-500">welcome_fallback_ad</span>
                <textarea
                  value={fallbackAdDraft}
                  onChange={(e) => setFallbackAdDraft(e.target.value)}
                  onBlur={() => setDirty(true)}
                  rows={6}
                  className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#0F0F0F] px-3 py-2.5 font-mono text-xs text-zinc-100 outline-none focus:border-[var(--tenant-primary)]/40"
                />
                {jsonErrors.ad && <p className="mt-1 text-xs text-red-300">{jsonErrors.ad}</p>}
              </label>
              <label className="block">
                <span className="mb-1 block text-xs text-zinc-500">welcome_fallback_organic</span>
                <textarea
                  value={fallbackOrganicDraft}
                  onChange={(e) => setFallbackOrganicDraft(e.target.value)}
                  onBlur={() => setDirty(true)}
                  rows={6}
                  className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#0F0F0F] px-3 py-2.5 font-mono text-xs text-zinc-100 outline-none focus:border-[var(--tenant-primary)]/40"
                />
                {jsonErrors.organic && <p className="mt-1 text-xs text-red-300">{jsonErrors.organic}</p>}
              </label>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            disabled={state === 'saving' || !dirty}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/15 px-3 py-2 text-sm font-semibold text-[var(--tenant-primary)] disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {state === 'saving' ? 'Guardando…' : state === 'saved' && !dirty ? 'Guardado' : 'Guardar'}
          </button>
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
    </section>
  )
}
