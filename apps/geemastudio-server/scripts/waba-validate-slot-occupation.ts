#!/usr/bin/env -S deno run --allow-read --config supabase/functions/deno.json
/**
 * Unit test — ocupación de slots (turnover + almuerzo Stephani, sep 2026).
 * Sin webhook ni Supabase: valida lib/slot-occupation.ts y escenarios Yelitza.
 */
import {
  occupiedMinutesForServices,
  intervalsOverlap,
  hasFlexibleMealBreak,
  OTHER_TURNOVER_MINUTES,
  NAIL_TURNOVER_MINUTES,
  NAIL_CATEGORY_ID,
  SALON_CLOSE_MINUTES,
  SALON_BEDS,
  bedsForServices,
  bedsAvailable,
  occupiedMinutesForComposition,
} from "../supabase/functions/whatsapp-webhook/lib/slot-occupation.ts";

type Case = { name: string; pass: boolean };
const cases: Case[] = [];

function check(name: string, pass: boolean) {
  cases.push({ name, pass });
}

// ── 1–3: occupiedMinutesForServices ─────────────────────────────────────────
check(
  "uñas 120 min → 150 ocupados (+30 turnover)",
  occupiedMinutesForServices([
    { duration: 120, category_id: NAIL_CATEGORY_ID },
  ]) === 150,
);

check(
  "pestañas 90 min → 105 ocupados (+15 turnover)",
  occupiedMinutesForServices([
    { duration: 90, category_id: "cat-extensiones" },
  ]) ===
    90 + OTHER_TURNOVER_MINUTES,
);

check(
  "combo Clásicas+Poly 90+120 → 240 (un solo turnover, el de uñas)",
  occupiedMinutesForServices([
    { duration: 90, category_id: "cat-extensiones" },
    { duration: 120, category_id: NAIL_CATEGORY_ID },
  ]) === 90 + 120 + NAIL_TURNOVER_MINUTES,
);

// ── Helpers de escenario (misma matemática que agenda.ts) ───────────────────
type Interval = { start: number; end: number };

function slotBlocked(
  existing: Interval[],
  candidateStart: number,
  candidateOccupied: number,
  opts?: {
    incomingNeedsMeal?: boolean;
    existingNeedsMeal?: boolean[];
    salonClose?: number;
  },
): boolean {
  const candidate: Interval = {
    start: candidateStart,
    end: candidateStart + candidateOccupied,
  };
  const overlap = existing.some((e) => intervalsOverlap(e, candidate));
  if (overlap) return true;
  if (opts?.incomingNeedsMeal === false) return false;
  const mealAppts = existing.filter(
    (_, i) => opts?.existingNeedsMeal?.[i] !== false,
  );
  return !hasFlexibleMealBreak(
    mealAppts,
    candidate,
    opts?.salonClose ?? SALON_CLOSE_MINUTES,
  );
}

// Builder Gel 120 + turnover uñas = 150 min → 11:00–13:30
const builderOccupied = occupiedMinutesForServices([
  { duration: 120, category_id: NAIL_CATEGORY_ID },
]);
const builderInterval: Interval = {
  start: 11 * 60,
  end: 11 * 60 + builderOccupied,
};

check(
  "Builder 11:00 ocupa hasta 13:30 (sanity)",
  builderInterval.end === 13 * 60 + 30,
);

// ── 4: Yelitza sábado — combo 13:00 choca con Builder ───────────────────────
const combo255 = occupiedMinutesForServices([
  { duration: 90, category_id: "cat-extensiones" },
  { duration: 120, category_id: NAIL_CATEGORY_ID },
]);

check(
  "Yelitza: Builder 11:00 + combo 13:00 (255 min) → bloqueado por solape",
  slotBlocked([builderInterval], 13 * 60, combo255, {
    incomingNeedsMeal: true,
    existingNeedsMeal: [true],
  }),
);

// ── 5: almuerzo — gap 13:30–14:00 insuficiente; 14:30 OK ───────────────────
const lashes105 = occupiedMinutesForServices([
  { duration: 90, category_id: "cat-extensiones" },
]);

check(
  "almuerzo: gap 13:30–14:00 = 30 min < 45 → falla",
  slotBlocked([builderInterval], 14 * 60, lashes105, {
    incomingNeedsMeal: true,
    existingNeedsMeal: [true],
  }),
);

check(
  "almuerzo: candidata 14:30 con hueco 60 min → OK",
  !slotBlocked([builderInterval], 14 * 60 + 30, lashes105, {
    incomingNeedsMeal: true,
    existingNeedsMeal: [true],
  }),
);

// ── 6: día vacío mañana libre — almuerzo desplazable ────────────────────────
check(
  "día vacío 10:00 sin trabajo mañana → almuerzo flexible OK",
  !slotBlocked([], 10 * 60, lashes105, { incomingNeedsMeal: true }),
);

// Alberto VE …0417: pack Manos+Pies (90+120 uñas) + Mojado 120 a las 12:30
const packPlusMojado = occupiedMinutesForServices([
  { duration: 90, category_id: NAIL_CATEGORY_ID },
  { duration: 120, category_id: NAIL_CATEGORY_ID },
  { duration: 120, category_id: "cat-extensiones" },
]);
check(
  "pack uñas + Mojado = 360 min ocupados (un solo turnover)",
  packPlusMojado === 90 + 120 + 120 + NAIL_TURNOVER_MINUTES,
);
check(
  "12:30 pack+Mojado (día vacío) → bloqueado (almuerzo Stephani / cierre)",
  slotBlocked([], 12 * 60 + 30, packPlusMojado, { incomingNeedsMeal: true }),
);
check(
  "10:00 pack+Mojado (día vacío) → almuerzo cabe después",
  !slotBlocked([], 10 * 60, packPlusMojado, { incomingNeedsMeal: true }),
);

// ── Camillas + duración configurada de pack/promo (oct 2026) ────────────────
const lifting = { duration: 45, category_id: "cat-lifting" };
const retiro = { duration: 30, category_id: "cat-extensiones" };
const unas = { duration: 90, category_id: NAIL_CATEGORY_ID };
check("uñas no usan camilla", bedsForServices([unas]) === 0);
check("retiro de pestañas usa 1 camilla", bedsForServices([retiro]) === 1);
check("uñas + lifting usa 1 camilla", bedsForServices([unas, lifting]) === 1);
check("2 camillas en total", SALON_BEDS === 2);
check("retiro (1) + duo lifting (2) → no cabe", !bedsAvailable(1, 2));
check("retiro (1) + 1 lifting → cabe", bedsAvailable(1, 1));
check("duo lifting (2) en salón vacío → cabe", bedsAvailable(0, 2));
check("uñas (0) con 2 camillas ocupadas → cabe", bedsAvailable(2, 0));
const packMins = new Map([["lift|lift", 75]]);
check(
  "override de pack (75) pisa la suma (2×45+turnover)",
  occupiedMinutesForComposition(["lift", "lift"], [lifting, lifting], packMins) === 75,
);
check(
  "sin override → suma normal",
  occupiedMinutesForComposition(["lift"], [lifting], packMins) ===
    occupiedMinutesForServices([lifting]),
);

// ── Resumen ─────────────────────────────────────────────────────────────────
const failed = cases.filter((c) => !c.pass);
console.log(
  `\n=== waba-validate-slot-occupation (${cases.length} checks) ===\n`,
);
for (const c of cases) {
  console.log(c.pass ? "✅" : "❌", c.name);
}
if (failed.length > 0) {
  console.error(`\n${failed.length} fallo(s).`);
  Deno.exit(1);
}
console.log(`\n${cases.length}/${cases.length} OK`);
