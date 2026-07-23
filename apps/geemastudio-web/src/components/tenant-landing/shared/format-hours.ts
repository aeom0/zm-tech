import {
  CLAVES_DIA_LABORAL,
  ETIQUETA_DIA_LABORAL,
} from "@geemastudio/tenant-config";
import type { BusinessHoursConfig } from "@/types/tenant-landing";

export interface DayEntry {
  label: string;
  hours: string;
  enabled: boolean;
}

export function formatBusinessHours(
  hours: BusinessHoursConfig | null,
): DayEntry[] {
  if (!hours) return [];
  return CLAVES_DIA_LABORAL.map((day) => {
    const config = hours[day];
    if (!config) {
      return {
        label: ETIQUETA_DIA_LABORAL[day],
        hours: "—",
        enabled: false,
      };
    }
    return {
      label: ETIQUETA_DIA_LABORAL[day],
      hours: config.enabled ? `${config.open} – ${config.close}` : "Cerrado",
      enabled: config.enabled,
    };
  });
}
