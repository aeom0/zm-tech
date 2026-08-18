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
  address: string | null
  city: string | null
  statClients: string
  statRating: string
  statYears: string
  services: WebService[]
  reviews: WebReview[]
  businessHours: BusinessHoursConfig | null
}

export interface TenantLandingProps {
  data: TenantLandingData
}
