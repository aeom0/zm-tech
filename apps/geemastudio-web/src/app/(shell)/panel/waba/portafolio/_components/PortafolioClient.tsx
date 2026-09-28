'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Images, Lock, RefreshCw } from 'lucide-react'

import { ConfigImageCard } from '@/components/waba/ConfigImageCard'
import { supabase } from '@/lib/supabase'
import {
  emptySlots,
  PORTFOLIO_SLOTS,
  usePortfolioCatalog,
  usePortfolioImageCounts,
  useServicePortfolioSlots,
  useMoveSlotMutation,
  type PortfolioSlot,
} from '@/hooks/waba/usePortfolioConfig'

/** Gate admin local: `/panel` no expone AuthContext. */
function useIsAdmin() {
  return useQuery({
    queryKey: ['web_waba_portafolio_is_admin'],
    enabled: !!supabase,
    queryFn: async (): Promise<boolean> => {
      if (!supabase) throw new Error('Supabase no está configurado')
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return false
      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      const role = (data as { role?: string } | null)?.role
      return role === 'dev' || role === 'owner'
    },
  })
}

export function PortafolioClient() {
  const isAdminQuery = useIsAdmin()
  const catalog = usePortfolioCatalog()
  const counts = usePortfolioImageCounts()

  const categories = useMemo(() => catalog.data?.categories ?? [], [catalog.data])
  const services = useMemo(() => catalog.data?.services ?? [], [catalog.data])

  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [activeServiceId, setActiveServiceId] = useState<string | null>(null)
  const [localSlots, setLocalSlots] = useState<PortfolioSlot[]>(emptySlots())

  const { query: slotsQuery, saveSlot, isSaving } = useServicePortfolioSlots(activeServiceId)
  const { moveSlot } = useMoveSlotMutation()
  const [moveTargets, setMoveTargets] = useState<Record<number, string>>({})
  const [movingIndex, setMovingIndex] = useState<number | null>(null)
  const [moveError, setMoveError] = useState<string | null>(null)

  useEffect(() => {
    if (categories.length === 0) return
    if (!activeCat || !categories.some((c) => c.id === activeCat)) {
      setActiveCat(categories[0].id)
    }
  }, [categories, activeCat])

  const servicesInCat = services.filter((s) => s.category_id === activeCat)

  useEffect(() => {
    if (servicesInCat.length === 0) {
      setActiveServiceId(null)
      return
    }
    if (!activeServiceId || !servicesInCat.some((s) => s.id === activeServiceId)) {
      const withPhotos = servicesInCat.find((s) => (counts.data?.[s.id] ?? 0) > 0)
      setActiveServiceId(withPhotos?.id ?? servicesInCat[0].id)
    }
  }, [servicesInCat, activeServiceId, counts.data])

  useEffect(() => {
    if (slotsQuery.data) {
      setLocalSlots(slotsQuery.data)
    } else if (!activeServiceId) {
      setLocalSlots(emptySlots())
    }
  }, [slotsQuery.data, activeServiceId])

  if (isAdminQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-zinc-400">Cargando…</div>
      </div>
    )
  }

  if (!isAdminQuery.data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-6 py-16 text-center">
        <Lock className="h-8 w-8 text-zinc-500" />
        <p className="text-sm text-zinc-400">
          Solo owners y developers pueden gestionar el portafolio.
        </p>
      </div>
    )
  }

  const activeService = services.find((s) => s.id === activeServiceId)
  const activeCatName = categories.find((c) => c.id === activeCat)?.name ?? activeCat ?? ''

  const refetchAll = () => {
    catalog.refetch()
    counts.refetch()
    slotsQuery.refetch()
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-[var(--tenant-primary)]">
            <Images className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-wide">WhatsApp</span>
          </div>
          <h1 className="text-xl font-bold text-white sm:text-2xl">Portafolio de trabajos</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Hasta {PORTFOLIO_SLOTS} fotos por servicio del catálogo. Cuando un cliente pide ver
            trabajos, el bot envía las del servicio concreto (o una lista si solo indica el rubro).
          </p>
        </div>
        <button
          type="button"
          onClick={refetchAll}
          className="inline-flex min-h-[36px] shrink-0 items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              catalog.isFetching || counts.isFetching || slotsQuery.isFetching ? 'animate-spin' : ''
            }`}
          />
          Actualizar
        </button>
      </div>

      {(catalog.error || counts.error || slotsQuery.error) && (
        <div
          role="alert"
          className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          No se pudo cargar el portafolio. Inténtalo de nuevo.
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const catSvcs = services.filter((s) => s.category_id === cat.id)
          const filled = catSvcs.reduce((n, s) => n + (counts.data?.[s.id] ?? 0), 0)
          const active = cat.id === activeCat
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCat(cat.id)
                setActiveServiceId(null)
              }}
              className={[
                'inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
                active
                  ? 'border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)]'
                  : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]',
              ].join(' ')}
            >
              {cat.name}
              {filled > 0 && (
                <span className="text-[10px] font-normal opacity-70">
                  {filled} foto{filled !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {catalog.isLoading ? (
        <p className="text-sm text-zinc-500">Cargando catálogo…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[minmax(12rem,18rem)_1fr] sm:items-start sm:gap-6">
          <div className="sm:hidden">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Servicio — {activeCatName}
            </label>
            {servicesInCat.length === 0 ? (
              <p className="text-sm text-zinc-500">Sin servicios activos.</p>
            ) : (
              <select
                value={activeServiceId ?? ''}
                onChange={(e) => setActiveServiceId(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-zinc-900 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/40"
              >
                {servicesInCat.map((svc) => {
                  const n = counts.data?.[svc.id] ?? 0
                  return (
                    <option key={svc.id} value={svc.id}>
                      {svc.name}{' '}
                      {n > 0 ? `· ${n}/${PORTFOLIO_SLOTS} fotos` : '· sin fotos'}
                    </option>
                  )
                })}
              </select>
            )}
          </div>

          <div className="hidden max-h-[min(32rem,calc(100vh-14rem))] min-h-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.03] sm:flex sm:flex-col">
            <p className="shrink-0 border-b border-white/[0.06] px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Servicios — {activeCatName}
            </p>
            <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain p-1.5">
              {servicesInCat.length === 0 ? (
                <p className="px-2 py-3 text-sm text-zinc-500">Sin servicios activos.</p>
              ) : (
                servicesInCat.map((svc) => {
                  const n = counts.data?.[svc.id] ?? 0
                  const active = svc.id === activeServiceId
                  const label =
                    (svc.name && svc.name.trim()) ||
                    (svc.short_name && svc.short_name.trim()) ||
                    'Sin nombre'
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      title={label}
                      onClick={() => setActiveServiceId(svc.id)}
                      className={[
                        'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                        active
                          ? 'border-[var(--tenant-primary)]/50 bg-[var(--tenant-primary)]/15'
                          : 'border-transparent hover:bg-white/[0.06]',
                      ].join(' ')}
                    >
                      <span
                        className={[
                          'block break-words font-medium leading-snug',
                          active ? 'text-white' : 'text-zinc-200',
                        ].join(' ')}
                      >
                        {label}
                      </span>
                      <span
                        className={[
                          'mt-0.5 block text-[10px] leading-tight',
                          n > 0 ? 'text-[var(--tenant-primary)]' : 'text-zinc-500',
                        ].join(' ')}
                      >
                        {n > 0 ? `${n}/${PORTFOLIO_SLOTS} fotos` : 'Sin fotos'}
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            {!activeServiceId || !activeService ? (
              <p className="text-sm text-zinc-500">Elige un servicio para subir fotos.</p>
            ) : slotsQuery.isLoading ? (
              <p className="text-sm text-zinc-500">Cargando imágenes…</p>
            ) : (
              <>
                <p className="text-xs text-zinc-400">
                  Servicio:{' '}
                  <strong className="text-zinc-100">{activeService.name}</strong>. Sube JPG/PNG/WebP
                  (máx. 5 MB). Caption vacío → se usa el nombre del servicio al enviar.
                  {isSaving ? ' Guardando…' : ''}
                </p>

                {localSlots.map((slot, index) => (
                  <div key={`${activeServiceId}-${index}-${slot.id ?? 'new'}`}>
                    <ConfigImageCard
                      title={`Foto ${index + 1} — ${activeService.short_name || activeService.name}`}
                      description={
                        index === 0
                          ? 'Primera imagen de este servicio.'
                          : 'Opcional. Se envía solo si tiene URL.'
                      }
                      imageUrl={slot.url}
                      caption={slot.caption}
                      onChangeImageUrl={(url) => {
                        setLocalSlots((prev) => {
                          const next = [...prev]
                          next[index] = { ...next[index], url }
                          return next
                        })
                      }}
                      onChangeCaption={(caption) => {
                        setLocalSlots((prev) => {
                          const next = [...prev]
                          next[index] = { ...next[index], caption }
                          return next
                        })
                      }}
                      onSave={async () => {
                        const current = localSlots[index]
                        await saveSlot({
                          serviceId: activeServiceId,
                          sortOrder: index,
                          url: current.url,
                          caption: current.caption,
                          existingId: current.id,
                        })
                      }}
                      saveLabel="Guardar foto"
                      uploadBucket="waba-images"
                      uploadPath={`portfolio/${activeServiceId}/${index + 1}.jpg`}
                    />

                    {slot.id && (
                      <div className="mb-2 mt-2 flex flex-wrap items-center gap-2 px-1">
                        <select
                          value={moveTargets[index] ?? ''}
                          onChange={(e) =>
                            setMoveTargets((prev) => ({
                              ...prev,
                              [index]: e.target.value,
                            }))
                          }
                          className="min-w-0 flex-1 rounded-lg border border-white/[0.08] bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/40"
                        >
                          <option value="">Mover a otro servicio…</option>
                          {services
                            .filter((s) => s.id !== activeServiceId)
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {categories.find((c) => c.id === s.category_id)?.name ??
                                  s.category_id}{' '}
                                · {s.name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          disabled={!moveTargets[index] || movingIndex === index}
                          onClick={async () => {
                            const target = moveTargets[index]
                            if (!target || !slot.id || !activeServiceId) return
                            setMoveError(null)
                            setMovingIndex(index)
                            try {
                              await moveSlot({
                                existingId: slot.id,
                                sourceServiceId: activeServiceId,
                                targetServiceId: target,
                              })
                              setMoveTargets((prev) => {
                                const next = { ...prev }
                                delete next[index]
                                return next
                              })
                            } catch (e) {
                              setMoveError(
                                e instanceof Error ? e.message : 'No se pudo mover la foto',
                              )
                            } finally {
                              setMovingIndex(null)
                            }
                          }}
                          className="shrink-0 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-white/[0.06] disabled:opacity-50"
                        >
                          {movingIndex === index ? 'Moviendo…' : 'Mover'}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {moveError && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200"
                  >
                    {moveError}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
