#!/usr/bin/env node
/**
 * QA unitario — casos reales que caían a:
 * "No estoy segura… 932 535 512" (Gabriela …4563, Luz …02357, Rubber costó, Cris clases).
 *
 * Mirror de matchers en booking-flow.ts / dispatcher.ts / pending-appointment.ts.
 * Sin webhook — no requiere cleanup.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function matchesFirstMessageBookingIntent(lower) {
  if (
    lower.includes("reagendar") ||
    lower.includes("reprogramar") ||
    lower.includes("re programar")
  ) {
    return false;
  }
  const phrases = [
    "agendar",
    "reservar",
    "disponibilidad",
    "cita para",
    "quiero una cita",
    "me gustaría agendar",
    "me gustaria agendar",
    "quisiera agendar",
    "necesito agendar",
    "hacerme una cita",
  ];
  return phrases.some((p) => {
    if (p === "agendar") return /\bagendar\b/.test(lower);
    return lower.includes(p);
  });
}

function matchesLocationQuestion(lower) {
  return (
    /\bd[oó]nde\s+queda/.test(lower) ||
    /\bd[oó]nde\s+est[aá]n/.test(lower) ||
    /\bd[oó]nde\s+queda[ns]?/.test(lower) ||
    /\bd[oó]nde\s+se\s+ubica/.test(lower) ||
    /\bse\s+ubica(?:n)?\b/.test(lower) ||
    /\bd[oó]nde\s+est[aá](?:n)?\s+ubicad/.test(lower) ||
    /\bd[oó]nde\s+est[aá]\s+(el\s+|la\s+)?(local|sal[oó]n)\b/.test(lower) ||
    (/\bd[oó]nde\b/.test(lower) && /\b(el\s+)?local\b/.test(lower)) ||
    /\bubicaci[oó]n\b/.test(lower) ||
    /\bdirecci[oó]n\b/.test(lower) ||
    /\bc[oó]mo\s+lleg/.test(lower) ||
    /\bpara\s+lleg/.test(lower) ||
    (/\breferencias?\b/.test(lower) &&
      (/\blleg/.test(lower) ||
        /\bsal[oó]n/.test(lower) ||
        /\blocal\b/.test(lower) ||
        lower.length <= 40)) ||
    lower.includes("google maps") ||
    lower.includes("mapa") ||
    /\b([uú]nica|unica)\s+sede\b/.test(lower) ||
    /\b(tienen|hay)\s+(otra|m[aá]s)\s+sede\b/.test(lower) ||
    /\bsolo\s+(hay\s+)?(una|1)\s+sede\b/.test(lower) ||
    /\bsede\s*\??\s*$/.test(lower) ||
    /\b(ustedes|el\s+sal[oó]n)\s+(queda[n]?|est[aá]n?|en|den)\s+surco\b/.test(
      lower,
    ) ||
    (/\bsurco\b/.test(lower) &&
      /\b(barranco|miraflores|san\s+borja|la\s+molina|lejos|cerca)\b/.test(
        lower,
      )) ||
    /\bkennedy\b/.test(lower) ||
    /\bamistad\b/.test(lower) ||
    (/\bcerca\b/.test(lower) &&
      /\b(benavides|wong|plazuelas|kennedy|amistad)\b/.test(lower)) ||
    lower === "ubicacion" ||
    lower === "ubicación"
  );
}

function looksLikeServiceBrowseIntent(text) {
  const lower = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!lower || lower.length > 120) return false;
  if (
    /\b(ruber|rubber|soft\s*gel|poly\s*gel|polygel|builder(\s+gel)?)\b/.test(
      lower,
    )
  ) {
    return true;
  }
  if (
    /\b(manicure|pedicure|manos\s+y\s+pies|pies\s+en\s+gel|unas)\b/.test(lower)
  ) {
    return true;
  }
  if (
    /\b(lifting|pestanas|cejas|extensiones|microblading|depilaci)\b/.test(
      lower,
    )
  ) {
    return true;
  }
  if (/\ben\s+gel\b/.test(lower) || /\bgel\b/.test(lower)) {
    if (lower.length <= 40) return true;
  }
  if (/\beste\s+me\s+interesa\b/.test(lower)) return true;
  return false;
}

const TARDANZA_KEYWORDS = [
  "voy tarde",
  "llego tarde",
  "estoy tarde",
  "me retraso",
  "me retrase",
  "voy a llegar tarde",
  "llegaré tarde",
  "llegare tarde",
  "voy con retraso",
  "llego con retraso",
  "un poco tarde",
  "algo tarde",
  "llegaré un poco",
  "llegare un poco",
  "calculo llegar",
  "calculo que llego",
  "llego tipo",
  "llegar tipo",
  "llegaré tipo",
  "llegare tipo",
  "llego aprox",
  "llegar aprox",
  "normal llego",
  "llego normal",
  "llego a tiempo",
  "voy en camino",
  "estoy en camino",
  "recién voy a salir",
  "recien voy a salir",
  "recién salgo",
  "recien salgo",
  "estoy saliendo",
  "voy para allá",
  "voy para alla",
  "me atraso",
  "me atrasé",
  "me atrase",
];

function matchesTardanzaIntent(text) {
  const msgLower = text.trim().toLowerCase();
  if (!msgLower) return false;
  if (matchesLocationQuestion(msgLower)) return false;
  if (TARDANZA_KEYWORDS.some((k) => msgLower.includes(k))) return true;
  if (
    /\blleg(o|ar|aré|are)\b/.test(msgLower) &&
    /\d{1,2}/.test(msgLower) &&
    !/\bc[oó]mo\s+lleg/.test(msgLower) &&
    !/\bpara\s+lleg/.test(msgLower) &&
    !/\ba\s+qu[eé]\s+hora\b/.test(msgLower) &&
    !/\bqu[eé]\s+hora\s+lleg/.test(msgLower)
  ) {
    return true;
  }
  return false;
}

function matchesNaturalClosingIntent(text) {
  const raw = text.trim().toLowerCase();
  if (!raw || raw.length > 48) return false;
  const cleaned = raw
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/[!?¡¿.]+/g, " ")
    .replace(/[\n\r,]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length > 48) return false;
  if (/^nos vemos\b/.test(cleaned)) return true;
  if (/^(hasta luego|hasta pronto|chao|chau|bye)\b/.test(cleaned)) return true;
  if (/^(okis|oki|ok|oka|okiss|okey)(\s+gracias)?\s*$/.test(cleaned)) {
    return true;
  }
  if (
    /^(ok|oki|okis|oka|okiss|okey|dale|listo|super|perfecto|igualmente)?\s*gracias\s*$/.test(
      cleaned,
    )
  ) {
    return true;
  }
  if (/^(muchas|mil)\s+gracias\s*$/.test(cleaned)) return true;
  if (/^igualmente\s*$/.test(cleaned)) return true;
  return false;
}

function matchesMiCitaIntent(lower) {
  const phrases = [
    "mi cita",
    "ya tengo cita",
    "tengo la cita",
    "mi reserva",
    "reprogramar",
    "reprogramación",
    "reprogramacion",
    "reagendar",
    "re agendar",
    "cambiar hora",
    "cambiar horario",
    "cambiar la hora",
    "cambiar fecha",
  ];
  return phrases.some((p) => lower.includes(p));
}

const FREE_Q = [
  "precio",
  "precios",
  "cuesta",
  "cuestan",
  "costo",
  "costó",
  "costaron",
  "cuánto sale",
  "cuanto sale",
  "vale",
  "clases",
  "dictan",
  "curso",
  "para llegar",
  "referencias",
  "retiro",
];

function matchesClassesQuestion(lower) {
  return (
    /\bdictan?\s+clases?\b/.test(lower) ||
    /\bdan\s+clases?\b/.test(lower) ||
    /\bhay\s+clases?\b/.test(lower) ||
    /\bcurso(s)?\b/.test(lower) ||
    /\bcapacitaci[oó]n\b/.test(lower)
  );
}

function matchesRetiroInfoQuestion(lower) {
  const hasRetiro = /\bretiro\b/.test(lower);
  const hasOtro =
    /\botro\s+(sal[oó]n|local)\b/.test(lower) ||
    /\bde\s+otro\b/.test(lower);
  if (hasRetiro && hasOtro) return true;
  if (
    hasRetiro &&
    (/\binclu(ye|ido|ída|ida)\b/.test(lower) ||
      /\bcobran\b/.test(lower) ||
      /\bpor\s*qu[eé]\b/.test(lower) ||
      /\bcu[aá]nto\b/.test(lower))
  ) {
    return true;
  }
  return false;
}

let passed = 0;
function ok(name, cond) {
  assert.ok(cond, name);
  console.log(`  ✓ ${name}`);
  passed++;
}

console.log("── fallback-932 unit ──");

ok(
  "Gabriela tardanza sin 'tarde'",
  matchesTardanzaIntent(
    "Hola!! Tuve un inconveniente en mi casa, recién voy a salir para allá y calculo llegar 1:20 aprox",
  ),
);
ok("Gabriela Normal llego?", matchesTardanzaIntent("Normal llego?"));
ok(
  "cómo llegar ≠ tardanza",
  !matchesTardanzaIntent("cómo llegar al salón"),
);
ok(
  "a qué hora llego el 15 ≠ tardanza",
  !matchesTardanzaIntent("¿a qué hora llego el 15?"),
);
ok(
  "Yelitza clásico sigue",
  matchesTardanzaIntent("Voy a llegar tarde"),
);
ok(
  "Sofia Ya estoy en camino = intent llegada (gate sin cita en dispatcher)",
  matchesTardanzaIntent("Ya estoy en camino"),
);
ok(
  "calculo llegar 1:20 sigue",
  matchesTardanzaIntent("calculo llegar 1:20 aprox"),
);

ok("Nos vemos!!😊", matchesNaturalClosingIntent("Nos vemos!!😊"));
ok("Gracias!!", matchesNaturalClosingIntent("Gracias!!"));
ok("okis", matchesNaturalClosingIntent("okis"));
ok("okis\\ngracias", matchesNaturalClosingIntent("okis\ngracias"));
ok(
  "precio no es cierre",
  !matchesNaturalClosingIntent("cuánto cuesta el lifting?"),
);
ok(
  "listo mid-booking no es cierre",
  !matchesNaturalClosingIntent("listo te agendo el viernes"),
);

function isOutboundPendingPrompt(row) {
  if ((row.msg_type ?? "").toLowerCase() === "interactive") return true;
  const content = (row.content ?? "").trim();
  return content.includes("?");
}

ok(
  "OUT con ? = prompt pendiente",
  isOutboundPendingPrompt({
    msg_type: "text",
    content: "¿Qué servicio te gustaría agendar?",
  }),
);
ok(
  "OUT lista = prompt pendiente",
  isOutboundPendingPrompt({
    msg_type: "interactive",
    content: "[lista] Cejas y Rostro",
  }),
);
ok(
  "OUT confirmación sin ? ≠ prompt",
  !isOutboundPendingPrompt({
    msg_type: "text",
    content: "Tu cita quedó confirmada para el sábado.",
  }),
);

{
  const dispatcher = readFileSync(
    resolve(
      dirname(fileURLToPath(import.meta.url)),
      "../supabase/functions/whatsapp-webhook/handlers/dispatcher.ts",
    ),
    "utf8",
  );
  ok(
    "dispatcher tiene hasRecentOutboundPendingPrompt",
    dispatcher.includes("hasRecentOutboundPendingPrompt"),
  );
  ok(
    "atajo cierre consulta prompt pendiente",
    /matchesNaturalClosingIntent\(messageText\)\s*&&\s*!\(await hasRecentOutboundPendingPrompt/.test(
      dispatcher,
    ),
  );
}

ok(
  "reagendar → Mi cita",
  matchesMiCitaIntent("o la voy a tener que reagendar?".toLowerCase()),
);
ok(
  "reagendar ≠ booking nuevo",
  !matchesFirstMessageBookingIntent(
    "o la voy a tener que reagendar?".toLowerCase(),
  ),
);
ok(
  "quiero agendar sí es booking",
  matchesFirstMessageBookingIntent("quiero agendar mi cita"),
);

ok(
  "Luz referencias para llegar",
  matchesLocationQuestion("una referencias para llegar"),
);
ok(
  "cómo llegar clásico",
  matchesLocationQuestion("cómo llegar"),
);
ok(
  "Karina Única sede?",
  matchesLocationQuestion("Única sede?".toLowerCase()),
);
ok(
  "Tania Barranco/Surco",
  matchesLocationQuestion(
    "estoy en Barranco y ustedes den Surco".toLowerCase(),
  ),
);
ok(
  "Merillyn cerca del Kennedy",
  matchesLocationQuestion("están cerca del Kennedy?".toLowerCase()),
);
ok(
  "Av. Amistad landmark",
  matchesLocationQuestion("queda por Av. Amistad?".toLowerCase()),
);
ok(
  "TE EXTRAÑO PAPITO …324 Donde se ubica el local",
  matchesLocationQuestion("Donde se ubica el local".toLowerCase()),
);
ok(
  "dónde está el local (está singular)",
  matchesLocationQuestion("dónde está el local".toLowerCase()),
);
ok(
  "dónde se ubican",
  matchesLocationQuestion("dónde se ubican?".toLowerCase()),
);

const SALON_NOT_AT_KENNEDY =
  "No estamos en Parque Kennedy (Miraflores). Estamos en Santiago de Surco — CC. Las Plazuelas, cerca de Av. Benavides / Av. Amistad.";
function resolveUbicacionReply(lower, ubicacionText) {
  const base = (ubicacionText || "").trim() || "📍 base";
  if (!/\bkennedy\b/.test(lower) && !/\bamistad\b/.test(lower)) return base;
  if (/kennedy/i.test(base)) return base;
  return `${SALON_NOT_AT_KENNEDY}\n\n${base}`;
}
ok(
  "Kennedy reply aclara Miraflores≠Surco",
  resolveUbicacionReply(
    "están cerca del kennedy?",
    "📍 Calle Artesanos",
  ).includes("No estamos en Parque Kennedy") &&
    resolveUbicacionReply(
      "están cerca del kennedy?",
      "📍 Calle Artesanos",
    ).includes("Calle Artesanos"),
);
ok(
  "ubicación genérica sin prefijo Kennedy",
  resolveUbicacionReply("dónde quedan?", "📍 Calle Artesanos") ===
    "📍 Calle Artesanos",
);

function isMostlyLocationQuestion(lower) {
  if (!matchesLocationQuestion(lower)) return false;
  const stripped = lower
    .replace(/\bd[oó]nde\s+queda[ns]?\b/gi, " ")
    .replace(/\bd[oó]nde\s+est[aá]n\b/gi, " ")
    .replace(/\bd[oó]nde\s+se\s+ubica(?:n)?\b/gi, " ")
    .replace(/\bse\s+ubica(?:n)?\b/gi, " ")
    .replace(/\bubica(?:do|da|dos|das)?\b/gi, " ")
    .replace(/\b(el\s+)?local\b/gi, " ")
    .replace(/\bubicaci[oó]n\b/gi, " ")
    .replace(/\bdirecci[oó]n\b/gi, " ")
    .replace(/\bc[oó]mo\s+lleg\w*/gi, " ")
    .replace(/\bpara\s+lleg\w*/gi, " ")
    .replace(/\breferencias?\b/gi, " ")
    .replace(/\buna\b/gi, " ")
    .replace(/\bgoogle\s+maps\b/gi, " ")
    .replace(/\bmapa\b/gi, " ")
    .replace(/\b([uú]nica|unica)\s+sede\b/gi, " ")
    .replace(/\b(tienen|hay)\s+(otra|m[aá]s)\s+sede\b/gi, " ")
    .replace(/\bsolo\s+(hay\s+)?(una|1)\s+sede\b/gi, " ")
    .replace(/\bsede\b/gi, " ")
    .replace(
      /\b(ustedes|el\s+sal[oó]n)\s+(queda[n]?|est[aá]n?|en|den)\s+surco\b/gi,
      " ",
    )
    .replace(/\b(barranco|miraflores|san\s+borja|la\s+molina|surco)\b/gi, " ")
    .replace(/\b(lejos|cerca|estoy\s+en)\b/gi, " ")
    .replace(/\b(kennedy|amistad|benavides|wong|plazuelas)\b/gi, " ")
    .replace(/\bdel\b/gi, " ")
    .replace(
      /\b(cu[aá]l|qu[eé]|es|la|el|los|las|de|un|una|me|puedes|dar|pasar|decir|indica|indique|donde|d[oó]nde)\b/gi,
      " ",
    )
    .replace(/\bpor\s+favor\b/gi, " ")
    .replace(/\bgracias\b/gi, " ")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length <= 2;
}
ok(
  "LION dirección de la sede = mostly location",
  isMostlyLocationQuestion("cual es la dirección de la sede?".toLowerCase()),
);
ok(
  "Donde se ubica el local = mostly location",
  isMostlyLocationQuestion("donde se ubica el local"),
);

