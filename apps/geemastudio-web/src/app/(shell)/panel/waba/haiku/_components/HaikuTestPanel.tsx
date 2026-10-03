'use client'

import { useState } from 'react'
import { Loader2, Send, TestTube2 } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import type { HaikuSettings } from '@/hooks/waba/useHaikuConfig'

type TestResult = {
  text: string
  inputTokens: number
  outputTokens: number
  latencyMs: number
}

/**
 * Invoca la Edge Function `test-haiku-preview` ya desplegada por ZM en el mismo
 * proyecto Supabase (udelxwwnyivknslueerr, compartido con Geema). No se crea una
 * función nueva: el `ai_usage_log` de estas pruebas queda atribuido a "zm-lash-nails"
 * (limitación conocida del AsyncLocalStorage de esa función, no bloqueante).
 */
export function HaikuTestPanel({
  systemPrompt,
  settings,
}: {
  systemPrompt: string
  settings: HaikuSettings
}) {
  const [userMessage, setUserMessage] = useState('¿Qué me recomiendan para mi primera cita?')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runTest = async () => {
    if (!supabase) {
      setError('Supabase no está configurado')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<
        TestResult | { error: string }
      >('test-haiku-preview', {
        body: {
          systemPrompt,
          userMessage,
          maxTokens: settings.max_tokens,
          timeoutMs: Math.min(8000, Math.max(1000, settings.timeout_ms)),
        },
      })

      if (invokeError) {
        let message = invokeError.message
        const context = (invokeError as { context?: { body?: unknown } }).context
        if (context?.body) {
          try {
            const parsed =
              typeof context.body === 'string'
                ? (JSON.parse(context.body) as { error?: string })
                : (context.body as { error?: string })
            if (parsed?.error) message = parsed.error
          } catch {
            // el body no es JSON, se mantiene el mensaje original
          }
        }
        throw new Error(message)
      }

      if (data && 'error' in data) throw new Error(data.error)
      setResult(data as TestResult)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo probar el bot')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-fg/[0.08] bg-fg/[0.03]">
      <div className="flex items-start gap-3 border-b border-fg/[0.08] p-5">
        <div className="border-[var(--tenant-primary)]/25 bg-[var(--tenant-primary)]/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-tenant-text">
          <TestTube2 className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-base font-bold text-fg">Test de personalidad</h2>
          <p className="mt-1 text-sm text-fg-muted">
            Prueba el system prompt en edición (sin guardar) contra un mensaje de ejemplo.
          </p>
        </div>
      </div>

      <div className="space-y-3 p-5">
        <label className="block">
          <span className="mb-1 block text-xs text-fg-subtle">Mensaje de la clienta</span>
          <textarea
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            rows={3}
            className="focus:border-[var(--tenant-primary)]/40 w-full resize-y rounded-xl border border-fg/[0.08] bg-app px-3 py-2.5 text-sm text-fg outline-none placeholder:text-fg-subtle"
          />
        </label>

        <button
          type="button"
          disabled={loading || !systemPrompt.trim()}
          onClick={() => void runTest()}
          className="border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/15 inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold text-tenant-text disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {loading ? 'Probando…' : 'Probar'}
        </button>

        {error && <p className="text-sm text-red-700 dark:text-red-300">{error}</p>}

        {result && (
          <div className="space-y-2 rounded-xl border border-fg/[0.08] bg-scrim/20 p-4">
            <p className="whitespace-pre-wrap text-sm text-fg">{result.text}</p>
            <p className="text-[11px] text-fg-subtle">
              {result.latencyMs} ms · {result.inputTokens} in / {result.outputTokens} out tokens
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
