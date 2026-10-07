// booking-flow.ts — Fast-lane agendar, parse hora, recuperación de sesión

import {
  hasExplicitTime,
  parseDateOnlyKey,
  parseDatetimeES,
} from "../parse-datetime-es.ts";
import {
  collapseSlotsToClientHours,
  formatHourCompact,
} from "../lib/duo-pack.ts";
import {
  getSession,
  type SupabaseClient,
  upsertSession,
} from "../lib/supabase.ts";
import {
  ADDITIONAL_BOOKING_BLOCK_MESSAGE,
  BOOKING_OVERLAP_MESSAGE,
  finalizeRescheduleAppointment,
  getPendingAppointmentsForPhone,
  matchesAttendanceAffirmation,
  newBookingOverlapsExisting,
  shouldBlockAdditionalBooking,
  STAFF_COORDINATION_PHONE,
  startRescheduleFromAppointment,
} from "./pending-appointment.ts";
import {
  getEmployeeCategories,
  getSalonTimeSlots,
  isValidSalonSlot,
  LIMA_UTC_OFFSET_HOURS,
  WA_IDS,
} from "../lib/constants.ts";
import type { ServiceCatalog } from "../lib/services-catalog.ts";
import { overlapCapForCart } from "../lib/services-catalog.ts";
import type { CartItem } from "../lib/supabase.ts";
import { clientTypedPortion } from "../lib/reply-context.ts";
import {
  countOverlappingAppointments,
  hasSlotCapacityForServices,
  sendDateSelector,
  sendTimeSelector,
} from "./agenda.ts";
import { finalizeBookingAfterDatetimeSelection } from "./payment.ts";
import { sendMessage } from "../wa-api.ts";
import { formatDateSpanish, parseLimaLocalToDate } from "../format.ts";
import {
  getDateKeyLima,
  getSalonClosedMessage,
  isPeruHoliday,
  isSalonClosed,
  isSunday,
  isZmMallClosed,
} from "../lib/peru-holidays.ts";

/** Clienta quiere cambiar el servicio del carrito / reprogramación (Patricia …5300). */
export function matchesServiceChangeIntent(text: string): boolean {
  const t = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!t.trim()) return false;
  return (
    /\bya\s+no\s+quiero\b/.test(t) ||
    /\bno\s+quiero\s+(el|la|las|los|ese|esa|mas|más|builder|soft|poly|lifting|esmalte|gel|acrilico|rubber|polygel|anime|4d|3d)\b/
      .test(
        t,
      ) ||
    /\bcambiar\s+(el\s+)?servicio\b/.test(t) ||
    /\bcambia(r|me)?\s+(a|por)\b/.test(t) ||
    /\bcambio\s+(a|de|por)\b/.test(t) ||
    /\ben\s+vez\s+de\b/.test(t) ||
    /\ben\s+lugar\s+de\b/.test(t) ||
    /\bsolo\s+(quiero|esmalte|manicure|pedicure|lifting|builder|soft|poly)\b/
      .test(
        t,
      ) ||
    /\bprefiero\b/.test(t) ||
    // "Mejor 4D" / "mejor las Anime" — no "mejor el viernes" ni "mejor me cambia"
    /\bmejor\s+(?:el|la|las|los|solo)\s+(?!lunes|martes|miercoles|jueves|viernes|sabado|domingo|hoy|manana)[a-z0-9áéíóúñ]{2,}/
      .test(
        t,
      ) ||
    /\bmejor\s+(?!me\b|el\b|la\b|las\b|los\b|hoy\b|manana\b|para\b)[a-z0-9áéíóúñ]{2,}/
      .test(
        t,
      )
  );
}

const STALE_SESSION_MS = 24 * 60 * 60 * 1000;

export function sessionHasCart(
  session: {
    cartItems?: unknown[];
    serviceIds?: string[];
  } | null,
): boolean {
  return (
    (session?.cartItems?.length ?? 0) > 0 ||
    (session?.serviceIds?.length ?? 0) > 0
  );
}

/**
 * Categorías de catálogo que el texto nombra (hints de producto).
 * Usa solo la parte tipeada (sin quote ↳) — Jessi …6106.
 */
export function mentionedServiceCategoryIds(text: string): Set<string> {
  const t = clientTypedPortion(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  const cats = new Set<string>();
  if (
    /\b(cejas|dise[nñ]o\s+de\s+cejas|laminado\s+de\s+cejas|microblading)\b/
      .test(
        t,
      )
  ) {
    cats.add("cat-cejas-rostro");
  }
  if (
    /\b(manicure|pedicure|u[nñ]as|builder|rubber|polygel|esmalte|acrilico)\b/
      .test(
        t,
      )
  ) {
    cats.add("cat-unas");
  }
  if (/\blifting\b/.test(t)) cats.add("cat-lifting");
  if (
    /\b(extensiones|pesta[nñ]as|volumen|clasicas|rimel|hawaiana|anime|fox|wispy|mojado)\b/
      .test(
        t,
      )
  ) {
    cats.add("cat-extensiones");
  }
  if (/\bdepilaci[oó]n\b/.test(t)) cats.add("cat-depilacion");
  return cats;
}

/** Categorías presentes en el carrito (servicios expandidos + packs). */
export function cartCategoryIds(
  session: {
    cartItems?: CartItem[];
    serviceIds?: string[];
  } | null,
  catalog: ServiceCatalog,
): Set<string> {
  const cats = new Set<string>();
  for (const id of session?.serviceIds ?? []) {
    const svc = catalog.servicesById.get(id);
    if (svc?.category_id) cats.add(svc.category_id);
  }
  for (const it of session?.cartItems ?? []) {
    if (it.item_type === "service") {
      const svc = catalog.servicesById.get(it.item_id);
      if (svc?.category_id) cats.add(svc.category_id);
    } else if (it.item_type === "pack") {
      const pack = catalog.packsById.get(it.item_id);
      if (pack?.category_id) cats.add(pack.category_id);
    }
  }
  return cats;
}

/**
 * Mid-`awaiting_datetime`: el mensaje nombra otra categoría distinta a la del carrito
 * (Jessi …6106: Pack VIP extensiones + "Diseño de cejas / Manicure" → Haiku cotizaba
 * otro pack sin aclarar el conflicto).
 * No aplica si ya hay intención explícita de cambio (`matchesServiceChangeIntent`).
 */
export function mentionsConflictingCatalogMidCart(
  text: string,
  session: {
    cartItems?: CartItem[];
    serviceIds?: string[];
  } | null,
  catalog: ServiceCatalog,
): boolean {
  if (!sessionHasCart(session)) return false;
  if (matchesServiceChangeIntent(text)) return false;
  const mentioned = mentionedServiceCategoryIds(text);
  if (mentioned.size === 0) return false;
  const inCart = cartCategoryIds(session, catalog);
  if (inCart.size === 0) return false;
  for (const c of mentioned) {
    if (!inCart.has(c)) return true;
  }
  return false;
}

/**
 * Mid-agenda: quiere ver/agregar otro servicio (no solo elegir día).
 * Alberto VE …0417 — "quiero agregar manicure" / "qué tienes para las uñas".
 * Fix 13-sep: "también quisiera extensiones" (conjugación "quisiera", no solo
 * "quiero") caía al boilerplate genérico "agregar/cambiar" en vez de abrir
 * catálogo — cubrir también "querría"/"quisiéramos".
 * Fix 13-sep (cont.): "Y anime tienen o wispy" (pregunta de disponibilidad
 * con "tienen"/"tienes", sin "quiero"/"qué tienes") también caía al mismo
 * boilerplate en vez de responder sobre el efecto. El caller ya validó que
 * el texto menciona una categoría (mentionsConflictingCatalogMidCart), así
 * que "tienen"/"tienes" solos son señal suficiente aquí.
 */
export function matchesMidAgendaBrowseOrAddIntent(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower) return false;
  const QUERER_RE = "quiero|quisiera|quisi[eé]ramos|querr[ií]a";
  return (
    new RegExp(
      `\\b(agregar|a[ñn]adir|sumar|tambi[eé]n\\s+(?:${QUERER_RE})|ademas\\s+(?:${QUERER_RE})|además\\s+(?:${QUERER_RE}))\\b`,
    ).test(lower) ||
    /\b(ver|mostrar|ense[nñ]ar|pasame|p[aá]same).{0,24}(servicio|servicios|u[nñ]as|extensi|ceja|lifting|categor)/
      .test(
        lower,
      ) ||
    /\b(qu[eé]\s+tienes|qu[eé]\s+hay|tienen|tienes|nunca\s+me\s+he\s+puesto|opciones\s+de)\b/
      .test(
        lower,
      )
  );
}

/**
 * Tras Haiku mid-`awaiting_datetime`: no reenviar "Ver fechas" si el mensaje
 * era sobre fotos/efecto/catálogo (spam Alberto VE …0417, 13-sep).
 */
export function shouldSkipDatetimeResendAfterHaiku(text: string): boolean {
  const lower = text.trim().toLowerCase();
  if (!lower) return false;
  if (matchesServiceChangeIntent(text)) return true;
  if (matchesMidAgendaBrowseOrAddIntent(lower)) return true;
  // Pregunta de horarios/disponibilidad ("no hay más horarios?", "algún
  // cupo?") sin día explícito: Haiku ya respondió sobre eso (con o sin
  // CUPOS REALES) — reenviar el selector duplica y contradice su propia
  // respuesta (caso Gimena …5978, 17-sep-2026).
  if (/\b(horarios?|disponib\w*|cupos?)\b/.test(lower)) return true;
  return (
    /\b(foto|fotos|imagen|im[aá]genes|portafolio|dise[nñ]o|efecto|ardilla|mu[nñ]eca|ojo\s+de\s+gato|ojo\s+abierto|r[ií]mel|wispy|cl[aá]sicas?)\b/
      .test(
        lower,
      ) ||
    /\b(me\s+voy\s+por|voy\s+por|prefiero\s+el|prefiero\s+la|ese\s+look|ese\s+efecto)\b/
      .test(
        lower,
      )
  );
}

