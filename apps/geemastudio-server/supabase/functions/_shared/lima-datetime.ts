/** appointments.date = timestamp WITHOUT time zone, hora Lima literal. */

const LIMA_UTC_OFFSET_HOURS = 5;

/**
 * Parsea "YYYY-MM-DD HH:mm:ss" (o ISO con Z erróneo) como hora Lima → Date UTC.
 */
export function parseLimaLocalToDate(
  dateStr: string | null | undefined,
): Date | null {
  if (!dateStr) return null;
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
  return new Date(
    Date.UTC(
      parseInt(y!, 10),
      parseInt(m!, 10) - 1,
      parseInt(d!, 10),
      parseInt(h!, 10) + LIMA_UTC_OFFSET_HOURS,
      parseInt(min!, 10),
      parseInt(sec ?? "0", 10),
    ),
  );
}

/**
 * "Ahora" en hora Lima literal ("YYYY-MM-DD HH:mm:ss") para comparar contra
 * appointments.date. Usar `now.toISOString()` (UTC) deja una ventana ciega de
 * 5 h en la que una cita de hoy parece pasada.
 *
 * @param graceHours margen hacia atrás; una cita en curso sigue contando.
 */
export function limaNowTimestamp(graceHours = 0): string {
  return limaNowAsUtcShiftedDate(graceHours)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

/**
 * "Ahora" en Lima como Date con los componentes UTC ya desplazados (para sumar
 * horas/días con `getTime()`/`Date.UTC` y luego formatear con getUTC*).
 * No es un instante real: es la técnica usada en cron jobs para construir
 * ventanas comparables contra `appointments.date` (literal Lima, sin TZ).
 */
export function limaNowAsUtcShiftedDate(graceHours = 0): Date {
  return new Date(
    Date.now() - (LIMA_UTC_OFFSET_HOURS + graceHours) * 60 * 60 * 1000,
  );
}

/** Texto en español (America/Lima) para appointments.date o ISO UTC. */
export function formatAppointmentDateForClient(
  dateInput: string,
): string | null {
  const trimmed = dateInput.trim();
  let date: Date | null = null;

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(trimmed)) {
    date = parseLimaLocalToDate(trimmed);
  }
  if (!date) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) date = parsed;
  }
  if (!date) return null;

  const parts = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";

  const weekday = get("weekday").toLowerCase();
  const day = get("day");
  const month = get("month").toLowerCase();
  const hour = get("hour");
  const minute = get("minute");
  const dayPeriod = get("dayPeriod").toUpperCase();

  const time = minute === "00"
    ? `${hour}:00 ${dayPeriod}`
    : `${hour}:${minute} ${dayPeriod}`;
  return `${weekday} ${day} de ${month} a las ${time}`;
}

/** Solo hora (ej. "3:00 PM") para recordatorio mismo día. */
export function formatAppointmentTimeForClient(
  dateInput: string,
): string | null {
  const trimmed = dateInput.trim();
  let date: Date | null = null;

  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(trimmed)) {
    date = parseLimaLocalToDate(trimmed);
  }
  if (!date) {
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) date = parsed;
  }
  if (!date) return null;

  const parts = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const hour = get("hour");
  const minute = get("minute");
  const dayPeriod = get("dayPeriod").toUpperCase();

  return minute === "00"
    ? `${hour}:00 ${dayPeriod}`
    : `${hour}:${minute} ${dayPeriod}`;
}
