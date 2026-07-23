// handlers/agenda.ts — Selector de fecha/hora y disponibilidad (zona del tenant)

import { sendMessage, sendInteractiveList } from "../wa-api.ts";
import { formatDateShort } from "../format.ts";
import type { SupabaseClient } from "../lib/supabase.ts";
import { WA_IDS } from "../lib/wa-ids.ts";
import { getUtcOffsetHours } from "../lib/timezone.ts";
import { resolveBusinessHoursForWaba } from "../lib/timezone.ts";
import type { TenantWabaRecord } from "../lib/tenant-resolver.ts";
import type { WaSendConfig } from "../lib/tenant-config.ts";

function parseLocalTimestampToDate(
  dateStr: string | null | undefined,
  timezone: string,
): Date | null {
  if (!dateStr) return null;
  const s = dateStr.replace("T", " ").trim();
  const match = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/,
  );
  if (!match) return null;
  const [, y, m, d, h, min, sec] = match;
  const year = parseInt(y!, 10);
  const month = parseInt(m!, 10) - 1;
  const day = parseInt(d!, 10);
  const off = getUtcOffsetHours(timezone);
  const hour = parseInt(h!, 10) + off;
  const minute = parseInt(min!, 10);
  const second = parseInt(sec ?? "0", 10);
  return new Date(Date.UTC(year, month, day, hour, minute, second));
}

function zonedWallHourToUtcDate(
  year: number,
  month: number,
  day: number,
  hourWall: number,
  timezone: string,
): Date {
  const off = getUtcOffsetHours(timezone);
  return new Date(Date.UTC(year, month - 1, day, hourWall + off, 0, 0));
}

export async function checkAvailability(
  supabase: SupabaseClient,
  tenantId: string,
  employeeId: string,
  date: Date,
  duration: number,
  excludeId?: string,
  timezone: string = "America/Lima",
): Promise<boolean> {
  const start = date;
  const end = new Date(date.getTime() + duration * 60000);
  let q = supabase
    .from("appointments")
    .select("id, date, duration")
    .eq("tenant_id", tenantId)
    .eq("employee_id", employeeId)
    .neq("status", "cancelled");
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  if (!data) return true;
  const hasOverlap = data.some((a: { date: string; duration: number }) => {
    const aStart =
      parseLocalTimestampToDate(a.date, timezone) ?? new Date(a.date);
    const aEnd = new Date(aStart.getTime() + (a.duration ?? 0) * 60000);
    return start < aEnd && end > aStart;
  });
  return !hasOverlap;
}

function todayYmdInTimezone(timezone: string): {
  y: number;
  m: number;
  d: number;
} {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day") };
}

