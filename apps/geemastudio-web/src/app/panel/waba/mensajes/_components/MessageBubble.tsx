'use client'

import { Camera, Check, CheckCheck, File as FileIcon, FileText, List, MousePointerClick, XCircle } from 'lucide-react'

import type { WabaMessage } from '@/hooks/waba/useWabaMessages'
import { formatTemplatePreview, isTemplateContent } from './templateLabels'

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

function DeliveryTicks({ status }: { status: WabaMessage['deliveryStatus'] }) {
  if (!status) return null
  if (status === 'failed')
    return (
      <span title="No entregado">
        <XCircle className="h-3.5 w-3.5 text-red-400" />
      </span>
    )
  if (status === 'read')
    return (
      <span title="Leído">
        <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
      </span>
    )
  if (status === 'delivered')
    return (
      <span title="Entregado">
        <CheckCheck className="h-3.5 w-3.5 text-zinc-400" />
      </span>
    )
  if (status === 'sent')
    return (
      <span title="Enviado a WhatsApp">
        <Check className="h-3.5 w-3.5 text-zinc-500" />
      </span>
    )
  return (
    <span title="Aceptado por Meta (entrega pendiente)">
      <Check className="h-3.5 w-3.5 text-zinc-600" />
    </span>
  )
}

/** Separa cuerpo y preview `↳ …` del content enriquecido. */
function splitQuotePreview(content: string): { body: string; quoteLabel: string | null } {
  const idx = content.indexOf(' ↳ ')
  if (idx < 0) return { body: content, quoteLabel: null }
  return { body: content.slice(0, idx).trim(), quoteLabel: content.slice(idx + 3).trim() || null }
}

function QuoteCard({ imageUrl, label }: { imageUrl: string | null; label: string | null }) {
  const caption = (label ?? '').replace(/^\[imagen\]\s*/i, '').trim()
  return (
    <div className="mb-1.5 flex max-w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-2 py-1.5">
      {imageUrl ? (
        <a href={imageUrl} target="_blank" rel="noreferrer" title="Ver imagen citada" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={caption || 'Imagen citada'}
            className="h-11 w-11 rounded-lg border border-white/[0.08] object-cover"
          />
        </a>
      ) : (
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/[0.08]">
          <Camera className="h-4 w-4 text-zinc-400" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[10px] uppercase leading-none tracking-wide text-zinc-500">Respondiendo a</div>
        <div className="truncate text-xs leading-snug text-zinc-300">
          {caption || (imageUrl ? 'Foto' : label || 'mensaje')}
        </div>
      </div>
    </div>
  )
}

export function MessageBubble({ message }: { message: WabaMessage }) {
  const out = message.direction === 'out'
  const content = message.content || ''
  const isReaction = message.msgType === 'reaction'
  const isInteractive = message.msgType === 'interactive'
  const isButton = message.msgType === 'button'
  const isTemplate = !isReaction && isTemplateContent(content, message.msgType)

  const hasReplyQuote = Boolean(message.replyImageUrl) || Boolean(message.replyToWamid) || content.includes(' ↳ ')
  const { body: bodyWithoutQuote, quoteLabel } = hasReplyQuote
    ? splitQuotePreview(content)
    : { body: content, quoteLabel: null }
  const showQuoteCard = !out && (Boolean(message.replyImageUrl) || Boolean(quoteLabel))

  return (
    <div className={['flex', out ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[85%] space-y-1.5 rounded-2xl px-3 py-2 text-sm',
          out
            ? isTemplate
              ? 'bg-violet-500/20 text-violet-100'
              : 'bg-[var(--tenant-primary)]/20 text-zinc-100'
            : 'bg-white/[0.06] text-zinc-200',
        ].join(' ')}
      >
        {showQuoteCard && <QuoteCard imageUrl={message.replyImageUrl} label={quoteLabel} />}

        {message.imageUrl && (
          <a href={message.imageUrl} target="_blank" rel="noreferrer" className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.imageUrl}
              alt="Imagen enviada"
              className="max-h-64 w-full rounded-xl object-cover"
            />
          </a>
        )}

        {message.audioUrl && (
          <audio controls className="w-full max-w-[240px]" src={message.audioUrl}>
            Tu navegador no soporta audio.
          </audio>
        )}

        {message.documentUrl && (
          <a
            href={message.documentUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-black/20 px-3 py-2 text-xs text-zinc-200 hover:bg-black/30"
          >
            <FileIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{message.documentName || 'Documento'}</span>
          </a>
        )}

        {isReaction ? (
          content && !content.startsWith('[') ? (
            <p className="text-2xl leading-none">{content}</p>
          ) : (
            <p className="text-xs italic text-zinc-400">quitó su reacción</p>
          )
        ) : isTemplate ? (
          <p className="flex items-start gap-2 whitespace-pre-wrap break-words">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
            <span>
              <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-violet-300/80">Plantilla</span>
              {formatTemplatePreview(bodyWithoutQuote)}
            </span>
          </p>
        ) : isInteractive ? (
          <p className="flex items-center gap-2">
            <List className="h-4 w-4 shrink-0 text-zinc-400" />
            {bodyWithoutQuote || '[interactivo]'}
          </p>
        ) : isButton ? (
          <p className="flex items-center gap-2 italic text-zinc-400">
            <MousePointerClick className="h-4 w-4 shrink-0" />
            {bodyWithoutQuote || '[seleccionó una opción]'}
          </p>
        ) : (
          bodyWithoutQuote &&
          !bodyWithoutQuote.startsWith('[imagen]') &&
          !bodyWithoutQuote.startsWith('[audio]') && (
            <p className="whitespace-pre-wrap break-words">{bodyWithoutQuote}</p>
          )
        )}

        <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-500">
          {formatTime(message.createdAt)}
          {!['text', 'image', 'audio', 'document', 'reaction', 'template', 'interactive', 'button'].includes(
            message.msgType
          )
            ? ` · ${message.msgType}`
            : ''}
          {out && <DeliveryTicks status={message.deliveryStatus} />}
        </div>

        {message.deliveryStatus === 'failed' && message.deliveryError && (
          <p className="text-[10px] text-red-300">{message.deliveryError}</p>
        )}
      </div>
    </div>
  )
}
