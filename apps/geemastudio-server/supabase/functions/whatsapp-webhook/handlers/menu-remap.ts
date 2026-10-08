/**
 * Bloque #25 — remapeo de texto libre a IDs de menú (WA_IDS / rutas fijas).
 * Extraído de dispatcher.ts para tests unitarios sin webhook.
 *
 * Ver docs/waba/auditoria-intenciones-waba.md § intent `remapeo_menu_generico`.
 */

import { WA_IDS } from "../lib/constants.ts";
import { matchesQuotedOfferConfirm } from "../lib/pending-price-cta.ts";
import { matchesPurePromosNavigationIntent } from "../lib/promo-intent.ts";
import {
  matchesCartCorrectionIntent,
  matchesCartSelectionQuestion,
  matchesCartTotalQuestion,
  matchesHorariosAvailabilityQuery,
  matchesServiceChangeIntent,
  messageMentionsCalendarDate,
  sessionHasCart,
} from "./booking-flow.ts";
import {
  matchesCancelCitaIntent,
  matchesMiCitaIntent,
} from "./pending-appointment.ts";
import { hasExplicitTime } from "../parse-datetime-es.ts";

const SHORT_AFFIRMATIVE_WORDS = new Set([
  "sí",
  "si",
  "sip",
  "ok",
  "okay",
  "dale",
  "va",
  "listo",
  "claro",
  "quiero",
  "perfecto",
  "yep",
]);

export function isShortAffirmativeText(text: string): boolean {
  const t = text.trim().toLowerCase();
  return SHORT_AFFIRMATIVE_WORDS.has(t);
}

/**
 * Plan Haiku-primero Batch 4 — "agendar"/"reservar" sueltos siguen el
 * calendario determinístico; si queda fecha, servicio o "la semana que
 * viene" (Edgar …2122) no se remapea: Haiku primero.
 *
 * Umbral `<= 2` igual que horarios/ubicación: el strip ya se come la
 * fraseología de cita. Carrito usa `<= 8` porque sus frases nav son más
 * largas ("ver mi selección"); retiro `<= 12` por "otro salón".
 */
export function isMostlyAgendarNav(lower: string): boolean {
  if (
    !/\b(agendar|agenda|reservar|reserva)\b/.test(lower) &&
    ![
      "hacerme una cita",
      "quiero una cita",
      "hacer una cita",
      "necesito una cita",
      "nueva cita",
    ].some((k) => lower.includes(k))
  ) {
    return false;
  }
  const stripped = lower
    .replace(/\bquiero\s+agendar(\s+ya)?\b/gi, " ")
    .replace(/\bagendar(\s+ya)?\b/gi, " ")
    .replace(/\bagenda\b/gi, " ")
    .replace(/\breservar(\s+una)?(\s+cita)?\b/gi, " ")
    .replace(/\breserva\b/gi, " ")
    .replace(/\b(hacerme|hacer|quiero|necesito|deseo)\s+una\s+cita\b/gi, " ")
    .replace(/\bnueva\s+cita\b/gi, " ")
    .replace(/\b(una\s+)?cita\b/gi, " ")
    .replace(
      /\b(hola|hi|hello|buenas?|buenos\s+dias|buenas\s+tardes|buenas\s+noches)\b/gi,
      " ",
    )
    .replace(/\b(quiero|necesito|deseo|puedes|me|ya|una|por\s+favor)\b/gi, " ")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length <= 2;
}

/**
 * Haiku-primero — "ver packs" / "packs" sueltos siguen la lista;
 * "el pack", "sí el pack", "el pack de uñas" no remapean (Alberto VE …0417).
 */
