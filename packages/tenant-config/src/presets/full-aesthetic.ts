import type { TenantConfig } from "../types";

export const fullAestheticPreset: TenantConfig = {
  businessName: "Centro Estético Integral",
  businessType: "full-aesthetic",
  tagline: "Bienestar y belleza en un solo lugar",

  theme: {
    primaryColor: "#00897B",
    accentColor: "#FFD700",
    darkMode: false,
  },

  locale: {
    currency: { code: "PEN", symbol: "S/" },
    country: "PE",
    timezone: "America/Lima",
    language: "es-VE",
    timeFormat: "24",
  },

  terminology: {
    staff: "especialistas",
    staffSingular: "especialista",
    appointment: "cita",
    client: "cliente",
  },

  contact: {},

  businessHours: {
    lunes: { open: "09:00", close: "19:00" },
    martes: { open: "09:00", close: "19:00" },
    miercoles: { open: "09:00", close: "19:00" },
    jueves: { open: "09:00", close: "19:00" },
    viernes: { open: "09:00", close: "19:00" },
    sabado: { open: "09:00", close: "18:00" },
    domingo: null,
  },

  commissions: {
    defaultStaffPercent: 40,
    defaultHousePercent: 60,
  },

  businessSubtype: undefined,
  serviceCategories: [
    "unas",
    "cejas-pestanas",
    "depilacion",
    "masajes",
    "faciales",
    "spa",
  ],
};