export async function sendDateSelector(
  to: string,
  supabase: SupabaseClient,
  tenantId: string,
  tenantRecord: TenantWabaRecord,
  wa: WaSendConfig,
  employeeIds: string[],
  totalDuration: number,
  minEmployeesFree: number = 1,
) {
  const tz = tenantRecord.timezone;
  const { weekday: weekdaySlots } = resolveBusinessHoursForWaba(
    tenantRecord.waba_business_hours,
    tz,
  );
  const today = todayYmdInTimezone(tz);
  const nowUtc = new Date();
  const rows: { id: string; title: string; description: string }[] = [];

  for (let d = 0; d < 14 && rows.length < 7; d++) {
    const dayCursor = new Date(Date.UTC(today.y, today.m - 1, today.d + d));
    const y = dayCursor.getUTCFullYear();
    const mo = dayCursor.getUTCMonth() + 1;
    const dd = dayCursor.getUTCDate();
    const dayOfWeek = dayCursor.getUTCDay();
    if (dayOfWeek === 0) continue;
    const hours = weekdaySlots;

    let hasSlot = false;
    for (const h of hours) {
      const slotDate = zonedWallHourToUtcDate(y, mo, dd, h, tz);
      if (slotDate <= nowUtc) continue;
      let freeCount = 0;
      for (const empId of employeeIds) {
        const avail = await checkAvailability(
          supabase,
          tenantId,
          empId,
          slotDate,
          totalDuration,
          undefined,
          tz,
        );
        if (avail) freeCount++;
      }
      if (freeCount >= minEmployeesFree) {
        hasSlot = true;
        break;
      }
    }
    if (!hasSlot) continue;

    const labelShort = formatDateShort(new Date(y, mo - 1, dd));
    const dateKeyStr = `${y}-${String(mo).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
    rows.push({
      id: `${WA_IDS.DATE_PREFIX}${dateKeyStr}`,
      title: labelShort,
      description: "Ver horarios",
    });
  }

  if (rows.length === 0) {
    await sendMessage(
      to,
      "No hay fechas disponibles en los próximos días. Escribe *menu* o contacta al negocio.",
      wa,
    );
    return;
  }

  const ok = await sendInteractiveList(
    to,
    "Elegir fecha",
    "¿Qué día prefieres?",
    "Ver fechas",
    [{ title: "Fechas disponibles", rows }],
    wa,
  );
  if (!ok) {
    const fallback = rows.map((r) => `• ${r.title}`).join("\n");
    await sendMessage(
      to,
      `📅 Fechas disponibles:\n\n${fallback}\n\n` +
        "Si no ves el selector, responde con *menu* para reintentar.",
      wa,
    );
  }
}

export async function sendTimeSelector(
  to: string,
  supabase: SupabaseClient,
  tenantId: string,
  tenantRecord: TenantWabaRecord,
  wa: WaSendConfig,
  dateKey: string,
  employeeIds: string[],
  totalDuration: number,
  minEmployeesFree: number = 1,
) {
  const tz = tenantRecord.timezone;
  const { weekday: weekdaySlots, sunday: sundaySlots } =
    resolveBusinessHoursForWaba(tenantRecord.waba_business_hours, tz);

  const [year, month, day] = dateKey.split("-").map(Number);
  const dayOfWeek = new Date(
    Date.UTC(year, month - 1, day, 12, 0, 0),
  ).getUTCDay();
  const hours = dayOfWeek === 0 ? sundaySlots : weekdaySlots;

  const nowUtc = new Date();
  const rows: { id: string; title: string; description: string }[] = [];

  for (const h of hours) {
    const slotDate = zonedWallHourToUtcDate(year, month, day, h, tz);
    if (slotDate <= nowUtc) continue;

    let freeCount = 0;
    for (const empId of employeeIds) {
      const avail = await checkAvailability(
        supabase,
        tenantId,
        empId,
        slotDate,
        totalDuration,
        undefined,
        tz,
      );
      if (avail) freeCount++;
    }
    if (freeCount < minEmployeesFree) continue;

    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const timeLabel = `${h12}:00 ${h < 12 ? "AM" : "PM"}`;
    rows.push({
      id: `${WA_IDS.TIME_PREFIX}${dateKey}T${h.toString().padStart(2, "0")}00`,
      title: timeLabel,
      description: "Disponible",
    });
  }

  if (rows.length === 0) {
    await sendMessage(
      to,
      "No hay horarios disponibles ese día. Por favor elige otro día.",
      wa,
    );
    return;
  }

  const days = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];
  const dayLabel = `${days[dayOfWeek]} ${day} de ${months[month - 1]}`;

  const ok = await sendInteractiveList(
    to,
    dayLabel.slice(0, 60),
    `¿A qué hora te queda bien el ${dayLabel}?`,
    "Ver horarios",
    [{ title: "Horarios disponibles", rows }],
    wa,
  );
  if (!ok) {
    const fallback = rows.map((r) => r.title).join(" | ");
    await sendMessage(
      to,
      `⏰ Horarios disponibles el ${dayLabel}:\n\n${fallback}\n\n` +
        "Si no ves el selector, responde con *menu* para volver al inicio.",
      wa,
    );
  }
}
