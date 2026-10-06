/**
 * Guarda de código: Haiku no debe declarar una cita confirmada/reservada
 * sin respaldo real en `appointments` (caso Alberto VE …4665, 17-sep-2026).
 * Review PR #134: no falsear negaciones ("aún no está reservado").
 */

export const FABRICATED_BOOKING_PATTERNS: RegExp[] = [
  /\bcita\s+(qued[oó]|est[aá])\s+confirmad/i,
  /\bconfirmad[ao]\s+(tu|la)\s+cita/i,
  /\bqued[oó]\s+agendad/i,
  /\bte\s+agend[eé]\b/i,
  /¡?\s*listo!?\s*(,?\s*tu\s+cita|te\s+esperamos)/i,
  // No usar /\breservad[oa]\b/ solo: falsea "aún no está reservado" /
  // "para que quede reservada falta el abono" y descartaba confirm_booking.
  /\b(qued[oó]|está|esta|deja(?:mos)?|dej[eé])\s+reservad[oa]\b/i,
  /\bcita\s+reservad[oa]\b/i,
  /\bya\s+(?:está|esta|qued[oó])\s+reservad[oa]\b/i,
  /\bnos\s+vemos\s+el\s+\S+\s+a\s+las\b/i,
  /\bquedamos\s+a\s+las\b/i,
  /\bcambio\s+tu\s+cita\b/i,
];

export function containsFabricatedBookingClaim(text: string): boolean {
  return FABRICATED_BOOKING_PATTERNS.some((re) => re.test(text));
}

/** Negaciones legítimas alrededor de "reservad*" — no son cierre fabricado. */
export function isNegatedBookingClaim(text: string): boolean {
  return (
    /\b(?:no|aún\s+no|aun\s+no|sin)\s+(?:está|esta|queda|quede|haber|hay)\s+reservad/i
      .test(text) ||
    /\b(?:falta|para\s+que\s+quede)\s+reservad/i.test(text) ||
    /\bno\s+(?:queda|quede|está|esta)\s+reservad/i.test(text)
  );
}

/** True si algún texto afirma cierre fabricado (ignorando negaciones). */
export function hasFabricatedBookingClaim(
  text: string,
  texts: string[] = [],
): boolean {
  const all = [text, ...texts].filter((t) => t.trim().length > 0);
  return all.some(
    (t) => containsFabricatedBookingClaim(t) && !isNegatedBookingClaim(t),
  );
}

export const FABRICATED_BOOKING_SAFE_REPLY =
  "Dame un momento, te confirmo el horario con el sistema 💜";
