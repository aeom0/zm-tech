#!/usr/bin/env -S deno run --allow-read --allow-env --config supabase/functions/deno.json
/**
 * Unit — gates Haiku-primero informativo (Batches 1–4) sin webhook.
 * B1 no tiene isMostly propio (usa mentionsConflictingCatalogMidCart).
 * B2: isMostlyOpenHours / isMostlyHorariosAvailability.
 * B3: isMostlyCartInspect / isMostlyLocation (mixto → Haiku; puro → estático).
 * B4: isMostlyAgendarNav (agendar puro → bot; mixto → Haiku).
 */
import {
  isMostlyCartInspectQuestion,
  isMostlyHorariosAvailabilityQuestion,
  isMostlyLocationQuestion,
  isMostlyOpenHoursQuestion,
  matchesCartSelectionQuestion,
  matchesCartTotalQuestion,
  matchesDateAvailabilityQuestion,
  matchesDateCorrectionIntent,
  matchesLocationQuestion,
  parseTimeSlot,
  isMostlyTimeChoice,
  isMostlyDateChoice,
  matchesServiceChangeIntent,
  matchesThirdPartyBookingIntent,
  isMostlyPartyIntent,
} from "../supabase/functions/whatsapp-webhook/handlers/booking-flow.ts";
import {
  isMostlyAgendarNav,
  isMostlyPacksNav,
} from "../supabase/functions/whatsapp-webhook/handlers/menu-remap.ts";
import { matchesQuotedOfferConfirm } from "../supabase/functions/whatsapp-webhook/lib/pending-price-cta.ts";
import { matchesPurePromosNavigationIntent } from "../supabase/functions/whatsapp-webhook/lib/promo-intent.ts";

type Case = { name: string; pass: boolean };
const cases: Case[] = [];

function check(name: string, pass: boolean) {
  cases.push({ name, pass });
}

function lower(s: string): string {
  return s.toLowerCase();
}

// ── B2 horarios ────────────────────────────────────────────────────────────
check(
  "B2 puro: hasta qué hora cierran → mostly",
  isMostlyOpenHoursQuestion(lower("hasta qué hora cierran?")),
);
check(
  "B2 mixto: cierran + lifting → no mostly",
  isMostlyOpenHoursQuestion(
    lower("cierran temprano? necesito hacerme un lifting de pestañas"),
  ) === false,
);
check(
  "B2 horario domingo puro → mostly availability",
  isMostlyHorariosAvailabilityQuestion(lower("horario domingo")),
);
check(
  "B2 horario domingo + lifting → no mostly",
  isMostlyHorariosAvailabilityQuestion(
    lower("horario domingo, atienden lifting?"),
  ) === false,
);

// ── B3 carrito ─────────────────────────────────────────────────────────────
check(
  "B3 cart puro: qué tengo en mi selección → mostly",
  isMostlyCartInspectQuestion(lower("qué tengo en mi selección")),
);
check(
  "B3 cart puro: ver mi selección → mostly",
  isMostlyCartInspectQuestion(lower("ver mi selección")),
);
check(
  "B3 cart puro: cuánto sería el total → mostly",
  isMostlyCartInspectQuestion(lower("cuánto sería el total")),
);
check(
  "B3 cart mixto: total + lifting → no mostly",
  isMostlyCartInspectQuestion(
    lower("cuánto sería el total si le agrego lifting de pestañas"),
  ) === false,
);
check(
  "B3 cart mixto dispara matcher total",
  matchesCartTotalQuestion(
    lower("cuánto sería el total si le agrego lifting de pestañas"),
  ),
);
check(
  "B3 cart mixto selección + manicure → no mostly",
  isMostlyCartInspectQuestion(
    lower("qué tengo en mi selección y también quiero saber del manicure"),
  ) === false,
);
check(
  "B3 cart matcher selección en pregunta pura",
  matchesCartSelectionQuestion(lower("qué tengo en mi selección")),
);

// ── B3 ubicación ───────────────────────────────────────────────────────────
check(
  "B3 loc puro: dónde queda → mostly",
  isMostlyLocationQuestion(lower("dónde queda?")),
);
check(
  "B3 loc puro LION: dirección de la sede → mostly",
  isMostlyLocationQuestion(lower("dirección de la sede")),
);
check(
  "B3 loc mixto: dónde queda + lifting → no mostly",
  isMostlyLocationQuestion(
    lower("dónde queda el local y atienden lifting de pestañas?"),
  ) === false,
);
check(
  "B3 loc mixto dispara matcher",
  matchesLocationQuestion(
    lower("dónde queda el local y atienden lifting de pestañas?"),
  ),
);

// ── B4 agendar nav ─────────────────────────────────────────────────────────
check("B4 agendar puro → mostly", isMostlyAgendarNav(lower("agendar")));
check(
  "B4 quiero agendar → mostly",
  isMostlyAgendarNav(lower("quiero agendar")),
);
check(
  "B4 voy agendar la semana que viene → no mostly",
  isMostlyAgendarNav(lower("Voy agendar para la semana que viene")) === false,
);
check(
  "B4 reserva para pestañas → no mostly",
  isMostlyAgendarNav(lower("reserva para pestañas naturales?")) === false,
);

check("packs nav puro → mostly", isMostlyPacksNav(lower("ver packs")));
check(
  "El pack no es nav (Haiku / CTA)",
  isMostlyPacksNav(lower("El pack")) === false,
);
check(
  "el pack de uñas el sábado → no mostly",
  isMostlyPacksNav(lower("el pack de uñas el sábado")) === false,
);
check(
  "promos nav puro → mostly",
  matchesPurePromosNavigationIntent(lower("ver promos")),
);
check(
  "la promo no es nav",
  matchesPurePromosNavigationIntent(lower("la promo")) === false,
);
check(
  "ver promos de uñas → no mostly",
  matchesPurePromosNavigationIntent(lower("ver promos de uñas")) === false,
);
check(
  "vi la promo de Mirada → no mostly",
  matchesPurePromosNavigationIntent(
    lower("vi la promo de Mirada de Impacto"),
  ) === false,
);

