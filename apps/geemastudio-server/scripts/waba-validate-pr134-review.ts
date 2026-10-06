#!/usr/bin/env -S deno run --allow-read --config supabase/functions/deno.json
/**
 * Unit QA — review PR #134 (sin webhook).
 *
 * A) matchesMiCitaIntent + remap "Reserve mi cita" → agendar (Milagros)
 * B) fabricated-booking-guard: afirmaciones vs negaciones
 * C) computeEvaluationGaps: huecos libres, no encima de otra clienta
 * D) nextHaikuFallbackState: umbral 3 → pausa
 */
import { remapMenuTextUserInput } from "../supabase/functions/whatsapp-webhook/handlers/menu-remap.ts";
import { matchesMiCitaIntent } from "../supabase/functions/whatsapp-webhook/handlers/pending-appointment.ts";
import {
  hasFabricatedBookingClaim,
  containsFabricatedBookingClaim,
} from "../supabase/functions/whatsapp-webhook/lib/fabricated-booking-guard.ts";
import { computeEvaluationGaps } from "../supabase/functions/whatsapp-webhook/handlers/agenda.ts";
import {
  HAIKU_FALLBACK_PAUSE_THRESHOLD,
  nextHaikuFallbackState,
} from "../supabase/functions/whatsapp-webhook/lib/haiku-fallback.ts";
import { SALON_OPEN_MINUTES } from "../supabase/functions/whatsapp-webhook/lib/slot-occupation.ts";

type Case = { name: string; pass: boolean };
const cases: Case[] = [];

function check(name: string, pass: boolean) {
  cases.push({ name, pass });
}

function remap(messageText: string) {
  return remapMenuTextUserInput({
    messageText,
    lower: messageText.toLowerCase(),
    session: null,
  });
}

// ── A) Mi Cita vs imperativo de nueva reserva ───────────────────────────────
check(
  "A1 matchesMiCitaIntent('mi cita') = true",
  matchesMiCitaIntent("mi cita") === true,
);
check(
  "A2 matchesMiCitaIntent('reserve mi cita') = false",
  matchesMiCitaIntent("reserve mi cita por la mañana") === false,
);
check(
  "A3 matchesMiCitaIntent('resérvame mi cita') = false",
  matchesMiCitaIntent("resérvame mi cita") === false,
);
check(
  "A4 matchesMiCitaIntent('reserveme mi cita') = false",
  matchesMiCitaIntent("reserveme mi cita para mañana") === false,
);
{
  const r = remap("Reserve mi cita por la mañana");
  check(
    "A5 remap Reserve mi cita → agendar_cita",
    r.kind === "remapped" &&
      (r as { userInput?: string }).userInput === "agendar_cita",
  );
}
{
  const r = remap("mi cita");
  check(
    "A6 remap mi cita → mi_cita",
    r.kind === "remapped" &&
      (r as { userInput?: string }).userInput === "mi_cita",
  );
}

// ── B) Cita fabricada / reservad* ───────────────────────────────────────────
check(
  "B1 '¡Listo! Tu cita quedó confirmada' → fabricada",
  hasFabricatedBookingClaim("¡Listo! Tu cita quedó confirmada 💜") === true,
);
check(
  "B2 'quedó reservada' → fabricada",
  hasFabricatedBookingClaim("Tu cita quedó reservada para mañana") === true,
);
check(
  "B3 'cita reservada' → fabricada",
  hasFabricatedBookingClaim("Tu cita reservada es a las 10") === true,
);
check(
  "B4 'aún no está reservado' → NO fabricada",
  hasFabricatedBookingClaim("aún no está reservado, falta el abono") === false,
);
check(
  "B5 'para que quede reservada falta el abono' → NO fabricada",
  hasFabricatedBookingClaim(
    "Para que quede reservada falta el abono de S/25",
  ) === false,
);
check(
  "B6 'no está reservada' → NO fabricada",
  hasFabricatedBookingClaim("Todavía no está reservada tu hora") === false,
);
check(
  "B7 'reservado' suelto sin verbo de cierre → NO",
  containsFabricatedBookingClaim("reservado") === false,
);
check(
  "B7b 'queda reservado' (queda ≠ quedó) → NO",
  containsFabricatedBookingClaim("solo con abono queda reservado") === false,
);
check(
  "B8 'nos vemos el sábado a las' → fabricada",
  hasFabricatedBookingClaim("Nos vemos el sábado a las 10 💜") === true,
);
check(
  "B9 texto informativo sin cierre → OK",
  hasFabricatedBookingClaim(
    "Dame un momento, te confirmo el horario con el sistema 💜",
  ) === false,
);

