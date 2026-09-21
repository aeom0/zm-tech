'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Loader2, Save, Trash2, UploadCloud } from 'lucide-react'

import { useImageUpload } from '@/hooks/waba/useImageUpload'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** Evita caché del navegador cuando la URL es la misma tras re-subir al mismo path en Storage. */
function urlVistaPrevia(url: string, nonce: number): string {
  if (!url.trim()) return ''
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}_vp=${nonce}`
}

function mensajeDeError(e: unknown): string {
  if (e instanceof Error) return e.message
  if (typeof e === 'object' && e !== null && 'message' in e) {
    const m = (e as { message?: unknown }).message
    if (typeof m === 'string' && m) return m
  }
  return 'No se pudo guardar'
}

export function ConfigImageCard({
  title,
  description,
  imageUrl,
  caption,
  onChangeImageUrl,
  onChangeCaption,
  onSave,
  saveLabel = 'Guardar cambios',
  uploadBucket,
  uploadPath,
}: {
  title: string
  description?: string
  imageUrl: string
  caption?: string
  onChangeImageUrl: (v: string) => void
  onChangeCaption?: (v: string) => void
  onSave: () => Promise<void>
  saveLabel?: string
  uploadBucket: string
  uploadPath: string
}) {
  const [state, setState] = useState<SaveState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [previewNonce, setPreviewNonce] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadState, uploadError, uploadImage } = useImageUpload()

  useEffect(() => {
    if (imageUrl.trim()) setPreviewNonce((n) => n + 1)
  }, [imageUrl])

  const canSave = useMemo(() => state !== 'saving' && uploadState !== 'uploading', [state, uploadState])

  const handleSave = async () => {
    setError(null)
    setState('saving')
    try {
      await onSave()
      setState('saved')
      setPreviewNonce((n) => n + 1)
      setTimeout(() => setState('idle'), 2800)
    } catch (e) {
      setState('error')
      setError(mensajeDeError(e))
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const url = await uploadImage(file, uploadBucket, uploadPath)
      onChangeImageUrl(url)
      setPreviewNonce((n) => n + 1)
    } catch {
      // uploadError ya se setea en el hook
    }
    e.target.value = ''
  }

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    try {
      const url = await uploadImage(file, uploadBucket, uploadPath)
      onChangeImageUrl(url)
      setPreviewNonce((n) => n + 1)
    } catch {
      // uploadError ya se setea en el hook
    }
  }

  const handleRemoveImage = () => {
    onChangeImageUrl('')
  }

  const srcVistaPrevia = imageUrl ? urlVistaPrevia(imageUrl, previewNonce) : ''

  return (
    <section className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03]">
      <div className="border-b border-white/[0.08] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">{title}</h2>
            {description && <p className="mt-1 text-sm text-zinc-400">{description}</p>}
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-[var(--tenant-primary)]/25 bg-[var(--tenant-primary)]/10 text-[var(--tenant-primary)] sm:h-10 sm:w-10">
            <UploadCloud className="h-5 w-5" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:gap-5 sm:p-5 lg:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0F0F0F]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview de URL arbitraria configurada por admin, tamaño variable, con fallback onError
            <img
              key={srcVistaPrevia}
              src={srcVistaPrevia}
              alt={caption || title}
              className="h-48 w-full object-contain sm:h-64"
            />
          ) : (
            <div className="flex h-48 items-center justify-center text-zinc-500 sm:h-64">Vista previa</div>
          )}
          {caption && (
            <div className="border-t border-white/[0.08] bg-white/[0.02] px-4 py-3 text-xs text-zinc-400">
              {caption}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-300">Imagen</label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => void handleFileChange(e)}
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => void handleDrop(e)}
              className={[
                'flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 transition-colors',
                uploadState === 'uploading'
                  ? 'pointer-events-none border-white/[0.08] bg-white/[0.02]'
                  : 'border-white/[0.12] hover:border-[var(--tenant-primary)]/50 hover:bg-[var(--tenant-primary)]/5',
              ].join(' ')}
            >
              {uploadState === 'uploading' ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-[var(--tenant-primary)]" />
                  <span className="text-sm text-zinc-400">Subiendo imagen…</span>
                </>
              ) : uploadState === 'success' ? (
                <>
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-300">Imagen lista ✓</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-6 w-6 text-zinc-500" />
                  <span className="text-center text-sm font-medium text-zinc-300">
                    Arrastra una imagen o haz clic para seleccionar
                  </span>
                  <span className="text-xs text-zinc-500">JPG, PNG o WebP · máx. 5 MB</span>
                </>
              )}
            </div>
            {imageUrl && (
              <button
                type="button"
                onClick={handleRemoveImage}
                className="mt-2 inline-flex items-center gap-1.5 text-sm text-red-300 hover:underline"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Quitar imagen
              </button>
            )}
          </div>

          {typeof caption === 'string' && onChangeCaption && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-300">Pie de foto (caption)</label>
              <input
                value={caption}
                onChange={(e) => onChangeCaption(e.target.value)}
                placeholder="Texto corto debajo de la imagen"
                className="w-full rounded-xl border border-white/[0.08] bg-[#0F0F0F] px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-[var(--tenant-primary)]/40"
              />
            </div>
          )}

          {uploadError && (
            <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {uploadError}
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {state === 'saved' && (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200"
            >
              Cambios guardados en el servidor. La vista previa refleja lo publicado.
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!canSave}
              onClick={() => void handleSave()}
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/15 px-4 py-2.5 text-sm font-semibold text-[var(--tenant-primary)] transition-opacity disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {state === 'saving' ? 'Guardando…' : state === 'saved' ? 'Guardado' : saveLabel}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
