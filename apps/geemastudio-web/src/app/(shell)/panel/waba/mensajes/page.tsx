'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MessageSquare, Search, X } from 'lucide-react'

import { useWabaConversations } from '@/hooks/waba/useWabaMessages'
import { useDashboardTenant } from '@/hooks/dashboard/useDashboardTenant'
import { phonesLikelyMatch } from '@/lib/waPhone'
import { MessageThread } from './_components/MessageThread'
import { formatAbsoluteWhen, formatPhone, formatRelativeTime } from './_components/time'
import { ScrollFadeRow } from '@/components/ui/ScrollFadeRow'
import { StateNote } from '@/components/ui/StateNote'

type FilterType = 'all' | 'active24h' | 'paused'

function findConversationByPhoneKey<T extends { phone: string; displayPhone: string | null }>(
  conversations: T[],
  phoneKey: string | null
): T | null {
  if (!phoneKey) return null
  return (
    conversations.find(
      (c) =>
        c.phone === phoneKey ||
        phonesLikelyMatch(c.phone, phoneKey) ||
        (c.displayPhone != null && phonesLikelyMatch(c.displayPhone, phoneKey))
    ) ?? null
  )
}

function PanelWabaMensajesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const phoneParam = searchParams.get('phone')

  const [selectedPhone, setSelectedPhone] = useState<string | null>(phoneParam)
  const [filter, setFilter] = useState<FilterType>('all')
  const [search, setSearch] = useState('')

  const conversationsQuery = useWabaConversations()
  const tenantQuery = useDashboardTenant()
  const timezone = tenantQuery.data?.timezone ?? 'America/Caracas'

  const conversations = useMemo(() => conversationsQuery.data ?? [], [conversationsQuery.data])

  /**
   * Solo reacciona a cambios de `phoneParam` (no de `selectedPhone`): al tocar la
   * flecha atrás, `selectPhone` limpia el estado local antes de que `router.replace`
   * actualice la URL, y si este efecto también dependiera de `selectedPhone` volvería
   * a sincronizar con el `phoneParam` todavía viejo, revirtiendo el back en el primer toque.
   */
  useEffect(() => {
    setSelectedPhone(phoneParam)
  }, [phoneParam])

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
    () => findConversationByPhoneKey(conversations, selectedPhone),
    [conversations, selectedPhone]
  )

  /** Si el deep link llegó con 9 dígitos y el hilo es `51…`, canónica al phone del hilo. */
  useEffect(() => {
    if (!selected || !selectedPhone) return
    if (selected.phone === selectedPhone) return
    if (!phonesLikelyMatch(selected.phone, selectedPhone)) return
    selectPhone(selected.phone)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- solo al resolver mismatch URL↔hilo
  }, [selected, selectedPhone])

  const stats = useMemo(() => {
    let count24h = 0
    let countPaused = 0
    for (const c of conversations) {
      if (c.inbound24h > 0) count24h++
      if (c.botPaused) countPaused++
    }
    return {
      total: conversations.length,
      count24h,
      countPaused,
    }
  }, [conversations])

  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase()
    const digits = q.replace(/\D+/g, '')

    return conversations.filter((c) => {
      if (filter === 'active24h' && c.inbound24h === 0) return false
      if (filter === 'paused' && !c.botPaused) return false

      if (!q) return true
      if (c.displayName?.toLowerCase().includes(q)) return true
      if (c.waUsername?.toLowerCase().includes(q)) return true
      if (c.lastMessage?.toLowerCase().includes(q)) return true
      if (c.phone.toLowerCase().includes(q)) return true
      if (c.displayPhone?.toLowerCase().includes(q)) return true
      if (digits) {
        if (c.phone.includes(digits)) return true
        if (c.displayPhone?.includes(digits)) return true
      }
      return false
    })
  }, [conversations, filter, search])

  const title = conversationsQuery.isLoading ? 'Mensajes' : `Mensajes (${conversations.length})`

  return (
    <div className={selectedPhone ? 'space-y-0 md:space-y-4' : 'space-y-4'}>
      <div className={selectedPhone ? 'hidden md:block' : 'block'}>
        <div className="text-xs text-fg-subtle">WhatsApp</div>
        <h1 className="text-2xl font-bold text-fg">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Historial por teléfono. Envío de texto, imagen, audio y documento desde el panel.
        </p>
      </div>

      {conversationsQuery.isError && (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">
          {conversationsQuery.error instanceof Error
            ? conversationsQuery.error.message
            : 'No se pudieron cargar las conversaciones'}
        </div>
      )}

      {!conversationsQuery.isError && conversationsQuery.isLoading && (
        <StateNote kind="loading">Cargando conversaciones…</StateNote>
      )}

      {!conversationsQuery.isError &&
        !conversationsQuery.isLoading &&
        conversations.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-fg/[0.08] bg-card px-4 py-12 text-center">
            <MessageSquare className="h-8 w-8 text-fg-subtle" />
            <p className="text-sm text-fg-muted">
              Todavía no hay mensajes de WhatsApp en tu negocio.
            </p>
          </div>
        )}

      {!conversationsQuery.isError && !conversationsQuery.isLoading && conversations.length > 0 && (
        <div
          className={[
            'grid grid-rows-[1fr] overflow-hidden rounded-2xl border border-fg/[0.08] bg-card md:grid-cols-[340px_1fr]',
            selectedPhone
              ? 'h-[calc(100dvh-9rem-env(safe-area-inset-bottom))] md:h-[calc(100dvh-12rem)]'
              : 'h-[calc(100dvh-15rem-env(safe-area-inset-bottom))] min-h-[440px] md:h-[calc(100dvh-12rem)]',
          ].join(' ')}
        >
          <aside
            className={[
              'flex h-full min-h-0 min-w-0 flex-col border-fg/[0.08] md:border-r',
              selectedPhone ? 'hidden md:flex' : 'flex',
            ].join(' ')}
          >
            {/* Buscador y filtros rápidos */}
            <div className="shrink-0 space-y-2 border-b border-fg/[0.08] p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nombre o número…"
                  className="focus:border-[var(--tenant-primary)]/40 w-full rounded-xl border border-fg/[0.08] bg-fg/[0.04] py-1.5 pl-8 pr-7 text-base text-fg outline-none placeholder:text-fg-subtle md:text-xs"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-subtle hover:text-fg-soft"
                    aria-label="Limpiar búsqueda"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <ScrollFadeRow
                backgroundColor="rgb(var(--surface-rgb))"
                className="flex items-center gap-1.5 pb-0.5 text-xs"
              >
                <button
                  type="button"
                  onClick={() => setFilter('all')}
                  className={[
                    'shrink-0 min-h-10 rounded-lg px-3 text-xs md:min-h-8 font-medium transition-colors',
                    filter === 'all'
                      ? 'bg-fg/10 font-semibold text-fg'
                      : 'text-fg-muted hover:bg-fg/[0.04] hover:text-fg-soft',
                  ].join(' ')}
                >
                  Todos ({stats.total})
                </button>

                <button
                  type="button"
                  onClick={() => setFilter('active24h')}
                  className={[
                    'inline-flex shrink-0 items-center gap-1.5 min-h-10 rounded-lg px-3 text-xs md:min-h-8 font-medium transition-colors',
                    filter === 'active24h'
                      ? 'bg-emerald-500/20 font-semibold text-emerald-700 dark:text-emerald-300'
                      : 'text-fg-muted hover:bg-fg/[0.04] hover:text-fg-soft',
                  ].join(' ')}
                >
                  <span>24h activas</span>
                  {stats.count24h > 0 && (
                    <span className="rounded-full bg-emerald-500/30 px-1.5 py-0.5 text-[11px] text-emerald-800 dark:text-emerald-200">
                      {stats.count24h}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setFilter('paused')}
                  className={[
                    'inline-flex shrink-0 items-center gap-1.5 min-h-10 rounded-lg px-3 text-xs md:min-h-8 font-medium transition-colors',
                    filter === 'paused'
                      ? 'bg-amber-500/20 font-semibold text-amber-700 dark:text-amber-300'
                      : 'text-fg-muted hover:bg-fg/[0.04] hover:text-fg-soft',
                  ].join(' ')}
                >
                  <span>En pausa</span>
                  {stats.countPaused > 0 && (
                    <span className="rounded-full bg-amber-500/30 px-1.5 py-0.5 text-[11px] text-amber-800 dark:text-amber-200">
                      {stats.countPaused}
                    </span>
                  )}
                </button>
              </ScrollFadeRow>
            </div>

            {/* Listado de conversaciones filtradas */}
            {filteredConversations.length === 0 ? (
              <div className="flex flex-1 items-center justify-center p-6 text-center text-xs text-fg-subtle">
                {search || filter !== 'all'
                  ? 'No hay conversaciones que coincidan con los filtros.'
                  : 'No hay conversaciones registradas.'}
              </div>
            ) : (
              <ul className="flex-1 overflow-y-auto">
                {filteredConversations.map((c) => {
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
                  // El nombre ya muestra @usuario cuando no hay displayName.
                  const showUsername = c.isBsuid && !!c.waUsername && !!c.displayName
                  const avatarLabel = (c.displayName || c.waUsername || 'WA')
                    .trim()
                    .charAt(0)
                    .toUpperCase()
                  const badgeCount = c.inbound24h > 99 ? '99+' : String(c.inbound24h)

                  return (
                    <li key={c.phone}>
                      <button
                        type="button"
                        onClick={() => selectPhone(c.phone)}
                        className={[
                          'w-full border-b border-fg/[0.06] px-4 py-3 text-left transition-colors',
                          active
                            ? 'bg-[var(--tenant-primary)]/10 border-l-2 border-l-[var(--tenant-primary)]'
                            : 'hover:bg-fg/[0.04]',
                        ].join(' ')}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-fg/[0.08] text-xs font-bold text-fg-soft">
                            {avatarLabel}
                            {c.inbound24h > 0 && (
                              <span
                                className="absolute -right-1 -top-1 rounded-full bg-[var(--tenant-primary)] px-1.5 py-0.5 text-[11px] font-semibold leading-none text-[var(--tenant-on-primary)]"
                                title="Mensajes entrantes dentro de la ventana de 24h"
                              >
                                {badgeCount}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <span
                              className="block truncate text-sm font-semibold text-fg"
                              title={name}
                            >
                              {name}
                            </span>

                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                              {phoneLabel && (
                                <span className="font-mono text-[11px] text-fg-subtle">
                                  {phoneLabel}
                                </span>
                              )}
                              {showUsername && (
                                <span
                                  className="max-w-full truncate text-[11px] font-medium text-fg-subtle"
                                  title="Usuario de WhatsApp"
                                >
                                  @{c.waUsername}
                                </span>
                              )}
                              {c.isBsuid && !c.displayPhone && (
                                <span
                                  className="inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
                                  title="Meta no compartió el número (usuario oculto)"
                                >
                                  Sin teléfono
                                </span>
                              )}
                              {c.botPaused && (
                                <span className="inline-block rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                                  Asistente en pausa
                                </span>
                              )}
                              <span
                                className="text-[11px] text-fg-subtle"
                                title={formatAbsoluteWhen(c.lastAt, timezone)}
                              >
                                {formatRelativeTime(c.lastAt, timezone)}
                              </span>
                            </div>

                            <p className="mt-1 line-clamp-2 text-xs text-fg-muted">
                              {c.lastDirection === 'out' ? (
                                <span className="text-fg-subtle">Tú: </span>
                              ) : null}
                              {c.lastMessage}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </aside>

          <section
            className={[
              'h-full min-h-0 min-w-0 flex-col',
              selectedPhone ? 'flex' : 'hidden md:flex',
            ].join(' ')}
          >
            {!selected && (
              <div className="flex flex-1 items-center justify-center p-8 text-sm text-fg-subtle">
                {selectedPhone
                  ? 'No hay conversación con ese número en tu negocio.'
                  : 'Elige una conversación'}
              </div>
            )}

            {selected && (
              <MessageThread
                conversation={selected}
                timeZone={timezone}
                onBack={() => selectPhone(null)}
              />
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default function PanelWabaMensajesPage() {
  return (
    <Suspense fallback={<div className="text-sm text-fg-subtle">Cargando…</div>}>
      <PanelWabaMensajesContent />
    </Suspense>
  )
}
