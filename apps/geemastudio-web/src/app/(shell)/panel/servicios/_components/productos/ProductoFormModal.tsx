'use client'

import { useRef, useState } from 'react'
import { CheckCircle2, Loader2, Trash2, UploadCloud } from 'lucide-react'

import { useImageUpload } from '@/hooks/waba/useImageUpload'
import { useCreateProducto, useUpdateProducto } from '@/hooks/servicios/useProductos'
import type { Producto } from '../../_services/productosService'

const PRODUCT_IMAGES_BUCKET = 'product-images'

interface Props {
  open: boolean
  producto?: Producto | null
  onClose: () => void
}

type FormState = {
  name: string
  description: string
  price: string
  quantity: string
  min_stock: string
  unit: string
  category: string
  image_url: string
}

const EMPTY: FormState = {
  name: '',
  description: '',
  price: '',
  quantity: '0',
  min_stock: '0',
  unit: 'unidad',
  category: '',
  image_url: '',
}

function formFromProducto(p: Producto): FormState {
  return {
    name: p.name,
    description: p.description ?? '',
    price: p.price != null ? String(p.price).replace('.', ',') : '',
    quantity: String(p.quantity),
    min_stock: String(p.min_stock),
    unit: p.unit,
    category: p.category ?? '',
    image_url: p.image_url ?? '',
  }
}

export function ProductoFormModal({ open, producto, onClose }: Props) {
  if (!open) return null

  return <ProductoFormModalInner key={producto?.id ?? 'new'} producto={producto} onClose={onClose} />
}

function ProductoFormModalInner({
  producto,
  onClose,
}: {
  producto?: Producto | null
  onClose: () => void
}) {
  const [form, setForm] = useState<FormState>(() => (producto ? formFromProducto(producto) : EMPTY))
  const create = useCreateProducto()
  const update = useUpdateProducto()
  const isPending = create.isPending || update.isPending

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadState, uploadError, uploadImage } = useImageUpload()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const path = `${producto?.id ?? 'new'}/${Date.now()}.${file.name.split('.').pop() ?? 'jpg'}`
      const url = await uploadImage(file, PRODUCT_IMAGES_BUCKET, path)
      setForm((f) => ({ ...f, image_url: url }))
    } catch {
      // uploadError ya se setea en el hook
    }
    e.target.value = ''
  }

  async function handleSubmit() {
    if (!form.name.trim()) return
    const price = form.price.trim() ? Number.parseFloat(form.price.replace(',', '.')) : null
    if (form.price.trim() && Number.isNaN(price)) return
    const quantity = Number.parseInt(form.quantity, 10) || 0
    const min_stock = Number.parseInt(form.min_stock, 10) || 0

    const input = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      quantity,
      min_stock,
      unit: form.unit.trim() || 'unidad',
      category: form.category.trim() || null,
      image_url: form.image_url || null,
    }

    if (producto) {
      await update.mutateAsync({ id: producto.id, input })
    } else {
      await create.mutateAsync(input)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-xl border border-white/10 bg-[#1a1d26] p-6">
        <h2 className="text-lg font-semibold text-white">
          {producto ? 'Editar producto' : 'Nuevo producto'}
        </h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">Imagen</label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void handleFileChange(e)}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={[
                'flex w-full cursor-pointer items-center gap-3 rounded-lg border-2 border-dashed px-3 py-3 transition-colors',
                uploadState === 'uploading'
                  ? 'pointer-events-none border-white/10 bg-white/5'
                  : 'border-white/10 hover:border-[var(--tenant-primary)]/50 hover:bg-[var(--tenant-primary)]/5',
              ].join(' ')}
            >
              {form.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- preview de URL de Storage
                <img src={form.image_url} alt="" className="h-12 w-12 rounded-md object-cover" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-md bg-white/5 text-white/30">
                  <UploadCloud className="h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1 text-sm">
                {uploadState === 'uploading' ? (
                  <span className="inline-flex items-center gap-1.5 text-white/60">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Subiendo…
                  </span>
                ) : uploadState === 'success' ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Imagen lista
                  </span>
                ) : (
                  <span className="text-white/50">Haz clic para subir una foto</span>
                )}
                <p className="text-xs text-white/30">JPG, PNG o WebP · máx. 5 MB</p>
              </div>
            </div>
            {form.image_url && (
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, image_url: '' }))}
                className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-red-300 hover:underline"
              >
                <Trash2 className="h-3 w-3" />
                Quitar imagen
              </button>
            )}
            {uploadError && <p className="mt-1.5 text-xs text-red-300">{uploadError}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">Nombre *</label>
            <input
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--tenant-primary)] focus:outline-none"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Kit cuidado pestañas"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">Descripción</label>
            <textarea
              className="w-full resize-none rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--tenant-primary)] focus:outline-none"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Qué incluye, para qué sirve, cómo se usa"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-white/50">Precio</label>
              <input
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--tenant-primary)] focus:outline-none"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                placeholder="0,00"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Unidad</label>
              <input
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--tenant-primary)] focus:outline-none"
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                placeholder="unidad, kit, ml..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-white/50">Cantidad en stock</label>
              <input
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--tenant-primary)] focus:outline-none"
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/50">Stock mínimo</label>
              <input
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--tenant-primary)] focus:outline-none"
                value={form.min_stock}
                onChange={(e) => setForm((f) => ({ ...f, min_stock: e.target.value }))}
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs text-white/50">Categoría</label>
            <input
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-[var(--tenant-primary)] focus:outline-none"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-white/60 transition-colors hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={isPending}
            className="rounded-lg bg-[var(--tenant-primary)] px-4 py-2 text-sm text-white transition-colors hover:bg-[var(--tenant-primary-hover)] disabled:opacity-50"
          >
            {isPending ? 'Guardando...' : producto ? 'Actualizar' : 'Crear producto'}
          </button>
        </div>
      </div>
    </div>
  )
}
