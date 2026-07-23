import { DateTime } from "luxon";

/** Alineado con claves `business_hours` y `DiaLaboralKey`. */
export type DiaLaboralKeyIana =
  | "domingo"
  | "lunes"
  | "martes"
  | "miercoles"
  | "jueves"
  | "viernes"
  | "sabado";

/** Luxon: lunes=1 … domingo=7 — coherente con `business_hours`. */
const LUXON_WEEKDAY_A_DIA_LABORAL: Record<number, DiaLaboralKeyIana> = {
  7: "domingo",
  1: "lunes",
  2: "martes",
  3: "miercoles",
  4: "jueves",
  5: "viernes",
  6: "sabado",
};

/** Valida IANA; si falla, `America/Caracas`. */
export function zonaIANASegura(timeZone: string | null | undefined): string {
  const z = (timeZone ?? "").trim() || "America/Caracas";
  const probe = DateTime.now().setZone(z);
  return probe.isValid ? z : "America/Caracas";
}

export function inicioDiaHoyEnZonaIANA(timeZone: string): Date {
  const z = zonaIANASegura(timeZone);
  return DateTime.now().setZone(z).startOf("day").toJSDate();
}

/** Medianoche del día calendario en zona que contiene el instante dado. */
export function inicioDiaDelInstanteEnZona(
  instant: Date,
  timeZone: string,
): Date {
  const z = zonaIANASegura(timeZone);
  return DateTime.fromJSDate(instant, { zone: z }).startOf("day").toJSDate();
}

export function diaLaboralKeyDesdeFechaEnZona(
  fecha: Date,
  timeZone: string,
): DiaLaboralKeyIana {
  const z = zonaIANASegura(timeZone);
  const w = DateTime.fromJSDate(fecha, { zone: z }).weekday;
  return LUXON_WEEKDAY_A_DIA_LABORAL[w] ?? "lunes";
}

function inicioSemanaDomingoLuxon(dt: DateTime): DateTime {
  const d = dt.startOf("day");
  const daysBack = d.weekday % 7;
  return d.minus({ days: daysBack });
}

/** Semana domingo→sábado en la zona del tenant; cada día es inicio de día local allí. */
export function calcularSemanaAgenda(
  selectedDate: Date,
  timeZone: string,
): { weekStart: Date; weekDays: Date[] } {
  const z = zonaIANASegura(timeZone);
  const anchor = DateTime.fromJSDate(selectedDate, { zone: z });
  const weekStart = inicioSemanaDomingoLuxon(anchor);
  const weekDays = Array.from({ length: 7 }, (_, i) =>
    weekStart.plus({ days: i }).startOf("day").toJSDate(),
  );
  return { weekStart: weekStart.toJSDate(), weekDays };
}

export function sumarDiasEnZonaIANA(
  date: Date,
  days: number,
  timeZone: string,
): Date {
  const z = zonaIANASegura(timeZone);
  return DateTime.fromJSDate(date, { zone: z })
    .plus({ days })
    .startOf("day")
    .toJSDate();
}

export function sumarSemanasEnZonaIANA(
  date: Date,
  semanas: number,
  timeZone: string,
): Date {
  const z = zonaIANASegura(timeZone);
  return DateTime.fromJSDate(date, { zone: z })
    .plus({ weeks: semanas })
    .startOf("day")
    .toJSDate();
}

export function esMismoDiaCalendarioEnZona(
  a: Date,
  b: Date,
  timeZone: string,
): boolean {
  const z = zonaIANASegura(timeZone);
  const da = DateTime.fromJSDate(a, { zone: z }).toISODate();
  const db = DateTime.fromJSDate(b, { zone: z }).toISODate();
  return da === db;
}

export function esHoyEnZonaIANA(date: Date, timeZone: string): boolean {
  const z = zonaIANASegura(timeZone);
  const today = DateTime.now().setZone(z).toISODate();
  const d = DateTime.fromJSDate(date, { zone: z }).toISODate();
  return today === d;
}

export function horaCalendarioEnZona(date: Date, timeZone: string): number {
  const z = zonaIANASegura(timeZone);
  return DateTime.fromJSDate(date, { zone: z }).hour;
}

/** Minutos desde medianoche (0–1439) en la zona IANA del negocio. */
export function minutosDelDiaEnZona(date: Date, timeZone: string): number {
  const z = zonaIANASegura(timeZone);
  const dt = DateTime.fromJSDate(date, { zone: z });
  return dt.hour * 60 + dt.minute;
}

/** Instante para guardar en BD: inicio de `horaEntera` en la fecha de columna (tenant). */
export function instanteCitaEnZona(
  fechaColumnaInicioDia: Date,
  horaEntera: number,
  timeZone: string,
): Date {
  const z = zonaIANASegura(timeZone);
  const col = DateTime.fromJSDate(fechaColumnaInicioDia, { zone: z });
  return col
    .set({ hour: horaEntera, minute: 0, second: 0, millisecond: 0 })
    .toJSDate();
}

export function formatoFechaLargaEnZona(
  date: Date,
  locale: string,
  timeZone: string,
): string {
  const z = zonaIANASegura(timeZone);
  return new Intl.DateTimeFormat(locale, {
    timeZone: z,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
}

export function formatoFechaCortaEnZona(
  date: Date,
  locale: string,
  timeZone: string,
): string {
  const z = zonaIANASegura(timeZone);
  return new Intl.DateTimeFormat(locale, {
    timeZone: z,
    month: "short",
    day: "numeric",
  }).format(date);
}

/** Índice 0 = domingo … 6 = sábado según calendario en la zona (como `Date.getDay()`). */
export function indiceDiaSemanaJSEnZona(date: Date, timeZone: string): number {
  const z = zonaIANASegura(timeZone);
  const w = DateTime.fromJSDate(date, { zone: z }).weekday;
  return w === 7 ? 0 : w;
}

export function diaDelMesEnZona(date: Date, timeZone: string): number {
  const z = zonaIANASegura(timeZone);
  return DateTime.fromJSDate(date, { zone: z }).day;
}