export function matchesFirstMessageBookingIntent(lower: string): boolean {
  // "reagendar" contiene "agendar" — no es cita nueva (Gabriela …4563).
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

export function matchesOpenHoursQuestion(lower: string): boolean {
  return (
    (lower.includes("hasta qu") && lower.includes("hora")) ||
    lower.includes("hasta que hora") ||
    lower.includes("a qué hora cierr") ||
    lower.includes("a que hora cierr") ||
    lower.includes("están abiert") ||
    lower.includes("estan abiert") ||
    lower.includes("abiertos hoy") ||
    lower.includes("cierran")
  );
}

/**
 * Plan 13-sep "Haiku-primero informativo", Batch 2: si tras quitar la
 * fraseología típica de "a qué hora cierran/abren" queda texto real (otro
 * servicio, una fecha puntual, "cuánto"), no es una pregunta genérica de
 * horario — vale la pena intentar Haiku antes del texto estático (mismo
 * patrón que `isMostlyLocationQuestion`).
 *
 * Umbrales `stripped.length` (Batch 4, no unificar a un número):
 * `<= 2` horarios / disponibilidad / ubicación / agendar-nav / hora-cita — el strip
 * ya absorbe la frase típica; lo que queda es ruido o contenido real.
 * `<= 8` carrito — "ver mi selección" / "cuánto sería el total" dejan
 * más residuo. `<= 12` retiro — "de otro salón" es más largo.
 */
export function isMostlyOpenHoursQuestion(lower: string): boolean {
  if (!matchesOpenHoursQuestion(lower)) return false;
  const stripped = lower
    .replace(/\bhasta\s+qu[eé]\s+hora\b/gi, " ")
    .replace(/\ba\s+qu[eé]\s+hora\s+cierr\w*\b/gi, " ")
    .replace(/\best[aá]n\s+abiert\w*\b/gi, " ")
    .replace(/\babiertos?\s+hoy\b/gi, " ")
    .replace(/\bcierran\b/gi, " ")
    .replace(/\b(hoy|ma[ñn]ana)\b/gi, " ")
    .replace(
      /\b(qu[eé]|cu[aá]l|es|la|el|los|las|de|un|una|hasta|hora|horas)\b/gi,
      " ",
    )
    .replace(/\bpor\s+favor\b/gi, " ")
    .replace(/\bgracias\b/gi, " ")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length <= 2;
}

/**
 * Mid-pago: ¿el adelanto es aparte? / ¿para qué es el abono?
 * Caso Lizbeth …3315 — "Esos 25 de adelanto ¿son aparte del servicio?"
 * También: "los S/25 son un pago adicional" / "son adicionales"
 */
export function matchesDepositFaqIntent(lower: string): boolean {
  const t = lower.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  const mentionsDeposit = /\b(adelanto|abono|deposito)\b/.test(t) ||
    /\bs\/?\s*25\b/.test(t) ||
    /\b(los?\s+)?25\b/.test(t);
  const asksAparte = /\b(aparte|adicional(?:es)?|extra)\b/.test(t) ||
    /\b(pago\s+adicional(?:es)?)\b/.test(t) ||
    /\b(se\s+suma|suma\s+al|encima\s+del)\b/.test(t);
  const asksWhy = /\b(para\s+que|por\s+que|pa\s+que|porque)\b/.test(t) ||
    /\b(para\s+que\s+sirve|que\s+cubre)\b/.test(t);
  // Follow-ups cortos sin repetir "adelanto" (Lizbeth 2.º msg / "son adicionales")
  if (
    asksAparte &&
    t.length <= 80 &&
    (/\b(servicio|total|precio|cita|pago)\b/.test(t) ||
      /\bson\s+(aparte|adicional(?:es)?|extra)\b/.test(t))
  ) {
    return true;
  }
  return mentionsDeposit && (asksAparte || asksWhy);
}

/** Ubicación / dirección / cómo llegar (Maps). */
export function matchesLocationQuestion(raw: string): boolean {
  // Solo lo tipeado: no heredar palabras del mensaje citado (↳).
  const lower = clientTypedPortion(raw);
  return (
    /\bd[oó]nde\s+queda/.test(lower) ||
    /\bd[oó]nde\s+est[aá]n/.test(lower) ||
    /\bd[oó]nde\s+queda[ns]?/.test(lower) ||
    // …324 "Donde se ubica el local" — "ubica" ≠ "ubicación"; "está" ≠ "están"
    /\bd[oó]nde\s+se\s+ubica/.test(lower) ||
    /\bse\s+ubica(?:n)?\b/.test(lower) ||
    /\bd[oó]nde\s+est[aá](?:n)?\s+ubicad/.test(lower) ||
    /\bd[oó]nde\s+est[aá]\s+(el\s+|la\s+)?(local|sal[oó]n)\b/.test(lower) ||
    (/\bd[oó]nde\b/.test(lower) && /\b(el\s+)?local\b/.test(lower)) ||
    /\bubicaci[oó]n\b/.test(lower) ||
    /\bdirecci[oó]n\b/.test(lower) ||
    /\bc[oó]mo\s+lleg/.test(lower) ||
    // Luz …02357: "Una referencias para llegar" (sin "cómo")
    /\bpara\s+lleg/.test(lower) ||
    (/\breferencias?\b/.test(lower) &&
      (/\blleg/.test(lower) ||
        /\bsal[oó]n/.test(lower) ||
        /\blocal\b/.test(lower) ||
        lower.length <= 40)) ||
    lower.includes("google maps") ||
    lower.includes("mapa") ||
    // Karina …: "Única sede?" / "tienen otra sede?"
    /\b([uú]nica|unica)\s+sede\b/.test(lower) ||
    /\b(tienen|hay)\s+(otra|m[aá]s)\s+sede\b/.test(lower) ||
    /\bsolo\s+(hay\s+)?(una|1)\s+sede\b/.test(lower) ||
    /\bsede\s*\??\s*$/.test(lower) ||
    // Tania: "estoy en Barranco y ustedes den Surco" (distancia / sede)
    /\b(ustedes|el\s+sal[oó]n)\s+(queda[n]?|est[aá]n?|en|den)\s+surco\b/.test(
      lower,
    ) ||
    (/\bsurco\b/.test(lower) &&
      /\b(barranco|miraflores|san\s+borja|la\s+molina|lejos|cerca)\b/.test(
        lower,
      )) ||
    // Merillyn …7296: "¿cerca del Kennedy?" / Amistad
    /\bkennedy\b/.test(lower) ||
    /\bamistad\b/.test(lower) ||
    (/\bcerca\b/.test(lower) &&
      /\b(benavides|wong|plazuelas|kennedy|amistad)\b/.test(lower)) ||
    lower === "ubicacion" ||
    lower === "ubicación" ||
    // Brescia …3243: "Lugar???" (palabra suelta, sin "dónde"/"local")
    /\blugar\s*\?*\s*$/.test(lower) ||
    // Misama …9751: "lugar de atencion y si es posible mañana" — "lugar de atención" en medio de frase
    /\blugar\s+de\s+atenci[oó]n\b/.test(lower)
  );
}

/**
 * True si el mensaje es casi solo la pregunta de ubicación
 * (permite seguir el turno si también dice "sí" / confirma pack).
 */
export function isMostlyLocationQuestion(lower: string): boolean {
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
    .replace(/\blugar\b/gi, " ")
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

/**
 * Texto libre que huele a catálogo (uñas/gel/manicure…) — si Haiku falla
 * preferimos menú/categorías antes que remitir al 932.
 */
export function looksLikeServiceBrowseIntent(text: string): boolean {
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
    /\b(manicure|pedicure|manos\s+y\s+pies|pies\s+en\s+gel|uñas|unas)\b/.test(
      lower,
    )
  ) {
    return true;
  }
  if (
    /\b(lifting|pestanas|pestañas|cejas|extensiones|microblading|depilaci)\b/
      .test(
        lower,
      )
  ) {
    return true;
  }
  if (
    /\b(diseno|diseño|ojo\s+abierto|ojo\s+de\s+gato|ardilla|muneca|muñeca|wispy)\b/
      .test(
        lower,
      )
  ) {
    return true;
  }
  if (/\ben\s+gel\b/.test(lower) || /\bgel\b/.test(lower)) {
    // "en gel" / "gel" cortos típicos post-lista CTWA (Karim …)
    if (lower.length <= 40) return true;
  }
  if (/\beste\s+me\s+interesa\b/.test(lower)) return true;
  return false;
}

/** Copy informativo de clases (no es servicio agendable por el bot). */
export const DEFAULT_CLASES_TEXT = `🎓 *Clases personalizadas*

*Estudios e incluye:*
🪻 Lifting de pestañas _(teoría y práctica)_
🌷 Laminado y planchado de cejas _(teoría y práctica)_
🪻 Diseño de cejas _(teoría y práctica)_

✨ Coffee break
🪷 Kit de lifting
💜 2 días de clases
👩🏻‍🏫 Clases 1 a 1 (personalizadas)
📜 Certificado

💰 *S/ 250* el pack completo

No se agenda por este chat 🙏 Para fechas e inscripción escríbenos al 📱 *932 535 512* y te orientamos.`;

/**
 * Curso de extensiones de pestañas — lead capture (caso Johanna …9981, Vanessa).
 * No se agenda por el bot; pide datos y el staff continúa.
 */
export const DEFAULT_CURSOS_EXTENSIONES_TEXT =
  `Si, hacemos cursos especializados en extensiones de pestañas personalizado 🌷

Brindarme los siguientes datos para poder enviarte la información:

🌸 Nombre y Apellidos:
🪻 N° de whatsapp:

🌸 ¿Cuál es el nivel en que te encuentras en extensiones de pestañas?

🌷 Nivel principiante ó nivel medio?`;

export const CURSO_LEAD_THANKS_TEXT =
  `¡Gracias! 💜 Recibimos tus datos. Una asesora te enviará la información del curso de extensiones en breve.`;

/** Step tras enviar el formulario de curso de extensiones. */
export const AWAITING_CURSO_LEAD = "awaiting_curso_lead";

/** Preguntas por clases / cursos / capacitación (Cris …8613). */
export function matchesClassesQuestion(lower: string): boolean {
  return (
    /\bdictan?\s+clases?\b/.test(lower) ||
    /\bdan\s+clases?\b/.test(lower) ||
    /\bofrecen\s+clases?\b/.test(lower) ||
    /\bhay\s+clases?\b/.test(lower) ||
    /\bclases?\s+de\b/.test(lower) ||
    /\bcurso(s)?\b/.test(lower) ||
    /\bcapacitaci[oó]n\b/.test(lower) ||
    /\bcapacitan\b/.test(lower) ||
    /\bcertificad[oa]s?\b/.test(lower) ||
    lower.includes("enseñan") ||
    lower.includes("ensenan") ||
    lower.includes("enseñar") ||
    lower.includes("ensenar")
  );
}

/**
 * Lead de curso de extensiones (default para "curso" / "inf sobre el curso").
 * El pack S/250 de lifting+cejas queda para "clases" o mención explícita lifting/cejas.
 */
export function matchesExtensionesCursoLead(lower: string): boolean {
  if (!matchesClassesQuestion(lower)) return false;
  if (/\b(lifting|cejas|laminado|planchado)\b/.test(lower)) return false;
  if (/\bcurso(s)?\b/.test(lower)) return true;
  const ascii = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (/\b(pestan|extension)/.test(ascii)) return true;
  return false;
}

/** Respuesta al formulario de curso (nombre + principiante/medio). */
export function matchesCursoLeadReply(lower: string): boolean {
  return (
    /\bprincipiante\b/.test(lower) ||
    /\bnivel\s+medio\b/.test(lower) ||
    /\bintermedio\b/.test(lower) ||
    (/\bmedio\b/.test(lower) && lower.length <= 120)
  );
}

/**
 * Formulario de lead de curso: multilínea o teléfono/DNI.
 * No basta con "Gracias" (≥6 chars) — Anace PE.…9630 (análisis 07-sep).
 */
export function looksLikeCursoLeadData(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length >= 8) return true;
  const lines = trimmed
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length >= 2 && trimmed.length >= 10;
}