export function isMostlyPacksNav(lower: string): boolean {
  if (!/\b(pack|packs|paquete|paquetes|combo|combos)\b/.test(lower)) {
    return false;
  }
  if (matchesQuotedOfferConfirm(lower)) return false;
  const stripped = lower
    .replace(
      /\b(ver|mostrar|ensename|enseñame|pasa(me)?)\s+(los\s+)?(packs?|paquetes?|combos?)\b/gi,
      " ",
    )
    .replace(
      /\b(que|cuales|cuáles)\s+(packs?|paquetes?|combos?)\s+(tienen|hay)\b/gi,
      " ",
    )
    .replace(/\b(packs?|paquetes?|combos?)\b/gi, " ")
    .replace(/\b(ver|mostrar|quiero|necesito|me|los|las|un|una|el|la)\b/gi, " ")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length <= 2;
}

/** Negaciones/despedidas que vacían carrito — guards anti falso positivo en precio/cambio servicio. */
export function isDeclineIntent(lower: string): boolean {
  if (matchesCancelCitaIntent(lower)) return false;
  if (matchesCartCorrectionIntent(lower)) return false;
  if (matchesServiceChangeIntent(lower)) return false;
  if (/(?:cu[aá]nto|precio|costo|cuesta|vale|\?)/i.test(lower)) return false;
  // Alberto VE …0417 (13-sep): "No quiero cambiar, quiero agregar" — niega el
  // copy del bot ("cambiar a manicure"), no cancela la cita/carrito.
  if (/\bno\s+quiero\s+cambiar\b/.test(lower)) return false;
  if (/\b(agregar|a[ñn]adir|sumar|tambi[eé]n\s+quiero)\b/.test(lower)) {
    return false;
  }

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

  /** Frases nuevas PR #81 — solo declinan si no hay señal de agendar/fecha (P0). */
  const NEG_SENSITIVE = ["más adelante", "por ahora no", "todavía no"];

  const hasBookingSignal = /\b(agend|reserv|cita)\w*\b/i.test(lower) ||
    messageMentionsCalendarDate(lower) ||
    hasExplicitTime(lower);

  // Romy @romymorinaga (26-sep): "no quiero una mirada q se vea triste" es una
  // preferencia que pide recomendación, no una despedida. Las negaciones
  // genéricas solo cuentan como decline en mensajes cortos; una frase larga
  // que las contiene va a Haiku.
  const WEAK_NEG = ["no quiero", "no deseo", "no necesito"];
  const wordCount = lower.split(/\s+/).filter(Boolean).length;
  if (
    NEG.some((k) => {
      if (!lower.includes(k)) return false;
      return !WEAK_NEG.includes(k) || wordCount <= 6;
    })
  ) {
    return true;
  }
  if (hasBookingSignal) return false;
  return NEG_SENSITIVE.some((k) => lower.includes(k));
}

export type MenuRemapResult =
  | { kind: "remapped"; userInput: string }
  | { kind: "short_affirmative_with_cart" }
  | { kind: "short_affirmative_no_cart" }
  | { kind: "no_match" };

export type MenuRemapSessionSlice = {
  cartItems?: unknown[];
} | null;

/**
 * Remapea texto libre de la clienta a `userInput` determinístico (menú/carrito).
 * No ejecuta side effects — el dispatcher aplica upsert/tryAcceptPendingPriceCta.
 */
