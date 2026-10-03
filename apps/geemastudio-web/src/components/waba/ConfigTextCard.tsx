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
    <section className="overflow-hidden rounded-2xl border border-fg/[0.08] bg-fg/[0.03]">
      <div className="flex items-start justify-between gap-4 border-b border-fg/[0.08] p-5">
        <div>
          <h2 className="text-base font-bold text-fg">{title}</h2>
          {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
        </div>
        <div className="border-[var(--tenant-primary)]/25 bg-[var(--tenant-primary)]/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border text-tenant-text">
          <FileText className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-fg-soft">Texto</label>
            <span className="text-xs text-fg-subtle">{charCount} caracteres</span>
          </div>
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={12}
            className="focus:border-[var(--tenant-primary)]/40 w-full resize-y whitespace-pre-wrap rounded-xl border border-fg/[0.08] bg-app px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
          {note && <p className="mt-2 text-xs text-fg-subtle">{note}</p>}
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200"
          >
            {error}
          </div>
        )}

        {state === 'saved' && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200"
          >
            Texto guardado en el servidor.
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={!canSave}
            onClick={() => void handleSave()}
            className="border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/15 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-tenant-text transition-opacity disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {state === 'saving' ? 'Guardando…' : state === 'saved' ? 'Guardado' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </section>
  )
}