export function isMostlyClassesQuestion(lower: string): boolean {
  if (!matchesClassesQuestion(lower)) return false;
  const stripped = lower
    .replace(/\bdictan?\s+clases?\b/gi, " ")
    .replace(/\bdan\s+clases?\b/gi, " ")
    .replace(/\bofrecen\s+clases?\b/gi, " ")
    .replace(/\bhay\s+clases?\b/gi, " ")
    .replace(/\bclases?\b/gi, " ")
    .replace(/\bcurso(s)?\b/gi, " ")
    .replace(/\bcapacitaci[oó]n\b/gi, " ")
    .replace(/\bcapacitan\b/gi, " ")
    .replace(/\bcertificad[oa]s?\b/gi, " ")
    .replace(/\bense[nñ]an\b/gi, " ")
    .replace(/\bense[nñ]ar\b/gi, " ")
    .replace(/\btambi[eé]n\b/gi, " ")
    .replace(/\bhola\b/gi, " ")
    .replace(/\bbuenos?\s+d[ií]as?\b/gi, " ")
    .replace(/\bpor\s+favor\b/gi, " ")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length <= 8;
}

/** Copy: por qué se cobra retiro si viene de otro local (Vanessa). */
export const DEFAULT_RETIRO_OTRO_SALON_TEXT =
  `Si vienes con un trabajo hecho de *otro local* se te cobrará el *retiro*.

*¿Por qué?*
🪻 No sabemos qué marca de producto usaron en tus uñas
🪷 Se debe de limar
🪻 Se debe de colocar preparadores nuevos en tus uñas
🪷 Se debe de colocar producto nuevo
🪻 El tiempo que se demora es *1 hr* más al servicio de uñas

*Costo del retiro:* S/20

Si el mantenimiento es de trabajo hecho *aquí en ZM*, no aplica ese cargo. ¿Vienes de otro salón o es retoque con nosotras?`;

/**
 * Preguntas informativas sobre retiro / trabajo de otro salón
 * (no selección del servicio Retiro por lista).
 */
export function matchesRetiroInfoQuestion(lower: string): boolean {
  const hasRetiro = /\bretiro\b/.test(lower);
  const hasOtro = /\botro\s+(sal[oó]n|local)\b/.test(lower) ||
    /\botra\s+(salon|salón|local)\b/.test(lower) ||
    /\bde\s+otro\b/.test(lower) ||
    /\botro\s+lado\b/.test(lower);
  if (hasRetiro && hasOtro) return true;
  if (
    hasRetiro &&
    (/\binclu(ye|ido|ída|ida)\b/.test(lower) ||
      /\bcobran\b/.test(lower) ||
      /\bcosto\b/.test(lower) ||
      /\bcu[eé]sto\b/.test(lower) ||
      /\bcu[aá]nto\b/.test(lower) ||
      /\bpor\s*qu[eé]\b/.test(lower) ||
      /\bporqu[eé]\b/.test(lower) ||
      /\bvale\b/.test(lower) ||
      /\bprecio\b/.test(lower))
  ) {
    return true;
  }
  // "¿vengo de otro salón me cobran retiro?" / "si traigo uñas de otro local"
  if (
    hasOtro &&
    (/\bretiro\b/.test(lower) ||
      /\bcobran\b/.test(lower) ||
      /\blimar\b/.test(lower) ||
      /\bquitar\b/.test(lower))
  ) {
    return true;
  }
  return false;
}

export function isMostlyRetiroInfoQuestion(lower: string): boolean {
  if (!matchesRetiroInfoQuestion(lower)) return false;
  const stripped = lower
    .replace(/\bretiro\b/gi, " ")
    .replace(/\botro\s+(sal[oó]n|local)\b/gi, " ")
    .replace(/\botra\s+(salon|salón|local)\b/gi, " ")
    .replace(/\bde\s+otro\b/gi, " ")
    .replace(/\binclu(ye|ido|ída|ida)\b/gi, " ")
    .replace(/\bcobran?\b/gi, " ")
    .replace(/\bpor\s*qu[eé]\b/gi, " ")
    .replace(/\bporqu[eé]\b/gi, " ")
    .replace(/\bcu[aá]nto\b/gi, " ")
    .replace(/\bcosto\b/gi, " ")
    .replace(/\bprecio\b/gi, " ")
    .replace(/\bvale\b/gi, " ")
    .replace(/\bu[nñ]as?\b/gi, " ")
    .replace(/\bhola\b/gi, " ")
    .replace(/\bpor\s+favor\b/gi, " ")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length <= 12;
}

export function matchesCartSelectionQuestion(lower: string): boolean {
  return [
    "seleccioné",
    "seleccione",
    "seleccion",
    "elegí",
    "elegi",
    "qué tengo en",
    "que tengo en",
    "qué llevo",
    "que llevo",
    "cuál es el servicio que",
    "cual es el servicio que",
    "qué servicio tengo",
    "que servicio tengo",
    "cuáles servicios tengo",
    "cuales servicios tengo",
    "mis servicios",
    "quedarme con mi selección",
    "quedarme con mi seleccion",
  ].some((k) => lower.includes(k));
}

/** Mensaje estándar cuando piden agendar para otra persona o múltiples citas. */
/** Legacy: el dispatcher ya no lo usa como bloqueo ciego (flujo party). */
export const THIRD_PARTY_BOOKING_MESSAGE =
  `¡Claro! 💜 Puedo agendar hasta *2 citas* en este chat (tú + acompañante, o solo para otra persona).\n\nSi ya tienes 2 programadas, escríbenos al 📱 *${STAFF_COORDINATION_PHONE}*.`;
/** Reclamo/garantía en texto libre (no confirmación de cita) — caso Lili 04-ago-2026. */
export function matchesComplaintIntent(text: string): boolean {
  const t = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!t.trim()) return false;
  return [
    "se cayo",
    "se cayeron",
    "se me cayo",
    "se me cayeron",
    "se bajo",
    "se bajaron",
    "se me bajo",
    "se me bajaron",
    "se callo",
    "se dano",
    "se danaron",
    "se solto",
    "se soltaron",
    "se me solto",
    "se me soltaron",
    "se despego",
    "se despegaron",
    "se me despego",
    "se me despegaron",
    "no deberia",
    "no debio",
    "no me duro",
    "no me duraron",
    "no duraron",
    "quedaron mal",
    "quedo mal",
    "tendran que",
    "volverlo a hacer",
    "volver a hacer",
    "volvieran a hacer",
    "fallo",
    "mal hecho",
    "reclamo",
    "garantia",
  ].some((k) => t.includes(k));
}

/** Mensaje estándar cuando el texto libre suena a reclamo/garantía, no a agendado. */
export const COMPLAINT_MESSAGE =
  `¡Uy, lamento leer esto! 💜 Para casos de garantía nuestro equipo te atiende directo al 📱 *${STAFF_COORDINATION_PHONE}* y lo revisamos contigo.\n\nNo quiero agendarte una cita nueva por error — escríbenos a ese número y coordinamos.`;

function normalizeIntentText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

const SELF_DATE_DAYS = "lunes|martes|miercoles|jueves|viernes|sabado|domingo";

/** Señales de reserva para otra persona o múltiples citas en el mismo chat. */
export function hasThirdPartyBookingSignals(lower: string): boolean {
  const phrases = [
    "para mi amiga",
    "para mi amigo",
    "para mi hermana",
    "para mi mama",
    "para mi papa",
    "para mi hija",
    "para mi hijo",
    "para otra persona",
    "otra persona mas",
    "para 2 personas",
    "para dos personas",
    "somos 2",
    "somos dos",
    "2 personas",
    "dos personas",
    "para las dos personas",
    "para ambas personas",
    "agendar para otra",
    "cita para otra",
    "reservar para otra",
    "separar para otra",
    "a nombre de",
    "para alguien mas",
  ];

  if (phrases.some((p) => lower.includes(p))) return true;

  if (/\bpara\s+(2|dos)\b/.test(lower) && /\bpersonas?\b/.test(lower)) {
    return true;
  }

  if (
    /\bse llama\b/.test(lower) &&
    !/\b(me llamo|mi nombre es)\b/.test(lower)
  ) {
    return true;
  }

  return false;
}

/** Cita propia con fecha (sin señales de terceros). */
export function hasSelfDateBookingIntent(lower: string): boolean {
  if (/\bpersonas?\b/.test(lower)) return false;
  return new RegExp(
    `\\b(agendar|reservar|cita|separar)\\b.*\\bpara\\s+(manana|hoy|el\\s|la\\s|${SELF_DATE_DAYS})`,
  ).test(lower);
}

/** Intención de reservar para terceros o más de una persona (flujo party in-bot). */
export function matchesThirdPartyBookingIntent(text: string): boolean {
  const lower = normalizeIntentText(text);

  if (hasSelfDateBookingIntent(lower) && !hasThirdPartyBookingSignals(lower)) {
    return false;
  }
  if (/^para\s+(manana|hoy)\b/.test(lower)) return false;

  return hasThirdPartyBookingSignals(lower);
}

/**
 * Haiku-primero: solo señales claras de multi/terceros abren el flujo party.
 * Si tras quitar esa fraseología queda precio/promo/servicio/pregunta real
 * ("somos 2, ¿cuánto el lifting?") → no mostly → Haiku antes de party.
 * Umbral `<= 2` como ubicación/horarios (Batch Haiku-primero).
 */
