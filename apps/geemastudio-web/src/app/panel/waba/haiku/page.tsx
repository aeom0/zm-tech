'use client'

import { useEffect, useState } from 'react'
import { Save, Sparkles } from 'lucide-react'

import {
  DEFAULT_HAIKU_SYSTEM_PROMPT,
  useHaikuSystemPrompt,
} from '@/hooks/waba/useHaikuConfig'

export default function PanelWabaHaikuPage() {
  const { query, save } = useHaikuSystemPrompt()
  const [draft, setDraft] = useState('')
  const [dirty, setDirty] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    if (!query.data || dirty) return
    setDraft(query.data.content)
  }, [query.data, dirty])

  const handleSave = async () => {
    setLocalError(null)
    try {
      await save.mutateAsync(draft)
      setDirty(false)
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  const handleResetDefault = () => {
    setDraft(DEFAULT_HAIKU_SYSTEM_PROMPT)
    setDirty(true)
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-zinc-500">WhatsApp</div>
        <h1 className="text-2xl font-bold text-white">Asistente IA</h1>
        <p className="mt-1 text-sm text-zinc-400">
          System prompt Haiku (`haiku_system_prompt` en waba_config). Se aplica cuando el Edge bot
          lo lea.
        </p>
      </div>

      {query.isError && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {query.error instanceof Error ? query.error.message : 'Error al cargar el prompt'}
        </div>
      )}

      {query.isLoading && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
          Cargando prompt…
        </div>
      )}

      {!query.isLoading && !query.isError && (
        <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.08] p-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">Personalidad del bot</h2>
                <span className="rounded-full border border-[#40E0D0]/20 bg-[#40E0D0]/10 px-2 py-0.5 text-[11px] text-[#40E0D0]">
                  Haiku
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-400">
                Definí tono, límites y cómo debe guiar a agendar. No hardcodees datos de un solo
                salón si el tenant es multi-marca.
              </p>
              {query.data?.updatedAt && (
                <p className="mt-2 text-[11px] text-zinc-500">
                  Última guardada:{' '}
                  {new Date(query.data.updatedAt).toLocaleString('es-VE')}
                  {!query.data.fromDb ? ' · (default local, aún no en BD)' : ''}
                </p>
              )}
              {!query.data?.fromDb && (
                <p className="mt-2 text-[11px] text-amber-200/90">
                  Todavía no hay fila en BD; se muestra el default genérico.
                </p>
              )}
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#40E0D0]/25 bg-[#40E0D0]/10 text-[#40E0D0]">
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
              rows={16}
              className="w-full resize-y rounded-xl border border-white/[0.08] bg-[#0F0F0F] px-3 py-2.5 font-mono text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[#40E0D0]/40"
              placeholder="Cómo debe hablar el bot…"
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-zinc-500">{draft.length} caracteres</div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleResetDefault}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-zinc-300 hover:bg-white/[0.06]"
                >
                  Restaurar default
                </button>
                <button
                  type="button"
                  disabled={save.isPending || !dirty}
                  onClick={() => void handleSave()}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#40E0D0]/30 bg-[#40E0D0]/15 px-3 py-2 text-sm font-semibold text-[#40E0D0] disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {save.isPending ? 'Guardando…' : save.isSuccess && !dirty ? 'Guardado' : 'Guardar'}
                </button>
              </div>
            </div>

            {(localError || save.isError) && (
              <p className="text-sm text-red-300">
                {localError ??
                  (save.error instanceof Error ? save.error.message : 'Error al guardar')}
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
