'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, X } from 'lucide-react'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D+/g, '')
}

export function BlockedNumbersEditor({
  value,
  onSave,
}: {
  value: string[]
  onSave: (phones: string[]) => Promise<void>
}) {
  const [draft, setDraft] = useState(value)
  const [dirty, setDirty] = useState(false)
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [inputError, setInputError] = useState<string | null>(null)

  useEffect(() => {
    if (dirty) return
    setDraft(value)
  }, [value, dirty])

  const add = () => {
    const digits = normalizePhoneDigits(input)
    if (digits.length < 8) {
      setInputError('Mínimo 8 dígitos')
      return
    }
    setInputError(null)
    if (!new Set(draft).has(digits)) {
      setDraft([...draft, digits])
      setDirty(true)
    }
    setInput('')
  }

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

  return (
    <section className="overflow-hidden rounded-2xl border border-fg/[0.08] bg-fg/[0.03]">
      <div className="border-b border-fg/[0.08] p-5">
        <h2 className="text-base font-bold text-fg">Números bloqueados</h2>
        <p className="mt-1 text-sm text-fg-muted">
          El bot ignora mensajes de estos números (spam, competencia, pruebas). Se sincroniza con el
          bloqueo rápido desde Mensajes.
        </p>
      </div>

      <div className="space-y-3 p-5">
        <div className="flex flex-wrap gap-1.5">
          {draft.length === 0 && <p className="text-xs text-fg-subtle">Sin números bloqueados.</p>}
          {draft.map((phone) => (
            <span
              key={phone}
              className="inline-flex items-center gap-1 rounded-full border border-fg/[0.08] bg-fg/[0.04] px-2.5 py-1 text-xs text-fg-soft"
            >
              {phone}
              <button
                type="button"
                onClick={() => {
                  setDraft(draft.filter((p) => p !== phone))
                  setDirty(true)
                }}
                className="text-fg-subtle hover:text-fg-soft"
                aria-label={`Desbloquear ${phone}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value)
              setInputError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                add()
              }
            }}
            placeholder="Ej. 51987654321"
            className="focus:border-[var(--tenant-primary)]/40 flex-1 rounded-lg border border-fg/[0.08] bg-app px-2.5 py-1.5 text-base text-fg outline-none placeholder:text-fg-subtle md:text-sm"
          />
          <button
            type="button"
            onClick={add}
            className="min-h-[44px] md:min-h-0 inline-flex items-center gap-1 rounded-lg border border-fg/[0.08] bg-fg/[0.04] px-3 py-1.5 text-xs text-fg-soft hover:bg-fg/[0.06]"
          >
            <Plus className="h-3.5 w-3.5" />
            Bloquear
          </button>
        </div>
        {inputError && <p className="text-xs text-red-700 dark:text-red-300">{inputError}</p>}

        <div className="flex justify-end">
          <button
            type="button"
            disabled={state === 'saving' || !dirty}
            onClick={() => void handleSave()}
            className="border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/15 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold text-tenant-text disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {state === 'saving'
              ? 'Guardando…'
              : state === 'saved' && !dirty
                ? 'Guardado'
                : 'Guardar'}
          </button>
        </div>

        {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}
      </div>
    </section>
  )
}