export function isMostlyPartyIntent(text: string): boolean {
  if (!matchesThirdPartyBookingIntent(text)) return false;
  const lower = normalizeIntentText(text);
  const stripped = lower
    .replace(/\bpara\s+las\s+dos\s+personas\b/gi, " ")
    .replace(/\bpara\s+ambas\s+personas\b/gi, " ")
    .replace(/\bpara\s+(2|dos)\s+personas\b/gi, " ")
    .replace(/\bpara\s+mi\s+(amiga|amigo|hermana|mama|papa|hija|hijo)\b/gi, " ")
    .replace(/\bpara\s+otra\s+persona(\s+mas)?\b/gi, " ")
    .replace(/\botra\s+persona\s+mas\b/gi, " ")
    .replace(/\bpara\s+alguien\s+mas\b/gi, " ")
    .replace(/\b(agendar|cita|reservar|separar)\s+para\s+otra\b/gi, " ")
    .replace(/\bnecesito\s+separar\b/gi, " ")
    .replace(/\ba\s+nombre\s+de\b/gi, " ")
    .replace(/\bsomos\s+(2|dos)\b/gi, " ")
    .replace(/\b(2|dos)\s+personas\b/gi, " ")
    .replace(/\bvamos\s+juntas?\b/gi, " ")
    .replace(/\bcon\s+mi\s+(amiga|hermana|mama|hija)\b/gi, " ")
    .replace(/\bse\s+llama\b/gi, " ")
    .replace(/\bpara\s+(2|dos)\b/gi, " ")
    .replace(/\bpersonas?\b/gi, " ")
    .replace(
      /\b(agendar|agenda|reservar|reserva|cita|separar|quiero|necesito|deseo|puedes|me|ya|una|un|el|la|los|las|de|para|mas|m[aá]s|por\s+favor|gracias|hola|buenas?)\b/gi,
      " ",
    )
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Residuo con precio/promo/servicio → mixto aunque sea corto
  if (
    /\b(cu[aá]nto|precio|precios|costo|cuesta|vale|promo|promoci[oó]n|descuento|oferta|pack|lifting|pesta[nñ]as|cejas|u[nñ]as|extensiones|manicure|gel)\b/i
      .test(
        stripped,
      )
  ) {
    return false;
  }
  return stripped.length <= 2;
}

export function matchesCartTotalQuestion(lower: string): boolean {
  return [
    "cuánto sería",
    "cuanto seria",
    "cuánto es el total",
    "cuanto es el total",
    "total de mis",
    "cuánto llevo",
    "cuanto llevo",
    "cuánto debo",
    "cuanto debo",
  ].some((k) => lower.includes(k));
}

const CART_INSPECT_NAV_PHRASES = [
  "ver selección",
  "ver mi selección",
  "ver seleccion",
  "ver mi seleccion",
  "mi selección",
  "mi seleccion",
];

/**
 * Plan 13-sep "Haiku-primero informativo", Batch 3: "qué tengo en mi
 * selección" / "ver mi selección" genéricos siguen el dump estático del
 * carrito; si tras quitar esa fraseología queda una pregunta real
 * ("cuánto sería el total si le agrego lifting") → Haiku antes del resumen.
 */
export function isMostlyCartInspectQuestion(lower: string): boolean {
  const hitsCart = matchesCartSelectionQuestion(lower) ||
    matchesCartTotalQuestion(lower) ||
    CART_INSPECT_NAV_PHRASES.some((k) => lower.includes(k));
  if (!hitsCart) return false;
  const stripped = lower
    .replace(/\bquedarme\s+con\s+mi\s+selecci[oó]n\b/gi, " ")
    .replace(/\bver\s+(mi\s+)?selecci[oó]n\b/gi, " ")
    .replace(/\bcu[aá]l\s+es\s+el\s+servicio\s+que\b/gi, " ")
    .replace(/\bcu[aá]les\s+servicios\s+tengo\b/gi, " ")
    .replace(/\bqu[eé]\s+servicio\s+tengo\b/gi, " ")
    .replace(/\bqu[eé]\s+tengo\s+en\b/gi, " ")
    .replace(/\bqu[eé]\s+llevo\b/gi, " ")
    .replace(/\bmis\s+servicios\b/gi, " ")
    .replace(/\bcu[aá]nto\s+es\s+el\s+total\b/gi, " ")
    .replace(/\bcu[aá]nto\s+ser[ií]a\b/gi, " ")
    .replace(/\btotal\s+de\s+mis\b/gi, " ")
    .replace(/\bcu[aá]nto\s+llevo\b/gi, " ")
    .replace(/\bcu[aá]nto\s+debo\b/gi, " ")
    .replace(/\bseleccion[eé]?\b/gi, " ")
    .replace(/\beleg[ií]\b/gi, " ")
    .replace(/\bmi\s+selecci[oó]n\b/gi, " ")
    .replace(/\bselecci[oó]n\b/gi, " ")
    .replace(/\btotal\b/gi, " ")
    .replace(/\bcarrito\b/gi, " ")
    .replace(
      /\b(qu[eé]|cu[aá]l|cu[aá]les|es|la|el|los|las|de|un|una|me|puedes|decir|dar|pasar|indicar|tengo|en|mi|mis)\b/gi,
      " ",
    )
    .replace(/\bpor\s+favor\b/gi, " ")
    .replace(/\bgracias\b/gi, " ")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length <= 8;
}

/** Queja o corrección del carrito (no es despedida ni hora). */
export function matchesCartCorrectionIntent(lower: string): boolean {
  const folded = lower.normalize("NFD").replace(/\p{M}/gu, "");
  // Dubraska …0467 (28-sep, análisis 29-sep): "sacar cita" no es quitar un
  // servicio. El "sacar" suelto abría el menú de carrito y Haiku no veía el
  // turno (Batch 4). "sacar el/la lifting" sigue siendo corrección.
  if (/\bsacar\s+(una\s+|la\s+|mi\s+)?(cita|turno|hora|cupo)\b/.test(folded)) {
    return false;
  }
  return [
    "me equivoqu",
    "equivoqu",
    "me faltó",
    "me falto",
    "faltó un servicio",
    "falto un servicio",
    "no era ese",
    "no es ese servicio",
    "quiero otro servicio",
    "cambiar servicio",
    // Quitar/posponer un servicio del carrito
    "quitar",
    "sacar el ",
    "sacar la ",
    "sacar los ",
    "sacar las ",
    "sacalo",
    "sácalo",
    "sin el",
    "sin la",
    "no el lifting",
    "no la lifting",
    "otro día el",
    "otro dia el",
    "otro día me hago",
    "otro dia me hago",
    "déjalo para después",
    "dejalo para despues",
    "después el",
    "despues el",
    "solo las uñas",
    "solo las manos",
    "solo el manicure",
    "solo el pedicure",
    "sin uñas",
    "modificar",
  ].some((k) => lower.includes(k));
}

export function matchesHorariosAvailabilityQuery(lower: string): boolean {
  const hasHorario = lower.includes("horario") ||
    lower.includes("disponib") ||
    lower.includes("disponible") ||
    lower.includes("cupo");
  const hasDay = [
    "lunes",
    "martes",
    "miércoles",
    "miercoles",
    "jueves",
    "viernes",
    "sábado",
    "sabado",
    "domingo",
    "hoy",
    "mañana",
    "manana",
  ].some((d) => lower.includes(d));
  return hasHorario && hasDay;
}

/**
 * Plan 13-sep "Haiku-primero informativo", Batch 2: "horario domingo" es
 * genérico (texto estático de siempre alcanza); "horario domingo tienen
 * cita para lifting de pestañas" trae una pregunta real detrás del día
 * mencionado — vale intentar Haiku antes del texto estático.
 */
export function isMostlyHorariosAvailabilityQuestion(lower: string): boolean {
  if (!matchesHorariosAvailabilityQuery(lower)) return false;
  const stripped = lower
    .replace(/\bhorarios?\b/gi, " ")
    .replace(/\bdisponib\w*\b/gi, " ")
    .replace(/\bcupos?\b/gi, " ")
    .replace(
      /\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo|hoy|ma[ñn]ana)\b/gi,
      " ",
    )
    .replace(
      /\b(qu[eé]|cu[aá]l|tienen|hay|para|el|la|los|las|de|un|una|me|puedes|dar|decir|ustedes|atienden)\b/gi,
      " ",
    )
    .replace(/\bpor\s+favor\b/gi, " ")
    .replace(/\bgracias\b/gi, " ")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length <= 2;
}

/** Parsea hora y minutos en texto libre (variantes comunes en WhatsApp). */
export function parseTimeSlot(
  text: string,
): { hour: number; minute: number } | null {
  const t = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (t === "mediodia" || t.includes("mediodia")) {
    return { hour: 12, minute: 0 };
  }

  // Minutos: ":" (estándar), "," / "." (PE/WhatsApp: "3,30", "3.30")
  const ampm = t.match(/\b(\d{1,2})(?:[:.,](\d{2}))?\s*(am|pm)\b/);
  if (ampm) {
    let h = parseInt(ampm[1], 10);
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0;
    const period = ampm[3];
    if (period === "pm" && h !== 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return { hour: h, minute: m };
    return null;
  }

  const ampmCompact = t.match(/\b(\d{1,2})(am|pm)\b/);
  if (ampmCompact) {
    let h = parseInt(ampmCompact[1], 10);
    const period = ampmCompact[2];
    if (period === "pm" && h !== 12) h += 12;
    if (period === "am" && h === 12) h = 0;
    return h >= 0 && h <= 23 ? { hour: h, minute: 0 } : null;
  }

  const hhmm = t.match(/\b(\d{1,2})[:.,](\d{2})\b/);
  if (hhmm) {
    let h = parseInt(hhmm[1], 10);
    const m = parseInt(hhmm[2], 10);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      // Salón abre 10 AM–7 PM; "2:00" sin sufijo solo puede ser 2 PM en este contexto.
      if (h >= 1 && h <= 7) h += 12;
      return { hour: h, minute: m };
    }
  }

  const manana = t.match(
    /\b(\d{1,2})(?:[:.,](\d{2}))?\s*(?:de\s+la\s+)?ma[nñ]ana\b/,
  );
  if (manana) {
    const h = parseInt(manana[1], 10);
    const m = manana[2] ? parseInt(manana[2], 10) : 0;
    return h >= 1 && h <= 12 ? { hour: h, minute: m } : null;
  }

  const tarde = t.match(
    /\b(\d{1,2})(?:[:.,](\d{2}))?\s*(?:de\s+la\s+)?tarde\b/,
  );
  if (tarde) {
    let h = parseInt(tarde[1], 10);
    const m = tarde[2] ? parseInt(tarde[2], 10) : 0;
    if (h < 12) h += 12;
    return h >= 12 && h <= 19 ? { hour: h, minute: m } : null;
  }

  const noche = t.match(
    /\b(\d{1,2})(?:[:.,](\d{2}))?\s*(?:de\s+la\s+)?noche\b/,
  );
  if (noche) {
    let h = parseInt(noche[1], 10);
    const m = noche[2] ? parseInt(noche[2], 10) : 0;
    if (h < 12) h += 12;
    return h >= 18 && h <= 23 ? { hour: h, minute: m } : null;
  }

  const porFavor = t.match(/\b(\d{1,2})\s*(?:am|pm)?\s+por\s+favor\b/);
  if (porFavor) {
    let h = parseInt(porFavor[1], 10);
    if (h >= 1 && h <= 7) h += 12;
    return h >= 0 && h <= 23 ? { hour: h, minute: 0 } : null;
  }

  const alas = t.match(/(?:a\s+las?|las?)\s+(\d{1,2})(?:[:.,](\d{2}))?\b/);
  if (alas) {
    let h = parseInt(alas[1], 10);
    const m = alas[2] ? parseInt(alas[2], 10) : 0;
    if (h >= 1 && h <= 7) h += 12;
    return h >= 0 && h <= 23 ? { hour: h, minute: m } : null;
  }

  // Número suelto: "3" / "2:30" cortos sí; "tengo el mismo servicio 2 veces" no.
  const wordCount = t.split(/\s+/).filter(Boolean).length;
  if (/\b\d{1,2}\s+veces\b/.test(t) && !hasExplicitTime(text)) {
    return null;
  }
  const solo = t.match(/(?:^|\s)(\d{1,2})(?:[:.,](\d{2}))?(?:\s|$)/);
  if (solo) {
    if (wordCount > 4 && !hasExplicitTime(text)) return null;
    let h = parseInt(solo[1], 10);
    const m = solo[2] ? parseInt(solo[2], 10) : 0;
    if (h >= 1 && h <= 7) h += 12;
    return h >= 0 && h <= 23 ? { hour: h, minute: m } : null;
  }

  return null;
}

