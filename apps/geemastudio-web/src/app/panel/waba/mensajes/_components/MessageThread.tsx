'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Ban,
  Check,
  Copy,
  FileText,
  History,
  Image as ImageIcon,
  Loader2,
  Mic,
  Pause,
  Play,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'

import {
  useWabaThread,
  WABA_THREAD_PAGE_SIZE,
  type WabaConversation,
} from '@/hooks/waba/useWabaMessages'
import { useSendWabaMessage, useWabaStaffSession } from '@/hooks/waba/useWabaSend'
import { useDeleteWabaThread, useToggleWabaBlock, useWabaBlockedStatus } from '@/hooks/waba/useWabaModeration'
import { useImageUpload } from '@/hooks/waba/useImageUpload'
import { MessageBubble } from './MessageBubble'

const TEXTAREA_LINE_HEIGHT_PX = 22
const TEXTAREA_MAX_LINES = 4
const WINDOW_MS = 24 * 60 * 60 * 1000

function digitsOnly(v: string): string {
  return v.replace(/\D+/g, '')
}

function attachmentPath(phone: string, file: File): string {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_').slice(-80)
  return `staff/${digitsOnly(phone) || 'na'}/${Date.now()}-${safeName}`
}

export function MessageThread({
  conversation,
  onBack,
}: {
  conversation: WabaConversation
  onBack: () => void
}) {
  const phone = conversation.phone
  const [limit, setLimit] = useState(WABA_THREAD_PAGE_SIZE)
  const threadQuery = useWabaThread(phone, limit)
  const sendMutation = useSendWabaMessage(phone)
  const staffSessionMutation = useWabaStaffSession(phone)
  const { uploadImage, uploadState, uploadError, resetUpload } = useImageUpload()
  const blockedQuery = useWabaBlockedStatus(phone)
  const toggleBlockMutation = useToggleWabaBlock(phone)
  const deleteThreadMutation = useDeleteWabaThread()

  const [text, setText] = useState('')
  const [attachError, setAttachError] = useState<string | null>(null)
  const [moderationError, setModerationError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  const messages = useMemo(() => threadQuery.data ?? [], [threadQuery.data])

  // Hay más mensajes anteriores si la última página vino llena.
  const hasOlder = messages.length >= limit
  // Al cargar anteriores no saltamos al fondo: se conserva la posición de lectura.
  const prependRef = useRef<{ prevHeight: number; prevTop: number } | null>(null)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const prepend = prependRef.current
    if (prepend) {
      el.scrollTop = el.scrollHeight - prepend.prevHeight + prepend.prevTop
      prependRef.current = null
      return
    }
    el.scrollTop = el.scrollHeight
  }, [messages.length, phone])

  useEffect(() => {
    setLimit(WABA_THREAD_PAGE_SIZE)
    prependRef.current = null
  }, [phone])

  const handleLoadOlder = () => {
    const el = scrollRef.current
    if (el) prependRef.current = { prevHeight: el.scrollHeight, prevTop: el.scrollTop }
    setLimit((l) => l + WABA_THREAD_PAGE_SIZE)
  }

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    const maxHeight = TEXTAREA_LINE_HEIGHT_PX * TEXTAREA_MAX_LINES
    ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`
  }, [text])

  const [withinWindow, setWithinWindow] = useState(true)

  useEffect(() => {
    let lastInboundAt: number | null = null
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].direction === 'in') {
        lastInboundAt = Date.parse(messages[i].createdAt)
        break
      }
    }
    setWithinWindow(lastInboundAt != null && Date.now() - lastInboundAt <= WINDOW_MS)
  }, [messages])

  const isBusy = sendMutation.isPending || uploadState === 'uploading'

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed || isBusy) return
    sendMutation.mutate(
      { phone, message: trimmed, pauseBot: true },
      {
        onSuccess: () => setText(''),
      }
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleAttach = async (file: File, kind: 'image' | 'audio' | 'document') => {
    setAttachError(null)
    resetUpload()
    try {
      const path = attachmentPath(phone, file)
      const bucket = kind === 'audio' ? 'waba-audio' : 'waba-images'
      const url = await uploadImage(file, bucket, path, kind)

      if (kind === 'image') {
        await sendMutation.mutateAsync({ phone, imageUrl: url, pauseBot: true })
      } else if (kind === 'audio') {
        await sendMutation.mutateAsync({ phone, audioUrl: url, pauseBot: true })
      } else {
        await sendMutation.mutateAsync({
          phone,
          documentUrl: url,
          documentName: file.name,
          pauseBot: true,
        })
      }
    } catch (err) {
      setAttachError(err instanceof Error ? err.message : 'Error al adjuntar el archivo')
    }
  }

  useEffect(() => {
    setConfirmDelete(false)
    setModerationError(null)
    setCopied(false)
  }, [phone])

  const copyParts = [
    conversation.displayName,
    conversation.displayPhone || (conversation.isBsuid ? null : phone),
    conversation.waUsername ? `@${conversation.waUsername}` : null,
  ].filter((part): part is string => !!part)
  const copyValue = copyParts.join(' ')

  const handleCopy = async () => {
    if (!copyValue) return
    try {
      await navigator.clipboard.writeText(copyValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setModerationError('No se pudo copiar el contacto')
    }
  }

  const handlePauseToggle = () => {
    staffSessionMutation.mutate({ phone, action: conversation.botPaused ? 'resume_bot' : 'pause_bot' })
  }

  const handleHaikuAgenda = () => {
    setModerationError(null)
    staffSessionMutation.mutate(
      { phone, action: 'haiku_finish_booking' },
      {
        onError: (err) =>
          setModerationError(err instanceof Error ? err.message : 'No se pudo ejecutar Haiku agenda'),
      }
    )
  }

  const handleToggleBlock = () => {
    setModerationError(null)
    toggleBlockMutation.mutate(undefined, {
      onError: (err) =>
        setModerationError(err instanceof Error ? err.message : 'No se pudo actualizar el bloqueo'),
    })
  }

  const handleDeleteThread = () => {
    setModerationError(null)
    deleteThreadMutation.mutate(phone, {
      onSuccess: () => {
        setConfirmDelete(false)
        onBack()
      },
      onError: (err) => {
        setModerationError(err instanceof Error ? err.message : 'No se pudo eliminar la conversación')
        setConfirmDelete(false)
      },
    })
  }

  return (
    <>
      <div className="border-b border-white/[0.08] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] md:hidden"
              onClick={onBack}
              aria-label="Volver a la lista"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-white">
                {conversation.displayName ||
                  (conversation.waUsername ? `@${conversation.waUsername}` : null) ||
                  (conversation.isBsuid ? 'Contacto de WhatsApp' : phone)}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {conversation.displayPhone || !conversation.isBsuid ? (
                  <span className="font-mono text-[11px] text-zinc-500">
                    {conversation.displayPhone || phone}
                  </span>
                ) : (
                  <span
                    className="inline-flex shrink-0 items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
                    title="Meta no compartió el número (username / BSUID)"
                  >
                    Sin teléfono
                  </span>
                )}
                <span
                  className={[
                    'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                    conversation.botPaused
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-300',
                  ].join(' ')}
                >
                  {conversation.botPaused ? 'Bot en pausa' : 'Bot activo'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!copyValue}
              title={copyValue ? 'Copiar nombre y contacto' : 'No hay datos de contacto para copiar'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-40 sm:w-auto sm:gap-1.5 sm:px-2.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={deleteThreadMutation.isPending}
              title="Eliminar conversación"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-300 hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handlePauseToggle}
            disabled={staffSessionMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"
          >
            {conversation.botPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {conversation.botPaused ? 'Reactivar bot' : 'Pausar bot'}
          </button>
          <button
            type="button"
            onClick={handleToggleBlock}
            disabled={toggleBlockMutation.isPending || blockedQuery.isLoading}
            title={
              blockedQuery.data
                ? 'Desbloquear: el bot volverá a responder a este número'
                : 'Bloquear: el bot dejará de responder a este número'
            }
            className={[
              'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50',
              blockedQuery.data
                ? 'border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20'
                : 'border-white/[0.08] bg-white/[0.03] text-zinc-200 hover:bg-white/[0.06]',
            ].join(' ')}
          >
            {toggleBlockMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : blockedQuery.data ? (
              <ShieldCheck className="h-3.5 w-3.5" />
            ) : (
              <Ban className="h-3.5 w-3.5" />
            )}
            {blockedQuery.data ? 'Desbloquear' : 'Bloquear'}
          </button>
        </div>
      </div>

      {confirmDelete && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-200">
          <span>¿Eliminar esta conversación? Se borran todos los mensajes y no se puede deshacer.</span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteThread}
              disabled={deleteThreadMutation.isPending}
              className="rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
            >
              {deleteThreadMutation.isPending ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteThreadMutation.isPending}
              className="rounded-lg px-2.5 py-1 text-zinc-300 hover:bg-white/[0.06]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {moderationError && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-300">
          {moderationError}
        </div>
      )}

      {conversation.botPaused && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          <p>El bot está en pausa para este número — solo el staff responde hasta reactivarlo.</p>
          <button
            type="button"
            onClick={handleHaikuAgenda}
            disabled={staffSessionMutation.isPending}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-violet-400/40 bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/20 disabled:opacity-50"
          >
            {staffSessionMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Haiku agenda
          </button>
        </div>
      )}

      {blockedQuery.data && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-200">
          Número bloqueado — el bot no le responderá hasta desbloquearlo.
        </div>
      )}

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {hasOlder && !threadQuery.isLoading && !threadQuery.isError && (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={threadQuery.isFetching}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.08] disabled:opacity-50"
            >
              {threadQuery.isFetching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <History className="h-3.5 w-3.5" />
              )}
              Ver mensajes anteriores
            </button>
          </div>
        )}
        {threadQuery.isLoading && <p className="text-center text-sm text-zinc-500">Cargando hilo…</p>}
        {threadQuery.isError && (
          <p className="text-center text-sm text-red-300">
            {threadQuery.error instanceof Error ? threadQuery.error.message : 'Error al cargar el hilo'}
          </p>
        )}
        {!threadQuery.isLoading &&
          !threadQuery.isError &&
          messages.map((m) => <MessageBubble key={m.id} message={m} />)}
      </div>

      <div className="shrink-0 border-t border-white/[0.08] p-3">
        {!withinWindow && (
          <p className="mb-2 text-[11px] text-zinc-500">
            Han pasado más de 24h desde el último mensaje del cliente — WhatsApp puede rechazar
            texto libre fuera de plantilla.
          </p>
        )}
        {(attachError || uploadError) && (
          <p className="mb-2 text-[11px] text-red-300">{attachError ?? uploadError}</p>
        )}
        <div className="flex items-end gap-2">
          <div className="flex shrink-0 gap-1">
            <input
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void handleAttach(f, 'image')
              }}
            />
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void handleAttach(f, 'audio')
              }}
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.xls,.xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (f) void handleAttach(f, 'document')
              }}
            />
            <button
              type="button"
              title="Adjuntar imagen"
              onClick={() => imageInputRef.current?.click()}
              disabled={isBusy}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-50"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Adjuntar audio"
              onClick={() => audioInputRef.current?.click()}
              disabled={isBusy}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-50"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Adjuntar documento"
              onClick={() => documentInputRef.current?.click()}
              disabled={isBusy}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje…"
            rows={1}
            disabled={isBusy}
            className="min-h-[36px] min-w-0 flex-1 resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--tenant-primary)]/40 focus:outline-none disabled:opacity-50"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={isBusy || !text.trim()}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--tenant-primary)] text-black disabled:opacity-40"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}
