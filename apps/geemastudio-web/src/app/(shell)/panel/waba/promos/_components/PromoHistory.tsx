'use client'

import { CheckCircle2, Clock, Trash2, XCircle } from 'lucide-react'
import type { PromoBroadcast, PromoBroadcastStatus } from '@geemastudio/data'
import { formatoInstanteEnZona, zonaIANASegura } from '@zmtech/tenant-config'

import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { StateNote } from '@/components/ui/StateNote'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import { useDeletePromo, usePromoHistory } from '@/hooks/promos/usePromos'

const STATUS_LABEL: Record<PromoBroadcastStatus, string> = {
  draft: 'Borrador',
  sending: 'Enviando',
  done: 'Enviada',
  failed: 'Con errores',
}

const STATUS_TONE: Record<PromoBroadcastStatus, string> = {
  draft: 'bg-fg/[0.06] text-fg-muted',
  sending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  done: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-red-500/10 text-red-600 dark:text-red-400',
}

export function PromoHistory() {
  const { data, isLoading, error } = usePromoHistory()
  const { data: settings } = useTenantSettings()
  const timeZone = zonaIANASegura(settings?.timezone)
  const del = useDeletePromo()
  const { confirm, dialog } = useConfirm()

  const handleDelete = async (b: PromoBroadcast) => {
    const ok = await confirm({
      title: 'Eliminar promo',
      description: `Se borrará «${b.title}» del historial junto con su imagen. Los mensajes ya enviados no se retiran.`,
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (ok) del.mutate(b)
  }

  if (isLoading) return <StateNote kind="loading">Cargando historial…</StateNote>
  if (error) return <StateNote kind="error">No se pudo cargar el historial. Intenta de nuevo.</StateNote>
  if (!data?.length) return <StateNote kind="empty">Aún no hay promos enviadas.</StateNote>

  return (
    <div className="space-y-3">
      {del.error ? (
        <StateNote kind="error">No se pudo eliminar la promo. Intenta de nuevo.</StateNote>
      ) : null}
      <ul className="space-y-3">
        {data.map((b) => (
          <li
            key={b.id}
            className="flex gap-3 rounded-2xl border border-line bg-surface p-3 sm:gap-4 sm:p-4"
          >
            {b.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.image_url}
                alt=""
                className="h-16 w-16 shrink-0 rounded-xl object-cover sm:h-20 sm:w-20"
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-sm font-semibold text-fg">{b.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_TONE[b.status]}`}>
                  {STATUS_LABEL[b.status]}
                </span>
              </div>
              <p className="mt-1 line-clamp-2 text-xs text-fg-muted">{b.body_text}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-subtle">
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" aria-hidden />
                  {formatoInstanteEnZona(b.sent_at ?? b.created_at, timeZone, 'es', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: false,
                  })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" aria-hidden />
                  {b.total_sent} enviadas
                </span>
                {b.total_failed > 0 ? (
                  <span className="inline-flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-red-500" aria-hidden />
                    {b.total_failed} fallidas
                  </span>
                ) : null}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<Trash2 className="h-4 w-4" />}
              aria-label={`Eliminar ${b.title}`}
              disabled={b.status === 'sending' || del.isPending}
              onClick={() => handleDelete(b)}
            />
          </li>
        ))}
      </ul>
      {dialog}
    </div>
  )
}
