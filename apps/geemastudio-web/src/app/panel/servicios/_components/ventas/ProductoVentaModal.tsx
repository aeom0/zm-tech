'use client'

import { useMemo, useState } from 'react'

import type { ProductOrderSource, Producto } from '@/app/panel/servicios/_services/productosService'

export function ProductoVentaModal({
  products,
  busy,
  onClose,
  onSave,
}: {
  products: Producto[]
  busy: boolean
  onClose: () => void
  onSave: (input: {
    inventory_item_id: string
    quantity: number
    unit_price: number
    client_name: string
    client_phone: string
    source: ProductOrderSource
    notes: string
  }) => void
}) {
  const [itemId, setItemId] = useState(products[0]?.id ?? '')
  const [quantity, setQuantity] = useState('1')
  const [clientName, setClientName] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [source, setSource] = useState<ProductOrderSource>('whatsapp')
  const [notes, setNotes] = useState('')
  const selected = useMemo(
    () => products.find((product) => product.id === itemId),
    [itemId, products]
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <button type="button" aria-label="Cerrar" className="absolute inset-0" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-[#1a1d26] p-5 sm:rounded-2xl">
        <h2 className="mb-4 text-lg font-semibold text-white">Nuevo apartado</h2>
        <div className="space-y-3">
          <Field label="Producto">
            <select
              value={itemId}
              onChange={(event) => setItemId(event.target.value)}
              className="field"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} — S/{Number(product.price ?? 0).toFixed(2)} · stock{' '}
                  {product.quantity}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Cantidad">
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="field"
            />
          </Field>
          <Field label="Clienta">
            <input
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Nombre"
              className="field"
            />
          </Field>
          <Field label="Teléfono">
            <input
              value={clientPhone}
              onChange={(event) => setClientPhone(event.target.value)}
              placeholder="519…"
              className="field"
            />
          </Field>
          <Field label="Origen">
            <select
              value={source}
              onChange={(event) => setSource(event.target.value as ProductOrderSource)}
              className="field"
            >
              <option value="whatsapp">WhatsApp</option>
              <option value="promo">Promo WA</option>
              <option value="salon">Salón</option>
            </select>
          </Field>
          <Field label="Notas">
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              className="field"
            />
          </Field>
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm text-white/50">
            Cancelar
          </button>
          <button
            type="button"
            disabled={busy || !selected}
            onClick={() =>
              selected &&
              onSave({
                inventory_item_id: selected.id,
                quantity: Math.max(1, Number(quantity) || 1),
                unit_price: Number(selected.price ?? 0),
                client_name: clientName,
                client_phone: clientPhone,
                source,
                notes,
              })
            }
            className="rounded-lg bg-[var(--tenant-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Guardando…' : 'Apartar'}
          </button>
        </div>
      </div>
      <style jsx>{`
        .field {
          margin-top: 0.25rem;
          min-height: 2.5rem;
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(255 255 255 / 0.1);
          background: rgb(255 255 255 / 0.05);
          padding: 0.5rem 0.75rem;
          color: white;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs text-white/50">
      {label}
      {children}
    </label>
  )
}
