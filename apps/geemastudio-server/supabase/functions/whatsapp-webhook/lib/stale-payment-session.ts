/**
 * Sesión de pago abandonada (Alberto …0417, 6-oct-2026): `awaiting_screenshot`
 * quedó en true desde el 4-oct y "Hola quiero agendar" se contestó con el aviso
 * de pago. Si pasaron más de STALE_PAYMENT_MS sin actividad y la clienta
 * escribe un saludo o pide agendar, se reinicia la reserva en vez de seguir
 * en el paso de pago. Una imagen (comprobante) nunca cuenta como reinicio.
 */
export const STALE_PAYMENT_MS = 6 * 60 * 60 * 1000;

const PAYMENT_STEPS = new Set([
  "awaiting_payment_screenshot",
  "awaiting_deposit_datos",
  "awaiting_deposit_boleta",
]);

const FRESH_START_RE =
  /^\s*(hola|holi|holis|hey|buen[oa]s?(\s+(dias|tardes|noches))?)\b|\b(agendar|reservar|reserva|quiero\s+(una\s+)?cita|sacar\s+(una\s+)?cita)\b/;

export function isStalePaymentRestart(
  session: {
    step?: string | null;
    awaiting_screenshot?: boolean | null;
    updated_at?: string | null;
  } | null,
  text: string,
  now = Date.now(),
): boolean {
  if (!session?.updated_at) return false;
  const inPayment = PAYMENT_STEPS.has(session.step ?? "") ||
    session.awaiting_screenshot === true;
  if (!inPayment) return false;
  const age = now - new Date(session.updated_at).getTime();
  if (!(age > STALE_PAYMENT_MS)) return false;
  const t = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  return FRESH_START_RE.test(t);
}
