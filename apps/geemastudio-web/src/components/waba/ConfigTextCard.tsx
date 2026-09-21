'use client'

import { useMemo, useState } from 'react'
import { FileText, Save } from 'lucide-react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function mensajeDeError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e !== null && 'message' in e) {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m) return m
  }
  return 'No se pudo guardar'
}

export function ConfigTextCard({
  title,
  description,
  value,
  onChange,
  onSave,
  note,
}: {
  title: string
  description?: string
  value: string
  onChange: (v: string) => void
  onSave: () => Promise<void>
  note?: string
}) {
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  const charCount = value.length
  const canSave = useMemo(() => state !== 'saving', [state])

  const handleSave = async () => {
    setError(null)
    setState('saving')
    try {
      await onSave()
      setState('saved')
      setTimeout(() => setState('idle'), 2800)
    } catch (e) {
      setState('error')
      setError(mensajeDeError(e))
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-5">
        <div>
          <h2 className="text-base font-bold text-white">{title}</h2>
          {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
        </div>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--tenant-primary)]/25 bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]">
          <FileText className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-zinc-300">Texto</label>
            <span className="text-xs text-zinc-500">{charCount} caracteres</span>
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={12}
            className="w-full resize-y whitespace-pre-wrap rounded-xl border border-white/[0.08] bg-[#0F0F0F] px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[var(--tenant-primary)]/40"
          />
          {note && <p className="mt-2 text-xs text-zinc-500">{note}</p>}
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {error}
          </div>
        )}

        {state === 'saved' && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
          >
            Texto guardado en el servidor.
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void handleSave()}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/15 px-4 py-2.5 text-sm font-semibold text-[var(--tenant-primary)] transition-opacity disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {state === 'saving' ? 'Guardando…' : state === 'saved' ? 'Guardado' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </section>
  )
}
