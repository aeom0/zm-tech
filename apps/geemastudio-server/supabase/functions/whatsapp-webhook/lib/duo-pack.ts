/**
 * Pack de dos personas con el mismo servicio (ej. 2 Lifting).
 * Son dos citas en paralelo, no una cita con el servicio repetido.
 */

export function isTwoPersonSameServiceIds(ids: string[]): boolean {
  if (ids.length < 2) return false;
  const first = ids[0];
  if (!first) return false;
  return ids.every((id) => id === first);
}

/**
 * Horas que ve la clienta: en punto si las :00 están libres.
 * La media hora se lista solo cuando las :00 de esa hora no tienen cupo.
 * Si ella escribe 5:30, el agendado sigue aceptando ese slot.
 */
export function collapseSlotsToClientHours(
  slots: { hour: number; minute: number }[],
): { hour: number; minute: number }[] {
  const byHour = new Map<number, Set<number>>();
  for (const slot of slots) {
    const mins = byHour.get(slot.hour) ?? new Set<number>();
    mins.add(slot.minute);
    byHour.set(slot.hour, mins);
  }
  const hours = [...byHour.keys()].sort((a, b) => a - b);
  const out: { hour: number; minute: number }[] = [];
  for (const hour of hours) {
    const mins = byHour.get(hour)!;
    if (mins.has(0)) out.push({ hour, minute: 0 });
    else if (mins.has(30)) out.push({ hour, minute: 30 });
  }
  return out;
}

/** "10 AM" en punto; "5:30 PM" solo si esa media es la que quedó libre. */
export function formatHourCompact(hour24: number, minute = 0): string {
  const h12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
  const period = hour24 >= 12 ? "PM" : "AM";
  if (minute === 0) return `${h12} ${period}`;
  return `${h12}:${String(minute).padStart(2, "0")} ${period}`;
}

/**
 * Texto que no es un nombre: ubicación, cupo, día, precio.
 * Mientras pedimos a la acompañante, estos mensajes siguen su flujo
 * y después se vuelve a preguntar el nombre.
 */
export function textInterruptsCompanionName(text: string): boolean {
  const lower = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!lower) return false;
  if (
    /\b(donde|ubicad|direccion|mapa|maps|cupo|disponib|horario|precio|cuanto|promocion|promo|yape|plin)\b/.test(
      lower,
    )
  ) {
    return true;
  }
  if (
    /\b(manana|hoy|pasado|lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.test(
      lower,
    )
  ) {
    return true;
  }
  if (/\b(a las|am|pm)\b/.test(lower) && /\d/.test(lower)) return true;
  if (
    /\b(tiene|tienen|tambien|servicio|servicios|unas|como es|que es|quiero|gustaria|cupo)\b/.test(
      lower,
    )
  ) {
    return true;
  }
  if (/[?¿]/.test(text)) return true;
  return false;
}

const NON_NAME_REPLY =
  /^(hola+|holi+s?|buen(a|o)s?( (dias|tardes|noches))?|hey|ola|gracias|muchas gracias|ok(i|is|ey)?|oka|si+|sip|no|nop|dale|listo|claro|ya|bien|bueno|perfecto|hasta luego|chao|nada|ninguna|nadie)$/;

function normalizeForNameCheck(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Nombre de persona: pocas palabras, sin pregunta ni verbo de servicio. */
export function looksLikePersonName(text: string): boolean {
  const clean = text.trim().replace(/\s+/g, " ");
  if (clean.length < 2 || clean.length > 40) return false;
  if (textInterruptsCompanionName(clean)) return false;
  const words = clean.split(" ");
  if (words.length > 4) return false;
  if (NON_NAME_REPLY.test(normalizeForNameCheck(clean))) return false;
  return /^[\p{L}\s.'’-]+$/u.test(clean);
}

/** "Somos 2" / "mi hija y yo" después de haber cotizado el pack. */
export function mentionsTwoPeople(text: string): boolean {
  const lower = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!lower) return false;
  if (/\b(cuanto|precio|que es|como es)\b/.test(lower)) return false;
  return (
    /\bsomos\s+(2|dos)\b/.test(lower) ||
    /\bmi hija y yo\b/.test(lower) ||
    /\bcon mi hija\b/.test(lower) ||
    /\blas dos\b/.test(lower)
  );
}

/** "Me gusta el pack de 2" / "2 lifting" confirma el pack de dos personas. */
export function confirmsTwoPersonPack(text: string): boolean {
  const lower = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!lower) return false;
  if (/\b(cuanto|precio|que es|como es)\b/.test(lower) && !/\bme gusta\b/.test(lower)) {
    return false;
  }
  return (
    /\bpack de (2|dos)\b/.test(lower) ||
    /\b(2|dos) lifting\b/.test(lower) ||
    /\bpack de dos personas\b/.test(lower)
  );
}
