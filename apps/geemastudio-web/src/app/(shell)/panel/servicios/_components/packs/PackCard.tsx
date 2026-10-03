'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'

import { useDeletePack, useTogglePackActive } from '@/hooks/servicios/usePacks'
import type { Pack } from '../../_services/packsService'
import { SavingIndicator } from '../shared/SavingIndicator'
import { useConfirm } from '@/components/ui/ConfirmDialog'

interface Props {
  pack: Pack
  onEdit: (pack: Pack) => void
}

export function PackCard({ pack, onEdit }: Props) {
  const deletePack = useDeletePack()
  const { confirm, dialog } = useConfirm()
  const toggleActive = useTogglePackActive()
  const [savingState, setSavingState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  async function handleToggle() {
    setSavingState('saving')
    try {
      await toggleActive.mutateAsync({
        id: pack.id,
        is_active: !pack.is_active,
      })
      setSavingState('saved')
      setTimeout(() => setSavingState('idle'), 2000)
    } catch {
      setSavingState('error')
      setTimeout(() => setSavingState('idle'), 3000)
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: `¿Eliminar el pack "${pack.name}"?`,
      confirmLabel: 'Eliminar',
      destructive: true,
    })
    if (!ok) return
    setSavingState('saving')
    try {
      await deletePack.mutateAsync(pack.id)
    } catch {
      setSavingState('error')
      setTimeout(() => setSavingState('idle'), 3000)
    }
  }

  return (
    <>
    <div
      className={`rounded-xl border border-fg/10 bg-fg/5 p-4 transition-opacity ${!pack.is_active ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-medium text-fg">
            {pack.emoji ? <span aria-hidden>{pack.emoji} </span> : null}
            {pack.name}
          </h3>
          {pack.description ? (
            <p className="mt-0.5 line-clamp-1 text-xs text-fg/50">{pack.description}</p>
          ) : null}
          <p className="mt-1 text-sm font-semibold text-tenant-text">
            {Number(pack.price).toLocaleString('es-VE', {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="mt-0.5 text-xs text-fg/30">
            {pack.service_ids.length} servicio
            {pack.service_ids.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <SavingIndicator state={savingState} />
          <button
            type="button"
            onClick={() => void handleToggle()}
            className={`relative h-6 w-11 rounded-full before:absolute before:-inset-y-2.5 before:inset-x-0 before:content-[''] transition-colors ${pack.is_active ? 'bg-[var(--tenant-primary)]' : 'bg-fg/20'}`}
            aria-label={pack.is_active ? 'Desactivar pack' : 'Activar pack'}
          >
            <span
              className={`absolute top-0.5 block h-5 w-5 rounded-full bg-white transition-transform ${pack.is_active ? 'left-[22px]' : 'left-0.5'}`}
            />
          </button>
          <button
            type="button"
            onClick={() => onEdit(pack)}
            className="p-1.5 text-fg/40 transition-colors hover:text-fg"
            aria-label="Editar pack"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deletePack.isPending}
            className="p-1.5 text-fg/40 transition-colors hover:text-red-700 disabled:opacity-30 dark:hover:text-red-400"
            aria-label="Eliminar pack"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
      {dialog}
    </>
  )
}
