// timezone.ts — Zona horaria IANA del tenant (Deno / Temporal)

/** Offset respecto a UTC en horas (positivo si la zona está adelante de UTC). */
export function getUtcOffsetHours(timezone: string): number {
  try {
    const now = Temporal.Now.zonedDateTimeISO(timezone);
    return -(now.offsetNanoseconds / 1e9 / 3600);
  } catch {
    try {
      const fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        timeZoneName: "longOffset",
      });
      const parts = fmt.formatToParts(new Date());
      const tz = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
      const m = tz.replace("GMT", "").match(/^([+-])(\d{1,2})(?::(\d{2}))?$/);
      if (!m) return 0;
      const sign = m[1] === "-" ? -1 : 1;
      const h = parseInt(m[2]!, 10);
      const min = m[3] ? parseInt(m[3], 10) : 0;
      return sign * (h + min / 60);
    } catch {
      return 0;
    }
  }
}

/** Horas de atención WABA o fallback desde tenant_settings.business_hours. */
export function resolveBusinessHoursForWaba(
  wabaHours: { weekday: number[]; sunday: number[] } | null,
  _timezone: string,
): { weekday: number[]; sunday: number[] } {
  const weekday = wabaHours?.weekday?.length
    ? [...wabaHours.weekday].sort((a, b) => a - b)
    : [10, 11, 12, 13, 14, 15, 16, 17, 18];
  const sunday = wabaHours?.sunday?.length
    ? [...wabaHours.sunday].sort((a, b) => a - b)
    : [10, 11, 12];
  return { weekday, sunday };
}
