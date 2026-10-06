// design-staff-hours.mjs — compartido Deno (webhook) + Node (QA).
// Horario ack foto diseño: 7:00–20:59 Lima, todos los días (sin feriado).

export const LIMA_UTC_OFFSET = 5;
export const DESIGN_STAFF_HOUR_START = 7;
/** Exclusivo: < 21 → hasta 20:59 Lima. */
export const DESIGN_STAFF_HOUR_END = 21;

/** Suite `waba:validate:design-pause` — SÍ ejercita pausa (otros QA no pausan). */
export const DESIGN_PAUSE_QA_PHONE = "51999000985";

export const DESIGN_ACK_IN_HOURS =
  "En breves momentos una asesora personalizada se comunicará contigo, luego de visualizar tu diseño 💜";

export const DESIGN_ACK_OFF_HOURS =
  "Recibimos tu diseño 💜 Nuestro equipo lo revisará y una asesora te escribirá en el próximo horario de atención (7 AM – 9 PM).";

/** true = 7:00–20:59 America/Lima. */
export function isWithinDesignStaffHours(now = new Date()) {
  const limaHour = (now.getUTCHours() - LIMA_UTC_OFFSET + 24) % 24;
  return (
    limaHour >= DESIGN_STAFF_HOUR_START && limaHour < DESIGN_STAFF_HOUR_END
  );
}

export function getDesignAckMessage(now = new Date()) {
  return isWithinDesignStaffHours(now)
    ? DESIGN_ACK_IN_HOURS
    : DESIGN_ACK_OFF_HOURS;
}

export function isDesignPauseQaPhone(phone) {
  return phone.replace(/\D/g, "") === DESIGN_PAUSE_QA_PHONE;
}

/**
 * QA genérico no pausa (Treysy imagen mid-agenda, etc.).
 * Excepción: DESIGN_PAUSE_QA_PHONE sí pausa para la suite dedicada.
 */
export function shouldSkipDesignPauseForQa(phone) {
  const d = phone.replace(/\D/g, "");
  if (!d.startsWith("519990009")) return false;
  const suffix = parseInt(d.slice(-3), 10);
  const isQa = suffix >= 978 && suffix <= 999;
  if (!isQa) return false;
  return d !== DESIGN_PAUSE_QA_PHONE;
}
