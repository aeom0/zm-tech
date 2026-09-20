'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, Plus, Save, Trash2, Upload } from 'lucide-react'

import {
  useUpdateWebSettings,
  useUploadWebAsset,
  useWebSettings,
} from '@/hooks/web-config/useWebSettings'
import type { WebAssetFolder } from '@/hooks/web-config/webSettingsService'
import type {
  WebGalleryItem,
  WebPromo,
  WebReview,
  WebService,
  WebTeamMember,
} from '@/types/tenant-landing'

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

function ImageField({
  label,
  url,
  onUpload,
  onClear,
  uploading,
}: {
  label: string
  url?: string
  onUpload: (file: File) => void
  onClear: () => void
  uploading: boolean
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center gap-3">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04]">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={label} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] text-zinc-500">Sin foto</span>
          )}
        </div>
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-xs font-medium text-zinc-200 hover:bg-white/[0.08]">
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          Subir
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUpload(f)
              e.target.value = ''
            }}
          />
        </label>
        {url && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-red-300 hover:text-red-200"
          >
            Quitar
          </button>
        )}
      </div>
    </div>
  )
}

function RowCard({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      {children}
      <button
        type="button"
        onClick={onRemove}
        className="inline-flex items-center gap-1.5 text-xs text-red-300 hover:text-red-200"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Eliminar
      </button>
    </div>
  )
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-dashed border-white/[0.15] px-4 py-2.5 text-sm font-medium text-zinc-300 hover:border-[#40E0D0]/40 hover:text-[#40E0D0]"
    >
      <Plus className="h-4 w-4" />
      {label}
    </button>
  )
}

