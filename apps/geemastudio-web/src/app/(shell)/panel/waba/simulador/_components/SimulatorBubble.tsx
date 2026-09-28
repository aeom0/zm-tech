'use client'

import { Camera, List, Megaphone, MousePointerClick } from 'lucide-react'
import type { SimulatorBubble } from '../_hooks/useSimulatorChat'

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('es-PE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'America/Lima',
    })
  } catch {
    return ''
  }
}

export function SimulatorBubbleView({
  message,
  onTapInteractive,
}: {
  message: SimulatorBubble
  onTapInteractive?: (id: string, title: string) => void
}) {
  const isUser = message.role === 'user'
  const content = (message.content || '').trim()
  const isImage = message.msg_type === 'image'
  const isInteractive = message.msg_type === 'interactive'
  const isList = content.startsWith('[lista]')
  const imageCaption = content.replace(/^\[imagen\]\s*/, '').trim()
  const time = formatTime(message.created_at)

  return (
    <div className={['flex w-full', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[85%] rounded-2xl px-3 py-2 shadow-sm sm:max-w-[75%]',
          isUser
            ? message.fromAd
              ? 'rounded-br-md bg-violet-600 text-white'
              : 'rounded-br-md bg-emerald-600 text-white'
            : 'rounded-bl-md border border-white/[0.08] bg-white/[0.06] text-zinc-100',
        ].join(' ')}
      >
        {message.fromAd && (
          <span className="mb-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-violet-100/95">
            <Megaphone className="h-3 w-3" />
            vía anuncio
          </span>
        )}
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {isImage ? (
            message.image_url ? (
              <a
                href={message.image_url}
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex items-center gap-2"
                title="Ver imagen"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={message.image_url}
                  alt={imageCaption || 'Foto del bot'}
                  className="h-16 w-16 shrink-0 rounded-xl border border-white/10 object-cover transition-opacity group-hover:opacity-90"
                  loading="lazy"
                />
                {imageCaption && <span>{imageCaption}</span>}
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 italic opacity-80">
                <Camera className="h-4 w-4" />
                {imageCaption || '[imagen]'}
              </span>
            )
          ) : isList || isInteractive ? (
            <span className="inline-flex items-start gap-2">
              {message.interactiveId ? (
                <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
              ) : (
                <List className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
              )}
              <span>
                {isList && (
                  <span
                    className={[
                      'mb-0.5 block text-[10px] uppercase tracking-wide',
                      isUser ? 'text-emerald-100/90' : 'text-zinc-400',
                    ].join(' ')}
                  >
                    Menú
                  </span>
                )}
                {content || '[interactivo]'}
                {message.interactiveId && onTapInteractive && (
                  <button
                    type="button"
                    className="mt-1 block text-[11px] underline opacity-80 hover:opacity-100"
                    onClick={() => onTapInteractive(message.interactiveId!, content)}
                  >
                    Reenviar opción
                  </button>
                )}
              </span>
            </span>
          ) : (
            content || '…'
          )}
        </div>
        {time && (
          <div
            className={[
              'mt-1 text-right text-[10px] tabular-nums',
              isUser
                ? message.fromAd
                  ? 'text-violet-100/80'
                  : 'text-emerald-100/80'
                : 'text-zinc-500',
            ].join(' ')}
          >
            {time}
          </div>
        )}
      </div>
    </div>
  )
}
