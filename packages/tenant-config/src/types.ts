export interface TenantConfig {
  businessName: string;
  businessType: "spa-nails" | "barbershop" | "hair-salon" | "full-aesthetic";
  logo?: string;
  tagline?: string;

  theme: {
    primaryColor: string;
    accentColor: string;
    darkMode: boolean;
  };

  locale: {
    currency: { code: string; symbol: string };
    country: string;
    timezone: string;
    language: "es" | "es-PE" | "es-VE" | "es-CO" | "pt-BR";
  };

  terminology: {
    staff: string; // "chicas" | "barberos" | "estilistas" | "especialistas"
    staffSingular: string;
    appointment: string; // "cita" | "turno" | "reserva"
    client: string; // "cliente" | "clienta"
  };

  contact: {
    phone?: string;
    whatsapp?: string;
    email?: string;
    address?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };

  businessHours: {
    [day: string]: { open: string; close: string } | null;
  };

  commissions: {
    defaultStaffPercent: number;
    defaultHousePercent: number;
  };

  /** Módulos opcionales (p. ej. promo WhatsApp en Más / ajustes) */
  features?: {
    whatsapp?: boolean;
  };

  supabase?: {
    url: string;
    anonKey: string;
  };
}
