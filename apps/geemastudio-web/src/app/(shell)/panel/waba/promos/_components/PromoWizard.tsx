'use client'

import { useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Search,
  Send,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react'
import {
  normalizePromoBody,
  PROMO_BODY_MAX,
  PROMO_TEMPLATE,
  type PromoBroadcast,
  type PromoRecipient,
} from '@geemastudio/data'

import { Button } from '@/components/ui/Button'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { Field, FormError, inputClass } from '@/components/ui/Field'
import { FilterChips } from '@/components/ui/FilterChips'
import { StateNote } from '@/components/ui/StateNote'
import { useTenantSettings } from '@/hooks/configuracion/useTenantSettings'
import {
  usePromoSegment,
  useSendPromo,
  useUploadPromoImage,
  type PromoSendOutcome,
} from '@/hooks/promos/usePromos'
import { useCategorias } from '@/hooks/servicios/useCategorias'

type Step = 'config' | 'clientas' | 'preview' | 'enviando' | 'resultado'

const STEPS: { id: Step; label: string }[] = [
  { id: 'config', label: 'Promo' },
  { id: 'clientas', label: 'Clientas' },
  { id: 'preview', label: 'Revisión' },
  { id: 'enviando', label: 'Envío' },
  { id: 'resultado', label: 'Resultado' },
]

const MAX_IMAGE_BYTES = 5 * 1024 * 1024

function lastVisitLabel(days: number | null): string {
  if (days == null) return 'Sin visitas'
  if (days <= 0) return 'Vino hoy'
  if (days === 1) return 'Hace 1 día'
  if (days < 7) return `Hace ${days} días`
  if (days < 56) return `Hace ${Math.floor(days / 7)} semanas`
  return `Hace ~${Math.floor(days / 30)} meses`
}

export function PromoWizard({ onShowHistory }: { onShowHistory: () => void }) {
  const { data: settings } = useTenantSettings()
  const { confirm, dialog } = useConfirm()
  const [step, setStep] = useState<Step>('config')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [selected, setSelected] = useState<Map<string, PromoRecipient>>(new Map())
  const [progress, setProgress] = useState<PromoBroadcast | null>(null)
  const [outcome, setOutcome] = useState<PromoSendOutcome | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Si ya se creó la campaña, un error lleva al resultado (puede haber envíos hechos).
  const createdRef = useRef(false)
  const send = useSendPromo((b) => {
    createdRef.current = true
    setProgress(b)
  })
  const recipients = useMemo(() => [...selected.values()], [selected])
  const stepIndex = STEPS.findIndex((s) => s.id === step)

  const reset = () => {
    setStep('config')
    setTitle('')
    setBody('')
    setImageUrl(null)
    setSelected(new Map())
    setProgress(null)
    setOutcome(null)
    setError(null)
    send.reset()
  }

  const handleSend = async () => {
    if (!imageUrl || recipients.length === 0) return
    const ok = await confirm({
      title: 'Enviar promo',
      description: `Se enviará por WhatsApp a ${recipients.length} ${recipients.length === 1 ? 'clienta' : 'clientas'}. No se puede deshacer.`,
      confirmLabel: 'Enviar',
      destructive: true,
    })
    if (!ok) return
    setError(null)
    setProgress(null)
    createdRef.current = false
    setStep('enviando')
    send.mutate(
      { title, bodyText: body, imageUrl, recipients },
      {
        onSuccess: (res) => {
          setOutcome(res)
          setStep('resultado')
        },
        onError: (e) => {
          setError(e.message)
          setStep(createdRef.current ? 'resultado' : 'preview')
        },
      }
    )
  }

  return (
    <div className="space-y-5">
      {dialog}
      <ol className="flex flex-wrap gap-2 text-xs" aria-label="Pasos">
        {STEPS.map((s, i) => (
          <li
            key={s.id}
            aria-current={i === stepIndex ? 'step' : undefined}
            className={[
              'rounded-full px-3 py-1 font-semibold',
              i === stepIndex
                ? 'bg-[var(--tenant-primary)] text-[var(--tenant-on-primary)]'
                : i < stepIndex
                  ? 'bg-fg/[0.08] text-fg-soft'
                  : 'bg-fg/[0.03] text-fg-subtle',
            ].join(' ')}
          >
            {i + 1}. {s.label}
          </li>
        ))}
      </ol>

      <FormError message={error} />

      {step === 'config' && (
        <ConfigStep
          title={title}
          body={body}
          imageUrl={imageUrl}
          onTitle={setTitle}
          onBody={setBody}
          onImage={setImageUrl}
          onNext={() => setStep('clientas')}
        />
      )}

      {step === 'clientas' && (
        <RecipientsStep
          selected={selected}
          onChange={setSelected}
          onBack={() => setStep('config')}
          onNext={() => setStep('preview')}
        />
      )}

      {step === 'preview' && imageUrl && (
        <div className="space-y-5">
          <div className="max-w-sm rounded-2xl border border-line bg-card p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Imagen de la promo" className="mb-3 max-h-64 w-full rounded-xl object-cover" />
            <p className="text-sm font-semibold text-fg">Hola {recipients[0]?.name.split(' ')[0] ?? 'María'}</p>
            <p className="mt-1 whitespace-pre-line text-sm text-fg-soft">{normalizePromoBody(body)}</p>
            <p className="mt-3 text-xs text-fg-subtle">{settings?.business_name}</p>
          </div>
          <p className="text-xs text-fg-subtle">
            Vista aproximada. El saludo y el cierre los pone la plantilla «{PROMO_TEMPLATE}» aprobada en
            Meta; cada clienta recibe su nombre.
          </p>
          <p className="text-sm text-fg">
            Se enviará a <strong>{recipients.length}</strong>{' '}
            {recipients.length === 1 ? 'clienta' : 'clientas'}.
          </p>
          <div className="flex gap-2">
            <Button icon={<ArrowLeft className="h-4 w-4" />} onClick={() => setStep('clientas')}>
              Atrás
            </Button>
            <Button variant="primary" icon={<Send className="h-4 w-4" />} onClick={handleSend}>
              Enviar promo
            </Button>
          </div>
        </div>
      )}

      {step === 'enviando' && (
        <StateNote kind="loading">
          {progress?.status === 'sending'
            ? `Enviando… ${progress.total_sent} enviados, ${progress.total_failed} con error`
            : 'Preparando el envío…'}{' '}
          No cierres esta página.
        </StateNote>
      )}

      {step === 'resultado' && (
        <div className="space-y-4">
          {outcome ? (
            <>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" />
                  {outcome.broadcast.total_sent} enviados
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200">
                  <XCircle className="h-4 w-4" />
                  {outcome.broadcast.total_failed} con error
                </div>
              </div>
              {outcome.failedItems.length > 0 && (
                <ul className="divide-y divide-line rounded-2xl border border-line bg-card text-sm">
                  {outcome.failedItems.map((item) => (
                    <li key={item.id} className="px-4 py-2">
                      <span className="font-semibold text-fg">{item.client_name}</span>{' '}
                      <span className="text-fg-subtle">{item.phone}</span>
                      {item.error_msg && <p className="text-xs text-red-700 dark:text-red-300">{item.error_msg}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <StateNote kind="warning">
              No se pudo confirmar el resultado. Revisa el historial en unos minutos.
            </StateNote>
          )}
          <div className="flex gap-2">
            <Button variant="primary" onClick={reset}>
              Nueva promo
            </Button>
            <Button onClick={onShowHistory}>Ver historial</Button>
          </div>
        </div>
      )}
    </div>
  )
}

function ConfigStep({
  title,
  body,
  imageUrl,
  onTitle,
  onBody,
  onImage,
  onNext,
}: {
  title: string
  body: string
  imageUrl: string | null
  onTitle: (v: string) => void
  onBody: (v: string) => void
  onImage: (v: string | null) => void
  onNext: () => void
}) {
  const upload = useUploadPromoImage()
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const valid = title.trim().length > 0 && normalizePromoBody(body).length > 0 && !!imageUrl

  const handleFile = (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (!file.type.startsWith('image/')) return setError('Elige una imagen (JPG o PNG).')
    if (file.size > MAX_IMAGE_BYTES) return setError('La imagen supera 5 MB.')
    upload.mutate(file, { onSuccess: onImage, onError: (e) => setError(e.message) })
  }

  return (
    <div className="max-w-xl space-y-4">
      <Field label="Título interno" htmlFor="promo-title" hint="Solo lo ves tú, en el historial.">
        <input
          id="promo-title"
          className={inputClass}
          value={title}
          onChange={(e) => onTitle(e.target.value)}
          placeholder="Ej: Promo de noviembre"
          maxLength={120}
        />
      </Field>
      <Field
        label="Texto de la promo"
        htmlFor="promo-body"
        hint={`${body.length}/${PROMO_BODY_MAX}. Va en un solo párrafo: WhatsApp no admite saltos de línea en plantillas.`}
      >
        <textarea
          id="promo-body"
          className={`${inputClass} min-h-[120px]`}
          value={body}
          onChange={(e) => onBody(e.target.value.slice(0, PROMO_BODY_MAX))}
          placeholder="Ej: Este mes las extensiones clásicas están a S/50. Responde este mensaje para agendar."
        />
      </Field>
      <Field label="Imagen" hint="JPG o PNG, hasta 5 MB.">
        {imageUrl ? (
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="Imagen de la promo" className="h-32 w-32 rounded-xl object-cover" />
            <Button size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onImage(null)}>
              Quitar
            </Button>
          </div>
        ) : (
          <Button
            icon={upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
            disabled={upload.isPending}
            onClick={() => fileRef.current?.click()}
          >
            {upload.isPending ? 'Subiendo…' : 'Subir imagen'}
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </Field>
      <FormError message={error} />
      <Button variant="primary" disabled={!valid} icon={<ArrowRight className="h-4 w-4" />} onClick={onNext}>
        Elegir clientas
      </Button>
    </div>
  )
}

function RecipientsStep({
  selected,
  onChange,
  onBack,
  onNext,
}: {
  selected: Map<string, PromoRecipient>
  onChange: (next: Map<string, PromoRecipient>) => void
  onBack: () => void
  onNext: () => void
}) {
  const { data: categories = [] } = useCategorias()
  const [category, setCategory] = useState<string>('all')
  const [inactiveOnly, setInactiveOnly] = useState(true)
  const [search, setSearch] = useState('')
  const segment = usePromoSegment(category === 'all' ? null : category, inactiveOnly)

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const all = segment.data ?? []
    return q ? all.filter((r) => r.name.toLowerCase().includes(q) || r.phone.includes(q)) : all
  }, [segment.data, search])

  const categoryOptions = useMemo(
    () => [{ id: 'all', label: 'Todas' }, ...categories.map((c) => ({ id: c.name, label: c.name }))],
    [categories]
  )

  const toggle = (r: PromoRecipient) => {
    const next = new Map(selected)
    if (next.has(r.id)) next.delete(r.id)
    else next.set(r.id, r)
    onChange(next)
  }

  const allVisibleSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const toggleAll = () => {
    const next = new Map(selected)
    for (const r of rows) {
      if (allVisibleSelected) next.delete(r.id)
      else next.set(r.id, r)
    }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <FilterChips
        options={categoryOptions}
        value={category}
        onChange={setCategory}
        ariaLabel="Categoría de servicio"
        scroll
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-fg-soft">
          <input type="checkbox" checked={inactiveOnly} onChange={(e) => setInactiveOnly(e.target.checked)} />
          Solo sin cita y con 30+ días sin venir
        </label>
        <div className="relative sm:ml-auto sm:w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
          <input
            className={`${inputClass} pl-9`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            aria-label="Buscar clienta"
          />
        </div>
      </div>

      {segment.isLoading ? (
        <StateNote kind="loading">Cargando clientas…</StateNote>
      ) : segment.error ? (
        <StateNote kind="error">{(segment.error as Error).message}</StateNote>
      ) : rows.length === 0 ? (
        <StateNote kind="empty" icon={<Users className="h-5 w-5" />}>
          No hay clientas con estos filtros.
        </StateNote>
      ) : (
        <div className="rounded-2xl border border-line bg-card">
          <div className="flex items-center justify-between border-b border-line px-4 py-2 text-sm">
            <span className="text-fg-muted">
              {rows.length} {rows.length === 1 ? 'clienta' : 'clientas'}
            </span>
            <Button size="sm" variant="ghost" onClick={toggleAll}>
              {allVisibleSelected ? 'Quitar todas' : 'Elegir todas'}
            </Button>
          </div>
          <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
            {rows.map((r) => (
              <li key={r.id}>
                <label className="flex cursor-pointer items-center gap-3 px-4 py-2 hover:bg-fg/[0.03]">
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">{r.name}</span>
                    <span className="block text-xs text-fg-subtle">
                      {r.phone.startsWith('PE.') ? 'Contacto de WhatsApp' : r.phone} ·{' '}
                      {lastVisitLabel(r.days_since_last_visit)}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button icon={<ArrowLeft className="h-4 w-4" />} onClick={onBack}>
          Atrás
        </Button>
        <Button
          variant="primary"
          disabled={selected.size === 0}
          icon={<ArrowRight className="h-4 w-4" />}
          onClick={onNext}
        >
          Revisar ({selected.size})
        </Button>
      </div>
    </div>
  )
}
