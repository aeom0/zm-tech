'use client'

import { useEffect, useState } from 'react'
import { Plus, Save, X } from 'lucide-react'

import type { HaikuTriggerKeywords } from '@/hooks/waba/useHaikuConfig'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-xs text-zinc-200">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="text-zinc-500 hover:text-zinc-200"
        aria-label={`Quitar "${label}"`}
      >
        <X className="h-3 w-3" />
      </button>
    </span>
  )
}

function KeywordsSection({
  title,
  description,
  color,
  values,
  onChange,
}: {
  title: string
  description: string
  color: 'blue' | 'green' | 'red'
  values: string[]
  onChange: (next: string[]) => void
}) {
  const [input, setInput] = useState('')

  const dot = { blue: 'bg-sky-400', green: 'bg-emerald-400', red: 'bg-red-400' }[color]

  const add = () => {
    const v = input.trim().toLowerCase()
    if (!v || values.includes(v)) {
      setInput('')
      return
    }
    onChange([...values, v])
    setInput('')
  }

  return (
    <div className="space-y-2 rounded-xl border border-white/[0.08] bg-black/20 p-4">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
        <span className="text-xs text-zinc-500">({values.length})</span>
      </div>
      <p className="text-xs text-zinc-500">{description}</p>

      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <Chip key={v} label={v} onRemove={() => onChange(values.filter((x) => x !== v))} />
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Agregar keyword…"
          className="flex-1 rounded-lg border border-white/[0.08] bg-[#0F0F0F] px-2.5 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[var(--tenant-primary)]/40"
        />
        <button
          type="button"
          onClick={add}
          className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.06]"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar
        </button>
      </div>
    </div>
  )
}

export function TriggerKeywordsEditor({
  value,
  onSave,
}: {
  value: HaikuTriggerKeywords
  onSave: (next: HaikuTriggerKeywords) => Promise<void>
}) {
  const [draft, setDraft] = useState(value)
  const [dirty, setDirty] = useState(false)
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (dirty) return
    setDraft(value)
  }, [value, dirty])

  const total = draft.recommendation.length + draft.free_question.length + draft.blocked.length

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
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      <div className="border-b border-white/[0.08] p-5">
        <h2 className="text-base font-bold text-white">Keywords de activación</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Frases que cambian el comportamiento del bot: piden recomendación, hacen preguntas
          libres o solicitan hablar con una persona. Sin fila guardada en BD se usa el default de
          fábrica.
        </p>
        <p className="mt-1 text-xs text-zinc-500">{total} keywords en total</p>
      </div>

      <div className="space-y-3 p-5">
        <KeywordsSection
          title="Pide recomendación"
          description="Activa el flujo de sugerencia guiada de servicios/packs."
          color="blue"
          values={draft.recommendation}
          onChange={(v) => {
            setDraft({ ...draft, recommendation: v })
            setDirty(true)
          }}
        />
        <KeywordsSection
          title="Pregunta libre"
          description="Dudas generales que el bot responde sin salir del guion."
          color="green"
          values={draft.free_question}
          onChange={(v) => {
            setDraft({ ...draft, free_question: v })
            setDirty(true)
          }}
        />
        <KeywordsSection
          title="Pide humano"
          description="Corta el bot y marca la conversación para atención manual."
          color="red"
          values={draft.blocked}
          onChange={(v) => {
            setDraft({ ...draft, blocked: v })
            setDirty(true)
          }}
        />

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
