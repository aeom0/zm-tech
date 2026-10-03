'use client'

import {
  Camera,
  Check,
  CheckCheck,
  File as FileIcon,
  FileText,
  List,
  MousePointerClick,
  XCircle,
} from 'lucide-react'

import type { WabaMessage } from '@/hooks/waba/useWabaMessages'
import { formatTemplatePreview, isTemplateContent } from './templateLabels'

function formatTime(iso: string, timeZone: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', timeZone })
}

function DeliveryTicks({ status }: { status: WabaMessage['deliveryStatus'] }) {
  if (!status) return null
  if (status === 'failed')
    return (
      <span title="No entregado">
        <XCircle className="h-3.5 w-3.5 text-red-700 dark:text-red-400" />
      </span>
    )
  if (status === 'read')
    return (
      <span title="Leído">
        <CheckCheck className="h-3.5 w-3.5 text-sky-700 dark:text-sky-400" />
      </span>
    )
  if (status === 'delivered')
    return (
      <span title="Entregado">
        <CheckCheck className="h-3.5 w-3.5 text-fg-muted" />
      </span>
    )
  if (status === 'sent')
    return (
      <span title="Enviado a WhatsApp">
        <Check className="h-3.5 w-3.5 text-fg-subtle" />
      </span>
    )
  return (
    <span title="Aceptado por Meta (entrega pendiente)">
      <Check className="h-3.5 w-3.5 text-fg-subtle" />
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
    <div className="mb-1.5 flex max-w-full items-center gap-2 rounded-xl border border-fg/[0.08] bg-scrim/20 px-2 py-1.5">
      {imageUrl ? (
        <a
          href={imageUrl}
          target="_blank"
          rel="noreferrer"
          title="Ver imagen citada"
          className="shrink-0"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={caption || 'Imagen citada'}
            className="h-11 w-11 rounded-lg border border-fg/[0.08] object-cover"
          />
        </a>
      ) : (
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-fg/[0.08]">
          <Camera className="h-4 w-4 text-fg-muted" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-[11px] uppercase leading-none tracking-wide text-fg-subtle">
          Respondiendo a
        </div>
        <div className="truncate text-xs leading-snug text-fg-soft">
          {caption || (imageUrl ? 'Foto' : label || 'mensaje')}
        </div>
      </div>
    </div>
  )
}

export function MessageBubble({ message, timeZone }: { message: WabaMessage; timeZone: string }) {
  const out = message.direction === 'out'
  const content = message.content || ''
  const isReaction = message.msgType === 'reaction'
  const isInteractive = message.msgType === 'interactive'
  const isButton = message.msgType === 'button'
  const isTemplate = !isReaction && isTemplateContent(content, message.msgType)

  const hasReplyQuote =
    Boolean(message.replyImageUrl) || Boolean(message.replyToWamid) || content.includes(' ↳ ')
  const { body: bodyWithoutQuote, quoteLabel } = hasReplyQuote
    ? splitQuotePreview(content)
    : { body: content, quoteLabel: null }
  const showQuoteCard = !out && (Boolean(message.replyImageUrl) || Boolean(quoteLabel))

  return (
    <div
      className={[
        'flex w-full',
        out ? 'justify-end pl-3 sm:pl-10' : 'justify-start pr-3 sm:pr-10',
      ].join(' ')}
    >
      <div
        className={[
          'min-w-0 max-w-[90%] space-y-1.5 overflow-hidden rounded-2xl px-3 py-2 text-sm sm:max-w-[80%]',
          out
            ? isTemplate
              ? 'bg-violet-500/20 text-violet-900 dark:text-violet-100'
              : 'bg-[var(--tenant-primary)]/20 text-fg'
            : 'bg-fg/[0.06] text-fg-soft',
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
          <div className="max-w-full overflow-hidden">
            <audio controls className="w-full max-w-[240px]" src={message.audioUrl}>
              Tu navegador no soporta audio.
            </audio>
          </div>
        )}

        {message.documentUrl && (
          <a
            href={message.documentUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 rounded-xl border border-fg/[0.08] bg-scrim/20 px-3 py-2 text-xs text-fg-soft hover:bg-scrim/30"
          >
            <FileIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{message.documentName || 'Documento'}</span>
          </a>
        )}

        {isReaction ? (
          content && !content.startsWith('[') ? (
            <p className="text-2xl leading-none">{content}</p>
          ) : (
            <p className="text-xs italic text-fg-muted">quitó su reacción</p>
          )
        ) : isTemplate ? (
          <p className="flex items-start gap-2 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
            <FileText className="mt-0.5 h-4 w-4 shrink-0 text-violet-700 dark:text-violet-300" />
            <span className="min-w-0 flex-1">
              <span className="mb-0.5 block text-[11px] uppercase tracking-wide text-violet-700/80 dark:text-violet-300/80">
                Plantilla
              </span>
              {formatTemplatePreview(bodyWithoutQuote)}
            </span>
          </p>
        ) : isInteractive ? (
          <p className="flex items-center gap-2 [overflow-wrap:anywhere]">
            <List className="h-4 w-4 shrink-0 text-fg-muted" />
            <span className="min-w-0 flex-1">{bodyWithoutQuote || '[interactivo]'}</span>
          </p>
        ) : isButton ? (
          <p className="flex items-center gap-2 italic text-fg-muted [overflow-wrap:anywhere]">
            <MousePointerClick className="h-4 w-4 shrink-0" />
            <span className="min-w-0 flex-1">{bodyWithoutQuote || '[seleccionó una opción]'}</span>
          </p>
        ) : (
          bodyWithoutQuote &&
          !bodyWithoutQuote.startsWith('[imagen]') &&
          !bodyWithoutQuote.startsWith('[audio]') && (
            <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
              {bodyWithoutQuote}
            </p>
          )
        )}

        <div className="flex items-center justify-end gap-1 text-[11px] text-fg-subtle">
          {formatTime(message.createdAt, timeZone)}
          {![
            'text',
            'image',
            'audio',
            'document',
            'reaction',
            'template',
            'interactive',
            'button',
          ].includes(message.msgType)
            ? ` · ${message.msgType}`
            : ''}
          {out && <DeliveryTicks status={message.deliveryStatus} />}
        </div>

        {message.deliveryStatus === 'failed' && message.deliveryError && (
          <p className="text-[11px] text-red-700 dark:text-red-300">{message.deliveryError}</p>
        )}
      </div>
    </div>
  )
}
