#!/usr/bin/env -S deno run --allow-read --allow-env --config supabase/functions/deno.json
/**
 * Unit test — restricción de promos por día de la semana (sep 2026).
 * Sin webhook ni Supabase: valida que `promoAppliesOnWeekday`/`formatValidDaysEs`
 * lean `valid_days` real de la promo en vez de un día hardcodeado (caso
 * "Packs Especiales" — antes `isPacksEspecialesAllowed()` chequeaba
 * lunes-miércoles a ciegas, ignorando `is_active`/`valid_days` de la BD).
 */
import {
  promoAppliesOnWeekday,
  formatValidDaysEs,
} from "../supabase/functions/whatsapp-webhook/lib/services-catalog.ts";

type Case = { name: string; pass: boolean };
const cases: Case[] = [];

function check(name: string, pass: boolean) {
  cases.push({ name, pass });
}

// ── promoAppliesOnWeekday ────────────────────────────────────────────────────
check(
  "valid_days null → aplica cualquier día (compat promos sin restricción)",
  promoAppliesOnWeekday({ valid_days: null }, 5 /* viernes */) === true,
);

check(
  "valid_days '1,2,3' (lun-mié) → aplica lunes",
  promoAppliesOnWeekday({ valid_days: "1,2,3" }, 1) === true,
);

check(
  "valid_days '1,2,3' (lun-mié) → NO aplica viernes",
  promoAppliesOnWeekday({ valid_days: "1,2,3" }, 5) === false,
);

check(
  "valid_days '1,2,3' → NO aplica domingo (7)",
  promoAppliesOnWeekday({ valid_days: "1,2,3" }, 7) === false,
);

check(
  "valid_days con espacios ' 1, 2, 3 ' → mismo resultado que sin espacios",
  promoAppliesOnWeekday({ valid_days: " 1, 2, 3 " }, 2) === true,
);

check(
  "valid_days vacío '' → aplica cualquier día (mismo trato que null)",
  promoAppliesOnWeekday({ valid_days: "" }, 4) === true,
);

// ── formatValidDaysEs ────────────────────────────────────────────────────────
check(
  "formatValidDaysEs('1,2,3') → 'lunes, martes y miércoles'",
  formatValidDaysEs("1,2,3") === "lunes, martes y miércoles",
);

check(
  "formatValidDaysEs('1') → 'lunes' (un solo día, sin 'y')",
  formatValidDaysEs("1") === "lunes",
);

check(
  "formatValidDaysEs('6,7') → 'sábado y domingo'",
  formatValidDaysEs("6,7") === "sábado y domingo",
);

// ── Resumen ─────────────────────────────────────────────────────────────────
const failed = cases.filter((c) => !c.pass);
console.log(
  `\n=== waba-validate-promo-weekday-gate (${cases.length} checks) ===\n`,
);
for (const c of cases) {
  console.log(c.pass ? "✅" : "❌", c.name);
}
if (failed.length > 0) {
  console.error(`\n${failed.length} fallo(s).`);
  Deno.exit(1);
}
console.log(`\n${cases.length}/${cases.length} OK`);
