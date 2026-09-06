// Tipos del sistema de landing pages para tenants

export type WebTemplate = 'elegant' | 'warm' | 'modern'

export interface WebService {
  name: string
  description: string
  price: string
  duration: string
  /** Nombre de ícono Lucide (ej. "Sparkles") o texto corto mostrado como fallback */
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

export interface BusinessHoursConfig {
  [day: string]: { open: string; close: string; enabled: boolean }
}

export interface TenantLandingData {
  businessName: string
  slug: string
  webTemplate: WebTemplate
  customDomain: string | null
  tagline: string | null
  about: string | null
  heroTagline: string | null
  currencySymbol: string
  whatsapp: string | null
  instagram: string | null
  facebook: string | null
  tiktok: string | null
  address: string | null
  city: string | null
  statClients: string
  statRating: string
  statYears: string
  services: WebService[]
  reviews: WebReview[]
  businessHours: BusinessHoursConfig | null
  heroVideoUrl: string | null
  salonVideoUrl: string | null
  marqueeText: string | null
  gallery: WebGalleryItem[]
  team: WebTeamMember[]
  promos: WebPromo[]
  mapEmbedUrl: string | null
}

export interface TenantLandingProps {
  data: TenantLandingData
}
