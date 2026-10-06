#!/usr/bin/env -S deno run --allow-read --config supabase/functions/deno.json
/**
 * Unit test puro (sin webhook) para parseDatetimeES / parseDateOnlyKey.
 *
 * A) Fallback "número suelto = hora" (Lili 04-ago-2026): número suelto sin
 *    am/pm/":" solo si el mensaje tiene ≤4 palabras.
 * B) Nombre de día suelto ("Sábado"/"Domingo") — Quick Win análisis 01/03-sep
 *    (PE.…8419, Smil …9843): mismo cálculo que "el próximo <día>".
 * C) "la 3D"/"la 4D" no es hora (Sayuri 09-sep-2026 — SLOT_TAKEN fantasma).
 * D) FIX 10-sep: "hoy" / mes→día / disyunción "N o N" + controles de regresión.
 */
import {
  parseDateOnlyKey,
  parseDatetimeES,
} from "../supabase/functions/whatsapp-webhook/parse-datetime-es.ts";

type HourCase = {
  name: string;
  text: string;
  expectNull: boolean;
  expectHour?: number;
};

const hourCases: HourCase[] = [
  {
    name: "'3' (1 palabra) → 3pm",
    text: "3",
    expectNull: false,
    expectHour: 15,
  },
  {
    name: "'a las 3' (prefijo explícito, 3 palabras) → 3pm",
    text: "a las 3",
    expectNull: false,
    expectHour: 15,
  },
  {
    name: "'3 pm' (am/pm explícito) → 3pm",
    text: "3 pm",
    expectNull: false,
    expectHour: 15,
  },
  {
    name: "Reclamo Lili (14 palabras, número suelto embebido) → null",
    text: "Tendrán que volverlo a hacer xq no se puede bajar solo en 3 o 4 días",
    expectNull: true,
  },
  {
    name: "Mensaje largo (8 palabras) con número suelto sin marcador → null",
    text: "no sé todavía si puedo ir el 3 tal vez",
    expectNull: true,
  },
  {
    name: "Sayuri 'Esto es la 3D?' → null (no 'las 3')",
    text: "Esto es la 3D?",
    expectNull: true,
  },
  {
    name: "'la 4D' efecto → null",
    text: "la 4D",
    expectNull: true,
  },
  {
    name: "'volumen 3D' sin la → null",
    text: "volumen 3D",
    expectNull: true,
  },
  {
    name: "'a las 3pm' compacto sigue OK → 3pm",
    text: "a las 3pm",
    expectNull: false,
    expectHour: 15,
  },
];

/** Viernes 4-sep-2026 — próximo sábado = 5, domingo = 6. */
const REF_FRI = new Date(2026, 8, 4, 12, 0, 0);

type DayCase = {
  name: string;
  text: string;
  expectKey: string | null;
};

