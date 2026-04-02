import type { TenantConfig, TimeFormatPreference } from "./types";
import { instanteCitaEnZona } from "./iana-timezone";

export type { TimeFormatPreference };

/** true si la agenda debe mostrar am/pm. */
export function usaFormato12Horas(locale: TenantConfig["locale"]): boolean {
  return (locale.timeFormat ?? "24") === "12";
}

/**
 * Etiqueta de una hora entera del día (fila de agenda), respetando zona e idioma.
 */
export function formatoHoraAgendaSlot(
  fechaDiaCalendario: Date,
  horaEntera: number,
  timeZone: string,
  language: TenantConfig["locale"]["language"],
  timeFormat: TimeFormatPreference,
): string {
  const inst = instanteCitaEnZona(fechaDiaCalendario, horaEntera, timeZone);
  return formatoHoraInstanteEnZona(inst, timeZone, language, timeFormat);
}

/** Hora de un instante (p. ej. inicio de cita) según preferencia 12/24 h. */
export function formatoHoraInstanteEnZona(
  instante: Date,
  timeZone: string,
  language: TenantConfig["locale"]["language"],
  timeFormat: TimeFormatPreference,
): string {
  return new Intl.DateTimeFormat(language, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: timeFormat === "12",
  }).format(instante);
}
