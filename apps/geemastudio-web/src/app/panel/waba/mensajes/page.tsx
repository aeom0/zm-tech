'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MessageSquare } from 'lucide-react'

import { useWabaConversations } from '@/hooks/waba/useWabaMessages'
import { MessageThread } from './_components/MessageThread'
import { formatAbsoluteWhen, formatPhone, formatRelativeTime } from './_components/time'

function PanelWabaMensajesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phoneParam = searchParams.get('phone')

  const [selectedPhone, setSelectedPhone] = useState<string | null>(phoneParam)
  const conversationsQuery = useWabaConversations()

  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data])

  useEffect(() => {
    if (phoneParam && phoneParam !== selectedPhone) setSelectedPhone(phoneParam)
  }, [phoneParam, selectedPhone])

  const selectPhone = (phone: string | null) => {
    setSelectedPhone(phone)
    const params = new URLSearchParams(searchParams.toString())
    if (phone) params.set('phone', phone)
    else params.delete('phone')
    router.replace(`/panel/waba/mensajes${params.toString() ? `?${params.toString()}` : ''}`, {
      scroll: false,
    })
  }

  const selected = useMemo(
    () => conversations.find((c) => c.phone === selectedPhone) ?? null,
    [conversations, selectedPhone]
  )

  const title = conversationsQuery.isLoading ? 'Mensajes' : `Mensajes (${conversations.length})`

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-zinc-500">WhatsApp</div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Historial por teléfono. Envío de texto, imagen, audio y documento desde el panel.
        </p>
      </div>

      {conversationsQuery.isError && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {conversationsQuery.error instanceof Error
            ? conversationsQuery.error.message
            : 'No se pudieron cargar las conversaciones'}
        </div>
      )}

      {!conversationsQuery.isError && conversationsQuery.isLoading && (
        <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
          Cargando conversaciones…
        </div>
      )}

      {!conversationsQuery.isError &&
        !conversationsQuery.isLoading &&
        conversations.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-12 text-center">
            <MessageSquare className="h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-400">
              Todavía no hay mensajes en <span className="font-mono">wa_messages</span> para este
              tenant.
            </p>
          </div>
        )}

      {!conversationsQuery.isError && !conversationsQuery.isLoading && conversations.length > 0 && (
        <div className="grid min-h-[480px] overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] md:grid-cols-[320px_1fr]">
          <aside
            className={[
              'border-white/[0.08] md:border-r',
              selectedPhone ? 'hidden md:block' : 'block',
            ].join(' ')}
          >
            <ul className="max-h-[70vh] overflow-y-auto">
              {conversations.map((c) => {
                const active = c.phone === selectedPhone
                const name =
                  c.displayName ||
                  (c.waUsername ? `@${c.waUsername}` : null) ||
                  (c.isBsuid ? 'Contacto de WhatsApp' : formatPhone(c.phone))
                const phoneLabel = c.displayPhone
                  ? formatPhone(c.displayPhone)
                  : !c.isBsuid && c.displayName
                    ? formatPhone(c.phone)
                    : null
                const avatarLabel = (c.displayName || c.waUsername || 'WA').trim().charAt(0).toUpperCase()
                const badgeCount = c.inbound24h > 99 ? '99+' : String(c.inbound24h)

                return (
                  <li key={c.phone}>
                    <button
                      type="button"
                      onClick={() => selectPhone(c.phone)}
                      className={[
                        'w-full border-b border-white/[0.06] px-4 py-3 text-left transition-colors',
                        active ? 'bg-[var(--tenant-primary)]/10' : 'hover:bg-white/[0.04]',
                      ].join(' ')}
                    >
                      <div className="flex items-start gap-3">
                        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-xs font-bold text-zinc-200">
                          {avatarLabel}
                          {c.inbound24h > 0 && (
                            <span
                              className="absolute -right-1 -top-1 rounded-full bg-[var(--tenant-primary)] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-black"
                              title="Mensajes entrantes dentro de la ventana de 24h"
                            >
                              {badgeCount}
                            </span>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white" title={name}>
                            {name}
                          </span>

                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                            {phoneLabel && (
                              <span className="font-mono text-[11px] text-zinc-500">{phoneLabel}</span>
                            )}
                            {c.isBsuid && !c.displayPhone && (
                              <span
                                className="inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
                                title="Meta no compartió el número (username / BSUID)"
                              >
                                Sin teléfono
                              </span>
                            )}
                            {c.botPaused && (
                              <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-300">
                                Bot en pausa
                              </span>
                            )}
                            <span className="text-[11px] text-zinc-500" title={formatAbsoluteWhen(c.lastAt)}>
                              {formatAbsoluteWhen(c.lastAt)} · {formatRelativeTime(c.lastAt)}
                            </span>
                          </div>

                          <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{c.lastMessage}</p>
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          </aside>

          <section
            className={['flex min-h-0 flex-col', selectedPhone ? 'flex' : 'hidden md:flex'].join(
              ' '
            )}
          >
            {!selected && (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
                Elegí una conversación
              </div>
            )}

            {selected && <MessageThread conversation={selected} onBack={() => selectPhone(null)} />}
          </section>
        </div>
      )}
    </div>
  )
}

export default function PanelWabaMensajesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-zinc-500">Cargando…</div>}>
      <PanelWabaMensajesContent />
    </Suspense>
  )
}