ok(
  "Fanny rubber → browse soft",
  looksLikeServiceBrowseIntent("Uñas en ruber"),
);
ok(
  "Karim en gel → browse soft",
  looksLikeServiceBrowseIntent("en gel"),
);
ok(
  "Alejandra manicure → browse soft",
  looksLikeServiceBrowseIntent("Manicure y pedicure"),
);
ok(
  "Rosa este me interesa → browse soft",
  looksLikeServiceBrowseIntent("Este me interesa"),
);
ok(
  "pregunta random ≠ browse soft",
  !looksLikeServiceBrowseIntent("tienen wifi?"),
);

ok(
  "costó en free_question",
  FREE_Q.some((k) => "Rubber ➕ pies en gel que costó ?".toLowerCase().includes(k)),
);
ok(
  "dictan clases en free_question",
  FREE_Q.some((k) =>
    "Hola, buenos días también dictan clases ?".toLowerCase().includes(k),
  ),
);

ok(
  "dictan clases → matcher",
  matchesClassesQuestion("hola, buenos días también dictan clases ?"),
);
ok(
  "incluye el retiro → matcher",
  matchesRetiroInfoQuestion("el soft gel incluye el retiro?"),
);
ok(
  "retiro otro salón → matcher",
  matchesRetiroInfoQuestion("si vengo de otro local me cobran retiro?"),
);
ok(
  "solo retiro sin contexto ≠ info",
  !matchesRetiroInfoQuestion("quiero el retiro"),
);

function matchesParkingOrMovilidadQuestion(lower) {
  return (
    /\bestacionamiento\b/.test(lower) ||
    /\bparking\b/.test(lower) ||
    /\bcochera\b/.test(lower) ||
    /\bmovilidad\b/.test(lower) ||
    (/\b(auto|carro|veh[ií]culo)\b/.test(lower) &&
      /\b(dejar|estacion|gratis|libre|pag[ao])\b/.test(lower))
  );
}
ok(
  "Milagros movilidad gratis → parking",
  matchesParkingOrMovilidadQuestion(
    "Vi en la promoción movilidad gratis".toLowerCase(),
  ),
);
ok(
  "estacionamiento gratis → parking",
  matchesParkingOrMovilidadQuestion("tienen estacionamiento gratis?"),
);
ok(
  "dónde queda ≠ parking",
  !matchesParkingOrMovilidadQuestion("dónde queda el salón?"),
);

console.log(`\n✅ ${passed} checks OK`);
