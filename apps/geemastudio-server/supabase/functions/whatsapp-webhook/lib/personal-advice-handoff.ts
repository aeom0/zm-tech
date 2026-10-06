/**
 * Asesoría personalizada de mirada (Romy @romymorinaga, 26-sep): la clienta
 * describe su ojo/rostro y pide qué le queda — eso lo resuelven Vanessa o
 * Stephani viendo una foto, no el bot. Pausa el bot y pasa el chat al staff.
 *
 * NO dispara con "qué estilo me queda mejor" a secas: es el texto prellenado de
 * los anuncios CTWA y Haiku lo maneja bien (pregunta de calificación).
 */
import { srtaLabel } from "./client-address.ts";

const EYE_FACE_TRAIT =
  /\b(mi(s)?\s+(ojos?|mirada|rostro|cara|p[aá]rpados?)|forma\s+de\s+(mi(s)?\s+)?(ojos?|rostro|cara)|ojos?\s+(grandes?|peque[ñn]os?|chicos?|redondos?|rasgados?|almendrados?|ca[ií]dos?|hundidos?|separados?|juntos?|encapotados?)|p[aá]rpados?\s+(ca[ií]dos?|encapotados?))\b/i;

const LOOK_CONCERN =
  /\b(se\s+vea(n)?\s+(triste|cansad[ao]s?|rar[ao]s?|mal|ca[ií]d[ao]s?|pesad[ao]s?)|no\s+quiero\s+(que\s+)?(una\s+)?(mirada|ojos?)|qu[eé]\s+(me\s+)?(queda|favorece|va)\s+(mejor|m[aá]s)|recomi[eé]nd(a|e)me|me\s+recomiendas?|qu[eé]\s+me\s+recomiendas?)\b/i;

/** Rasgo de ojo/rostro + petición/preocupación (ambos), o "se vea triste/cansada". */
export function matchesPersonalAdviceIntent(lower: string): boolean {
  if (/\b(se\s+vea(n)?\s+(triste|cansad[ao]s?|rar[ao]s?))\b/i.test(lower)) {
    return true;
  }
  return EYE_FACE_TRAIT.test(lower) && LOOK_CONCERN.test(lower);
}

export function buildPersonalAdviceHandoffMessage(
  contactName: string | null | undefined,
): string {
  const srta = srtaLabel(contactName);
  const who = srta ? `${srta}, te` : "Te";
  return `${who} vamos a poner en contacto con una asesora personalizada 💜 Si deseas, puedes enviarnos una foto de tu rostro o de tus ojos para darte una recomendación a tu medida ✨`;
}
