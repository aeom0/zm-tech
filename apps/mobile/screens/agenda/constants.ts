/** Franja horaria visible en la grilla (10:00–19:00) */
export const AGENDA_HOURS = Array.from({ length: 10 }, (_, i) => i + 10);

export const DAYS_ES = [
  "Dom",
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
] as const;
