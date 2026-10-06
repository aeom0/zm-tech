/**
 * Haiku-primero: no armar carrito en el mismo turno en que Haiku pregunta
 * y espera respuesta escrita. Si ella ya confirmó (sí / agéndame / día / hora),
 * el add_to_cart sigue y el calendario usa ese mensaje.
 */

import { hasExplicitTime, parseDateOnlyKey } from "../parse-datetime-es.ts";
import { isShortAffirmativeText } from "../handlers/menu-remap.ts";
import { matchesQuotedOfferConfirm } from "./pending-price-cta.ts";

/**
 * Haiku cerró con una pregunta que espera respuesta escrita
 * («¿Deseas agendar este pack? Solo dime qué día te funciona»).
 */
export function haikuTextInvitesWrittenReply(text: string): boolean {
  const t = text ?? "";
  return (
    /¿[^?¿]*\b(agend|reserv)[^?]*\?/i.test(t) ||
    /\bdime\s+qu[eé]\s+d[ií]a\b/i.test(t) ||
    /\bqu[eé]\s+d[ií]a\s+(te|le)\s+(funciona|queda|va|viene)\b/i.test(t)
  );
}

/** El mensaje de ella ya elige o confirma: no hay que esperar otro turno. */
export function clientMessageAlreadyCommitsBooking(text: string): boolean {
  const raw = (text ?? "").trim();
  if (!raw) return false;
  if (isShortAffirmativeText(raw)) return true;
  if (matchesQuotedOfferConfirm(raw)) return true;
  if (hasExplicitTime(raw)) return true;
  if (parseDateOnlyKey(raw)) return true;
  const t = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  return /\b(agendame|reservame|reservalo|anotame|me anoto)\b/.test(t);
}

/**
 * True → descartar add_to_cart de este turno.
 * False → ella ya dijo sí, agéndame, un día o una hora: el carrito sigue.
 */
export function shouldDeferHaikuAddToCart(
  haikuText: string,
  clientText: string,
): boolean {
  return (
    haikuTextInvitesWrittenReply(haikuText) &&
    !clientMessageAlreadyCommitsBooking(clientText)
  );
}
