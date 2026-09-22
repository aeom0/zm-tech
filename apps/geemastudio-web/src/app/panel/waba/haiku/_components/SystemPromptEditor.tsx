'use client'

import { useEffect, useState } from 'react'
import { Save, Sparkles } from 'lucide-react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export function SystemPromptEditor({
  value,
  defaultValue,
  onSave,
}: {
  value: string
  defaultValue: string
  onSave: (content: string) => Promise<void>
}) {
  const [draft, setDraft] = useState(value)
  const [dirty, setDirty] = useState(false)
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (dirty) return
    setDraft(value)
  }, [value, dirty])

  const handleSave = async () => {
    setError(null)
    setState('saving')
    try {
      await onSave(draft)
      setDirty(false)
      setState('saved')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar')
      setState('error')
    }
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        if (dirty) void handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, dirty])

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white">Personalidad del bot</h2>
            <span className="rounded-full border border-[var(--tenant-primary)]/20 bg-[var(--tenant-primary)]/10 px-2 py-0.5 text-[11px] text-[var(--tenant-primary)]">
              Haiku
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-400">
            Definí tono, límites y cómo debe guiar a agendar. No hardcodees datos de un solo salón
            si el tenant es multi-marca.
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--tenant-primary)]/25 bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-3 p-5">
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setDirty(true)
          }}
          rows={18}
          className="min-h-[400px] w-full resize-y rounded-xl border border-white/[0.08] bg-[#0F0F0F] px-3 py-2.5 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[var(--tenant-primary)]/40"
          placeholder="Cómo debe hablar el bot…"
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-zinc-500">{draft.length.toLocaleString('es-VE')} caracteres</div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(defaultValue)
                setDirty(true)
              }}
              className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.06]"
            >
              Restaurar default
            </button>
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
        </div>

        {error && <p className="text-sm text-red-300">{error}</p>}
      </div>
    </section>
  )
}
