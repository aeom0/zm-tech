import type { TenantConfig } from "../types";

export const barbershopPreset: TenantConfig = {
  businessName: "Barbería Clásica",
  businessType: "barbershop",
  tagline: "Cortes con tradición y estilo",

  theme: {
    primaryColor: "#1A237E",
    accentColor: "#F9A825",
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
    staff: "barberos",
    staffSingular: "barbero",
    appointment: "turno",
    client: "cliente",
  },

  contact: {},

  businessHours: {
    lunes: { open: "09:00", close: "20:00" },
    martes: { open: "09:00", close: "20:00" },
    miercoles: { open: "09:00", close: "20:00" },
    jueves: { open: "09:00", close: "20:00" },
    viernes: { open: "09:00", close: "20:00" },
    sabado: { open: "09:00", close: "20:00" },
    domingo: null,
  },

  commissions: {
    defaultStaffPercent: 50,
    defaultHousePercent: 50,
  },

  businessSubtype: undefined,
  serviceCategories: ["cortes", "barba-afeitado"],
};
