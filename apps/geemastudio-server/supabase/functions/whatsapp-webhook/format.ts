// format.ts — Formateo de datos

import { DEFAULT_UBICACION_TEXT } from "./lib/salon-location.ts";

/** Límite de caracteres para títulos en listas interactivas de WhatsApp. */
export const LIST_TITLE_MAX = 24;

export { DEFAULT_UBICACION_TEXT } from "./lib/salon-location.ts";

/** Lima = UTC-5. La columna appointments.date es "timestamp without time zone"; guardamos hora local Lima. */
const LIMA_UTC_OFFSET_HOURS = 5;

/**
 * Convierte un Date (UTC) a string "YYYY-MM-DD HH:mm:ss" en hora Lima.
 * Para insertar en appointments.date (timestamp without time zone).
 */
export function toLimaLocalTimestamp(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${
    get("minute")
  }:${get("second")}`;
}

/**
 * Parsea un valor "YYYY-MM-DD HH:mm:ss" o ISO como hora local Lima y devuelve Date (UTC).
 * Para comparar citas en checkAvailability (BD guarda Lima local).
 */
export function parseLimaLocalToDate(
  dateStr: string | null | undefined,
): Date | null {
  if (!dateStr) return null;
  // appointments.date = hora Lima literal; PostgREST a veces añade Z/+00 — ignorar TZ
  const s = dateStr
    .replace("T", " ")
    .trim()
    .replace(/\.\d+/, "")
    .replace(/Z$/i, "")
    .replace(/[+-]\d{2}:?\d{2}$/, "");
  const match = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!match) return null;
  const [, y, m, d, h, min, sec] = match;
  const year = parseInt(y!, 10);
  const month = parseInt(m!, 10) - 1;
  const day = parseInt(d!, 10);
  const hour = parseInt(h!, 10) + LIMA_UTC_OFFSET_HOURS;
  const minute = parseInt(min!, 10);
  const second = parseInt(sec ?? "0", 10);
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

/**
 * Recorta un título al límite de la API (24 chars). Si se recorta, añade "…" al final.
 * Intenta cortar en espacio para no partir palabras.
 */
export function truncateListTitle(
  text: string,
  max: number = LIST_TITLE_MAX,
): string {
  const t = (text ?? "").trim();
  if (t.length <= max) return t;
  const slice = t.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const out = lastSpace > max * 0.5 ? slice.slice(0, lastSpace) : slice;
  return out + "…";
}

/**
 * Fecha corta para filas de listas interactivas (límite 24 chars).
 * Ej: "Mié 12 mar", "Lun 15 abr".
 * Usa componentes UTC del Date — en Edge (TZ=UTC) `getDay()` local coincide,
 * pero construimos siempre vía noon UTC / dateKey para no depender del TZ del runtime.
 */
export function formatDateShort(date: Date): string {
  const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  const d = date.getUTCDate();
  const dayName = days[date.getUTCDay()];
  const month = months[date.getUTCMonth()];
  return `${dayName} ${d} ${month}`;
}

/** Igual que formatDateShort pero desde YYYY-MM-DD (calendario Lima, sin TZ local). */
export function formatDateKeyShort(dateKey: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!m) return dateKey;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return formatDateShort(new Date(Date.UTC(y, mo - 1, d, 12, 0, 0)));
}

export function formatSoles(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "0,00";
  try {
    return value.toLocaleString("es-PE", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  } catch {
    const fixed = value.toFixed(decimals);
    const [intPart, decPart] = fixed.split(".");
    const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return decPart ? `${withThousands},${decPart}` : withThousands;
  }
}

/** Hora Lima (hour/minute/dayPeriod crudo, ej. "a. m.") vía Intl.DateTimeFormat — compartido por formatDateSpanish y formatHourOnlyLima. */
export function timePartsLima(date: Date): {
  hour: string;
  minute: string;
  dayPeriod: string;
} {
  const parts = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    hour: get("hour"),
    minute: get("minute"),
    dayPeriod: get("dayPeriod"),
  };
}

/** Fecha y hora en español (America/Lima), hora 12h. `date` = instante UTC correcto. */
export function formatDateSpanish(date: Date): string {
  const parts = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    weekday: "long",
    day: "numeric",
    month: "long",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const weekday = get("weekday");
  const day = get("day");
  const month = get("month");
  const { hour, minute, dayPeriod } = timePartsLima(date);
  return `${weekday} ${day} de ${month} a las ${hour}:${minute} ${dayPeriod}`;
}

/** Formatea appointments.date (timestamp WITHOUT tz, hora Lima literal). */
export function formatStoredAppointmentDate(
  dateStr: string | null | undefined,
): string {
  const dt = parseLimaLocalToDate(dateStr);
  if (!dt) return String(dateStr ?? "");
  return formatDateSpanish(dt);
}

/** Formatea ISO UTC de sesión (parsed_datetime) a texto Lima. */
export function formatSessionDatetimeIso(isoStr: string): string {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return formatDateSpanish(d);
}

/**
 * Haiku a veces pega 🌸/⭐ en un párrafo. WhatsApp solo lista si hay salto de línea.
 * "foo 🌸 Clásicas — S/70 🌸 Rímel — S/85" → una viñeta por línea.
 */
export function formatCatalogBulletNewlines(text: string): string {
  if (!text) return text;
  return text.replace(
    /([^\n🌸⭐])[^\S\r\n]*(🌸|⭐)(?![🌸⭐])[^\S\r\n]*(?=[*_~]?[a-zA-ZáéíóúñÁÉÍÓÚÑ0-9])/gu,
    "$1\n$2 ",
  );
}

/** Resumen del carrito: total en S/; no se muestra duración total (promos son contenedores). */
export function formatCartSummary(
  services: { name: string; price: string; duration: number }[],
): string {
  if (services.length === 0) return "Tu selección está vacía.";
  let total = 0;
  let text = "🛒 *Tu selección:*\n\n";
  for (const s of services) {
    const p = parseFloat(String(s.price));
    total += p;
    text += `🌸 ${s.name} — S/ ${formatSoles(p)}\n`;
  }
  return text + `\n*Total: S/ ${formatSoles(total)}*`;
}

/** Línea resuelta del carrito (nombre + precio unitario + cantidad). */
export interface CartLine {
  name: string;
  quantity: number;
  unitPrice: number;
  duration?: number;
}

/** Resumen del carrito desde líneas (servicios/packs/promos): solo total en S/, sin duración total. */
export function formatCartSummaryFromLines(lines: CartLine[]): string {
  if (lines.length === 0) return "Tu selección está vacía.";
  let total = 0;
  let text = "🛒 *Tu selección:*\n\n";
  for (const l of lines) {
    const lineTotal = l.quantity * l.unitPrice;
    total += lineTotal;
    const qty = l.quantity > 1 ? `${l.quantity} × ` : "";
    text += `🌸 ${qty}${l.name} — S/ ${formatSoles(lineTotal)}\n`;
  }
  return text + `\n*Total: S/ ${formatSoles(total)}*`;
}

/** Dado ids (con duplicados) y lista única de servicios, devuelve servicios en orden para totales y resumen. */
export function orderedServicesFromIds<T extends { id: string }>(
  ids: string[],
  uniqueServices: T[],
): T[] {
  const map = new Map(uniqueServices.map((s) => [s.id, s]));
  return ids.map((id) => map.get(id)).filter(Boolean) as T[];
}

const BUSINESS_HOURS = { start: 10, end: 18 };
const SUNDAY_HOURS = { start: 10, end: 13 };

export function isBusinessHours(): boolean {
  const now = new Date();
  const peruTime = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Lima" }),
  );
  const hour = peruTime.getHours();
  const day = peruTime.getDay();
  if (day === 0) return hour >= SUNDAY_HOURS.start && hour < SUNDAY_HOURS.end;
  return hour >= BUSINESS_HOURS.start && hour < BUSINESS_HOURS.end;
}

/** Día de la semana en Lima, ISO (1=lunes … 7=domingo). Para validar promos por día (`promotions.valid_days`). */
export function limaIsoWeekday(date: Date): number {
  const peruTime = new Date(
    date.toLocaleString("en-US", { timeZone: "America/Lima" }),
  );
  const jsDay = peruTime.getDay(); // 0=domingo … 6=sábado
  return jsDay === 0 ? 7 : jsDay;
}

export function getMenuResponse(option: string): string {
  const l = option.toLowerCase().trim();
  if (l === "mi_cita" || (l.includes("mi cita") && !l.includes("agendar"))) {
    return "📋 *Mi cita*\n\nSi ya tienes una cita pendiente, puedes ver el resumen y *cambiar fecha u hora* sin duplicar la reserva.";
  }
  if (
    l === "agendar_cita" ||
    l === "2" ||
    (l.includes("agendar") && !l.includes("mi cita")) ||
    (l.includes("cita") && l.includes("agendar"))
  ) {
    return "📅 *Agendar Cita*\n\nSelecciona *Ver servicios* para elegir uno o más servicios y luego podrás agendar.";
  }
  if (l === "horarios" || l === "3" || l.includes("horario")) {
    return "🕐 *Horarios de Atención*\n\n📅 Lunes a Sábado (con cita previa)\n⏰ 10:00 AM - 6:00 PM\n\n📅 Domingos\n⏰ 10:30 AM - 1:00 PM (previa cita)";
  }
  if (
    l === "ubicacion" ||
    l === "4" ||
    l.includes("ubicaci") ||
    l.includes("donde")
  ) {
    return DEFAULT_UBICACION_TEXT;
  }
  return "No entendí tu mensaje 🫶 Escribe *menu* para ver las opciones disponibles.";
}