export function remapMenuTextUserInput(opts: {
  messageText: string;
  lower: string;
  session: MenuRemapSessionSlice;
}): MenuRemapResult {
  const { messageText, lower, session } = opts;
  const hasCart = sessionHasCart(session);

  // Confirmación de pack/cotización ("Si claro el pack es mejor",
  // "Si confirmamos") no es navegación a ver_packs ni a Agendar cita.
  if (matchesQuotedOfferConfirm(messageText)) {
    return { kind: "no_match" };
  }

  const mentionsPackOrCombo = [
    "pack",
    "packs",
    "paquete",
    "paquetes",
    "combo",
    "combos",
  ].some((k) => lower.includes(k));

  const mentionsMultiple =
    /\blos \d\b|\blos dos\b|\bambos\b|\bvarios\b|\btodos\b|\blas \d\b/i.test(
      lower,
    );

  if (
    ["agregar", "agregar otro", "otro servicio"].some((k) =>
      new RegExp(`\\b${k}\\b`, "i").test(lower)
    ) &&
    !mentionsPackOrCombo &&
    !mentionsMultiple &&
    !/\bagendar\b/i.test(lower)
  ) {
    return { kind: "remapped", userInput: WA_IDS.AGREGAR_OTRO };
  }

  if (
    ["agendar", "agendar ya", "reservar"].some((k) => lower.includes(k)) &&
    !isDeclineIntent(lower)
  ) {
    if (!isMostlyAgendarNav(lower)) return { kind: "no_match" };
    return { kind: "remapped", userInput: WA_IDS.AGENDAR_YA };
  }

  if (
    ["ver selección", "ver mi selección", "ver seleccion", "mi selección"].some(
      (k) => lower.includes(k),
    ) ||
    matchesCartSelectionQuestion(lower) ||
    (matchesCartTotalQuestion(lower) && hasCart)
  ) {
    return { kind: "remapped", userInput: WA_IDS.VER_SELECCION };
  }

  if (
    ["vaciar", "vaciar carrito", "vaciar selección", "empezar de cero"].some(
      (k) => lower.includes(k),
    )
  ) {
    return { kind: "remapped", userInput: WA_IDS.VACIAR_CARRITO };
  }

  if (matchesPurePromosNavigationIntent(lower)) {
    return { kind: "remapped", userInput: "ver_promos" };
  }

  if (
    ["pack", "packs", "paquete", "paquetes", "combo", "combos"].some((k) =>
      lower.includes(k)
    )
  ) {
    if (!isMostlyPacksNav(lower)) return { kind: "no_match" };
    return { kind: "remapped", userInput: "ver_packs" };
  }

  if (
    [
      "ver servicios",
      "ver el catálogo",
      "ver catalogo",
      "mostrar servicios",
      "qué servicios tienen",
      "que servicios tienen",
    ].some((k) => lower.includes(k))
  ) {
    return { kind: "remapped", userInput: "ver_servicios" };
  }

  // "Reserve mi cita" / "resérvame mi cita" = pedido de NUEVA reserva (imperativo),
  // no consulta de cita existente. matchesMiCitaIntent ya excluye este patrón, pero
  // se resuelve aquí explícito a agendar_cita en vez de caer en isMostlyAgendarNav
  // (caso Milagros Saldaña, 18-sep-2026).
  if (/\b(reserve|res[eé]rvame|res[eé]rveme)\s+mi\s+cita\b/.test(lower)) {
    return { kind: "remapped", userInput: "agendar_cita" };
  }

  if (matchesMiCitaIntent(lower)) {
    return { kind: "remapped", userInput: "mi_cita" };
  }

  if (matchesHorariosAvailabilityQuery(lower)) {
    return { kind: "remapped", userInput: "consultar_horarios" };
  }

  if (
    [
      "hacerme una cita",
      "quiero una cita",
      "agendar cita",
      "reservar cita",
      "quiero agendar",
      "puedes agendarme",
      "puedes hacerme",
      "agenda para",
      "cita para el",
      "cita el lunes",
      "cita el martes",
      "cita el miércoles",
      "cita el miercoles",
      "cita el jueves",
      "cita el viernes",
      "cita el sábado",
      "cita el sabado",
      "hacer una cita",
      "necesito una cita",
      "necesito agendar",
      "deseo agendar",
      "reservar una cita",
      "nueva cita",
    ].some((k) => lower.includes(k)) ||
    (lower.includes("agendar") &&
      !matchesMiCitaIntent(lower) &&
      messageText.trim().length <= 60) ||
    (lower.includes("reservar") &&
      !lower.includes("cancelar") &&
      !matchesMiCitaIntent(lower) &&
      messageText.trim().length <= 60)
  ) {
    if (!isMostlyAgendarNav(lower)) return { kind: "no_match" };
    return { kind: "remapped", userInput: "agendar_cita" };
  }

  if (isShortAffirmativeText(messageText)) {
    if (hasCart) return { kind: "short_affirmative_with_cart" };
    return { kind: "short_affirmative_no_cart" };
  }

  return { kind: "no_match" };
}
