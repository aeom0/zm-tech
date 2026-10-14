'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { FormError } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'

type ReorderItem = { id: string; name: string; muted?: boolean }

/**
 * Ordena una lista con flechas (teclado y táctil sin arrastrar).
 * Montar solo mientras está abierto: el orden se inicializa al montar.
 */
export function ReorderModal({
  title,
  subtitle,
  items,
  onClose,
  onSave,
}: {
  title: string
  subtitle?: string
  items: ReorderItem[]
  onClose: () => void
  onSave: (orderedIds: string[]) => Promise<void>
}) {
  const [order, setOrder] = useState(items)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const changed = order.some((item, i) => item.id !== items[i]?.id)

  const move = (index: number, delta: -1 | 1) => {
    const target = index + delta
    if (target < 0 || target >= order.length) return
    setOrder((prev) => {
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave(order.map((i) => i.id))
      onClose()
    } catch (err) {
      setError((err as Error).message || 'No se pudo guardar el orden.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={title}
      description={subtitle}
      icon={<ArrowUpDown className="h-5 w-5 text-[var(--tenant-primary)]" />}
      size="sm"
      onClose={onClose}
      dismissible={!saving}
      footer={
        <>
          <Button onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button variant="primary" loading={saving} disabled={!changed} onClick={handleSave}>
            Guardar orden
          </Button>
        </>
      }
    >
      <FormError message={error} />
      <p className="mb-3 text-xs text-fg-muted">
        Así se muestran en la app, la web pública y el bot de WhatsApp.
      </p>
      <ol className="space-y-1.5">
        {order.map((item, index) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-xl border border-line bg-fg/[0.02] py-1.5 pl-3 pr-1.5"
          >
            <span className="w-5 text-xs tabular-nums text-fg-subtle">{index + 1}</span>
            <span
              className={[
                'min-w-0 flex-1 truncate text-sm',
                item.muted ? 'text-fg-subtle' : 'text-fg',
              ].join(' ')}
            >
              {item.name}
            </span>
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={index === 0 || saving}
              aria-label={`Subir ${item.name}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-soft hover:bg-fg/[0.06] disabled:opacity-30"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={index === order.length - 1 || saving}
              aria-label={`Bajar ${item.name}`}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-fg-soft hover:bg-fg/[0.06] disabled:opacity-30"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ol>
    </Modal>
  )
}
