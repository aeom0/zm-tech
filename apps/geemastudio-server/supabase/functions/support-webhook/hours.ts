// hours.ts — Horario de atención humana del soporte.
// 8:00 a 20:00 hora de Venezuela (UTC−4, sin horario de verano), todos los días.
// Lo calcula el código y se le pasa al agente; el modelo no lo deduce.

const VET_OFFSET_HOURS = -4;
export const SUPPORT_OPEN_HOUR = 8;
export const SUPPORT_CLOSE_HOUR = 20;

export interface SupportHoursStatus {
  open: boolean;
  /** Hora local de Venezuela, "HH:MM". */
  localTime: string;
}

export function supportHoursStatus(now = new Date()): SupportHoursStatus {
  const local = new Date(now.getTime() + VET_OFFSET_HOURS * 60 * 60 * 1000);
  const h = local.getUTCHours();
  const m = local.getUTCMinutes();
  return {
    open: h >= SUPPORT_OPEN_HOUR && h < SUPPORT_CLOSE_HOUR,
    localTime: `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
  };
}

/** Lo que el usuario debe saber sobre cuándo lo contacta una persona. */
export function humanReplyNotice(status: SupportHoursStatus): string {
  return status.open
    ? "Una persona del equipo te responde en breve por este chat."
    : `Nuestro horario de atención es de ${SUPPORT_OPEN_HOUR}:00 a ${SUPPORT_CLOSE_HOUR}:00 (hora de Venezuela); tu caso queda registrado y te contactamos desde las ${SUPPORT_OPEN_HOUR}:00.`;
}
