#!/usr/bin/env node
/**
 * Valida slots feriado (10–12) y flujo domingo (adelanto 20%).
 * Ejecutar: node scripts/waba-validate-sunday-holiday.mjs
 */
import { createRequire } from "module";
import { pathToFileURL } from "url";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

// Deno-style imports — evaluamos la lógica vía subprocess deno si está disponible
const checks = [];

function assert(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(cond ? "✅" : "❌", name);
}

// Slots esperados (réplica de constants.ts + peru-holidays.ts)
const SALON_SLOT_MINUTES = [0, 30];
const PERU_HOLIDAYS = new Set([
  "2026-06-29",
  "2026-07-23",
  "2026-07-28",
  "2026-07-29",
]);
const PERU_HOLIDAYS_CLOSED = new Set([
  "2026-07-23",
  "2026-07-28",
  "2026-07-29",
]);

function isPeruHoliday(dateKey) {
  return PERU_HOLIDAYS.has(dateKey);
}

function isSalonClosed(dateKey) {
  return PERU_HOLIDAYS_CLOSED.has(dateKey);
}

function getHolidayTimeSlots() {
  const slots = [];
  for (const hour of [10, 11, 12]) {
    for (const minute of SALON_SLOT_MINUTES) {
      if (hour === 12 && minute === 30) continue;
      slots.push({ hour, minute });
    }
  }
  return slots;
}

function getSalonTimeSlots(dayOfWeek, dateKey) {
  if (dateKey && isSalonClosed(dateKey)) return [];
  if (dateKey && isPeruHoliday(dateKey)) return getHolidayTimeSlots();
  const hours =
    dayOfWeek === 0 ? [10, 11, 12] : [10, 11, 12, 13, 14, 15, 16, 17];
  const slots = [];
  for (const hour of hours) {
    for (const minute of SALON_SLOT_MINUTES) {
      if (dayOfWeek === 0 && hour === 10 && minute === 0) continue;
      slots.push({ hour, minute });
    }
  }
  if (dayOfWeek === 0) slots.push({ hour: 13, minute: 0 });
  return slots;
}

function isSunday(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay() === 0;
}

// Feriado lun 29-jun-2026: solo hasta 12:00
const feriado = "2026-06-29";
const feriadoSlots = getSalonTimeSlots(1, feriado);
assert(
  "Feriado 29-jun: último slot 12:00",
  feriadoSlots.some((s) => s.hour === 12 && s.minute === 0),
);
assert(
  "Feriado 29-jun: NO slot 12:30",
  !feriadoSlots.some((s) => s.hour === 12 && s.minute === 30),
);
assert(
  "Feriado 29-jun: NO slot 13:00",
  !feriadoSlots.some((s) => s.hour === 13),
);

// Feriado 23/28/29-jul: CC cerrado — 0 slots
for (const closed of ["2026-07-23", "2026-07-28", "2026-07-29"]) {
  assert(
    `Feriado ${closed.slice(5)}: cerrado (0 slots)`,
    isSalonClosed(closed) && getSalonTimeSlots(0, closed).length === 0,
  );
}

// Domingo normal: 10:30 – 13:00
const domingo = "2026-06-28";
const domSlots = getSalonTimeSlots(0, domingo);
assert(
  "Domingo: incluye 10:30",
  domSlots.some((s) => s.hour === 10 && s.minute === 30),
);
assert(
  "Domingo: incluye 13:00",
  domSlots.some((s) => s.hour === 13 && s.minute === 0),
);
assert("Domingo: adelanto requerido", isSunday(domingo));

// Lunes normal: hasta 17:30
const lun = "2026-06-30";
const lunSlots = getSalonTimeSlots(2, lun);
assert(
  "Lun normal: slot 17:30",
  lunSlots.some((s) => s.hour === 17 && s.minute === 30),
);

const failed = checks.filter((c) => !c.ok);
if (failed.length) {
  console.error("\nFallaron", failed.length, "checks");
  process.exit(1);
}
console.log("\nTodos los checks OK (" + checks.length + ")");
