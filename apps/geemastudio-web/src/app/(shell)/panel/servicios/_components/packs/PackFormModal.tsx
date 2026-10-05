'use client'

import { useState } from 'react'

import { useCreatePack, useUpdatePack } from '@/hooks/servicios/usePacks'
import type { Pack } from '../../_services/packsService'
import { DEFAULT_CATALOG_EMOJI, EmojiPicker, PACK_QUICK_EMOJIS } from '../shared/EmojiPicker'
import { ServicePickerCheckbox } from './ServicePickerCheckbox'

interface Props {
  open: boolean
  pack?: Pack | null
  onClose: () => void
}

type FormState = {
  name: string
  emoji: string
  description: string
  price: string
  slot_minutes: string
  service_ids: string[]
  is_active: boolean
}

const EMPTY: FormState = {
  name: '',
  emoji: DEFAULT_CATALOG_EMOJI,
  description: '',
  price: '',
  slot_minutes: '',
  service_ids: [],
  is_active: true,
}

function formFromPack(pack: Pack): FormState {
  return {
    name: pack.name,
    emoji: pack.emoji || DEFAULT_CATALOG_EMOJI,
    description: pack.description ?? '',
    price: String(pack.price).replace('.', ','),
    slot_minutes: pack.slot_minutes ? String(pack.slot_minutes) : '',
    service_ids: pack.service_ids,
    is_active: pack.is_active,
  }
}

export function PackFormModal({ open, pack, onClose }: Props) {
  if (!open) return null

  return <PackFormModalInner key={pack?.id ?? 'new'} pack={pack} onClose={onClose} />
}

function PackFormModalInner({ pack, onClose }: { pack?: Pack | null; onClose: () => void }) {
  const [form, setForm] = useState<FormState>(() => (pack ? formFromPack(pack) : EMPTY))
  const create = useCreatePack()
  const update = useUpdatePack()
  const isPending = create.isPending || update.isPending

  async function handleSubmit() {
    const price = Number.parseFloat(form.price.replace(',', '.'))
    if (!form.name.trim() || Number.isNaN(price)) return

    const input = {
      name: form.name.trim(),
      emoji: form.emoji.trim() || DEFAULT_CATALOG_EMOJI,
      description: form.description.trim() || null,
      price,
      service_ids: form.service_ids,
      is_active: form.is_active,
      slot_minutes: Number.parseInt(form.slot_minutes, 10) > 0 ? Number.parseInt(form.slot_minutes, 10) : null,
    }

    if (pack) {
      await update.mutateAsync({ id: pack.id, input })
    } else {
      await create.mutateAsync(input)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-scrim/60 backdrop-blur-sm sm:items-center sm:p-4">
      <div className="max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-t-2xl border border-fg/10 bg-surface p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:rounded-2xl">
        <h2 className="text-lg font-semibold text-fg">{pack ? 'Editar pack' : 'Nuevo pack'}</h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-fg/50">Nombre *</label>
            <input
              className="w-full rounded-lg border border-fg/10 bg-fg/5 px-3 py-2 text-base text-fg focus:border-[var(--tenant-primary)] focus:outline-none md:text-sm"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Pack novias"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-fg/50">Emoji</label>
            <EmojiPicker
              emojis={PACK_QUICK_EMOJIS}
              value={form.emoji}
              onChange={(emoji) => setForm((f) => ({ ...f, emoji }))}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-fg/50">Descripción</label>
            <textarea
              className="w-full resize-none rounded-lg border border-fg/10 bg-fg/5 px-3 py-2 text-base text-fg focus:border-[var(--tenant-primary)] focus:outline-none md:text-sm"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              placeholder="Opcional"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-fg/50">Precio *</label>
            <input
              className="w-full rounded-lg border border-fg/10 bg-fg/5 px-3 py-2 text-base text-fg focus:border-[var(--tenant-primary)] focus:outline-none md:text-sm"
              value={form.price}
              onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-fg/50">Duración en agenda (min)</label>
            <input
              className="w-full rounded-lg border border-fg/10 bg-fg/5 px-3 py-2 text-base text-fg focus:border-[var(--tenant-primary)] focus:outline-none md:text-sm"
              value={form.slot_minutes}
              onChange={(e) =>
                setForm((f) => ({ ...f, slot_minutes: e.target.value.replace(/\D/g, '') }))
              }
              placeholder="Vacío = suma de los servicios"
              inputMode="numeric"
            />
            <p className="mt-1 text-xs text-fg/40">
              Si lo llenas, el bot usa este tiempo (incluye limpieza) en lugar de sumar las
              duraciones.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs text-fg/50">
              Servicios incluidos ({form.service_ids.length} seleccionados)
            </label>
            <div className="rounded-lg border border-fg/10 bg-fg/5 p-2">
              <ServicePickerCheckbox
                selectedIds={form.service_ids}
                onChange={(ids) => setForm((f) => ({ ...f, service_ids: ids }))}
              />
            </div>
          </div>

          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
              className="h-5 w-5 accent-[var(--tenant-primary)]"
            />
            <span className="text-sm text-fg/70">Activo</span>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-fg/60 transition-colors hover:text-fg"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isPending}
            className="rounded-lg bg-[var(--tenant-primary)] px-4 py-2 text-sm text-[var(--tenant-on-primary)] transition-colors hover:bg-[var(--tenant-primary-hover)] disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : pack ? 'Actualizar' : 'Crear pack'}
          </button>
        </div>
      </div>
    </div>
  )
}