// ── C) Huecos de evaluación ─────────────────────────────────────────────────
const open = SALON_OPEN_MINUTES; // 10:00 = 600
const close = 18 * 60; // 18:00

check(
  "C1 sin citas → []",
  computeEvaluationGaps([], {
    nowMinutes: 10 * 60,
    openMinutes: open,
    closeMinutes: close,
  }).length === 0,
);

check(
  "C2 una sola cita → [] (no encima de esa clienta)",
  computeEvaluationGaps([{ startMinutes: 10 * 60, endMinutes: 12 * 60 }], {
    nowMinutes: 9 * 60,
    openMinutes: open,
    closeMinutes: close,
  }).length === 0,
);

{
  const gaps = computeEvaluationGaps(
    [
      { startMinutes: 10 * 60, endMinutes: 11 * 60 },
      { startMinutes: 14 * 60, endMinutes: 15 * 60 },
    ],
    {
      nowMinutes: 9 * 60,
      openMinutes: open,
      closeMinutes: close,
    },
  );
  check(
    "C3 dos citas con hueco 11–14 → un gap 11:00–14:00",
    gaps.length === 1 && gaps[0]!.start === 11 * 60 && gaps[0]!.end === 14 * 60,
  );
}

{
  const gaps = computeEvaluationGaps(
    [
      { startMinutes: 10 * 60, endMinutes: 11 * 60 },
      { startMinutes: 14 * 60, endMinutes: 15 * 60 },
    ],
    {
      nowMinutes: 12 * 60, // ya son las 12 → hueco empieza a las 12
      openMinutes: open,
      closeMinutes: close,
    },
  );
  check(
    "C4 now=12 clippea el hueco a 12–14",
    gaps.length === 1 && gaps[0]!.start === 12 * 60 && gaps[0]!.end === 14 * 60,
  );
}

{
  const gaps = computeEvaluationGaps(
    [
      { startMinutes: 10 * 60, endMinutes: 11 * 60 },
      { startMinutes: 11 * 60 + 10, endMinutes: 12 * 60 }, // gap 10 min < 15
    ],
    {
      nowMinutes: 9 * 60,
      openMinutes: open,
      closeMinutes: close,
    },
  );
  check("C5 hueco <15 min → []", gaps.length === 0);
}

{
  const gaps = computeEvaluationGaps(
    [
      { startMinutes: 10 * 60, endMinutes: 11 * 60 },
      { startMinutes: 13 * 60, endMinutes: 14 * 60 },
      { startMinutes: 16 * 60, endMinutes: 17 * 60 },
    ],
    {
      nowMinutes: 9 * 60,
      openMinutes: open,
      closeMinutes: close,
    },
  );
  check(
    "C6 tres citas → dos huecos (11–13 y 14–16)",
    gaps.length === 2 &&
      gaps[0]!.start === 11 * 60 &&
      gaps[0]!.end === 13 * 60 &&
      gaps[1]!.start === 14 * 60 &&
      gaps[1]!.end === 16 * 60,
  );
}

// ── D) Auto-pausa Haiku ─────────────────────────────────────────────────────
check(
  "D1 umbral = 3",
  HAIKU_FALLBACK_PAUSE_THRESHOLD === 3,
);
check(
  "D2 count 0 → next 1, no pause",
  (() => {
    const s = nextHaikuFallbackState(0);
    return s.nextCount === 1 && s.shouldPause === false;
  })(),
);
check(
  "D3 count 1 → next 2, no pause",
  (() => {
    const s = nextHaikuFallbackState(1);
    return s.nextCount === 2 && s.shouldPause === false;
  })(),
);
check(
  "D4 count 2 → next 0 + pause",
  (() => {
    const s = nextHaikuFallbackState(2);
    return s.nextCount === 0 && s.shouldPause === true;
  })(),
);
check(
  "D5 null/undefined → trata como 0",
  nextHaikuFallbackState(null).nextCount === 1 &&
    nextHaikuFallbackState(undefined).shouldPause === false,
);

// ── Resumen ─────────────────────────────────────────────────────────────────
let fails = 0;
console.log("QA PR #134 review — unit\n");
for (const c of cases) {
  console.log(`${c.pass ? "✅" : "❌"} ${c.name}`);
  if (!c.pass) fails++;
}
console.log(
  fails === 0
    ? `\n✅ ${cases.length}/${cases.length} OK`
    : `\n❌ ${fails}/${cases.length} fallaron`,
);
Deno.exit(fails === 0 ? 0 : 1);