const dayCases: DayCase[] = [
  {
    name: "'Sábado' suelto → próximo sábado",
    text: "Sábado",
    expectKey: "2026-09-05",
  },
  {
    name: "'sabado' minúsculas sin tilde → mismo",
    text: "sabado",
    expectKey: "2026-09-05",
  },
  {
    name: "'Domingo!' con puntuación → próximo domingo",
    text: "Domingo!",
    expectKey: "2026-09-06",
  },
  {
    name: "'el sábado' (prefijo existente) → mismo cálculo",
    text: "el sábado",
    expectKey: "2026-09-05",
  },
  {
    name: "'no domingo' (negación) → null (no adivinar)",
    text: "no domingo",
    expectKey: null,
  },
  {
    name: "frase larga con día embebido sin prefijo → null (solo mensaje = nombre)",
    text: "quiero sábado por la tarde",
    expectKey: null,
  },
  // ── FIX 10-sep: hoy / mes→día / disyunción + controles de regresión ──
  {
    name: "'hoy' → hoy (ref viernes 4-sep)",
    text: "hoy",
    expectKey: "2026-09-04",
  },
  {
    name: "'Hoy dia' (sin tilde) → hoy",
    text: "Hoy dia",
    expectKey: "2026-09-04",
  },
  {
    name: "'hoy día' → hoy",
    text: "hoy día",
    expectKey: "2026-09-04",
  },
  {
    name: "'para hoy' → hoy",
    text: "para hoy",
    expectKey: "2026-09-04",
  },
  {
    name: "'Hoy dia jueves!' → hoy (sticky, no adivinar weekday)",
    text: "Hoy dia jueves!",
    expectKey: "2026-09-04",
  },
  {
    name: "'en octubre el 4' → 2026-10-04",
    text: "en octubre el 4",
    expectKey: "2026-10-04",
  },
  {
    name: "'octubre 4' → 2026-10-04",
    text: "octubre 4",
    expectKey: "2026-10-04",
  },
  {
    name: "'En Octubre el 4 o 5' → sticky primer día 4",
    text: "En Octubre el 4 o 5",
    expectKey: "2026-10-04",
  },
  {
    name: "'4 o 5 de octubre' → sticky 4",
    text: "4 o 5 de octubre",
    expectKey: "2026-10-04",
  },
  {
    name: "'el 4 o 5' → sticky 4 del mes ref (sep)",
    text: "el 4 o 5",
    expectKey: "2026-09-04",
  },
  // Controles de regresión (no romper)
  {
    name: "CONTROL 'este jueves' → próximo jueves",
    text: "este jueves",
    expectKey: "2026-09-10",
  },
  {
    name: "CONTROL 'el viernes' → próximo viernes",
    text: "el viernes",
    expectKey: "2026-09-11",
  },
  {
    name: "CONTROL 'mañana' → sábado 5",
    text: "mañana",
    expectKey: "2026-09-05",
  },
  {
    name: "CONTROL '4 de octubre' → 2026-10-04",
    text: "4 de octubre",
    expectKey: "2026-10-04",
  },
];

let fails = 0;
for (const c of hourCases) {
  const result = parseDatetimeES(c.text);
  if (c.expectNull) {
    const ok = result === null;
    console.log(
      `${ok ? "✅" : "❌"} ${c.name} → ${ok ? "null" : JSON.stringify(result)}`,
    );
    if (!ok) fails++;
    continue;
  }
  const hour = result
    ? parseInt(
        result.date.toLocaleString("en-US", {
          timeZone: "America/Lima",
          hour: "numeric",
          hour12: false,
        }),
        10,
      )
    : null;
  const ok = result !== null && hour === c.expectHour;
  console.log(
    `${ok ? "✅" : "❌"} ${c.name} → hora Lima ${hour} (esperado ${c.expectHour})`,
  );
  if (!ok) fails++;
}

console.log("\n── Día suelto (parseDateOnlyKey) ──");
for (const c of dayCases) {
  const key = parseDateOnlyKey(c.text, REF_FRI);
  const ok = key === c.expectKey;
  console.log(
    `${ok ? "✅" : "❌"} ${c.name} → ${key ?? "null"} (esperado ${c.expectKey ?? "null"})`,
  );
  if (!ok) fails++;
}

/** Miércoles 16-sep-2026 — mañana = jueves 17; sábado = 19 (Yelitza). */
const REF_WED = new Date(2026, 8, 16, 12, 0, 0);
const yelitzaDayCases: DayCase[] = [
  {
    name: "Yelitza 'el sábado en la mañana' → sábado 19, no jueves 17",
    text: "el sábado en la mañana",
    expectKey: "2026-09-19",
  },
  {
    name: "Yelitza pregunta larga con 'en la mañana' → sábado 19",
    text: "si el sábado tiene disponibilidad en la mañana",
    expectKey: "2026-09-19",
  },
  {
    name: "'mañana' sola sigue siendo día siguiente (jueves 17)",
    text: "mañana",
    expectKey: "2026-09-17",
  },
];

console.log("\n── Yelitza sábado ≠ mañana (parseDateOnlyKey, mié 16-sep) ──");
for (const c of yelitzaDayCases) {
  const key = parseDateOnlyKey(c.text, REF_WED);
  const ok = key === c.expectKey;
  console.log(
    `${ok ? "✅" : "❌"} ${c.name} → ${key ?? "null"} (esperado ${c.expectKey ?? "null"})`,
  );
  if (!ok) fails++;
}

const total = hourCases.length + dayCases.length + yelitzaDayCases.length;
console.log(`\n${total - fails}/${total} casos OK`);
if (fails > 0) Deno.exit(1);
