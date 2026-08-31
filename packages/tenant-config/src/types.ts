export type TimeFormatPreference = '12' | '24'

/** Fondo detrás del logo del tenant cuando la app está en ese modo de color. */
export type LogoBackgroundStyle = 'transparent' | 'light' | 'dark'

export interface TenantConfig {
  businessName: string
  businessType: 'spa-nails' | 'barbershop' | 'hair-salon' | 'full-aesthetic'
  businessSubtype?:
    | 'brow-lash'
    | 'nails-only'
    | 'spa-full'
    | 'barber-lounge'
    | 'color-studio'
    | 'multi-service'
    | 'med-aesthetic'
  serviceCategories?: Array<
    | 'cortes'
    | 'barba-afeitado'
    | 'coloracion'
    | 'unas'
    | 'cejas-pestanas'
    | 'depilacion'
    | 'masajes'
    | 'faciales'
    | 'spa'
    | 'gaming'
    | 'otros'
  >
  logo?: string
  /** Fondo del logo cuando la app está en modo claro (default: 'transparent'). */
  logoBgLight?: LogoBackgroundStyle
  /** Fondo del logo cuando la app está en modo oscuro (default: 'transparent'). */
  logoBgDark?: LogoBackgroundStyle
  tagline?: string

  theme: {
    primaryColor: string
    accentColor: string
    darkMode: boolean
  }

  locale: {
    currency: { code: string; symbol: string }
    country: string
    timezone: string
    language: 'es' | 'es-PE' | 'es-VE' | 'es-CO' | 'es-AR' | 'es-CL' | 'es-MX' | 'pt-BR'
    /** Reloj en agenda y pantallas de horario: 24 h (default) o 12 h con am/pm */
    timeFormat?: TimeFormatPreference
  }

  terminology: {
    staff: string // "chicas" | "barberos" | "estilistas" | "especialistas"
    staffSingular: string
    appointment: string // "cita" | "turno" | "reserva"
    client: string // "cliente" | "clienta"
  }

  contact: {
    phone?: string
    whatsapp?: string
    email?: string
    address?: string
    instagram?: string
    facebook?: string
    tiktok?: string
  }

  businessHours: {
    [day: string]: { open: string; close: string } | null
  }

  commissions: {
    defaultStaffPercent: number
    defaultHousePercent: number
  }

  /** Cuenta sandbox demo (reset de datos al cerrar sesión vía Edge) */
  isDemo?: boolean

  /** Módulos opcionales (p. ej. promo WhatsApp en Más / ajustes) */
  features?: {
    whatsapp?: boolean
  }

  /** Integraciones externas (metadatos no sensibles; no guardar secretos en claro si no aplica) */
  integrations?: {
    waba?: {
      /** Expiración del token de WhatsApp Business (ISO 8601), si se conoce */
      tokenExpiry?: string
    }
  }

  supabase?: {
    url: string
    anonKey: string
  }
}
