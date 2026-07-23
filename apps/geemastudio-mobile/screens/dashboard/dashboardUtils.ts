/** Parseo robusto de fechas ISO / Postgres para citas */
export function parseAppointmentDate(dateString: string): Date {
  if (!dateString) return new Date();
  const s = String(dateString).trim();
  const hasTimezone = s.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(s);
  return new Date(hasTimezone ? s : `${s.replace(" ", "T")}Z`);
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

export function formatDashboardTime(
  dateString: string,
  locale: string,
): string {
  return parseAppointmentDate(dateString).toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDashboardDateLong(locale: string): string {
  return new Date().toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
