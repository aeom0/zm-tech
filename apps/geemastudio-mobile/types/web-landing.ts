/** Tipos del CMS Mi Web — alineados con geemastudio-web/src/types/tenant-landing.ts */

export type WebTemplate = 'elegant' | 'warm' | 'modern'

export type WebAssetFolder = 'gallery' | 'team' | 'promos' | 'reviews'

export interface WebService {
  name: string
  description: string
  price: string
  duration: string
  /** Nombre de ícono Lucide o texto corto de fallback */
  icon: string
}

export interface WebReview {
  author: string
  text: string
  role: string
  initial: string
  photoUrl?: string
}

export interface WebGalleryItem {
  url: string
  alt: string
  category?: string
}

export interface WebTeamMember {
  name: string
  role: string
  speciality?: string
  phrase?: string
  photoUrl?: string
  color?: string
}

export interface WebPromo {
  title: string
  description?: string
  badge?: string
  badgeColor?: string
  ctaText?: string
  whatsappMessage?: string
  imageUrl?: string
}

/** Fila CMS completa leída/escrita en tenant_settings */
export interface WebSettings {
  rowId: string
  tenantSlug: string | null
  webEnabled: boolean
  webTemplate: WebTemplate
  slug: string | null
  customDomain: string | null
  heroTagline: string | null
  about: string | null
  marqueeText: string | null
  heroVideoUrl: string | null
  salonVideoUrl: string | null
  whatsapp: string | null
  instagram: string | null
  facebook: string | null
  tiktok: string | null
  address: string | null
  city: string | null
  statClients: string
  statRating: string
  statYears: string
  mapEmbedUrl: string | null
  gallery: WebGalleryItem[]
  team: WebTeamMember[]
  promos: WebPromo[]
  services: WebService[]
  reviews: WebReview[]
}

/** Patch parcial hacia columnas snake_case (vía servicio) */
export type WebSettingsPatch = Partial<
  Omit<WebSettings, 'rowId' | 'tenantSlug'>
>
