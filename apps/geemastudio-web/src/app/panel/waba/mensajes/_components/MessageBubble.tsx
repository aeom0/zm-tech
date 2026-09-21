'use client'

import { Check, CheckCheck, File as FileIcon, XCircle } from 'lucide-react'

import type { WabaMessage } from '@/hooks/waba/useWabaMessages'

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit' })
}

function DeliveryTicks({ status }: { status: WabaMessage['deliveryStatus'] }) {
  if (!status) return null
  if (status === 'failed') return <XCircle className="h-3.5 w-3.5 text-red-400" />
  if (status === 'read') return <CheckCheck className="h-3.5 w-3.5 text-sky-400" />
  if (status === 'delivered') return <CheckCheck className="h-3.5 w-3.5 text-zinc-400" />
  return <Check className="h-3.5 w-3.5 text-zinc-500" />
}

export function MessageBubble({ message }: { message: WabaMessage }) {
  const out = message.direction === 'out'

  return (
    <div className={['flex', out ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[85%] space-y-1.5 rounded-2xl px-3 py-2 text-sm',
          out ? 'bg-[var(--tenant-primary)]/20 text-zinc-100' : 'bg-white/[0.06] text-zinc-200',
        ].join(' ')}
      >
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

        {message.content && !message.content.startsWith('[imagen]') && !message.content.startsWith('[audio]') && (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        )}

        <div className="flex items-center justify-end gap-1 text-[10px] text-zinc-500">
          {formatTime(message.createdAt)}
          {message.msgType !== 'text' && message.msgType !== 'image' && message.msgType !== 'audio' && message.msgType !== 'document'
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
