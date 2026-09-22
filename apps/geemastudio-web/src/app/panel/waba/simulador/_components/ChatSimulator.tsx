'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2, Megaphone, RotateCcw, Send } from 'lucide-react'
import { SimulatorBubbleView } from './SimulatorBubble'
import { SimulatorUserPicker } from './SimulatorUserPicker'
import {
  DEFAULT_CTWA_BOILERPLATE_TEXT,
  useSimulatorChat,
} from '../_hooks/useSimulatorChat'

export function ChatSimulator() {
  const {
    user,
    phone,
    messages,
    loading,
    starting,
    error,
    startSession,
    resetConversation,
    sendText,
    sendInteractive,
  } = useSimulatorChat()

  const [draft, setDraft] = useState('')
  const [tapId, setTapId] = useState('')
  const [showTapField, setShowTapField] = useState(false)
  const [fromAdMode, setFromAdMode] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const busy = loading || starting

  const enableFromAdMode = () => {
    setFromAdMode(true)
    if (messages.length === 0 && !draft.trim()) {
      setDraft(DEFAULT_CTWA_BOILERPLATE_TEXT)
      queueMicrotask(() => inputRef.current?.focus())
    }
  }

  const disableFromAdMode = () => {
    setFromAdMode(false)
    if (draft === DEFAULT_CTWA_BOILERPLATE_TEXT) {
      setDraft('')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    const text = draft.trim()
    if (!text && !fromAdMode) return
    const sendAsAd = fromAdMode
    setDraft('')
    if (sendAsAd) setFromAdMode(false)
    void sendText(text, {
      fromAdSimulated: sendAsAd,
      referralHeadline: sendAsAd ? 'Mirada Espectacular' : null,
    }).then(() => inputRef.current?.focus())
  }

  const handleTapSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tapId.trim() || busy) return
    const id = tapId.trim()
    setTapId('')
    void sendInteractive(id)
  }

  const handleReset = async () => {
    setFromAdMode(false)
    setDraft('')
    await resetConversation()
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] min-h-[28rem] max-w-2xl flex-col">
      <header className="shrink-0 space-y-3 border-b border-white/[0.08] px-1 pb-3 pt-1 sm:px-0">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-xs text-zinc-500">WhatsApp</div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">Simulador de chat</h1>
            <p className="mt-0.5 text-sm text-zinc-400">
              Prueba cómo responde el bot sin usar WhatsApp real (teléfonos QA).
            </p>
          </div>
          <button
            type="button"
            disabled={busy || !phone}
            onClick={() => void handleReset()}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 text-sm font-semibold text-zinc-200 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reiniciar conversación
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <SimulatorUserPicker
            user={user}
            disabled={busy}
            onSelect={(u) => {
              setFromAdMode(false)
              setDraft('')
              void startSession(u)
            }}
          />
          {user && (
            <p className="text-xs text-zinc-500">
              Sesión de prueba · {user === 'vanessa' ? 'Vanessa' : 'Alberto'}
              {phone ? ` · ${phone}` : ''}
            </p>
          )}
        </div>
      </header>

      <div
        className="min-h-0 flex-1 space-y-2.5 overflow-y-auto bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.04),_transparent_60%)] px-1 py-4 sm:px-0"
        aria-live="polite"
      >
        {starting && messages.length === 0 && (
          <div className="flex justify-center py-12 text-sm text-zinc-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Preparando sesión…
          </div>
        )}

        {!starting && messages.length === 0 && (
          <div className="flex justify-center py-12">
            <p className="max-w-xs text-center text-sm text-zinc-400">
              Escribe como lo haría un cliente, o activa &quot;Simular desde anuncio&quot; para
              entrar como desde una publicidad.
            </p>
          </div>
        )}

        {messages.map((m) => (
          <SimulatorBubbleView
            key={m.id}
            message={m}
            onTapInteractive={(id, title) => void sendInteractive(id, title)}
          />
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/[0.08] bg-white/[0.06] px-3 py-2 text-xs text-zinc-400">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              El bot está respondiendo…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {error && (
        <div
          role="alert"
          className="mx-1 mb-2 shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 sm:mx-0"
        >
          {error}
        </div>
      )}

      <div className="shrink-0 space-y-2 border-t border-white/[0.08] bg-zinc-950/80 px-1 py-3 sm:px-0">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || !phone}
            aria-pressed={fromAdMode}
            onClick={() => (fromAdMode ? disableFromAdMode() : enableFromAdMode())}
            className={[
              'inline-flex min-h-9 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold transition-colors disabled:opacity-50',
              fromAdMode
                ? 'border-violet-500/40 bg-violet-500/15 text-violet-300'
                : 'border-white/[0.08] text-zinc-300 hover:bg-white/[0.06]',
            ].join(' ')}
          >
            <Megaphone className="h-3.5 w-3.5" />
            Simular desde anuncio
          </button>
          {fromAdMode && (
            <span className="text-[11px] text-violet-400">
              El próximo mensaje entra como desde un anuncio (solo una vez)
            </span>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={
              fromAdMode ? 'Mensaje de anuncio (puedes editarlo)…' : 'Escribe un mensaje…'
            }
            disabled={busy || !phone}
            className={[
              'min-h-11 flex-1 rounded-xl border bg-white/[0.03] px-3 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/40 disabled:opacity-60',
              fromAdMode ? 'border-violet-500/40' : 'border-white/[0.08]',
            ].join(' ')}
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={busy || !phone || (!draft.trim() && !fromAdMode)}
            aria-label="Enviar"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl bg-[var(--tenant-primary)] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            className="text-xs font-medium text-zinc-500 transition-colors hover:text-[var(--tenant-primary)]"
            onClick={() => setShowTapField((v) => !v)}
          >
            {showTapField ? 'Ocultar opción de menú' : 'Elegir opción de menú (avanzado)'}
          </button>
        </div>

        {showTapField && (
          <form onSubmit={handleTapSubmit} className="flex items-center gap-2">
            <input
              value={tapId}
              onChange={(e) => setTapId(e.target.value)}
              placeholder="Código de opción (ej. Extensiones del anuncio)"
              disabled={busy || !phone}
              className="min-h-10 flex-1 rounded-xl border border-dashed border-white/[0.12] bg-transparent px-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/40 disabled:opacity-60"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={busy || !phone || !tapId.trim()}
              className="min-h-10 rounded-xl border border-white/[0.08] px-3 text-xs font-semibold text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"
            >
              Enviar opción
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
