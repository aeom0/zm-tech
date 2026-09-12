'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, MessageSquare } from 'lucide-react'

import { useWabaConversations, useWabaThread } from '@/hooks/waba/useWabaMessages'

function formatWhen(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('es-VE', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function PanelWabaMensajesPage() {
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const conversationsQuery = useWabaConversations()
  const threadQuery = useWabaThread(selectedPhone)

  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data])
  const messages = threadQuery.data ?? []

  const selected = useMemo(
    () => conversations.find((c) => c.phone === selectedPhone) ?? null,
    [conversations, selectedPhone]
  )

  const title = conversationsQuery.isLoading
    ? 'Mensajes'
    : `Mensajes (${conversations.length})`

  return (
    <div className="space-y-4">
      <div>
        <div className="text-xs text-zinc-500">WhatsApp</div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Historial por teléfono. Solo lectura — el envío sale por el bot / Edge.
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

      {!conversationsQuery.isError &&
        !conversationsQuery.isLoading &&
        conversations.length > 0 && (
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
                  return (
                    <li key={c.phone}>
                      <button
                        type="button"
                        onClick={() => setSelectedPhone(c.phone)}
                        className={[
                          'w-full border-b border-white/[0.06] px-4 py-3 text-left transition-colors',
                          active ? 'bg-[#40E0D0]/10' : 'hover:bg-white/[0.04]',
                        ].join(' ')}
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-sm font-semibold text-white">
                            {c.displayName || c.phone}
                          </span>
                          <span className="shrink-0 text-[11px] text-zinc-500">
                            {formatWhen(c.lastAt)}
                          </span>
                        </div>
                        {c.displayName && (
                          <div className="mt-0.5 font-mono text-[11px] text-zinc-500">
                            {c.phone}
                          </div>
                        )}
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{c.lastMessage}</p>
                        {c.inbound24h > 0 && (
                          <span className="mt-2 inline-block rounded-full border border-[#40E0D0]/20 bg-[#40E0D0]/10 px-2 py-0.5 text-[10px] text-[#40E0D0]">
                            {c.inbound24h} in · 24h
                          </span>
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </aside>

            <section
              className={[
                'flex min-h-0 flex-col',
                selectedPhone ? 'flex' : 'hidden md:flex',
              ].join(' ')}
            >
              {!selectedPhone && (
                <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
                  Elegí una conversación
                </div>
              )}

              {selectedPhone && (
                <>
                  <div className="flex items-center gap-3 border-b border-white/[0.08] px-4 py-3">
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.08] md:hidden"
                      onClick={() => setSelectedPhone(null)}
                      aria-label="Volver a la lista"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-white">
                        {selected?.displayName || selectedPhone}
                      </div>
                      <div className="font-mono text-[11px] text-zinc-500">{selectedPhone}</div>
                    </div>
                  </div>

                  <div className="max-h-[60vh] flex-1 space-y-2 overflow-y-auto p-4">
                    {threadQuery.isLoading && (
                      <p className="text-center text-sm text-zinc-500">Cargando hilo…</p>
                    )}
                    {threadQuery.isError && (
                      <p className="text-center text-sm text-red-300">
                        {threadQuery.error instanceof Error
                          ? threadQuery.error.message
                          : 'Error al cargar el hilo'}
                      </p>
                    )}
                    {!threadQuery.isLoading &&
                      !threadQuery.isError &&
                      messages.map((m) => {
                        const out = m.direction === 'out'
                        return (
                          <div
                            key={m.id}
                            className={['flex', out ? 'justify-end' : 'justify-start'].join(' ')}
                          >
                            <div
                              className={[
                                'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                                out
                                  ? 'bg-[#40E0D0]/20 text-zinc-100'
                                  : 'bg-white/[0.06] text-zinc-200',
                              ].join(' ')}
                            >
                              <p className="whitespace-pre-wrap break-words">{m.content}</p>
                              <div className="mt-1 text-[10px] text-zinc-500">
                                {formatWhen(m.createdAt)}
                                {m.msgType !== 'text' ? ` · ${m.msgType}` : ''}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </>
              )}
            </section>
          </div>
        )}
    </div>
  )
}