check(
  "pack confirm: Si claro el pack",
  matchesQuotedOfferConfirm("Si claro el pack"),
);
check(
  "pack confirm: Si claro el pack es mejor",
  matchesQuotedOfferConfirm("Si claro el pack es mejor"),
);
check("confirmamos el combo", matchesQuotedOfferConfirm("Si confirmamos"));
check(
  "ok las mojado me gustan",
  matchesQuotedOfferConfirm("Ok las mojado me gustan"),
);
check(
  "pack confirm: quiero el pack que me ofreció",
  matchesQuotedOfferConfirm(
    "Para qué me envía eso quiero el pack qué me ofreció",
  ),
);
check(
  "pack browse no es confirm",
  matchesQuotedOfferConfirm("qué packs tienen?") === false,
);
check(
  "El pack (tras cotizar) es confirm",
  matchesQuotedOfferConfirm("El pack"),
);
check("la promo es confirm", matchesQuotedOfferConfirm("la promo"));
check("sí la promo es confirm", matchesQuotedOfferConfirm("sí la promo"));
check(
  "ver packs no es confirm",
  matchesQuotedOfferConfirm("ver packs") === false,
);
check(
  "ver promos no es confirm",
  matchesQuotedOfferConfirm("ver promos") === false,
);
check(
  "sábado pregunta ≠ elegir día",
  matchesDateAvailabilityQuestion(
    "No veo el sábado en la lista, no trabajan el sábado?",
  ),
);
check(
  "el viernes sí es elegir día",
  matchesDateAvailabilityQuestion("El viernes") === false,
);
check(
  "cambia semana que viene es corrección de fecha",
  matchesDateCorrectionIntent("Mejor me cambia para la semana que viene"),
);
check(
  "2 veces no es las 2 PM",
  parseTimeSlot("Tengo el mismo servicio 2 veces") === null,
);
check("'3' suelto sí es hora", parseTimeSlot("3")?.hour === 15);
check("a las 3 sigue OK", parseTimeSlot("a las 3")?.hour === 15);
check(
  "hora pura es mostly",
  isMostlyTimeChoice("3") && isMostlyTimeChoice("a las 3"),
);
check(
  "2 veces no es mostly hora",
  isMostlyTimeChoice("Tengo el mismo servicio 2 veces") === false,
);
check(
  "la 3D no es mostly hora",
  isMostlyTimeChoice("Esto es la 3D?") === false,
);
check(
  "a las 4 + lifting no es mostly",
  isMostlyTimeChoice("a las 4 y también lifting") === false,
);
check("mañana a la 1 es mostly hora", isMostlyTimeChoice("Mañana a la 1"));
check(
  "este sabado a las 3 es mostly hora",
  isMostlyTimeChoice("este sabado a las 3"),
);
check(
  "este viernes 4pm es mostly hora",
  isMostlyTimeChoice("este viernes 4pm"),
);
check(
  "20 de septiembre a las 11 am es mostly hora",
  isMostlyTimeChoice("el 20 de septiembre a las 11 am"),
);
check("Hoy suelto es mostly día", isMostlyDateChoice("Hoy"));
check("este sabado es mostly día", isMostlyDateChoice("este sabado"));
check(
  "el 20 de septiembre es mostly día",
  isMostlyDateChoice("el 20 de septiembre"),
);
check(
  "Hoy + copy CTWA no pega el día",
  isMostlyDateChoice(
    "Hoy\n¡Hola! Quiero saber qué estilo de pestañas me queda mejor 💜",
  ) === false,
);
check("Mejor 4D es cambio de servicio", matchesServiceChangeIntent("Mejor 4D"));
check(
  "no quiero las Anime es cambio",
  matchesServiceChangeIntent("No quiero las Anime quiero las 4D"),
);
check(
  "Mejor 4D no es corrección de fecha",
  matchesDateCorrectionIntent("Mejor 4D") === false,
);
check(
  "cambio a 4D es cambio de servicio",
  matchesServiceChangeIntent("Te pedí cambio a 4D no Anime"),
);
check(
  "boleta no es corrección de fecha",
  matchesDateCorrectionIntent("Te pedí cambio a 4D no Anime") === false,
);

// ── Party / terceros (Haiku-primero) ───────────────────────────────────────
check(
  "Party puro: somos 2 → mostly",
  isMostlyPartyIntent("somos 2") && matchesThirdPartyBookingIntent("somos 2"),
);
check(
  "Party puro: para mi hija → mostly",
  isMostlyPartyIntent("para mi hija"),
);
check(
  "Party puro: Necesito separar para otra persona más → mostly",
  isMostlyPartyIntent("Necesito separar para otra persona más"),
);
check(
  "Party mixto: somos 2 + cuánto lifting → no mostly",
  isMostlyPartyIntent("somos 2, ¿cuánto sale el lifting?") === false,
);
check(
  "Party mixto: para mi amiga + promo → no mostly",
  isMostlyPartyIntent("para mi amiga hay promo de pestañas?") === false,
);
check(
  "Party: agendar para el sábado solo (sin terceros) → no match",
  matchesThirdPartyBookingIntent("agendar para el sábado") === false,
);

let fails = 0;
console.log("QA Haiku-primero gates (unit)\n");
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
