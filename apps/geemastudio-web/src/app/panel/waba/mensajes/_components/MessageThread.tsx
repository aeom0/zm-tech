'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, FileText, Image as ImageIcon, Mic, Pause, Play, Send } from 'lucide-react'

import { useWabaThread, type WabaConversation } from '@/hooks/waba/useWabaMessages'
import { useSendWabaMessage, useWabaStaffSession } from '@/hooks/waba/useWabaSend'
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
  const threadQuery = useWabaThread(phone)
  const sendMutation = useSendWabaMessage(phone)
  const staffSessionMutation = useWabaStaffSession(phone)
  const { uploadImage, uploadState, uploadError, resetUpload } = useImageUpload()

  const [text, setText] = useState('')
  const [attachError, setAttachError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const audioInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  const messages = useMemo(() => threadQuery.data ?? [], [threadQuery.data])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages.length, phone])

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

  const handlePauseToggle = () => {
    staffSessionMutation.mutate({ phone, action: conversation.botPaused ? 'resume_bot' : 'pause_bot' })
  }

  return (
    <>
      <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
        <button
          type="button"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] md:hidden"
          onClick={onBack}
          aria-label="Volver a la lista"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white">
            {conversation.displayName || phone}
          </div>
          <div className="font-mono text-[11px] text-zinc-500">{phone}</div>
        </div>
        <div className="flex items-center gap-2">
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
          <button
            type="button"
            onClick={handlePauseToggle}
            disabled={staffSessionMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"
          >
            {conversation.botPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {conversation.botPaused ? 'Reactivar bot' : 'Pausar bot'}
          </button>
        </div>
      </div>

      {conversation.botPaused && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-200">
          El bot está en pausa para este número — solo el staff responde hasta reactivarlo.
        </div>
      )}

      <div ref={scrollRef} className="max-h-[60vh] flex-1 space-y-2 overflow-y-auto p-4">
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

      <div className="border-t border-white/[0.08] p-3">
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
          <div className="flex gap-1">
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
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-50"
            >
              <ImageIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Adjuntar audio"
              onClick={() => audioInputRef.current?.click()}
              disabled={isBusy}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-50"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Adjuntar documento"
              onClick={() => documentInputRef.current?.click()}
              disabled={isBusy}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-white/[0.06] disabled:opacity-50"
            >
              <FileText className="h-4 w-4" />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí un mensaje…"
            rows={1}
            disabled={isBusy}
            className="min-h-[36px] flex-1 resize-none rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-[var(--tenant-primary)]/40 focus:outline-none disabled:opacity-50"
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
