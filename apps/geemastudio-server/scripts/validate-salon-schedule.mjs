#!/usr/bin/env node
/**
 * Valida reglas de horario WABA + mobile (feriados, domingos, L–S, cerrados).
 * Ejecutar: node scripts/validate-salon-schedule.mjs
 *           yarn validate:schedule
 */
const PERU_HOLIDAYS = new Set([
  "2026-01-01",
  "2026-04-02",
  "2026-04-03",
  "2026-05-01",
  "2026-06-29",
  "2026-07-23",
  "2026-07-28",
  "2026-07-29",
  "2026-08-06",
  "2026-08-30",
  "2026-10-08",
  "2026-11-01",
  "2026-12-08",
  "2026-12-25",
]);

/** Feriados con CC cerrado — sin citas (alineado con peru-holidays.ts). */
const PERU_HOLIDAYS_CLOSED = new Set([
  "2026-07-23",
  "2026-07-28",
  "2026-07-29",
]);

/** Última hora de inicio por feriado (default 12). */
const PERU_HOLIDAY_OPEN_UNTIL = {
  "2026-08-06": 14,
};

const SALON_SLOT_MINUTES = [0, 30];
const SALON_HOURS_WEEKDAY = [10, 11, 12, 13, 14, 15, 16, 17];
const SALON_HOURS_SUNDAY = [10, 11, 12];

function isPeruHoliday(dateKey) {
  return PERU_HOLIDAYS.has(dateKey);
}

function isSalonClosed(dateKey) {
  return PERU_HOLIDAYS_CLOSED.has(dateKey);
}

function getHolidayOpenUntilHour(dateKey) {
  return PERU_HOLIDAY_OPEN_UNTIL[dateKey] ?? 12;
}

function dayOfWeekFromDateKey(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).getUTCDay();
}

function getHolidayTimeSlots(openUntilHour) {
  const until = Math.min(18, Math.max(10, Math.trunc(openUntilHour)));
  const slots = [];
  for (let hour = 10; hour <= until; hour++) {
    for (const minute of SALON_SLOT_MINUTES) {
      if (hour === until && minute === 30) continue;
      slots.push({ hour, minute });
    }
  }
  return slots;
}

function getSalonTimeSlots(dayOfWeek, dateKey) {
  if (dateKey && isSalonClosed(dateKey)) return [];
  if (dateKey && isPeruHoliday(dateKey)) {
    return getHolidayTimeSlots(getHolidayOpenUntilHour(dateKey));
  }
  const hours = dayOfWeek === 0 ? SALON_HOURS_SUNDAY : SALON_HOURS_WEEKDAY;
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

function getAdvancePaymentRate(dateKey) {
  if (isSalonClosed(dateKey)) return null;
  if (dayOfWeekFromDateKey(dateKey) === 0) return 0.2;
  return null;
}

function requiresAdvancePayment(dateKey) {
  return getAdvancePaymentRate(dateKey) !== null;
}

function getUnionGridHours(dateKeys) {
  const hours = new Set();
  for (const dk of dateKeys) {
    const dow = dayOfWeekFromDateKey(dk);
    for (const { hour } of getSalonTimeSlots(dow, dk)) hours.add(hour);
  }
  return [...hours].sort((a, b) => a - b);
}

const checks = [];
function assert(name, cond) {
  checks.push({ name, ok: !!cond });
  console.log(cond ? "✅" : "❌", name);
}

// ── Feriado lun 29-jun-2026 (CC abre, horario corto) ────────────────────────
const feriado = "2026-06-29";
const feriadoSlots = getSalonTimeSlots(1, feriado);
assert("Feriado: primer slot 10:00", feriadoSlots[0]?.hour === 10);
assert(
  "Feriado: último slot 12:00",
  feriadoSlots[feriadoSlots.length - 1]?.hour === 12 &&
    feriadoSlots[feriadoSlots.length - 1]?.minute === 0,
);
assert(
  "Feriado: sin 12:30",
  !feriadoSlots.some((s) => s.hour === 12 && s.minute === 30),
);
assert("Feriado: sin 13:00", !feriadoSlots.some((s) => s.hour === 13));
assert("Feriado: 5 slots (10–12 cada 30 min)", feriadoSlots.length === 5);

// ── Batalla de Junín 6-ago-2026 (hasta 2 PM) ────────────────────────────────
const junin = "2026-08-06";
const juninSlots = getSalonTimeSlots(4, junin);
assert("Junín: es feriado", isPeruHoliday(junin));
assert(
  "Junín: último slot 14:00",
  juninSlots[juninSlots.length - 1]?.hour === 14 &&
    juninSlots[juninSlots.length - 1]?.minute === 0,
);
assert(
  "Junín: incluye 13:00",
  juninSlots.some((s) => s.hour === 13 && s.minute === 0),
);
assert("Junín: sin 14:30", !juninSlots.some((s) => s.hour === 14 && s.minute === 30));
assert("Junín: 9 slots (10–14)", juninSlots.length === 9);

// ── Domingo ─────────────────────────────────────────────────────────────────
const domingo = "2026-06-28";
const domSlots = getSalonTimeSlots(0, domingo);
assert(
  "Domingo: sin 10:00",
  !domSlots.some((s) => s.hour === 10 && s.minute === 0),
);
assert(
  "Domingo: incluye 10:30",
  domSlots.some((s) => s.hour === 10 && s.minute === 30),
);
assert(
  "Domingo: incluye 13:00",
  domSlots.some((s) => s.hour === 13 && s.minute === 0),
);
assert("Domingo: requiere adelanto 20%", requiresAdvancePayment(domingo));
assert("Domingo: tasa 20%", getAdvancePaymentRate(domingo) === 0.2);
assert(
  "Lunes feriado: NO requiere adelanto por día",
  !requiresAdvancePayment(feriado),
);

// ── Jul 2026: CC cerrado 23 / 28 / 29 ───────────────────────────────────────
for (const closed of ["2026-07-23", "2026-07-28", "2026-07-29"]) {
  const dow = dayOfWeekFromDateKey(closed);
  assert(
    `${closed}: cerrado (0 slots)`,
    isSalonClosed(closed) && getSalonTimeSlots(dow, closed).length === 0,
  );
  assert(
    `${closed}: sin adelanto (no se agenda)`,
    !requiresAdvancePayment(closed),
  );
}

// ── L–S normal ──────────────────────────────────────────────────────────────
const lun = "2026-06-30";
const lunSlots = getSalonTimeSlots(2, lun);
assert(
  "Lun normal: slot 17:30",
  lunSlots.some((s) => s.hour === 17 && s.minute === 30),
);
assert("Lun normal: sin 18:00", !lunSlots.some((s) => s.hour === 18));

// ── Grid mobile (unión semana con feriado) ───────────────────────────────────
const weekWithHoliday = getUnionGridHours([
  "2026-06-28",
  "2026-06-29",
  "2026-06-30",
]);
assert(
  "Grid semana: incluye hora 17 (días normales)",
  weekWithHoliday.includes(17),
);
assert(
  "Grid semana: incluye hora 10 (feriado/dom)",
  weekWithHoliday.includes(10),
);

assert(
  "Domingo tiene slots para selector de fecha",
  getSalonTimeSlots(0, domingo).length > 0,
);

const failed = checks.filter((c) => !c.ok);
console.log("");
if (failed.length) {
  console.error(`Fallaron ${failed.length} de ${checks.length} checks`);
  process.exit(1);
}
console.log(`Todos los checks OK (${checks.length}) — WABA + mobile alineados`);
