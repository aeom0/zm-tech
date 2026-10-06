#!/usr/bin/env node
/**
 * QA unitario: isDeclineIntent no debe despedir preguntas de precio que
 * contienen "no quiero X" (Stefy …1425, análisis 03-ago).
 *
 * Fuente: menu-remap.ts (guards precio + booking + service-change).
 * Sin webhook — no requiere cleanup.
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const PRICE_RE = /(?:cu[aá]nto|precio|costo|cuesta|vale|\?)/i;
const SERVICE_CHANGE_MATERIAL_RE =
  /\bno\s+quiero\s+(el|la|ese|esa|mas|más|builder|soft|poly|lifting|esmalte|gel|acrilico|rubber|polygel)\b/;
const BOOKING_WORD_RE = /\b(agend|reserv|cita)\w*\b/i;
const EXPLICIT_TIME_RE =
  /(?:a\s+las?|las?)\s+\d{1,2}|\d{1,2}:\d{2}|\d{1,2}\s*(?:am|pm|a\.m\.|p\.m\.)\b/i;
const CALENDAR_DATE_RE =
  /(\d{1,2})\s+(?:de\s+)?(ene|enero|feb|febrero|mar|marzo|abr|abril|may|mayo|jun|junio|jul|julio|ago|agosto|sep|sept|septiembre|oct|octubre|nov|noviembre|dic|diciembre)\b|(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})\b|\b(mañana|manana|pasado\s+mañana|pasado\s+manana)\b/i;

const NEG = [
  "no quiero",
  "no deseo",
  "no gracias",
  "no, gracias",
  "ya no",
  "ya no quiero",
  "no por ahora",
  "no agendar",
  "no me interesa",
  "no necesito",
  "disculpa y gracias",
  "gracias pero no",
  "tal vez después",
  "quizás después",
  "después lo veo",
  "luego lo veo",
  "lo pienso",
  "lo pensaré",
  "voy a pensar",
  "lo voy a pensar",
  "voy a pensarlo",
  "gracias por la información",
  "gracias por la info",
];

const NEG_SENSITIVE = ["más adelante", "por ahora no", "todavía no"];

function hasBookingSignal(lower) {
  return (
    BOOKING_WORD_RE.test(lower) ||
    CALENDAR_DATE_RE.test(lower) ||
    EXPLICIT_TIME_RE.test(lower)
  );
}

/** Réplica de isDeclineIntent (guards precio + booking + service-change + agregar). */
function wouldDecline(raw) {
  const lower = String(raw).toLowerCase();
  const t = lower.normalize("NFD").replace(/\p{M}/gu, "");
  if (/\bya\s+no\s+quiero\b/.test(t)) return false;
  if (SERVICE_CHANGE_MATERIAL_RE.test(t)) return false;
  if (PRICE_RE.test(lower)) return false;
  if (/\bno\s+quiero\s+cambiar\b/.test(lower)) return false;
  if (/\b(agregar|a[ñn]adir|sumar|tambi[eé]n\s+quiero)\b/.test(lower)) {
    return false;
  }
  const WEAK_NEG = ["no quiero", "no deseo", "no necesito"];
  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  if (
    NEG.some(
      (k) => lower.includes(k) && (!WEAK_NEG.includes(k) || wordCount <= 6),
    )
  ) {
    return true;
  }
  if (hasBookingSignal(lower)) return false;
  return NEG_SENSITIVE.some((k) => lower.includes(k));
}

const cases = [
  // [mensaje, debeDeclinar, nota]
  [
    "Mi ojo es grande pero no quiero una mirada q se vea triste",
    false,
    "Romy 26-sep: preferencia larga pide recomendación, no despedida",
  ],
  ["No quiero", true, "negación corta sigue declinando"],
  ["No quiero agendar", true, "negación corta con agendar"],
  [
    "Cuanto ests manos y pies clásicas no quiero gel",
    false,
    "Stefy …1425 — pregunta + no quiero gel",
  ],
  [
    "cuánto sale el rubber, no quiero acrilico",
    false,
    "precio + material rechazado",
  ],
  ["no quiero gel", false, "especificación de material → service change"],
  ["no gracias", true, "despedida clara"],
  ["no me interesa", true, "despedida clara"],
  ["no por ahora", true, "despedida clara"],
  ["tal vez después", true, "aplaza"],
  ["lo pensaré", true, "aplaza"],
  [
    "voy a pensarlo todavía, gracias por la información",
    true,
    "MORELIAMM — duda post-CTWA",
  ],
  [
    "quiero agendar para más adelante, el jueves a las 3pm",
    false,
    "booking real — no vaciar carrito",
  ],
  [
    "todavía no sé, pero anótame para el sábado 4pm",
    false,
    "booking real con todavía no",
  ],
  ["por ahora no, gracias", true, "sensitive sin booking"],
  ["todavía no, tal vez otro día", true, "sensitive sin booking"],
  [
    "No quiero cambiar, quiero agregar",
    false,
    "Alberto VE …0417 — niega copy del bot, pide agregar",
  ],
  ["quiero agregar manicure", false, "agregar mid-agenda no es despedida"],
];

function assertSourceHasGuard() {
  const menuRemap = readFileSync(
    resolve(
      ROOT,
      "supabase/functions/whatsapp-webhook/handlers/menu-remap.ts",
    ),
    "utf8",
  );
  const booking = readFileSync(
    resolve(
      ROOT,
      "supabase/functions/whatsapp-webhook/handlers/booking-flow.ts",
    ),
    "utf8",
  );
  const checks = [
    [
      menuRemap.includes("cu[aá]nto|precio|costo|cuesta|vale"),
      "menu-remap tiene guard de pregunta de precio",
    ],
    [
      menuRemap.includes("messageMentionsCalendarDate"),
      "menu-remap tiene guard de booking (calendar date)",
    ],
    [
      menuRemap.includes("hasExplicitTime"),
      "menu-remap tiene guard de booking (hora explícita)",
    ],
    [
      menuRemap.includes("NEG_SENSITIVE"),
      "menu-remap separa frases sensibles PR #81",
    ],
    [
      menuRemap.includes("no\\s+quiero\\s+cambiar") ||
        menuRemap.includes("no quiero cambiar"),
      "menu-remap tiene guard 'no quiero cambiar' (Alberto VE)",
    ],
    [
      menuRemap.includes("WEAK_NEG"),
      "menu-remap limita negaciones genéricas a mensajes cortos (Romy)",
    ],
    [
      menuRemap.includes("agregar|a[ñn]adir|sumar") ||
        /agregar\|a\[ñn\]adir\|sumar/.test(menuRemap),
      "menu-remap tiene guard agregar mid-decline",
    ],
  ];
  return checks;
}

function main() {
  console.log("QA isDeclineIntent — preguntas de precio vs despedida\n");
  let ok = true;

  for (const [msg, expectDecline, note] of cases) {
    const got = wouldDecline(msg);
    const pass = got === expectDecline;
    if (!pass) ok = false;
    console.log(
      `  ${pass ? "✅" : "❌"} "${msg.slice(0, 50)}${msg.length > 50 ? "…" : ""}" → decline=${got} (esperado ${expectDecline}) — ${note}`,
    );
  }

  console.log("\n── Fuente en repo ──");
  for (const [pass, note] of assertSourceHasGuard()) {
    if (!pass) ok = false;
    console.log(`  ${pass ? "✅" : "❌"} ${note}`);
  }

  console.log(`\n${ok ? "✅ Todos los casos pasaron" : "❌ Hay casos fallando"}`);
  process.exit(ok ? 0 : 1);
}

main();