/**
 * Haiku-primero — solo cierra/elige hora si el mensaje ES una hora.
 * "3" / "a las 3" / "3 pm" / "3,30 me viene bien" → true.
 * "2 veces" / "la 3D" / "a las 4 y lifting" → false (Haiku).
 */
export function isMostlyTimeChoice(text: string): boolean {
  const t = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (!t) return false;
  if (/\b\d{1,2}\s*d\b/.test(t)) return false;
  if (/\b\d{1,2}\s+(veces|dias|minutos|horas|servicios)\b/.test(t)) {
    return false;
  }
  if (!parseTimeSlot(text) && !hasExplicitTime(text)) return false;
  const stripped = t
    .replace(/\b(?:al\s+)?medio\s*dias?\b/gi, " ")
    .replace(/\bmediodia\b/gi, " ")
    .replace(/\b\d{1,2}(?:[:.,]\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?\b/gi, " ")
    .replace(/\b(?:a\s+las?|las?)\b/gi, " ")
    .replace(/\bde\s+la\s+(?:manana|tarde|noche)\b/gi, " ")
    .replace(/\b(hoy|manana|pasado\s+manana)\b/gi, " ")
    .replace(
      /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/gi,
      " ",
    )
    .replace(
      /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\b/gi,
      " ",
    )
    .replace(/\b(este|esta|ese|esa|estos|estas|esos|esas|otro|otra)\b/gi, " ")
    .replace(/\b(dia|fecha|dias|hora|horario|horarios)\b/gi, " ")
    .replace(
      /\b(me\s+viene(\s+bien)?|me\s+queda(\s+bien)?|por\s+favor|gracias)\b/gi,
      " ",
    )
    .replace(
      /\b(ok|okay|dale|va|perfecto|listo|si|claro|quiero|mejor|entonces)\b/gi,
      " ",
    )
    .replace(/\b(el|la|los|las|un|una|de|a|en|me|te|bien|para|hoy)\b/gi, " ")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length <= 2;
}

/** Parsea hora en texto libre (solo hora, minutos 0). */
export function parseTimeText(text: string): number | null {
  return parseTimeSlot(text)?.hour ?? null;
}

export function getLimaHourFromDate(d: Date): number {
  return parseInt(
    d.toLocaleString("en-US", {
      timeZone: "America/Lima",
      hour: "numeric",
      hour12: false,
    }),
    10,
  );
}

export function getLimaMinuteFromDate(d: Date): number {
  return parseInt(
    d.toLocaleString("en-US", {
      timeZone: "America/Lima",
      minute: "numeric",
    }),
    10,
  );
}

export function getLimaDayOfWeek(d: Date): number {
  const wd = d.toLocaleString("en-US", {
    timeZone: "America/Lima",
    weekday: "short",
  });
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[wd] ?? 1;
}

export function isValidSalonHour(hourLima: number, dayOfWeek: number): boolean {
  return getSalonTimeSlots(dayOfWeek).some((s) => s.hour === hourLima);
}

export { isValidSalonSlot };

/** Horario de apertura (sin filtrar cupo) — preferir formatAvailableHours en copy a clienta. */
export function formatSuggestedHours(
  dayOfWeek: number,
  dateKey?: string,
): string {
  return getSalonTimeSlots(dayOfWeek, dateKey)
    .map(({ hour, minute }) => formatHour12(hour, minute))
    .join(" · ");
}

function dayOfWeekFromDateKey(dateKey: string): number {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!, 12)).getUTCDay();
}

export function limaDateKeyAndTimeToUtc(
  dateKey: string,
  hour: number,
  minute: number,
): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!m) return null;
  return new Date(
    Date.UTC(
      Number(m[1]),
      Number(m[2]) - 1,
      Number(m[3]),
      hour + LIMA_UTC_OFFSET_HOURS,
      minute,
      0,
    ),
  );
}

export function dateKeyFromAppointmentDate(dateStr: string): string | null {
  const raw = String(dateStr ?? "");
  const head = raw.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) return head;
  const d = parseLimaLocalToDate(raw);
  return d ? getDateKeyLima(d) : null;
}

/**
 * Solo slots con cupo libre según `cap` (1 normal / 2 especial) + carriles
 * extensiones / filtro tarde Karelis cuando hay `catalog` + `serviceIds`.
 */
export async function formatAvailableHours(
  supabase: SupabaseClient,
  dateKey: string,
  durationMinutes: number,
  excludeAppointmentId?: string,
  cap: number = 1,
  catalog?: ServiceCatalog,
  serviceIds: string[] = [],
): Promise<string> {
  if (isSalonClosed(dateKey)) return "cerrado ese día";
  const dayOfWeek = dayOfWeekFromDateKey(dateKey);
  const slots = getSalonTimeSlots(dayOfWeek, dateKey);
  const freeSlots: { hour: number; minute: number }[] = [];
  const now = Date.now();
  for (const { hour, minute } of slots) {
    const slotDate = limaDateKeyAndTimeToUtc(dateKey, hour, minute);
    if (!slotDate || slotDate.getTime() <= now) continue;
    let ok: boolean;
    if (catalog) {
      ok = await hasSlotCapacityForServices(
        supabase,
        catalog,
        slotDate,
        durationMinutes,
        serviceIds,
        cap,
        excludeAppointmentId,
      );
    } else {
      const overlaps = await countOverlappingAppointments(
        supabase,
        slotDate,
        durationMinutes,
        excludeAppointmentId,
      );
      ok = overlaps < cap;
    }
    if (ok) freeSlots.push({ hour, minute });
  }
  const shown = collapseSlotsToClientHours(freeSlots);
  if (shown.length === 0) {
    return "ninguno libre ese día — escríbenos al 📱 932 535 512";
  }
  return shown.map((s) => formatHourCompact(s.hour, s.minute)).join(", ");
}

export function formatHoursHint(dateKey?: string, dayOfWeek?: number): string {
  if (dateKey) {
    if (isSalonClosed(dateKey)) {
      return isZmMallClosed(dateKey)
        ? "Cerrado — el CC no abre ese día"
        : "Cerrado ese día";
    }
    if (isPeruHoliday(dateKey)) {
      return "Feriado: 10 AM – 12 PM";
    }
    if (isSunday(dateKey)) {
      return "Dom: 10:30 AM – 1 PM (adelanto 20%)";
    }
  }
  if (dayOfWeek === 0) return "Dom: 10:30 AM – 1 PM (adelanto 20%)";
  return "L-S: 10 AM – 6 PM";
}

export function formatHour12(hour24: number, minute = 0): string {
  const h12 = hour24 > 12 ? hour24 - 12 : hour24 === 0 ? 12 : hour24;
  const period = hour24 >= 12 ? "PM" : "AM";
  if (minute === 0) return `${h12}:00 ${period}`;
  return `${h12}:${String(minute).padStart(2, "0")} ${period}`;
}

export function getSessionSelectedDay(
  session: Record<string, unknown> | null | undefined,
): string | null {
  if (!session) return null;
  const day = session.selected_day ?? session.selected_date;
  return typeof day === "string" && day.length > 0 ? day : null;
}

/**
 * Un día guardado en sesión que ya pasó no es un pedido de la clienta.
 * Melisa …9414 (27-sep): Agendar en el reenganche reabrió el 21 de agosto,
 * el día de su cita anterior, y dijo que no había cupo.
 */
export function stickyDayIfBookable(
  stickyDay: string | null,
  opts: { fromMessage: boolean; todayKey: string },
): string | null {
  if (!stickyDay) return null;
  if (!opts.fromMessage && stickyDay < opts.todayKey) return null;
  return stickyDay;
}

/** Intención de calendario en texto (última fecha gana — Pati 15→14). */
export type DateIntent = {
  dateKey: string;
  hasTime: boolean;
  bookingDate: Date | null;
};

