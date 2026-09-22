/**
 * Normalización de teléfonos para enlazar CRM → `/panel/waba/mensajes?phone=`.
 * Misma regla que ZM `ClientDetailSidebar.waMessagesPhoneKey`.
 */

/** Clave canónica para query `?phone=` (E.164 PE si son 9 dígitos locales). */
export function waMessagesPhoneKey(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '')
  if (!digits) return null
  return digits.length === 9 ? `51${digits}` : digits
}

/**
 * ¿Mismo hilo WA? Compara exacto (incl. BSUID) o últimos 9 dígitos
 * (clientes a veces guardan 9 locales y `wa_messages` trae `51…`).
 */
export function phonesLikelyMatch(a: string, b: string): boolean {
  if (a === b) return true
  const da = a.replace(/\D/g, '')
  const db = b.replace(/\D/g, '')
  if (!da || !db) return false
  if (da === db) return true
  if (da.length < 9 || db.length < 9) return false
  return da.slice(-9) === db.slice(-9)
}
