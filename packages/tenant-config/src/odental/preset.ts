import type { OdentalTenantConfig } from "./types";

/** Preset fijo — OdentalPro no cambia de vertical */
export const dentalClinicPreset: Omit<
  OdentalTenantConfig,
  "tenantId" | "slug" | "clinicName" | "businessSubtype"
> & {
  clinicName: string;
  slug: string;
  businessSubtype: "general";
  tenantId: null;
} = {
  preset: "dental-clinic",
  tenantId: null,
  slug: "clinica",
  clinicName: "Mi Clínica Dental",
  businessSubtype: "general",
  theme: {
    primaryColor: "#0d9488",
    accentColor: "#38bdf8",
    darkMode: true,
  },
  locale: {
    currencyCode: "USD",
    timezone: "America/Caracas",
    language: "es-VE",
  },
  terminology: {
    staff: "Especialistas",
    staffSingular: "especialista",
    appointment: "cita",
    client: "paciente",
  },
};

export function mergeOdentalTenantConfig(
  base: OdentalTenantConfig,
  partial: Partial<OdentalTenantConfig>,
): OdentalTenantConfig {
  return {
    ...base,
    ...partial,
    theme: { ...base.theme, ...partial.theme },
    locale: { ...base.locale, ...partial.locale },
    terminology: { ...base.terminology, ...partial.terminology },
  };
}
