import type { TenantConfig } from "./types";

// Valores por defecto / placeholder usados cuando no hay config guardada.
// Basado en el preset spa-nails para mantener compatibilidad con el sistema original.
export const defaultTenantConfig: TenantConfig = {
  businessName: "Mi Salón",
  businessType: "spa-nails",
  tagline: "Belleza y bienestar",

  theme: {
    primaryColor: "#E91E8C",
    accentColor: "#FFD700",
    darkMode: false,
  },

  locale: {
    currency: { code: "USD", symbol: "$" },
    country: "VE",
    timezone: "America/Caracas",
    language: "es-VE",
  },

  terminology: {
    staff: "Profesionales",
    staffSingular: "profesional",
    appointment: "cita",
    client: "clienta",
  },

  contact: {},

  businessHours: {
    lunes: { open: "10:00", close: "19:00" },
    martes: { open: "10:00", close: "19:00" },
    miercoles: { open: "10:00", close: "19:00" },
    jueves: { open: "10:00", close: "19:00" },
    viernes: { open: "10:00", close: "19:00" },
    sabado: { open: "10:00", close: "19:00" },
    domingo: { open: "10:30", close: "13:00" },
  },

  commissions: {
    defaultStaffPercent: 40,
    defaultHousePercent: 60,
  },
};
