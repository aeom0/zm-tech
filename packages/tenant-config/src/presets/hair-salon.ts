import type { TenantConfig } from "../types";

export const hairSalonPreset: TenantConfig = {
  businessName: "Salón de Estilo",
  businessType: "hair-salon",
  tagline: "Tu mejor versión empieza aquí",

  theme: {
    primaryColor: "#6A1B9A",
    accentColor: "#9E9E9E",
    darkMode: false,
  },

  locale: {
    currency: { code: "PEN", symbol: "S/" },
    country: "PE",
    timezone: "America/Lima",
    language: "es-VE",
  },

  terminology: {
    staff: "estilistas",
    staffSingular: "estilista",
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
    sabado: { open: "09:00", close: "19:00" },
    domingo: null,
  },

  commissions: {
    defaultStaffPercent: 45,
    defaultHousePercent: 55,
  },
};
