'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
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
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  Zap,
} from 'lucide-react'

import {
  useWabaThread,
  WABA_THREAD_PAGE_SIZE,
  type WabaConversation,
} from '@/hooks/waba/useWabaMessages'
import { useSendWabaMessage, useWabaStaffSession } from '@/hooks/waba/useWabaSend'
import {
  useDeleteWabaThread,
  useToggleWabaBlock,
  useWabaBlockedStatus,
} from '@/hooks/waba/useWabaModeration'
import { useImageUpload } from '@/hooks/waba/useImageUpload'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { getTenantLandingUrl } from '@/lib/site-url'
import { MessageBubble } from './MessageBubble'
import { formatPhone } from './time'
import { ScrollFadeRow } from '@/components/ui/ScrollFadeRow'

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
  timeZone,
}: {
  conversation: WabaConversation
  onBack: () => void
  timeZone: string
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
  const tenantSettingsQuery = useTenantSettings()
  const bookingUrl = tenantSettingsQuery.data?.slug
    ? getTenantLandingUrl(tenantSettingsQuery.data.slug)
    : ''

  const [text, setText] = useState('')
  const [attachError, setAttachError] = useState<string | null>(null)
  const [moderationError, setModerationError] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [copied, setCopied] = useState(false)
  const [attachOpen, setAttachOpen] = useState(false)
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
        onSuccess: (data) => {
          const results = Array.isArray(data) ? data : [data]
          const metaError = results.find(
            (r) => r && typeof r === 'object' && 'error' in (r as Record<string, unknown>)
          ) as { error?: { message?: string } } | undefined
          if (metaError) {
            setAttachError(
              `WhatsApp rechazó el mensaje: ${metaError.error?.message ?? 'error desconocido'}`
            )
            return
          }
          setAttachError(null)
          setText('')
        },
        onError: (err) =>
          setAttachError(err instanceof Error ? err.message : 'No se pudo enviar el mensaje'),
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
    staffSessionMutation.mutate({
      phone,
      action: conversation.botPaused ? 'resume_bot' : 'pause_bot',
    })
  }

  const handleHaikuAgenda = () => {
    setModerationError(null)
    staffSessionMutation.mutate(
      { phone, action: 'haiku_finish_booking' },
      {
        onError: (err) =>
          setModerationError(
            err instanceof Error ? err.message : 'No se pudo iniciar la agenda con el asistente'
          ),
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
        setModerationError(
          err instanceof Error ? err.message : 'No se pudo eliminar la conversación'
        )
        setConfirmDelete(false)
      },
    })
  }

  const quickReplies = useMemo(() => {
    const rawName = conversation.displayName?.trim()
    const firstName = rawName ? ` ${rawName.split(' ')[0]}` : ''
    return [
      {
        id: 'saludo',
        label: 'Saludo',
        text: `¡Hola${firstName}! Gracias por escribirnos. ¿En qué podemos ayudarte hoy?`,
      },
      {
        id: 'agendar',
        label: 'Agendar cita',
        text: bookingUrl
          ? `Puedes ver nuestros servicios y reservar tu cita directamente aquí: ${bookingUrl}`
          : 'Indícanos qué servicio deseas realizarte y en qué fecha u horario te gustaría tu cita.',
      },
      {
        id: 'confirmar',
        label: 'Confirmar cita',
        text: '¡Tu cita quedó confirmada con éxito! Te esperamos.',
      },
      {
        id: 'pago',
        label: 'Medios de pago',
        text: 'Aceptamos transferencias bancarias, efectivo y Yape/Plin.',
      },
    ]
  }, [conversation.displayName, bookingUrl])

  const handleApplyQuickReply = (quickText: string) => {
    setText((prev) => (prev.trim() ? `${prev.trim()}\n${quickText}` : quickText))
    textareaRef.current?.focus()
  }

  return (
    <>
      <div className="border-b border-fg/[0.08] px-3 py-2.5 sm:px-4 sm:py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            <button
              type="button"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-fg/[0.08] md:hidden md:h-9 md:w-9"
              onClick={onBack}
              aria-label="Volver a la lista"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-fg">
                {conversation.displayName ||
                  (conversation.waUsername ? `@${conversation.waUsername}` : null) ||
                  (conversation.isBsuid ? 'Contacto de WhatsApp' : formatPhone(phone))}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                {conversation.displayPhone || !conversation.isBsuid ? (
                  <span className="font-mono text-[11px] text-fg-subtle">
                    {formatPhone(conversation.displayPhone || phone)}
                  </span>
                ) : (
                  <span
                    className="inline-flex shrink-0 items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                    title="Meta no compartió el número (usuario oculto)"
                  >
                    Sin teléfono
                  </span>
                )}
                {conversation.isBsuid && conversation.waUsername && conversation.displayName && (
                  <span
                    className="max-w-[10rem] truncate text-[11px] font-medium text-fg-subtle"
                    title="Usuario de WhatsApp"
                  >
                    @{conversation.waUsername}
                  </span>
                )}
                <span
                  className={[
                    'rounded-full border px-2 py-0.5 text-[11px] font-medium',
                    conversation.botPaused
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                  ].join(' ')}
                >
                  {conversation.botPaused ? 'Asistente en pausa' : 'Asistente activo'}
                </span>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!copyValue}
              title={
                copyValue ? 'Copiar nombre y contacto' : 'No hay datos de contacto para copiar'
              }
              aria-label="Copiar nombre y contacto"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-fg/[0.08] text-fg-soft hover:bg-fg/[0.06] disabled:opacity-40 md:h-9 md:w-9"
            >
              {copied ? (
                <Check className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              disabled={deleteThreadMutation.isPending}
              title="Eliminar conversación"
              aria-label="Eliminar conversación"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-fg/[0.08] text-fg-soft hover:border-red-500/30 hover:bg-red-500/10 hover:text-red-700 disabled:opacity-50 dark:hover:text-red-300 md:h-9 md:w-9"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handlePauseToggle}
            disabled={staffSessionMutation.isPending}
            className="inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-2.5 py-1.5 text-xs text-fg-soft hover:bg-fg/[0.06] disabled:opacity-50 sm:flex-none md:min-h-0"
          >
            {conversation.botPaused ? (
              <Play className="h-3.5 w-3.5" />
            ) : (
              <Pause className="h-3.5 w-3.5" />
            )}
            {conversation.botPaused ? 'Reactivar asistente' : 'Pausar asistente'}
          </button>
          <button
            type="button"
            onClick={handleHaikuAgenda}
            disabled={staffSessionMutation.isPending}
            className="inline-flex min-h-[44px] min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl border border-violet-400/40 bg-violet-500/10 px-2.5 py-1.5 text-xs font-medium text-violet-800 hover:bg-violet-500/20 disabled:opacity-50 dark:text-violet-200 sm:flex-none md:min-h-0"
          >
            {staffSessionMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Agendar con asistente
          </button>
          <button
            type="button"
            onClick={handleToggleBlock}
            disabled={toggleBlockMutation.isPending || blockedQuery.isLoading}
            title={
              blockedQuery.data
                ? 'Desbloquear: el asistente volverá a responder a este número'
                : 'Bloquear: el asistente dejará de responder a este número'
            }
            className={[
              'inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50 md:min-h-0',
              blockedQuery.data
                ? 'border-red-500/30 bg-red-500/10 text-red-700 hover:bg-red-500/20 dark:text-red-300'
                : 'border-fg/[0.08] bg-fg/[0.03] text-fg-soft hover:bg-fg/[0.06]',
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

          {conversation.displayName ||
          conversation.displayPhone ||
          (!conversation.isBsuid && conversation.phone) ? (
            <Link
              href={`/panel/clientes?search=${encodeURIComponent(
                conversation.displayName || conversation.displayPhone || conversation.phone
              )}`}
              target="_blank"
              rel="noreferrer"
              title="Ver ficha en Clientes (abre en pestaña nueva)"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-2.5 py-1.5 text-xs text-fg-soft hover:bg-fg/[0.06] md:min-h-0"
            >
              <User className="h-3.5 w-3.5 text-fg-muted" />
              <span>Ver en Clientes</span>
            </Link>
          ) : null}
        </div>
      </div>

      {confirmDelete && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-800 dark:text-red-200">
          <span>
            ¿Eliminar esta conversación? Se borran todos los mensajes y no se puede deshacer.
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={handleDeleteThread}
              disabled={deleteThreadMutation.isPending}
              className="min-h-[44px] rounded-lg bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-60 md:min-h-0"
            >
              {deleteThreadMutation.isPending ? 'Eliminando…' : 'Sí, eliminar'}
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              disabled={deleteThreadMutation.isPending}
              className="rounded-lg px-2.5 py-1 text-fg-soft hover:bg-fg/[0.06]"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {moderationError && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-4 py-2 text-xs text-red-700 dark:text-red-300">
          {moderationError}
        </div>
      )}

      {conversation.botPaused && (
        <div className="border-b border-amber-500/20 bg-amber-500/10 px-4 py-2 text-xs text-amber-800 dark:text-amber-200">
          <p>El asistente está en pausa para este número — solo el staff responde hasta reactivarlo.</p>
        </div>
      )}

      {blockedQuery.data && (
        <div className="border-b border-red-500/20 bg-red-500/10 px-4 py-2 text-xs text-red-800 dark:text-red-200">
          Número bloqueado — el asistente no le responderá hasta desbloquearlo.
        </div>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overflow-x-hidden p-2.5 sm:p-4"
      >
        {hasOlder && !threadQuery.isLoading && !threadQuery.isError && (
          <div className="flex justify-center pb-1">
            <button
              type="button"
              onClick={handleLoadOlder}
              disabled={threadQuery.isFetching}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-fg/[0.08] bg-fg/[0.04] px-3 py-1.5 text-xs text-fg-soft hover:bg-fg/[0.08] disabled:opacity-50 md:min-h-0"
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
        {threadQuery.isLoading && (
          <p className="text-center text-sm text-fg-subtle">Cargando hilo…</p>
        )}
        {threadQuery.isError && (
          <p className="text-center text-sm text-red-700 dark:text-red-300">
            {threadQuery.error instanceof Error
              ? threadQuery.error.message
              : 'Error al cargar el hilo'}
          </p>
        )}
        {!threadQuery.isLoading &&
          !threadQuery.isError &&
          messages.map((m) => <MessageBubble key={m.id} message={m} timeZone={timeZone} />)}
      </div>

      <div className="shrink-0 border-t border-fg/[0.08] bg-app p-2.5 pb-2 sm:p-3 sm:pb-3">
        {!withinWindow && (
          <p className="mb-2 text-[11px] text-fg-subtle">
            Han pasado más de 24h desde el último mensaje del cliente — WhatsApp puede rechazar
            texto libre fuera de plantilla.
          </p>
        )}
        {(attachError || uploadError) && (
          <p className="mb-2 text-[11px] text-red-700 dark:text-red-300">
            {attachError ?? uploadError}
          </p>
        )}

        <ScrollFadeRow
          backgroundColor="rgb(var(--app-rgb))"
          wrapperClassName="mb-2"
          className="flex items-center gap-1.5 pb-0.5 text-xs"
        >
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-fg-subtle">
            <Zap className="h-3 w-3 text-tenant-text" />
            Rápidas:
          </span>
          {quickReplies.map((qr) => (
            <button
              key={qr.id}
              type="button"
              onClick={() => handleApplyQuickReply(qr.text)}
              className="hover:border-[var(--tenant-primary)]/40 shrink-0 rounded-lg border border-fg/[0.08] bg-fg/[0.03] px-2 py-0.5 text-[11px] text-fg-soft transition-colors hover:bg-fg/[0.06] hover:text-fg"
            >
              {qr.label}
            </button>
          ))}
        </ScrollFadeRow>

        <div className="flex items-end gap-1.5 sm:gap-2">
          <div className="relative flex shrink-0">
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
              onClick={() => setAttachOpen((v) => !v)}
              disabled={isBusy}
              aria-label="Adjuntar"
              aria-expanded={attachOpen}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-fg/[0.08] text-fg-soft hover:bg-fg/[0.06] disabled:opacity-50 md:h-9 md:w-9"
            >
              <Plus className={`h-5 w-5 transition-transform ${attachOpen ? 'rotate-45' : ''}`} />
            </button>
            {attachOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAttachOpen(false)} />
                <div className="absolute bottom-full left-0 z-20 mb-2 w-48 overflow-hidden rounded-xl border border-line bg-surface py-1 shadow-xl">
                  {[
                    { label: 'Imagen', Icon: ImageIcon, ref: imageInputRef },
                    { label: 'Audio', Icon: Mic, ref: audioInputRef },
                    { label: 'Documento', Icon: FileText, ref: documentInputRef },
                  ].map(({ label, Icon, ref }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        setAttachOpen(false)
                        ref.current?.click()
                      }}
                      className="flex min-h-[44px] w-full items-center gap-3 px-3 text-sm text-fg hover:bg-fg/[0.06]"
                    >
                      <Icon className="h-4 w-4 text-fg-soft" />
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje…"
            rows={1}
            disabled={isBusy}
            className="focus:border-[var(--tenant-primary)]/40 min-h-[44px] min-w-0 flex-1 resize-none rounded-xl border border-fg/[0.08] bg-fg/[0.03] px-3 py-2 text-base text-fg placeholder:text-fg-subtle focus:outline-none disabled:opacity-50 md:min-h-[36px] md:text-sm"
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={isBusy || !text.trim()}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)] disabled:opacity-40 md:h-9 md:w-9"
            aria-label="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}