const MONTH_OR_WEEKDAY_DATE_RE =
  /(\d{1,2})\s+(?:de\s+)?(ene|enero|feb|febrero|mar|marzo|abr|abril|may|mayo|jun|junio|jul|julio|ago|agosto|sep|sept|septiembre|oct|octubre|nov|noviembre|dic|diciembre)\b|(?:en\s+)?(ene|enero|feb|febrero|mar|marzo|abr|abril|may|mayo|jun|junio|jul|julio|ago|agosto|sep|sept|septiembre|oct|octubre|nov|noviembre|dic|diciembre)\s+(?:el\s+)?(\d{1,2})\b|(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\s+(\d{1,2})\b|\b(hoy(?:\s+d[ií]a)?|mañana|manana|pasado\s+mañana|pasado\s+manana)\b|^(?:el\s+)?(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)[!?.…]*$/i;

/** True si el texto nombra un día de calendario (no solo "2pm"). */
export function messageMentionsCalendarDate(texto: string): boolean {
  const t = texto.trim();
  if (!t) return false;
  if (parseDateOnlyKey(t)) return true;
  return MONTH_OR_WEEKDAY_DATE_RE.test(t);
}

/** True si pregunta si ese día existe/atienden, no si lo elige. */
export function matchesDateAvailabilityQuestion(text: string): boolean {
  const raw = text.trim();
  if (!raw) return false;
  const t = raw.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const asks = /\bno\s+veo\b/.test(t) ||
    /\bno\s+(trabajan|abren|atienden)\b/.test(t) ||
    /\b(trabajan|abren|atienden)\s+(el\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/
      .test(
        t,
      ) ||
    (/\?/.test(raw) &&
      /\b(trabajan|abren|atienden|disponible|disponib\w*|cupos?|en\s+la\s+lista|hay\s+espacio|hay\s+cupo)\b/
        .test(
          t,
        ));
  if (!asks) return false;
  return (
    messageMentionsCalendarDate(raw) ||
    /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/.test(t)
  );
}

/**
 * Extrae la última fecha/hora explícita del mensaje.
 * Hora suelta sin día de calendario → null (no pisa selected_day).
 */
export function extractDateIntentFromText(
  texto: string,
  refDate?: Date,
): DateIntent | null {
  const t = texto.trim();
  if (!t) return null;

  const dateOnly = parseDateOnlyKey(t, refDate);
  if (dateOnly) {
    return { dateKey: dateOnly, hasTime: false, bookingDate: null };
  }

  if (!messageMentionsCalendarDate(t)) return null;

  const full = parseDatetimeES(t, refDate);
  if (!full) return null;

  const dateKey = getDateKeyLima(full.date);
  const withTime = hasExplicitTime(t);
  return {
    dateKey,
    hasTime: withTime,
    bookingDate: withTime ? full.date : null,
  };
}

/**
 * Haiku-primero — no pegar selected_day por un "Hoy" embebido en un anuncio.
 * "el sábado" / "mañana" sueltos sí; "Hoy ¡Hola! quiero un estilo" no.
 */
export function isMostlyDateChoice(text: string): boolean {
  if (matchesDateAvailabilityQuestion(text)) return false;
  const intent = extractDateIntentFromText(text);
  if (!intent) return false;
  const t = text
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const stripped = t
    .replace(/\b(hoy|manana|pasado\s+manana)\b/gi, " ")
    .replace(
      /\b(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/gi,
      " ",
    )
    .replace(
      /\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\b/gi,
      " ",
    )
    .replace(/\b(este|esta|ese|esa|estos|estas|esos|esas|otro|otra)\b/gi, " ")
    .replace(/\b\d{1,2}(?:[:.,]\d{2})?\s*(?:am|pm)?\b/gi, " ")
    .replace(/\b(?:a\s+las?|las?)\b/gi, " ")
    .replace(/\b(dia|fecha|dias)\b/gi, " ")
    .replace(
      /\b(el|la|los|las|de|para|un|una|en|a|me|te|quiero|mejor|por\s+favor|gracias|ok|dale|si)\b/gi,
      " ",
    )
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length <= 2;
}

/** Corrección / indecisión de fecha (mejor el 14, prefiero viernes…). */
export function matchesDateCorrectionIntent(text: string): boolean {
  const t = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!t.trim()) return false;
  if (matchesServiceChangeIntent(text) && !messageMentionsCalendarDate(text)) {
    return false;
  }
  return (
    /\b(mejor|prefiero|preferiria|preferiría|cambia|cambiar|en realidad|en vez|en lugar|otra fecha|reprogram|pasame al|pásame al|mueve|muéve|movamos|dejalo para|déjalo para)\b/
      .test(
        t,
      ) ||
    /\bno\s+(el|la|al)\s+\d{1,2}\b/.test(t) ||
    // "no domingo", "no es sábado", "mañana es sábado no domingo" (Angie 14/15-ago)
    /\bno\s+(es\s+)?(lunes|martes|miercoles|jueves|viernes|sabado|domingo)\b/
      .test(
        t,
      )
  );
}

/**
 * Soft reprogramar cita ya confirmada sin menú *Mi cita*.
 * Fecha+hora, día con señal de cambio, o hora suelta ("10 am") con día sticky/cita.
 */
export function matchesSoftRescheduleIntent(text: string): boolean {
  const t = text.trim();
  // "10" / "10 am" / "10:30" ANTES de extract — si no, "10" se lee como día 10 del mes
  if (
    /^\d{1,2}(?:[:.,]\d{2})?\s*(?:am|pm|a\.?\s*m\.?|p\.?\s*m\.?)?$/i.test(t)
  ) {
    const slot = parseTimeSlot(t);
    if (!slot) return false;
    const bareNum = parseInt(t, 10);
    if (/^\d{1,2}$/.test(t) && bareNum >= 13 && bareNum <= 31) return false;
    if (hasExplicitTime(t)) return true;
    return slot.hour >= 10 && slot.hour <= 19;
  }

  const intent = extractDateIntentFromText(text);
  if (intent?.hasTime) return true;
  // Solo día: exigir corrección ("mejor el…") o relativo corto — no cualquier mención
  if (intent && !intent.hasTime) {
    if (/^(mañana|manana|hoy|pasado\s+mañana|pasado\s+manana)$/i.test(t)) {
      return true;
    }
    return matchesDateCorrectionIntent(text);
  }

  const slot = parseTimeSlot(text);
  if (!slot) return false;
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words > 5) return false;
  return hasExplicitTime(t);
}

/**
 * Persiste selected_day aunque aún no haya carrito (sticky mid-flujo).
 * Retorna el intent si se guardó.
 */
export async function stickySelectedDayFromText(
  supabase: SupabaseClient,
  phoneNumber: string,
  messageText: string,
  session?: {
    selected_day?: string | null;
    selected_date?: string | null;
  } | null,
): Promise<DateIntent | null> {
  const intent = extractDateIntentFromText(messageText);
  if (!intent) return null;
  if (!intent.hasTime && !isMostlyDateChoice(messageText)) return null;
  const prev = getSessionSelectedDay(
    (session ?? {}) as Record<string, unknown>,
  );
  if (prev === intent.dateKey && !intent.hasTime) return intent;
  await upsertSession(supabase, phoneNumber, {
    selected_day: intent.dateKey,
  });
  return intent;
}

/**
 * Tras carrito: si hay selected_day (o fecha en messageText) → hora;
 * si hay fecha+hora → cierra cita; si no → selector de días.
 */
export async function openBookingCalendarForCart(
  supabase: SupabaseClient,
  phoneNumber: string,
  session: {
    cartItems?: unknown[];
    serviceIds?: string[];
    selected_day?: string | null;
    selected_date?: string | null;
    reschedule_appointment_id?: string | null;
  } | null,
  catalog: ServiceCatalog,
  opts?: {
    messageText?: string;
    rescheduleAppointmentId?: string | null;
    summaryPrefix?: string;
  },
): Promise<boolean> {
  if (!sessionHasCart(session)) return false;

  const rescheduleId = opts?.rescheduleAppointmentId ??
    session?.reschedule_appointment_id ?? null;

  // Última fecha del mensaje gana sobre sticky previo
  const fromMsg = opts?.messageText
    ? extractDateIntentFromText(opts.messageText)
    : null;
  const todayKey = getDateKeyLima(new Date());
  const rawSticky = fromMsg?.dateKey ??
    getSessionSelectedDay(session as Record<string, unknown>);
  const stickyDay = stickyDayIfBookable(rawSticky, {
    fromMessage: Boolean(fromMsg?.dateKey),
    todayKey,
  });
  if (rawSticky && !stickyDay) {
    await upsertSession(supabase, phoneNumber, { selected_day: null });
  }

  if (fromMsg?.hasTime && fromMsg.bookingDate && !rescheduleId) {
    await upsertSession(supabase, phoneNumber, {
      step: "awaiting_datetime",
      selected_day: fromMsg.dateKey,
      reschedule_appointment_id: null,
      employee_assignments: JSON.stringify({}),
    });
    const sess = {
      ...session,
      step: "awaiting_datetime",
      selected_day: fromMsg.dateKey,
    };
    return await tryCompleteBookingFromText(
      supabase,
      phoneNumber,
      opts!.messageText!,
      sess,
      catalog,
    );
  }

  // Día ya fijado (sticky) + hora dada en este mismo mensaje sin fecha
  // ("a las 5 pm" tras ver cupos de hoy): usar esa hora, no re-preguntarla.
  // SAM, 7-oct: Haiku prometió «5 PM, dame un momento» y el bot reabrió la lista.
  if (stickyDay && !fromMsg && !rescheduleId && opts?.messageText) {
    const slot = parseTimeSlot(opts.messageText);
    if (slot && hasExplicitTime(opts.messageText)) {
      await upsertSession(supabase, phoneNumber, {
        step: "awaiting_datetime",
        selected_day: stickyDay,
        reschedule_appointment_id: null,
        employee_assignments: JSON.stringify({}),
      });
      const done = await tryCompleteBookingFromText(
        supabase,
        phoneNumber,
        `${slot.hour}:${String(slot.minute).padStart(2, "0")}`,
        { ...session, step: "awaiting_datetime", selected_day: stickyDay },
        catalog,
      );
      if (done) return true;
    }
  }

  if (stickyDay) {
    await upsertSession(supabase, phoneNumber, {
      step: "awaiting_datetime",
      selected_day: stickyDay,
      reschedule_appointment_id: rescheduleId ?? null,
      employee_assignments: JSON.stringify({}),
    });
    const empIds = await getEmployeeIdsForSession(
      supabase,
      session ?? { serviceIds: [] },
      catalog,
    );
    const serviceIds = session?.serviceIds ?? [];
    const validSvcs = serviceIds
      .map((id) => catalog.servicesById.get(id))
      .filter(Boolean) as { duration?: number }[];
    const totalDuration = validSvcs.reduce((a, s) => a + (s.duration ?? 60), 0);
    const cap = overlapCapForCart(serviceIds, catalog);
    const prefix = opts?.summaryPrefix?.trim();
    const sent = await sendTimeSelector(
      phoneNumber,
      supabase,
      stickyDay,
      empIds,
      totalDuration,
      cap,
      1,
      catalog,
      serviceIds,
      {
        introMessage: prefix
          ? `${prefix}\n\n📅 ¿A qué hora te viene mejor ese día?`
          : "Perfecto 📅 ¿A qué hora te viene mejor ese día?",
      },
    );
    if (sent) return true;
    await upsertSession(supabase, phoneNumber, { selected_day: null });
  }

  return false;
}

export function isSessionStale(
  session: { updated_at?: string | null } | null,
): boolean {
  if (!session?.updated_at) return false;
  const updatedMs = new Date(session.updated_at).getTime();
  return Date.now() - updatedMs > STALE_SESSION_MS;
}

export async function getEmployeeIdsForSession(
  supabase: SupabaseClient,
  session: { serviceIds?: string[] },
  catalog: ServiceCatalog,
): Promise<string[]> {
  const serviceIds = session.serviceIds ?? [];
  const possibleEmpIds = new Set<string>();
  for (const id of serviceIds) {
    const svc = catalog.servicesById.get(id);
    const catId = svc?.category_id ?? "";
    const allowed = getEmployeeCategories()[catId];
    if (allowed) allowed.forEach((eid) => possibleEmpIds.add(eid));
  }
  if (possibleEmpIds.size === 0) {
    const { data: allEmps } = await supabase
      .from("employees")
      .select("id")
      .eq("is_active", true);
    (allEmps ?? []).forEach((e: { id: string }) => possibleEmpIds.add(e.id));
  }
  return [...possibleEmpIds];
}

export async function resendDatetimeSelectors(
  phoneNumber: string,
  supabase: SupabaseClient,
  session: {
    serviceIds?: string[];
    selected_day?: string | null;
    selected_date?: string | null;
    employeeAssignments?: Record<string, string>;
  },
  catalog: ServiceCatalog,
  opts?: { debounce?: boolean; pageOffset?: number },
): Promise<void> {
  const empIds = await getEmployeeIdsForSession(supabase, session, catalog);
  const serviceIds = session.serviceIds ?? [];
  const validSvcs = serviceIds
    .map((id) => catalog.servicesById.get(id))
    .filter(Boolean) as { duration: number }[];
  const totalDuration = validSvcs.reduce((a, s) => a + s.duration, 0);
  const cap = overlapCapForCart(serviceIds, catalog);
  const selectedDate = getSessionSelectedDay(
    session as Record<string, unknown>,
  );
  const debounce = opts?.debounce !== false;

  // debounce: evita spam de lista tras Haiku en ráfagas ~8s (Yesenia P3).
  // No aplica a agendar_ya / carrito→calendario / nudges (callers sin opts).
  // Swap mid-agenda (Jessi): pasar { debounce: false } para forzar el selector.
  if (selectedDate) {
    const sent = await sendTimeSelector(
      phoneNumber,
      supabase,
      selectedDate,
      empIds,
      totalDuration,
      cap,
      1,
      catalog,
      serviceIds,
      { debounce, pageOffset: opts?.pageOffset },
    );
    // Si ese día ya no tiene cupo, limpiar selected_day: sin esto, cada
    // recordatorio posterior (mid-conversación, incluso ante preguntas sin
    // relación) repite el mismo "no hay horarios" en bucle sin ofrecer salida
    // (caso real Alberto VE …4665, 17-sep-2026 — 3 repeticiones seguidas).
    if (!sent) {
      await upsertSession(supabase, phoneNumber, { selected_day: null });
    }
    return;
  }

  await sendDateSelector(
    phoneNumber,
    supabase,
    empIds,
    totalDuration,
    cap,
    1,
    catalog,
    serviceIds,
    { debounce },
  );
}

/**
 * Parsea fecha/hora para cerrar agendado.
 * Última fecha en el mensaje gana sobre selected_day (Pati 15→14).
 * Si solo hay hora y selected_day, combina ese día + hora escrita.
 *
 * Importante: también con step `browsing` (no solo `awaiting_datetime`).
 * El gate P0 del dispatcher admite ambos steps; antes solo combinaba hora
 * suelta en awaiting_datetime — si algo reseteaba step→browsing dejando
 * selected_day, "12:30" fallaba en silencio (Alberto VE …0417, 17-sep-2026).
 */
export function parseBookingDatetimeFromMessage(
  messageText: string,
  session: Record<string, unknown> | null | undefined,
): Date | null {
  const intent = extractDateIntentFromText(messageText);
  if (intent?.hasTime && intent.bookingDate) {
    return intent.bookingDate;
  }

  const step = session?.step;
  const stepOk = !step || step === "awaiting_datetime" || step === "browsing";
  if (stepOk) {
    const selectedDay = intent?.dateKey ?? getSessionSelectedDay(session);
    const slot = parseTimeSlot(messageText);
    if (selectedDay && slot && isMostlyTimeChoice(messageText)) {
      const [y, mo, d] = selectedDay.split("-").map(Number);
      return new Date(
        Date.UTC(
          y,
          mo - 1,
          d,
          slot.hour + LIMA_UTC_OFFSET_HOURS,
          slot.minute,
          0,
        ),
      );
    }
  }
  return parseDatetimeES(messageText)?.date ?? null;
}

/** Cierra agendado cuando hay carrito + fecha/hora parseable en texto libre. */
export async function tryCompleteBookingFromText(
  supabase: SupabaseClient,
  phoneNumber: string,
  messageText: string,
  session: {
    cartItems?: unknown[];
    serviceIds?: string[];
    step?: string;
    reschedule_appointment_id?: string | null;
    selected_day?: string | null;
    selected_date?: string | null;
  } | null,
  catalog: ServiceCatalog,
): Promise<boolean> {
  if (!messageText.trim() || !sessionHasCart(session)) return false;
  if (
    session?.step &&
    session.step !== "browsing" &&
    session.step !== "awaiting_datetime"
  ) {
    return false;
  }
  if (session?.reschedule_appointment_id) return false;
  if (matchesDateAvailabilityQuestion(messageText)) return false;
  // "Estaré ahí a las 10" no es pedir cita: que decida Haiku (haiku-first).
  if (matchesAttendanceAffirmation(messageText)) return false;

  // Solo día (sin hora) → selected_day + lista de horas (última fecha gana)
  const dateIntent = extractDateIntentFromText(messageText);
  const dateOnlyKey = dateIntent && !dateIntent.hasTime
    ? dateIntent.dateKey
    : parseDateOnlyKey(messageText);
  if (dateOnlyKey && !isMostlyTimeChoice(messageText)) {
    if (isSalonClosed(dateOnlyKey)) {
      await sendMessage(phoneNumber, getSalonClosedMessage(dateOnlyKey));
      return true;
    }
    await upsertSession(supabase, phoneNumber, {
      step: "awaiting_datetime",
      selected_day: dateOnlyKey,
      reschedule_appointment_id: session?.reschedule_appointment_id ?? null,
    });
    const empIds = await getEmployeeIdsForSession(
      supabase,
      session ?? { serviceIds: [] },
      catalog,
    );
    const serviceIds = session?.serviceIds ?? [];
    const validSvcs = serviceIds
      .map((id) => catalog.servicesById.get(id))
      .filter(Boolean) as { duration?: number }[];
    const totalDuration = validSvcs.reduce((a, s) => a + (s.duration ?? 60), 0);
    const cap = overlapCapForCart(serviceIds, catalog);
    await sendTimeSelector(
      phoneNumber,
      supabase,
      dateOnlyKey,
      empIds,
      totalDuration,
      cap,
      1,
      catalog,
      serviceIds,
      {
        introMessage: "Perfecto 📅 ¿A qué hora te viene mejor ese día?",
      },
    );
    return true;
  }

  if (
    (parseTimeSlot(messageText) !== null || hasExplicitTime(messageText)) &&
    !isMostlyTimeChoice(messageText)
  ) {
    return false;
  }

  const bookingDate = parseBookingDatetimeFromMessage(
    messageText,
    session as Record<string, unknown>,
  );
  if (!bookingDate) {
    // Antes fallaba en silencio — sin esto no se veía por qué "12:30" no cerraba.
    const slot = parseTimeSlot(messageText);
    if (slot && isMostlyTimeChoice(messageText)) {
      console.log(
        "[WABA] tryCompleteBookingFromText: hora suelta sin día ancla",
        phoneNumber.slice(-4),
        {
          step: session?.step ?? null,
          selected_day: getSessionSelectedDay(
            session as Record<string, unknown>,
          ),
          text: messageText.slice(0, 40),
        },
      );
    }
    return false;
  }

  const hourLima = getLimaHourFromDate(bookingDate);
  const minuteLima = getLimaMinuteFromDate(bookingDate);
  const dayOfWeek = getLimaDayOfWeek(bookingDate);
  const dateKey = getDateKeyLima(bookingDate);
  if (isSalonClosed(dateKey)) {
    await sendMessage(phoneNumber, getSalonClosedMessage(dateKey));
    return true;
  }

  const serviceIds = session?.serviceIds ?? [];
  const validServices = serviceIds
    .map((id) => catalog.servicesById.get(id))
    .filter(Boolean) as { duration?: number }[];
  if (validServices.length === 0) return false;

  const totalDuration = validServices.reduce(
    (a, s) => a + (s.duration ?? 60),
    0,
  );
  const cap = overlapCapForCart(serviceIds, catalog);

  if (!isValidSalonSlot(hourLima, minuteLima, dayOfWeek, dateKey)) {
    const free = await formatAvailableHours(
      supabase,
      dateKey,
      totalDuration,
      undefined,
      cap,
      catalog,
      serviceIds,
    );
    await sendMessage(
      phoneNumber,
      `Ese horario (${
        formatHour12(hourLima, minuteLima)
      }) está fuera de nuestro horario 🕐\n\n` +
        `${formatHoursHint(dateKey, dayOfWeek)}\n\n` +
        `Horarios con cupo ese día: ${free}`,
    );
    // Retornar true: ya enviamos el error; el dispatcher no debe enviar un segundo mensaje.
    return true;
  }

  if (
    await shouldBlockAdditionalBooking(supabase, phoneNumber, {
      rescheduleAppointmentId: session?.reschedule_appointment_id,
    })
  ) {
    await sendMessage(phoneNumber, ADDITIONAL_BOOKING_BLOCK_MESSAGE);
    return true;
  }

  if (
    await newBookingOverlapsExisting(
      supabase,
      phoneNumber,
      bookingDate,
      totalDuration,
    )
  ) {
    await sendMessage(phoneNumber, BOOKING_OVERLAP_MESSAGE);
    return true;
  }

  // Capacidad: tope especial Vanessa y/o carriles Stephani/Karelis.
  if (
    !(await hasSlotCapacityForServices(
      supabase,
      catalog,
      bookingDate,
      totalDuration,
      serviceIds,
      cap,
    ))
  ) {
    const free = await formatAvailableHours(
      supabase,
      dateKey,
      totalDuration,
      undefined,
      cap,
      catalog,
      serviceIds,
    );
    await sendMessage(
      phoneNumber,
      `Horarios con cupo ese día: ${free}\n\nElige uno de los botones de abajo 👇`,
    );
    return true;
  }

  await finalizeBookingAfterDatetimeSelection(
    supabase,
    phoneNumber,
    bookingDate,
    dateKey,
  );
  return true;
}

/**
 * Pregunta por una hora puntual dentro del día ya elegido ("¿tienen las 5?",
 * "¿Horario de las 5 tiene?") — no es una confirmación (por eso
 * `tryCompleteBookingFromText` la descarta en isMostlyTimeChoice), pero
 * tampoco debe quedar en manos de Haiku: sin acción real de seguimiento,
 * Haiku solo puede prometer "dame un momento" y ahí se cuelga (caso Valeria
 * …9022, 23-sep-2026 — preguntó por las 5 PM del viernes ya elegido y nunca
 * llegó respuesta real). Chequea la disponibilidad real de esa hora puntual
 * y responde de una vez, sin agendar todavía (la clienta debe confirmar).
 */
export async function tryAnswerSpecificHourAvailability(
  supabase: SupabaseClient,
  phoneNumber: string,
  messageText: string,
  session: {
    cartItems?: unknown[];
    serviceIds?: string[];
    step?: string;
    selected_day?: string | null;
    selected_date?: string | null;
    reschedule_appointment_id?: string | null;
  } | null,
  catalog: ServiceCatalog,
): Promise<boolean> {
  if (!messageText.trim() || !sessionHasCart(session)) return false;
  if (session?.step !== "awaiting_datetime") return false;
  if (session?.reschedule_appointment_id) return false;
  if (
    !/\b(tienen?|hay|queda[n]?|libre|disponible|dispo)\b/i.test(messageText)
  ) {
    return false;
  }

  const slot = parseTimeSlot(messageText);
  if (!slot) return false;

  const dateKey = getSessionSelectedDay(session as Record<string, unknown>);
  if (!dateKey) return false;
  if (isSalonClosed(dateKey)) return false;

  const serviceIds = session?.serviceIds ?? [];
  const validServices = serviceIds
    .map((id) => catalog.servicesById.get(id))
    .filter(Boolean) as { duration?: number }[];
  if (validServices.length === 0) return false;

  const totalDuration = validServices.reduce(
    (a, s) => a + (s.duration ?? 60),
    0,
  );
  const cap = overlapCapForCart(serviceIds, catalog);

  const [y, mo, d] = dateKey.split("-").map(Number);
  const slotDate = new Date(
    Date.UTC(y, mo - 1, d, slot.hour + LIMA_UTC_OFFSET_HOURS, slot.minute, 0),
  );
  const dayOfWeek = getLimaDayOfWeek(slotDate);

  if (!isValidSalonSlot(slot.hour, slot.minute, dayOfWeek, dateKey)) {
    const free = await formatAvailableHours(
      supabase,
      dateKey,
      totalDuration,
      undefined,
      cap,
      catalog,
      serviceIds,
    );
    await sendMessage(
      phoneNumber,
      `Ese horario (${
        formatHour12(slot.hour, slot.minute)
      }) está fuera de nuestro horario 🕐\n\n` +
        `${formatHoursHint(dateKey, dayOfWeek)}\n\n` +
        `Horarios con cupo ese día: ${free}`,
    );
    return true;
  }

  const isFree = await hasSlotCapacityForServices(
    supabase,
    catalog,
    slotDate,
    totalDuration,
    serviceIds,
    cap,
  );

  const hourLabel = formatHour12(slot.hour, slot.minute);
  if (isFree) {
    await sendMessage(
      phoneNumber,
      `Sí, tenemos las ${hourLabel} libres 💜 ¿Te confirmo tu cita a esa hora?`,
    );
  } else {
    const free = await formatAvailableHours(
      supabase,
      dateKey,
      totalDuration,
      undefined,
      cap,
      catalog,
      serviceIds,
    );
    await sendMessage(
      phoneNumber,
      `Las ${hourLabel} ya no están libres 🙏\n\nHorarios con cupo ese día: ${free}`,
    );
  }
  return true;
}

/** Convierte hora parseada + día seleccionado en flujo awaiting_datetime. */
export function buildTimeInputFromParsedHour(
  selectedDay: string,
  parsedHour: number,
  parsedMinute = 0,
): string {
  return `${WA_IDS.TIME_PREFIX}${selectedDay}T${
    parsedHour.toString().padStart(2, "0")
  }${parsedMinute.toString().padStart(2, "0")}`;
}

/**
 * 1 cita scheduled + texto con nueva fecha/hora → UPDATE sin menú *Mi cita*.
 * Con hora: cierra al toque. Solo día: abre selector de hora.
 * Hora suelta ("10 am") usa selected_day o el día de la cita (Pati 13-ago).
 */
export async function trySoftRescheduleFromText(
  supabase: SupabaseClient,
  phoneNumber: string,
  messageText: string,
  catalog: ServiceCatalog,
): Promise<boolean> {
  if (!matchesSoftRescheduleIntent(messageText)) return false;
  // "Estaré ahí a las 10" confirma asistencia, no pide mover la cita (Nélida …6566).
  if (matchesAttendanceAffirmation(messageText)) return false;

  const sessNow = await getSession(supabase, phoneNumber);
  const pending = await getPendingAppointmentsForPhone(supabase, phoneNumber);
  if (pending.length !== 1) return false;

  // No interceptar mid-agendado NUEVO (carrito sin cita). Con cita scheduled,
  // el carrito residual no debe bloquear soft (Pati-E: cleanup/seed imperfecto).
  if (
    sessionHasCart(sessNow) &&
    (sessNow?.step === "browsing" ||
      sessNow?.step === "awaiting_datetime" ||
      !sessNow?.step)
  ) {
    // Permitir soft SOLO si el mensaje trae hora explícita (am/pm) — un
    // número suelto ("10") con carrito activo puede ser la hora de un
    // agendado NUEVO, no de la cita existente (mismo patrón que el bug
    // fantasma de Lili, PR #45: número corto + mensaje corto = riesgo).
    // Fix 14-ago (revisión PR #20): se retira el bypass de número suelto
    // sin am/pm; con am/pm explícito sigue funcionando igual (Pati-F).
    if (!hasExplicitTime(messageText)) {
      return false;
    }
  }
  // Servicio + fecha sin carrito → Haiku/add_to_cart, no pisar con soft reschedule
  if (
    /\b(lifting|pestañas|pestanas|extensiones|uñas|unas|cejas|depil|microblading|builder|soft\s*gel|rubber|retoque|laminado|manicure|pedicure|planchado|botox)\b/i
      .test(
        messageText,
      )
  ) {
    return false;
  }

  let intent = extractDateIntentFromText(messageText);

  // Unificar día + hora siempre que se puedan resolver (evita "Dale, ¿a qué hora?"
  // cuando el mensaje ya traía "a las 4pm" — Pati-E).
  {
    const slotAlways = parseTimeSlot(messageText);
    const dayForTime = intent?.dateKey ??
      (hasExplicitTime(messageText)
        ? dateKeyFromAppointmentDate(pending[0]!.date)
        : null) ??
      getSessionSelectedDay(sessNow as Record<string, unknown>) ??
      dateKeyFromAppointmentDate(pending[0]!.date);
    if (
      slotAlways &&
      dayForTime &&
      (hasExplicitTime(messageText) ||
        /^\d{1,2}([:.,]\d{2})?\s*(am|pm)?$/i.test(messageText.trim()))
    ) {
      const bookingDate = limaDateKeyAndTimeToUtc(
        dayForTime,
        slotAlways.hour,
        slotAlways.minute,
      );
      if (bookingDate) {
        intent = {
          dateKey: dayForTime,
          hasTime: true,
          bookingDate,
        };
      }
    }
  }

  // Hora suelta sin día aún → día de la cita (sticky solo si reprog. activa)
  if (!intent) {
    const slot = parseTimeSlot(messageText);
    if (!slot) return false;
    const inReschedule = Boolean(
      (sessNow as { reschedule_appointment_id?: string | null } | null)
        ?.reschedule_appointment_id,
    );
    const dayKey = inReschedule
      ? (getSessionSelectedDay(sessNow as Record<string, unknown>) ??
        dateKeyFromAppointmentDate(pending[0]!.date))
      : (dateKeyFromAppointmentDate(pending[0]!.date) ??
        getSessionSelectedDay(sessNow as Record<string, unknown>));
    if (!dayKey) return false;
    const bookingDate = limaDateKeyAndTimeToUtc(dayKey, slot.hour, slot.minute);
    if (!bookingDate) return false;
    intent = { dateKey: dayKey, hasTime: true, bookingDate };
  }

  if (isSalonClosed(intent.dateKey)) {
    await sendMessage(phoneNumber, getSalonClosedMessage(intent.dateKey));
    return true;
  }

  const appt = pending[0]!;
  const duration = appt.duration ?? 60;

  const { data: apptSvcRows } = await supabase
    .from("appointment_services")
    .select("service_id")
    .eq("appointment_id", appt.id);
  const apptServiceIds = [
    ...new Set(
      (apptSvcRows ?? []).map((r: { service_id: string }) => r.service_id),
    ),
  ];
  const cap = overlapCapForCart(apptServiceIds, catalog);

  if (intent.hasTime && intent.bookingDate) {
    // La hora pedida es la misma de su cita: no hay nada que mover ni chequeo
    // de cupo (Maribel …6295, 26-sep-2026: "Voy a las 10 entonces" con cita a
    // las 10:00 → "Horarios con cupo: ninguno libre").
    const currentApptDate = parseLimaLocalToDate(
      typeof appt.date === "string" ? appt.date : String(appt.date),
    );
    if (
      currentApptDate &&
      currentApptDate.getTime() === intent.bookingDate.getTime()
    ) {
      await sendMessage(
        phoneNumber,
        `Perfecto 💜 Tu cita sigue confirmada para el ${
          formatDateSpanish(currentApptDate)
        }. ¡Te esperamos!`,
      );
      return true;
    }
    const hourLima = getLimaHourFromDate(intent.bookingDate);
    const minuteLima = getLimaMinuteFromDate(intent.bookingDate);
    const dayOfWeek = getLimaDayOfWeek(intent.bookingDate);
    if (!isValidSalonSlot(hourLima, minuteLima, dayOfWeek, intent.dateKey)) {
      const free = await formatAvailableHours(
        supabase,
        intent.dateKey,
        duration,
        appt.id,
        cap,
        catalog,
        apptServiceIds,
      );
      await sendMessage(
        phoneNumber,
        `Ese horario (${
          formatHour12(hourLima, minuteLima)
        }) está fuera de nuestro horario 🕐\n\n` +
          `${formatHoursHint(intent.dateKey, dayOfWeek)}\n\n` +
          `Horarios con cupo ese día: ${free}`,
      );
      return true;
    }

    if (
      !(await hasSlotCapacityForServices(
        supabase,
        catalog,
        intent.bookingDate,
        duration,
        apptServiceIds,
        cap,
        appt.id,
      ))
    ) {
      const free = await formatAvailableHours(
        supabase,
        intent.dateKey,
        duration,
        appt.id,
        cap,
        catalog,
        apptServiceIds,
      );
      // Sin cupo alguno: no pedir "elige uno de los botones" (no hay botones) —
      // recordar que su cita sigue firme (Maribel …6295, 26-sep-2026).
      if (free.startsWith("ninguno libre")) {
        const keep = parseLimaLocalToDate(
          typeof appt.date === "string" ? appt.date : String(appt.date),
        );
        await sendMessage(
          phoneNumber,
          `Ese horario no está disponible por aquí 🙏 Tu cita sigue confirmada` +
            `${keep ? ` para el ${formatDateSpanish(keep)}` : ""}.\n\n` +
            `Si necesitas cambiarla, escríbenos al 📱 932 535 512 y el equipo te ayuda 💜`,
        );
        return true;
      }
      await sendMessage(
        phoneNumber,
        `Horarios con cupo ese día: ${free}\n\nElige uno de los botones de abajo 👇`,
      );
      return true;
    }

    await finalizeRescheduleAppointment(
      supabase,
      phoneNumber,
      appt.id,
      intent.bookingDate,
      catalog,
    );
    return true;
  }

  // Solo día → carrito de la cita + selected_day + pedir hora (sin lista 7 días)
  await startRescheduleFromAppointment(
    supabase,
    phoneNumber,
    appt.id,
    catalog,
    { selectedDay: intent.dateKey, skipDateSelector: true },
  );
  return true;
}
