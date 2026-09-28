'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, Lock, Megaphone, RefreshCw } from 'lucide-react'

import { supabase } from '@/lib/supabase'
import { useCampanasConfig, type WabaConfigRow } from '@/hooks/waba/useCampanasConfig'
import { useWabaStatus } from '@/hooks/waba/useWabaStatus'
import { ConfigImageCard } from '@/components/waba/ConfigImageCard'
import { ConfigTextCard } from '@/components/waba/ConfigTextCard'

/** Referencia estable cuando `query.data` es undefined (evita nuevo [] cada render). */
const EMPTY_WABA_ROWS: WabaConfigRow[] = []

function getTextValue(row: WabaConfigRow | undefined, fallback = ''): string {
  const v = row?.config_value as Record<string, unknown> | undefined
  const text = v?.text ?? v?.url
  return typeof text === 'string' ? text : fallback
}

function getLinesValue(row: WabaConfigRow | undefined, fallback = ''): string {
  const v = row?.config_value as Record<string, unknown> | undefined
  if (Array.isArray(v?.lines)) {
    return v.lines.filter((l): l is string => typeof l === 'string').join('\n')
  }
  if (typeof v?.text === 'string' && v.text.trim()) return v.text
  return fallback
}

/** Gate de admin local a esta página: `/panel` no expone AuthContext (solo `/finanzas` lo usa), así que se resuelve el rol directo desde `profiles`. */
function useIsAdmin() {
  return useQuery({
    queryKey: ['web_waba_campanas_is_admin'],
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

export function CampanasClient() {
  const isAdminQuery = useIsAdmin()
  const { query, mutation } = useCampanasConfig()
  const statusQuery = useWabaStatus()

  const rows = query.data ?? EMPTY_WABA_ROWS
  const byKey = useMemo(() => new Map(rows.map((r) => [r.config_key, r])), [rows])

  const metaAdsImageRow = byKey.get('meta_ads_hero_image_url')
  const metaAdsCaptionRow = byKey.get('meta_ads_hero_caption')
  const metaAdsServicesRow = byKey.get('meta_ads_services_text')
  const metaAdsBounceNudgeRow = byKey.get('meta_ads_bounce_nudge_text')
  const emotionalAlmostCloseExtRow = byKey.get('emotional_almost_close_lines_ext')
  const emotionalAlmostCloseLiftRow = byKey.get('emotional_almost_close_lines_lift')
  const emotionalDeclineReplyRow = byKey.get('emotional_decline_reply_ctwa')
  const emotionalNudge2ReplyRow = byKey.get('emotional_nudge2_reply_ctwa')
  const emotionalPriceCtaExtRow = byKey.get('emotional_price_cta_ext')
  const tardanzaImageRow = byKey.get('tardanza_image_url')
  const metaAdsImage2Row = byKey.get('meta_ads_image_2_url')
  const metaAdsImage2CaptionRow = byKey.get('meta_ads_image_2_caption')
  const metaAdsImage3Row = byKey.get('meta_ads_image_3_url')
  const metaAdsImage3CaptionRow = byKey.get('meta_ads_image_3_caption')
  const metaAdsImage4Row = byKey.get('meta_ads_image_4_url')
  const metaAdsImage4CaptionRow = byKey.get('meta_ads_image_4_caption')
  const metaAdsExtensionesImage1Row = byKey.get('meta_ads_extensiones_image_1_url')
  const metaAdsExtensionesImage1CaptionRow = byKey.get('meta_ads_extensiones_image_1_caption')
  const metaAdsExtensionesImage2Row = byKey.get('meta_ads_extensiones_image_2_url')
  const metaAdsExtensionesImage2CaptionRow = byKey.get('meta_ads_extensiones_image_2_caption')
  const metaAdsLiftingImage1Row = byKey.get('meta_ads_lifting_image_1_url')
  const metaAdsLiftingImage1CaptionRow = byKey.get('meta_ads_lifting_image_1_caption')
  const metaAdsLiftingImage2Row = byKey.get('meta_ads_lifting_image_2_url')
  const metaAdsLiftingImage2CaptionRow = byKey.get('meta_ads_lifting_image_2_caption')

  const [metaAdsImageUrl, setMetaAdsImageUrl] = useState('')
  const [metaAdsCaption, setMetaAdsCaption] = useState('')
  const [metaAdsServicesText, setMetaAdsServicesText] = useState('')
  const [metaAdsBounceNudgeText, setMetaAdsBounceNudgeText] = useState('')
  const [emotionalAlmostCloseExt, setEmotionalAlmostCloseExt] = useState('')
  const [emotionalAlmostCloseLift, setEmotionalAlmostCloseLift] = useState('')
  const [emotionalDeclineReply, setEmotionalDeclineReply] = useState('')
  const [emotionalNudge2Reply, setEmotionalNudge2Reply] = useState('')
  const [emotionalPriceCtaExt, setEmotionalPriceCtaExt] = useState('')
  const [tardanzaImageUrl, setTardanzaImageUrl] = useState('')
  const [metaAdsImage2Url, setMetaAdsImage2Url] = useState('')
  const [metaAdsImage2Caption, setMetaAdsImage2Caption] = useState('')
  const [metaAdsImage3Url, setMetaAdsImage3Url] = useState('')
  const [metaAdsImage3Caption, setMetaAdsImage3Caption] = useState('')
  const [metaAdsImage4Url, setMetaAdsImage4Url] = useState('')
  const [metaAdsImage4Caption, setMetaAdsImage4Caption] = useState('')
  const [metaAdsExtensionesImage1Url, setMetaAdsExtensionesImage1Url] = useState('')
  const [metaAdsExtensionesImage1Caption, setMetaAdsExtensionesImage1Caption] = useState('')
  const [metaAdsExtensionesImage2Url, setMetaAdsExtensionesImage2Url] = useState('')
  const [metaAdsExtensionesImage2Caption, setMetaAdsExtensionesImage2Caption] = useState('')
  const [metaAdsLiftingImage1Url, setMetaAdsLiftingImage1Url] = useState('')
  const [metaAdsLiftingImage1Caption, setMetaAdsLiftingImage1Caption] = useState('')
  const [metaAdsLiftingImage2Url, setMetaAdsLiftingImage2Url] = useState('')
  const [metaAdsLiftingImage2Caption, setMetaAdsLiftingImage2Caption] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  useEffect(() => {
    setMetaAdsImageUrl(getTextValue(metaAdsImageRow, ''))
  }, [metaAdsImageRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsCaption(getTextValue(metaAdsCaptionRow, ''))
  }, [metaAdsCaptionRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsServicesText(getTextValue(metaAdsServicesRow, ''))
  }, [metaAdsServicesRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsBounceNudgeText(getTextValue(metaAdsBounceNudgeRow, ''))
  }, [metaAdsBounceNudgeRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setEmotionalAlmostCloseExt(getLinesValue(emotionalAlmostCloseExtRow, ''))
  }, [emotionalAlmostCloseExtRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setEmotionalAlmostCloseLift(getLinesValue(emotionalAlmostCloseLiftRow, ''))
  }, [emotionalAlmostCloseLiftRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setEmotionalDeclineReply(getTextValue(emotionalDeclineReplyRow, ''))
  }, [emotionalDeclineReplyRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setEmotionalNudge2Reply(getTextValue(emotionalNudge2ReplyRow, ''))
  }, [emotionalNudge2ReplyRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setEmotionalPriceCtaExt(getTextValue(emotionalPriceCtaExtRow, ''))
  }, [emotionalPriceCtaExtRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setTardanzaImageUrl(getTextValue(tardanzaImageRow, ''))
  }, [tardanzaImageRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsImage2Url(getTextValue(metaAdsImage2Row, ''))
  }, [metaAdsImage2Row?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsImage2Caption(getTextValue(metaAdsImage2CaptionRow, ''))
  }, [metaAdsImage2CaptionRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsImage3Url(getTextValue(metaAdsImage3Row, ''))
  }, [metaAdsImage3Row?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsImage3Caption(getTextValue(metaAdsImage3CaptionRow, ''))
  }, [metaAdsImage3CaptionRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsImage4Url(getTextValue(metaAdsImage4Row, ''))
  }, [metaAdsImage4Row?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsImage4Caption(getTextValue(metaAdsImage4CaptionRow, ''))
  }, [metaAdsImage4CaptionRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsExtensionesImage1Url(getTextValue(metaAdsExtensionesImage1Row, ''))
  }, [metaAdsExtensionesImage1Row?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsExtensionesImage1Caption(getTextValue(metaAdsExtensionesImage1CaptionRow, ''))
  }, [metaAdsExtensionesImage1CaptionRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsExtensionesImage2Url(getTextValue(metaAdsExtensionesImage2Row, ''))
  }, [metaAdsExtensionesImage2Row?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsExtensionesImage2Caption(getTextValue(metaAdsExtensionesImage2CaptionRow, ''))
  }, [metaAdsExtensionesImage2CaptionRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsLiftingImage1Url(getTextValue(metaAdsLiftingImage1Row, ''))
  }, [metaAdsLiftingImage1Row?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsLiftingImage1Caption(getTextValue(metaAdsLiftingImage1CaptionRow, ''))
  }, [metaAdsLiftingImage1CaptionRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsLiftingImage2Url(getTextValue(metaAdsLiftingImage2Row, ''))
  }, [metaAdsLiftingImage2Row?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    setMetaAdsLiftingImage2Caption(getTextValue(metaAdsLiftingImage2CaptionRow, ''))
  }, [metaAdsLiftingImage2CaptionRow?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (isAdminQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center text-sm text-zinc-500">
        Cargando…
      </div>
    )
  }

  if (!isAdminQuery.data) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-300">
          <Lock className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-white">Solo administración</h1>
        <p className="mt-2 text-sm text-zinc-400">Este módulo es solo para administración.</p>
      </div>
    )
  }

  const isLoading = query.isLoading
  const loadError = query.error ? (query.error as Error).message : null
  const missingSeed = !metaAdsImageRow || !metaAdsCaptionRow || !metaAdsServicesRow || !metaAdsBounceNudgeRow || !tardanzaImageRow

  const businessName = statusQuery.data?.businessName || 'el salón'

  const saveMetaAdsImageAndCaption = async () => {
    if (!metaAdsImageRow || !metaAdsCaptionRow) {
      throw new Error('No se pudo guardar porque falta configuración inicial de Meta Ads.')
    }
    await mutation.mutateAsync({ id: metaAdsImageRow.id, config_value: { url: metaAdsImageUrl } })
    await mutation.mutateAsync({ id: metaAdsCaptionRow.id, config_value: { text: metaAdsCaption } })
  }

  const saveMetaAdsImage2 = async () => {
    if (!metaAdsImage2Row || !metaAdsImage2CaptionRow) {
      throw new Error('No se pudo guardar porque falta configuración inicial de imagen 2.')
    }
    await mutation.mutateAsync({ id: metaAdsImage2Row.id, config_value: { url: metaAdsImage2Url } })
    await mutation.mutateAsync({ id: metaAdsImage2CaptionRow.id, config_value: { text: metaAdsImage2Caption } })
  }

  const saveMetaAdsImage3 = async () => {
    if (!metaAdsImage3Row || !metaAdsImage3CaptionRow) {
      throw new Error('No se pudo guardar porque falta configuración inicial de imagen 3.')
    }
    await mutation.mutateAsync({ id: metaAdsImage3Row.id, config_value: { url: metaAdsImage3Url } })
    await mutation.mutateAsync({ id: metaAdsImage3CaptionRow.id, config_value: { text: metaAdsImage3Caption } })
  }

  const saveMetaAdsImage4 = async () => {
    if (!metaAdsImage4Row || !metaAdsImage4CaptionRow) {
      throw new Error('No se pudo guardar porque falta configuración inicial de imagen 4.')
    }
    await mutation.mutateAsync({ id: metaAdsImage4Row.id, config_value: { url: metaAdsImage4Url } })
    await mutation.mutateAsync({ id: metaAdsImage4CaptionRow.id, config_value: { text: metaAdsImage4Caption } })
  }

  const saveMetaAdsExtensionesImage1 = async () => {
    if (!metaAdsExtensionesImage1Row || !metaAdsExtensionesImage1CaptionRow) {
      throw new Error('No se pudo guardar porque falta configuración de Extensiones imagen 1.')
    }
    await mutation.mutateAsync({ id: metaAdsExtensionesImage1Row.id, config_value: { url: metaAdsExtensionesImage1Url } })
    await mutation.mutateAsync({
      id: metaAdsExtensionesImage1CaptionRow.id,
      config_value: { text: metaAdsExtensionesImage1Caption },
    })
  }

  const saveMetaAdsExtensionesImage2 = async () => {
    if (!metaAdsExtensionesImage2Row || !metaAdsExtensionesImage2CaptionRow) {
      throw new Error('No se pudo guardar porque falta configuración de Extensiones imagen 2.')
    }
    await mutation.mutateAsync({ id: metaAdsExtensionesImage2Row.id, config_value: { url: metaAdsExtensionesImage2Url } })
    await mutation.mutateAsync({
      id: metaAdsExtensionesImage2CaptionRow.id,
      config_value: { text: metaAdsExtensionesImage2Caption },
    })
  }

  const saveMetaAdsLiftingImage1 = async () => {
    if (!metaAdsLiftingImage1Row || !metaAdsLiftingImage1CaptionRow) {
      throw new Error('No se pudo guardar porque falta configuración de Lifting imagen 1.')
    }
    await mutation.mutateAsync({ id: metaAdsLiftingImage1Row.id, config_value: { url: metaAdsLiftingImage1Url } })
    await mutation.mutateAsync({
      id: metaAdsLiftingImage1CaptionRow.id,
      config_value: { text: metaAdsLiftingImage1Caption },
    })
  }

  const saveMetaAdsLiftingImage2 = async () => {
    if (!metaAdsLiftingImage2Row || !metaAdsLiftingImage2CaptionRow) {
      throw new Error('No se pudo guardar porque falta configuración de Lifting imagen 2.')
    }
    await mutation.mutateAsync({ id: metaAdsLiftingImage2Row.id, config_value: { url: metaAdsLiftingImage2Url } })
    await mutation.mutateAsync({
      id: metaAdsLiftingImage2CaptionRow.id,
      config_value: { text: metaAdsLiftingImage2Caption },
    })
  }

  const saveMetaAdsServicesText = async () => {
    if (!metaAdsServicesRow) {
      throw new Error('No se pudo guardar el texto porque falta configuración inicial.')
    }
    await mutation.mutateAsync({ id: metaAdsServicesRow.id, config_value: { text: metaAdsServicesText } })
  }

  const saveMetaAdsBounceNudgeText = async () => {
    if (!metaAdsBounceNudgeRow) {
      throw new Error('No se pudo guardar el reenganche porque falta configuración inicial.')
    }
    await mutation.mutateAsync({ id: metaAdsBounceNudgeRow.id, config_value: { text: metaAdsBounceNudgeText } })
  }

  const linesToConfigValue = (raw: string) => ({
    lines: raw
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean),
  })

  const saveEmotionalAlmostCloseExt = async () => {
    if (!emotionalAlmostCloseExtRow) {
      throw new Error('Falta la migración de venta emocional CTWA (emotional_almost_close_lines_ext).')
    }
    await mutation.mutateAsync({ id: emotionalAlmostCloseExtRow.id, config_value: linesToConfigValue(emotionalAlmostCloseExt) })
  }

  const saveEmotionalAlmostCloseLift = async () => {
    if (!emotionalAlmostCloseLiftRow) {
      throw new Error('Falta la migración de venta emocional CTWA (emotional_almost_close_lines_lift).')
    }
    await mutation.mutateAsync({ id: emotionalAlmostCloseLiftRow.id, config_value: linesToConfigValue(emotionalAlmostCloseLift) })
  }

  const saveEmotionalDeclineReply = async () => {
    if (!emotionalDeclineReplyRow) {
      throw new Error('Falta la migración de venta emocional CTWA (emotional_decline_reply_ctwa).')
    }
    await mutation.mutateAsync({ id: emotionalDeclineReplyRow.id, config_value: { text: emotionalDeclineReply } })
  }

  const saveEmotionalNudge2Reply = async () => {
    if (!emotionalNudge2ReplyRow) {
      throw new Error('Falta la migración de venta emocional CTWA (emotional_nudge2_reply_ctwa).')
    }
    await mutation.mutateAsync({ id: emotionalNudge2ReplyRow.id, config_value: { text: emotionalNudge2Reply } })
  }

  const saveEmotionalPriceCtaExt = async () => {
    if (!emotionalPriceCtaExtRow) {
      throw new Error('Falta la migración de venta emocional CTWA (emotional_price_cta_ext).')
    }
    await mutation.mutateAsync({ id: emotionalPriceCtaExtRow.id, config_value: { text: emotionalPriceCtaExt } })
  }

  const saveTardanzaImage = async () => {
    if (!tardanzaImageRow) {
      throw new Error('No se pudo guardar la imagen porque falta configuración inicial.')
    }
    await mutation.mutateAsync({ id: tardanzaImageRow.id, config_value: { url: tardanzaImageUrl } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs text-zinc-500">WhatsApp</div>
          <h1 className="text-2xl font-bold text-white">Campañas (Meta Ads + tardanzas)</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Cambia imágenes y textos sin ayuda técnica. Si ocurre un problema, el bot seguirá respondiendo con la
            configuración actual.
          </p>
        </div>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="inline-flex shrink-0 items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          <RefreshCw className="h-4 w-4" />
          Refrescar
        </button>
      </div>

      {loadError && (
        <div role="alert" className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          No se pudo cargar la configuración de campañas. Inténtalo nuevamente en unos segundos.
        </div>
      )}

      {missingSeed && !isLoading && (
        <div role="alert" className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          Faltan datos iniciales para esta pantalla. Avísale al equipo técnico para habilitar esta sección.
        </div>
      )}

      <ConfigImageCard
        title="Imagen Meta Ads 1"
        description="Imagen principal que se envía a clientas nuevas. Se envía solo si tiene URL configurada."
        imageUrl={metaAdsImageUrl}
        caption={metaAdsCaption}
        onChangeImageUrl={setMetaAdsImageUrl}
        onChangeCaption={setMetaAdsCaption}
        onSave={saveMetaAdsImageAndCaption}
        uploadBucket="waba-images"
        uploadPath="campanas/meta-ads-hero.jpg"
      />

      <ConfigImageCard
        title="Imagen Meta Ads 2 (opcional)"
        description="Segunda imagen. Se envía solo si tiene URL configurada."
        imageUrl={metaAdsImage2Url}
        caption={metaAdsImage2Caption}
        onChangeImageUrl={setMetaAdsImage2Url}
        onChangeCaption={setMetaAdsImage2Caption}
        onSave={saveMetaAdsImage2}
        uploadBucket="waba-images"
        uploadPath="campanas/meta-ads-image-2.jpg"
      />

      <ConfigImageCard
        title="Imagen Meta Ads 3 (opcional)"
        description="Tercera imagen. Se envía solo si tiene URL configurada."
        imageUrl={metaAdsImage3Url}
        caption={metaAdsImage3Caption}
        onChangeImageUrl={setMetaAdsImage3Url}
        onChangeCaption={setMetaAdsImage3Caption}
        onSave={saveMetaAdsImage3}
        uploadBucket="waba-images"
        uploadPath="campanas/meta-ads-image-3.jpg"
      />

      <ConfigImageCard
        title="Imagen Meta Ads 4 (opcional)"
        description="Cuarta imagen. Se envía solo si tiene URL configurada."
        imageUrl={metaAdsImage4Url}
        caption={metaAdsImage4Caption}
        onChangeImageUrl={setMetaAdsImage4Url}
        onChangeCaption={setMetaAdsImage4Caption}
        onSave={saveMetaAdsImage4}
        uploadBucket="waba-images"
        uploadPath="campanas/meta-ads-image-4.jpg"
      />

      <ConfigImageCard
        title="Extensiones imagen 1 (CTWA)"
        description="Tras elegir Extensiones en la pregunta de interés. Solo si tiene URL."
        imageUrl={metaAdsExtensionesImage1Url}
        caption={metaAdsExtensionesImage1Caption}
        onChangeImageUrl={setMetaAdsExtensionesImage1Url}
        onChangeCaption={setMetaAdsExtensionesImage1Caption}
        onSave={saveMetaAdsExtensionesImage1}
        uploadBucket="waba-images"
        uploadPath="campanas/meta-ads-extensiones-1.jpg"
      />

      <ConfigImageCard
        title="Extensiones imagen 2 (CTWA)"
        description="Segunda imagen de Extensiones. Solo si tiene URL."
        imageUrl={metaAdsExtensionesImage2Url}
        caption={metaAdsExtensionesImage2Caption}
        onChangeImageUrl={setMetaAdsExtensionesImage2Url}
        onChangeCaption={setMetaAdsExtensionesImage2Caption}
        onSave={saveMetaAdsExtensionesImage2}
        uploadBucket="waba-images"
        uploadPath="campanas/meta-ads-extensiones-2.jpg"
      />

      <ConfigImageCard
        title="Lifting imagen 1 (CTWA)"
        description="Tras elegir Lifting en la pregunta de interés. Solo si tiene URL."
        imageUrl={metaAdsLiftingImage1Url}
        caption={metaAdsLiftingImage1Caption}
        onChangeImageUrl={setMetaAdsLiftingImage1Url}
        onChangeCaption={setMetaAdsLiftingImage1Caption}
        onSave={saveMetaAdsLiftingImage1}
        uploadBucket="waba-images"
        uploadPath="campanas/meta-ads-lifting-1.jpg"
      />

      <ConfigImageCard
        title="Lifting imagen 2 (CTWA)"
        description="Segunda imagen de Lifting. Solo si tiene URL."
        imageUrl={metaAdsLiftingImage2Url}
        caption={metaAdsLiftingImage2Caption}
        onChangeImageUrl={setMetaAdsLiftingImage2Url}
        onChangeCaption={setMetaAdsLiftingImage2Caption}
        onSave={saveMetaAdsLiftingImage2}
        uploadBucket="waba-images"
        uploadPath="campanas/meta-ads-lifting-2.jpg"
      />

      <div className="overflow-hidden rounded-2xl border border-[var(--tenant-primary)]/25 bg-[var(--tenant-primary)]/[0.04]">
        <button
          type="button"
          onClick={() => setPreviewOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-4 text-left"
        >
          <div>
            <h2 className="text-base font-semibold text-white">Vista previa del flujo</h2>
            <p className="mt-0.5 text-xs text-zinc-400">Así ve la clienta los mensajes cuando llega desde un anuncio</p>
          </div>
          <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${previewOpen ? 'rotate-180' : ''}`} />
        </button>

        {previewOpen && (
          <div className="space-y-3 border-t border-white/[0.08] px-5 pb-6 pt-4">
            <div className="mx-auto max-w-sm space-y-2 rounded-xl bg-[#0b141a] p-4">
              {metaAdsServicesText && (
                <div className="max-w-[85%] rounded-xl rounded-tl-none bg-[#1f2c33] px-3 py-2 shadow-sm">
                  <p className="whitespace-pre-wrap break-words text-[13px] leading-snug text-zinc-100">
                    {metaAdsServicesText.replace('{nombre}', ' Vanessa')}
                  </p>
                  <span className="float-right mt-1 text-[10px] text-zinc-500">ahora</span>
                </div>
              )}

              {[
                { url: metaAdsImageUrl, caption: metaAdsCaption },
                { url: metaAdsImage2Url, caption: metaAdsImage2Caption },
                { url: metaAdsImage3Url, caption: metaAdsImage3Caption },
                { url: metaAdsImage4Url, caption: metaAdsImage4Caption },
              ]
                .filter(({ url }) => url.trim() !== '')
                .map(({ url, caption }, i) => (
                  <div key={i} className="max-w-[85%] overflow-hidden rounded-xl rounded-tl-none bg-[#1f2c33] shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element -- preview de URL arbitraria configurada por admin, con fallback onError */}
                    <img
                      src={url}
                      alt={`Imagen ${i + 1}`}
                      className="max-h-72 w-full bg-black/30 object-contain"
                      onError={(e) => {
                        ;(e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                    {caption && (
                      <p className="whitespace-pre-wrap px-3 py-2 text-[12px] leading-snug text-zinc-200">{caption}</p>
                    )}
                    <span className="float-right px-3 pb-2 text-[10px] text-zinc-500">ahora</span>
                  </div>
                ))}

              {[metaAdsImageUrl, metaAdsImage2Url, metaAdsImage3Url, metaAdsImage4Url].every((u) => !u.trim()) && (
                <p className="py-4 text-center text-xs text-zinc-500">Agrega al menos una imagen para ver la vista previa</p>
              )}
            </div>

            <p className="text-center text-[11px] text-zinc-500">
              El nombre {'"{nombre}"'} se reemplaza por el nombre real de la clienta
            </p>
          </div>
        )}
      </div>

      <ConfigTextCard
        title="Texto del mensaje Meta Ads"
        description="Mensaje que acompaña a la imagen cuando la clienta viene desde un anuncio."
        value={metaAdsServicesText}
        onChange={setMetaAdsServicesText}
        onSave={saveMetaAdsServicesText}
        note="Puedes personalizar el saludo escribiendo el nombre de la clienta dentro del mensaje."
      />

      <ConfigTextCard
        title="Reenganche si no responden (~2 h)"
        description="Mensaje automático si la clienta llegó por Instagram/Meta Ads, recibió la bienvenida y no escribió de nuevo."
        value={metaAdsBounceNudgeText}
        onChange={setMetaAdsBounceNudgeText}
        onSave={saveMetaAdsBounceNudgeText}
      />

      <div className="space-y-4 rounded-2xl border border-[var(--tenant-primary)]/25 bg-[var(--tenant-primary)]/[0.04] p-5">
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-[var(--tenant-primary)]" />
          <h2 className="text-base font-bold text-white">Venta emocional CTWA (v1)</h2>
        </div>
        <p className="text-sm text-zinc-400">
          Solo leads Meta Ads con Extensiones o Lifting en carrito. Usa <code className="text-xs">{'{servicio}'}</code> y{' '}
          <code className="text-xs">{'{parte}'}</code> donde aplique.
        </p>

        <ConfigTextCard
          title="Casi cierra — Extensiones (una frase por línea)"
          description="Rotación automática en cart-nudge cuando tiene calendario abierto y vino por anuncio."
          value={emotionalAlmostCloseExt}
          onChange={setEmotionalAlmostCloseExt}
          onSave={saveEmotionalAlmostCloseExt}
          note="El bot añade al final: «Te reenviamos el calendario 👇»"
        />

        <ConfigTextCard
          title="Casi cierra — Lifting (una frase por línea)"
          description="Igual que Extensiones, para carrito 100 % lifting."
          value={emotionalAlmostCloseLift}
          onChange={setEmotionalAlmostCloseLift}
          onSave={saveEmotionalAlmostCloseLift}
        />

        <ConfigTextCard
          title="Si dice que lo va a pensar"
          description='Ej: "Voy a pensarlo, gracias por la información".'
          value={emotionalDeclineReply}
          onChange={setEmotionalDeclineReply}
          onSave={saveEmotionalDeclineReply}
        />

        <ConfigTextCard
          title="Nudge 2 suave (carrito abandonado CTWA)"
          description="Sin urgencia fría; el carrito se vacía igual tras 90 min."
          value={emotionalNudge2Reply}
          onChange={setEmotionalNudge2Reply}
          onSave={saveEmotionalNudge2Reply}
        />

        <ConfigTextCard
          title="Caption foto al cotizar precio (CTWA Extensiones)"
          description="Cuando el bot envía foto proactiva tras dar precio."
          value={emotionalPriceCtaExt}
          onChange={setEmotionalPriceCtaExt}
          onSave={saveEmotionalPriceCtaExt}
        />
      </div>

      <ConfigImageCard
        title="Imagen política de tardanzas"
        description="Imagen que se envía cuando la clienta avisa que llegará tarde."
        imageUrl={tardanzaImageUrl}
        caption={`Políticas por tardanzas - ${businessName}`}
        onChangeImageUrl={setTardanzaImageUrl}
        onSave={saveTardanzaImage}
        saveLabel="Guardar"
        uploadBucket="waba-images"
        uploadPath="campanas/tardanza-policy.jpg"
      />

      <p className="pb-4 text-center text-[11px] text-zinc-500">Módulo WhatsApp · Solo administración</p>
    </div>
  )
}
