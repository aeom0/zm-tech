'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Loader2, Save } from 'lucide-react'
import { COUNTRY_PRESETS, localeFromCountry, type CountryCode } from '@zmtech/tenant-config'

import {
  useTenantSettings,
  useUpdateTenantSettings,
  useUploadTenantLogo,
} from '@/hooks/configuracion/useTenantSettings'
import {
  MONEDAS_LATAM,
  WEB_TEMPLATES,
  applyPresenceMode,
  presenceFromRow,
  slugify,
  type WebPresenceMode,
  type WebTemplate,
} from '@/hooks/configuracion/types'
import { getSiteUrl, getTenantLandingUrl } from '@/lib/site-url'

const fieldClass =
  'w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-sm text-white outline-none focus:border-[#40E0D0]/40'
const labelClass = 'mb-1 block text-xs text-zinc-500'

function Section({
  title,
  subtitle,
  children,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
      <div>
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  )
}

export default function PanelConfiguracionPage() {
  const settingsQuery = useTenantSettings()
  const update = useUpdateTenantSettings()
  const uploadLogo = useUploadTenantLogo()

  const row = settingsQuery.data

  const [businessName, setBusinessName] = useState('')
  const [tagline, setTagline] = useState('')
  const [country, setCountry] = useState('')
  const [currencyCode, setCurrencyCode] = useState('USD')
  const [currencySymbol, setCurrencySymbol] = useState('$')
  const [clientTerm, setClientTerm] = useState('cliente')
  const [staffTerm, setStaffTerm] = useState('Profesionales')
  const [staffSingular, setStaffSingular] = useState('Profesional')
  const [appointmentTerm, setAppointmentTerm] = useState('cita')
  const [primaryColor, setPrimaryColor] = useState('#40E0D0')
  const [accentColor, setAccentColor] = useState('#FFD700')
  const [logoUrl, setLogoUrl] = useState('')
  const [presence, setPresence] = useState<WebPresenceMode>('none')
  const [slug, setSlug] = useState('')
  const [customDomain, setCustomDomain] = useState('')
  const [webTemplate, setWebTemplate] = useState<WebTemplate>('elegant')
  const [featuresWhatsapp, setFeaturesWhatsapp] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)

  useEffect(() => {
    if (!row) return
    setBusinessName(row.business_name)
    setTagline(row.tagline ?? '')
    setCountry(row.country ?? '')
    setCurrencyCode(row.currency_code || 'USD')
    setCurrencySymbol(row.currency_symbol || '$')
    setClientTerm(row.client_terminology || 'cliente')
    setStaffTerm(row.staff_terminology || 'Profesionales')
    setStaffSingular(row.staff_singular_terminology || 'Profesional')
    setAppointmentTerm(row.appointment_terminology || 'cita')
    setPrimaryColor(row.primary_color || '#40E0D0')
    setAccentColor(row.accent_color || '#FFD700')
    setLogoUrl(row.logo_url || '')
    setPresence(presenceFromRow(row))
    setSlug(row.slug ?? '')
    setCustomDomain(row.custom_domain ?? '')
    setWebTemplate(row.web_template)
    setFeaturesWhatsapp(row.features_whatsapp)
  }, [row])

  const previewSlug = useMemo(() => slugify(slug), [slug])

  const handleCountryChange = (code: string) => {
    setCountry(code)
    const locale = localeFromCountry(code as CountryCode)
    if (locale) {
      setCurrencyCode(locale.currency.code)
      setCurrencySymbol(locale.currency.symbol)
    }
  }

  const handleCurrencyChange = (code: string) => {
    setCurrencyCode(code)
    const m = MONEDAS_LATAM.find((x) => x.code === code)
    if (m) setCurrencySymbol(m.symbol)
  }

  const handleSave = async () => {
    if (!row) return
    setMensaje(null)
    setErrorLocal(null)

    const name = businessName.trim()
    if (!name) {
      setErrorLocal('El nombre del negocio es obligatorio')
      return
    }

    if (presence === 'geema_hosted' && !previewSlug) {
      setErrorLocal('Para Geema hosting necesitas un slug válido (ej. mi-salon)')
      return
    }
    if (presence === 'own_domain' && !customDomain.trim()) {
      setErrorLocal('Indica el dominio propio (ej. midominio.com)')
      return
    }

    const webPatch = applyPresenceMode(presence, {
      slug: previewSlug,
      custom_domain: customDomain,
    })

    try {
      await update.mutateAsync({
        rowId: row.id,
        patch: {
          business_name: name,
          tagline: tagline.trim(),
          country,
          currency_code: currencyCode,
          currency_symbol: currencySymbol,
          client_terminology: clientTerm.trim() || 'cliente',
          staff_terminology: staffTerm.trim() || 'Profesionales',
          staff_singular_terminology: staffSingular.trim() || 'Profesional',
          appointment_terminology: appointmentTerm.trim() || 'cita',
          primary_color: primaryColor,
          accent_color: accentColor,
          logo_url: logoUrl,
          features_whatsapp: featuresWhatsapp,
          web_template: webTemplate,
          ...webPatch,
        },
      })
      setMensaje('Configuración guardada')
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  const handleLogoFile = async (file: File | null) => {
    if (!file || !row) return
    setErrorLocal(null)
    try {
      const url = await uploadLogo.mutateAsync(file)
      setLogoUrl(url)
      await update.mutateAsync({ rowId: row.id, patch: { logo_url: url } })
      setMensaje('Logo actualizado')
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : 'No se pudo subir el logo')
    }
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando configuración…
      </div>
    )
  }

  if (settingsQuery.isError) {
    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
        {(settingsQuery.error as Error)?.message ?? 'Error al cargar'}
      </div>
    )
  }

  if (!row) {
    return (
      <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
        No encontramos `tenant_settings` para esta sesión. Completa el onboarding en mobile o
        verifica el bridge `profiles.tenant_id` → `tenant_slug`.
      </div>
    )
  }

  const saving = update.isPending || uploadLogo.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs text-zinc-500">Panel</div>
          <h1 className="text-2xl font-bold text-white">Configuración</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Datos del negocio, marca, logo y presencia web. Horarios en{' '}
            <Link href="/panel/horarios" className="text-[#40E0D0] hover:underline">
              Panel · Horario
            </Link>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#40E0D0] px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-[#00897B] hover:text-white disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Guardar cambios
        </button>
      </div>

      {(mensaje || errorLocal) && (
        <div
          className={[
            'rounded-2xl border px-4 py-3 text-sm',
            errorLocal
              ? 'border-red-500/25 bg-red-500/10 text-red-200'
              : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-200',
          ].join(' ')}
        >
          {errorLocal ?? mensaje}
        </div>
      )}

      <Section title="Datos del negocio" subtitle={`Tipo: ${row.business_type}`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Nombre</label>
            <input
              className={fieldClass}
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Tagline</label>
            <input
              className={fieldClass}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Ej. Belleza con estilo"
            />
          </div>
          <div>
            <label className={labelClass}>País</label>
            <select
              className={fieldClass}
              value={country}
              onChange={(e) => handleCountryChange(e.target.value)}
            >
              <option value="">Seleccionar…</option>
              {COUNTRY_PRESETS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Moneda</label>
            <select
              className={fieldClass}
              value={currencyCode}
              onChange={(e) => handleCurrencyChange(e.target.value)}
            >
              {MONEDAS_LATAM.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.code} ({m.symbol}) — {m.pais}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>Cómo llamas a tus clientas</label>
            <input
              className={fieldClass}
              value={clientTerm}
              onChange={(e) => setClientTerm(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Cómo llamas a una cita</label>
            <input
              className={fieldClass}
              value={appointmentTerm}
              onChange={(e) => setAppointmentTerm(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Equipo (plural)</label>
            <input
              className={fieldClass}
              value={staffTerm}
              onChange={(e) => setStaffTerm(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Equipo (singular)</label>
            <input
              className={fieldClass}
              value={staffSingular}
              onChange={(e) => setStaffSingular(e.target.value)}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={featuresWhatsapp}
            onChange={(e) => setFeaturesWhatsapp(e.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-white/10"
          />
          WhatsApp / WABA habilitado en el producto
        </label>
      </Section>

      <Section title="Colores de marca" subtitle="Se usan en CTAs e interactivos (no en fondos).">
        <div className="flex flex-wrap items-end gap-6">
          <div>
            <label className={labelClass}>Primario</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-white/[0.08] bg-transparent"
              />
              <input
                className={`${fieldClass} w-28 font-mono`}
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Acento</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded-lg border border-white/[0.08] bg-transparent"
              />
              <input
                className={`${fieldClass} w-28 font-mono`}
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
              />
            </div>
          </div>
          <div
            className="rounded-2xl border border-white/[0.08] px-5 py-3 text-sm font-semibold text-zinc-950"
            style={{
              background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})`,
            }}
          >
            Preview CTA
          </div>
        </div>
      </Section>

      <Section title="Logo" subtitle="Bucket tenant-logos · se guarda al subir.">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.04]">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo" className="h-full w-full object-contain" />
            ) : (
              <span className="text-xs text-zinc-500">Sin logo</span>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-white/[0.08]">
            {uploadLogo.isPending ? 'Subiendo…' : 'Subir logo'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => void handleLogoFile(e.target.files?.[0] ?? null)}
            />
          </label>
          {logoUrl && (
            <button
              type="button"
              onClick={() => {
                setLogoUrl('')
              }}
              className="text-sm text-red-300 hover:text-red-200"
            >
              Quitar (guarda para aplicar)
            </button>
          )}
        </div>
      </Section>

      <Section
        title="Presencia web"
        subtitle="Controla landing pública. Contenido CMS (galería, team…) viene en Fase 2."
      >
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: 'none' as const, label: 'Sin landing' },
              { id: 'geema_hosted' as const, label: 'Geema (geema.zmtechdev.com/s/…)' },
              { id: 'own_domain' as const, label: 'Dominio propio' },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setPresence(opt.id)}
              className={[
                'rounded-xl border px-4 py-2 text-sm font-medium transition-colors',
                presence === opt.id
                  ? 'border-[#40E0D0]/40 bg-[#40E0D0]/15 text-[#40E0D0]'
                  : 'border-white/[0.08] bg-white/[0.02] text-zinc-300 hover:bg-white/[0.04]',
              ].join(' ')}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {(presence === 'geema_hosted' || presence === 'own_domain') && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Slug</label>
              <input
                className={fieldClass}
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="mi-salon"
              />
              {previewSlug ? (
                <p className="mt-1 flex flex-wrap items-center gap-1 text-xs text-zinc-500">
                  Preview:{' '}
                  <Link
                    href={`/s/${previewSlug}`}
                    target="_blank"
                    className="inline-flex max-w-full items-center gap-1 break-all text-[#40E0D0] hover:underline"
                  >
                    {getTenantLandingUrl(previewSlug)}
                    <ExternalLink className="h-3 w-3 shrink-0" />
                  </Link>
                  <span className="w-full text-[10px] text-zinc-600">
                    Host plataforma: {getSiteUrl()} (temporal hasta geemastudio.app)
                  </span>
                </p>
              ) : null}
            </div>
            <div>
              <label className={labelClass}>Dominio propio</label>
              <input
                className={fieldClass}
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                placeholder="midominio.com"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Informativo por ahora — Geema no enruta dominio custom aún.
              </p>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Template landing</label>
              <select
                className={fieldClass}
                value={webTemplate}
                onChange={(e) => setWebTemplate(e.target.value as WebTemplate)}
              >
                {WEB_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </Section>
    </div>
  )
}