export default function PanelWebPage() {
  const settingsQuery = useWebSettings()
  const update = useUpdateWebSettings()
  const uploadAsset = useUploadWebAsset()

  const row = settingsQuery.data

  const [heroTagline, setHeroTagline] = useState('')
  const [about, setAbout] = useState('')
  const [marqueeText, setMarqueeText] = useState('')
  const [heroVideoUrl, setHeroVideoUrl] = useState('')
  const [salonVideoUrl, setSalonVideoUrl] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [tiktok, setTiktok] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [statClients, setStatClients] = useState('500+')
  const [statRating, setStatRating] = useState('4.9')
  const [statYears, setStatYears] = useState('3+')
  const [mapEmbedUrl, setMapEmbedUrl] = useState('')

  const [gallery, setGallery] = useState<WebGalleryItem[]>([])
  const [team, setTeam] = useState<WebTeamMember[]>([])
  const [promos, setPromos] = useState<WebPromo[]>([])
  const [reviews, setReviews] = useState<WebReview[]>([])
  const [services, setServices] = useState<WebService[]>([])

  const [mensaje, setMensaje] = useState<string | null>(null)
  const [errorLocal, setErrorLocal] = useState<string | null>(null)
  const [uploadingKey, setUploadingKey] = useState<string | null>(null)

  useEffect(() => {
    if (!row) return
    setHeroTagline(row.heroTagline ?? '')
    setAbout(row.about ?? '')
    setMarqueeText(row.marqueeText ?? '')
    setHeroVideoUrl(row.heroVideoUrl ?? '')
    setSalonVideoUrl(row.salonVideoUrl ?? '')
    setWhatsapp(row.whatsapp ?? '')
    setInstagram(row.instagram ?? '')
    setFacebook(row.facebook ?? '')
    setTiktok(row.tiktok ?? '')
    setAddress(row.address ?? '')
    setCity(row.city ?? '')
    setStatClients(row.statClients)
    setStatRating(row.statRating)
    setStatYears(row.statYears)
    setMapEmbedUrl(row.mapEmbedUrl ?? '')
    setGallery(row.gallery)
    setTeam(row.team)
    setPromos(row.promos)
    setReviews(row.reviews)
    setServices(row.services)
  }, [row])

  const tenantSlug = row?.tenantSlug || row?.slug || 'tenant'

  const handleUpload = async (
    folder: WebAssetFolder,
    key: string,
    file: File,
    onDone: (url: string) => void
  ) => {
    setUploadingKey(key)
    setErrorLocal(null)
    try {
      const url = await uploadAsset.mutateAsync({ tenantSlug, folder, file })
      onDone(url)
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : 'No se pudo subir la imagen')
    } finally {
      setUploadingKey(null)
    }
  }

  const handleSave = async () => {
    if (!row) return
    setMensaje(null)
    setErrorLocal(null)
    try {
      await update.mutateAsync({
        rowId: row.rowId,
        patch: {
          heroTagline: heroTagline.trim() || null,
          about: about.trim() || null,
          marqueeText: marqueeText.trim() || null,
          heroVideoUrl: heroVideoUrl.trim() || null,
          salonVideoUrl: salonVideoUrl.trim() || null,
          whatsapp: whatsapp.trim() || null,
          instagram: instagram.trim() || null,
          facebook: facebook.trim() || null,
          tiktok: tiktok.trim() || null,
          address: address.trim() || null,
          city: city.trim() || null,
          statClients: statClients.trim() || '500+',
          statRating: statRating.trim() || '4.9',
          statYears: statYears.trim() || '3+',
          mapEmbedUrl: mapEmbedUrl.trim() || null,
          gallery,
          team,
          promos,
          reviews,
          services,
        },
      })
      setMensaje('Contenido guardado')
    } catch (e) {
      setErrorLocal(e instanceof Error ? e.message : 'No se pudo guardar')
    }
  }

  if (settingsQuery.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Cargando contenido de Mi Web…
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
        No encontramos `tenant_settings` para esta sesión.
      </div>
    )
  }

  const saving = update.isPending

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/panel/configuracion"
            className="mb-2 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Configuración
          </Link>
          <h1 className="text-2xl font-bold text-white">Mi Web</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Contenido de la landing pública — texto, galería, equipo, promos, reseñas y servicios.
            Activar/desactivar, slug y dominio están en{' '}
            <Link href="/panel/configuracion" className="text-[#40E0D0] hover:underline">
              Configuración → Presencia web
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

      <Section title="Contenido principal">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={labelClass}>Frase del hero</label>
            <input
              className={fieldClass}
              value={heroTagline}
              onChange={(e) => setHeroTagline(e.target.value)}
              placeholder="Belleza que te representa"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Sobre el negocio</label>
            <textarea
              className={`${fieldClass} min-h-24`}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Texto del marquee (banda destacada)</label>
            <input
              className={fieldClass}
              value={marqueeText}
              onChange={(e) => setMarqueeText(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Video hero (URL)</label>
            <input
              className={fieldClass}
              value={heroVideoUrl}
              onChange={(e) => setHeroVideoUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div>
            <label className={labelClass}>Video del salón (URL)</label>
            <input
              className={fieldClass}
              value={salonVideoUrl}
              onChange={(e) => setSalonVideoUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
        </div>
      </Section>

      <Section title="Contacto y redes">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass}>WhatsApp</label>
            <input
              className={fieldClass}
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Instagram</label>
            <input
              className={fieldClass}
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Facebook</label>
            <input
              className={fieldClass}
              value={facebook}
              onChange={(e) => setFacebook(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>TikTok</label>
            <input
              className={fieldClass}
              value={tiktok}
              onChange={(e) => setTiktok(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Dirección</label>
            <input
              className={fieldClass}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Ciudad</label>
            <input className={fieldClass} value={city} onChange={(e) => setCity(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className={labelClass}>Google Maps — URL de embed</label>
            <input
              className={fieldClass}
              value={mapEmbedUrl}
              onChange={(e) => setMapEmbedUrl(e.target.value)}
              placeholder="https://www.google.com/maps/embed?…"
            />
          </div>
        </div>
      </Section>

      <Section title="Estadísticas (social proof)">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={labelClass}>Clientas atendidas</label>
            <input
              className={fieldClass}
              value={statClients}
              onChange={(e) => setStatClients(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Rating</label>
            <input
              className={fieldClass}
              value={statRating}
              onChange={(e) => setStatRating(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Años activos</label>
            <input
              className={fieldClass}
              value={statYears}
              onChange={(e) => setStatYears(e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Galería" subtitle="Fotos del salón / trabajos.">
        <div className="space-y-3">
          {gallery.map((item, i) => (
            <RowCard key={i} onRemove={() => setGallery(gallery.filter((_, idx) => idx !== i))}>
              <ImageField
                label="Foto"
                url={item.url}
                uploading={uploadingKey === `gallery-${i}`}
                onUpload={(file) =>
                  void handleUpload('gallery', `gallery-${i}`, file, (url) =>
                    setGallery(gallery.map((g, idx) => (idx === i ? { ...g, url } : g)))
                  )
                }
                onClear={() =>
                  setGallery(gallery.map((g, idx) => (idx === i ? { ...g, url: '' } : g)))
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Texto alternativo</label>
                  <input
                    className={fieldClass}
                    value={item.alt}
                    onChange={(e) =>
                      setGallery(
                        gallery.map((g, idx) => (idx === i ? { ...g, alt: e.target.value } : g))
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Categoría (opcional)</label>
                  <input
                    className={fieldClass}
                    value={item.category ?? ''}
                    onChange={(e) =>
                      setGallery(
                        gallery.map((g, idx) =>
                          idx === i ? { ...g, category: e.target.value } : g
                        )
                      )
                    }
                  />
                </div>
              </div>
            </RowCard>
          ))}
          <AddButton
            label="Agregar foto"
            onClick={() => setGallery([...gallery, { url: '', alt: '' }])}
          />
        </div>
      </Section>

      <Section title="Equipo">
        <div className="space-y-3">
          {team.map((member, i) => (
            <RowCard key={i} onRemove={() => setTeam(team.filter((_, idx) => idx !== i))}>
              <ImageField
                label="Foto"
                url={member.photoUrl}
                uploading={uploadingKey === `team-${i}`}
                onUpload={(file) =>
                  void handleUpload('team', `team-${i}`, file, (url) =>
                    setTeam(team.map((m, idx) => (idx === i ? { ...m, photoUrl: url } : m)))
                  )
                }
                onClear={() =>
                  setTeam(team.map((m, idx) => (idx === i ? { ...m, photoUrl: '' } : m)))
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input
                    className={fieldClass}
                    value={member.name}
                    onChange={(e) =>
                      setTeam(
                        team.map((m, idx) => (idx === i ? { ...m, name: e.target.value } : m))
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Rol</label>
                  <input
                    className={fieldClass}
                    value={member.role}
                    onChange={(e) =>
                      setTeam(
                        team.map((m, idx) => (idx === i ? { ...m, role: e.target.value } : m))
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Especialidad (opcional)</label>
                  <input
                    className={fieldClass}
                    value={member.speciality ?? ''}
                    onChange={(e) =>
                      setTeam(
                        team.map((m, idx) => (idx === i ? { ...m, speciality: e.target.value } : m))
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Frase (opcional)</label>
                  <input
                    className={fieldClass}
                    value={member.phrase ?? ''}
                    onChange={(e) =>
                      setTeam(
                        team.map((m, idx) => (idx === i ? { ...m, phrase: e.target.value } : m))
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Color (hex, opcional)</label>
                  <input
                    className={fieldClass}
                    value={member.color ?? ''}
                    onChange={(e) =>
                      setTeam(
                        team.map((m, idx) => (idx === i ? { ...m, color: e.target.value } : m))
                      )
                    }
                    placeholder="#40E0D0"
                  />
                </div>
              </div>
            </RowCard>
          ))}
          <AddButton
            label="Agregar integrante"
            onClick={() => setTeam([...team, { name: '', role: '' }])}
          />
        </div>
      </Section>

      <Section title="Promos">
        <div className="space-y-3">
          {promos.map((promo, i) => (
            <RowCard key={i} onRemove={() => setPromos(promos.filter((_, idx) => idx !== i))}>
              <ImageField
                label="Imagen"
                url={promo.imageUrl}
                uploading={uploadingKey === `promos-${i}`}
                onUpload={(file) =>
                  void handleUpload('promos', `promos-${i}`, file, (url) =>
                    setPromos(promos.map((p, idx) => (idx === i ? { ...p, imageUrl: url } : p)))
                  )
                }
                onClear={() =>
                  setPromos(promos.map((p, idx) => (idx === i ? { ...p, imageUrl: '' } : p)))
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Título</label>
                  <input
                    className={fieldClass}
                    value={promo.title}
                    onChange={(e) =>
                      setPromos(
                        promos.map((p, idx) => (idx === i ? { ...p, title: e.target.value } : p))
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Badge (opcional)</label>
                  <input
                    className={fieldClass}
                    value={promo.badge ?? ''}
                    onChange={(e) =>
                      setPromos(
                        promos.map((p, idx) => (idx === i ? { ...p, badge: e.target.value } : p))
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Descripción (opcional)</label>
                  <textarea
                    className={`${fieldClass} min-h-20`}
                    value={promo.description ?? ''}
                    onChange={(e) =>
                      setPromos(
                        promos.map((p, idx) =>
                          idx === i ? { ...p, description: e.target.value } : p
                        )
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Texto del CTA (opcional)</label>
                  <input
                    className={fieldClass}
                    value={promo.ctaText ?? ''}
                    onChange={(e) =>
                      setPromos(
                        promos.map((p, idx) => (idx === i ? { ...p, ctaText: e.target.value } : p))
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Mensaje de WhatsApp (opcional)</label>
                  <input
                    className={fieldClass}
                    value={promo.whatsappMessage ?? ''}
                    onChange={(e) =>
                      setPromos(
                        promos.map((p, idx) =>
                          idx === i ? { ...p, whatsappMessage: e.target.value } : p
                        )
                      )
                    }
                  />
                </div>
              </div>
            </RowCard>
          ))}
          <AddButton label="Agregar promo" onClick={() => setPromos([...promos, { title: '' }])} />
        </div>
      </Section>

      <Section title="Reseñas">
        <div className="space-y-3">
          {reviews.map((review, i) => (
            <RowCard key={i} onRemove={() => setReviews(reviews.filter((_, idx) => idx !== i))}>
              <ImageField
                label="Foto (opcional)"
                url={review.photoUrl}
                uploading={uploadingKey === `reviews-${i}`}
                onUpload={(file) =>
                  void handleUpload('reviews', `reviews-${i}`, file, (url) =>
                    setReviews(reviews.map((r, idx) => (idx === i ? { ...r, photoUrl: url } : r)))
                  )
                }
                onClear={() =>
                  setReviews(reviews.map((r, idx) => (idx === i ? { ...r, photoUrl: '' } : r)))
                }
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Autora/autor</label>
                  <input
                    className={fieldClass}
                    value={review.author}
                    onChange={(e) =>
                      setReviews(
                        reviews.map((r, idx) => (idx === i ? { ...r, author: e.target.value } : r))
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Rol / relación (ej. &quot;Clienta desde 2023&quot;)
                  </label>
                  <input
                    className={fieldClass}
                    value={review.role}
                    onChange={(e) =>
                      setReviews(
                        reviews.map((r, idx) => (idx === i ? { ...r, role: e.target.value } : r))
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Testimonio</label>
                  <textarea
                    className={`${fieldClass} min-h-20`}
                    value={review.text}
                    onChange={(e) =>
                      setReviews(
                        reviews.map((r, idx) => (idx === i ? { ...r, text: e.target.value } : r))
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Inicial (avatar sin foto)</label>
                  <input
                    className={fieldClass}
                    value={review.initial}
                    maxLength={2}
                    onChange={(e) =>
                      setReviews(
                        reviews.map((r, idx) => (idx === i ? { ...r, initial: e.target.value } : r))
                      )
                    }
                  />
                </div>
              </div>
            </RowCard>
          ))}
          <AddButton
            label="Agregar reseña"
            onClick={() =>
              setReviews([...reviews, { author: '', text: '', role: '', initial: '' }])
            }
          />
        </div>
      </Section>

      <Section
        title="Servicios web"
        subtitle="Lista curada para la landing — independiente del catálogo de agenda."
      >
        <div className="space-y-3">
          {services.map((service, i) => (
            <RowCard key={i} onRemove={() => setServices(services.filter((_, idx) => idx !== i))}>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>Nombre</label>
                  <input
                    className={fieldClass}
                    value={service.name}
                    onChange={(e) =>
                      setServices(
                        services.map((s, idx) => (idx === i ? { ...s, name: e.target.value } : s))
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Ícono Lucide (ej. &quot;Sparkles&quot;)</label>
                  <input
                    className={fieldClass}
                    value={service.icon}
                    onChange={(e) =>
                      setServices(
                        services.map((s, idx) => (idx === i ? { ...s, icon: e.target.value } : s))
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Precio (texto libre, ej. &quot;Desde $20&quot;)
                  </label>
                  <input
                    className={fieldClass}
                    value={service.price}
                    onChange={(e) =>
                      setServices(
                        services.map((s, idx) => (idx === i ? { ...s, price: e.target.value } : s))
                      )
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Duración</label>
                  <input
                    className={fieldClass}
                    value={service.duration}
                    onChange={(e) =>
                      setServices(
                        services.map((s, idx) =>
                          idx === i ? { ...s, duration: e.target.value } : s
                        )
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Descripción</label>
                  <textarea
                    className={`${fieldClass} min-h-16`}
                    value={service.description}
                    onChange={(e) =>
                      setServices(
                        services.map((s, idx) =>
                          idx === i ? { ...s, description: e.target.value } : s
                        )
                      )
                    }
                  />
                </div>
              </div>
            </RowCard>
          ))}
          <AddButton
            label="Agregar servicio"
            onClick={() =>
              setServices([
                ...services,
                { name: '', description: '', price: '', duration: '', icon: 'Sparkles' },
              ])
            }
          />
        </div>
      </Section>
    </div>
  )
}
