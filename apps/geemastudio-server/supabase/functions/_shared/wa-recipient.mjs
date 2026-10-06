// wa-recipient.mjs — BSUID vs teléfono E.164 para Cloud API / hilos WABA.
// Importable desde Deno (Edge) y Node (scripts QA) sin dependencias.

/**
 * Business Scoped User ID (Meta usernames): `PE.1704503080781860`.
 * @param {unknown} id
 * @returns {boolean}
 */
export function isWaBsuid(id) {
  return typeof id === "string" && /^[A-Z]{2}\.[A-Za-z0-9]+/.test(id.trim());
}

/**
 * Repara móvil peruano sin código de país: 9 dígitos que empiezan en "9"
 * (todos los móviles PE) → antepone "51". Meta a veces envía `message.from`
 * así en vez del E.164 completo (caso Vianei Rubio / Veronika Castillo,
 * 19-ago-2026: mismo bug en inbound y en el log/envío de send-promo-whatsapp,
 * que usaba `clients.phone` crudo sin pasar por esta normalización). Sin
 * esto, el mismo número termina con 2-3 claves de hilo distintas
 * (whatsapp_sessions/wa_messages/clients duplicados).
 * @param {string} digits
 * @returns {string}
 */
function repairPeMobileDigits(digits) {
  if (digits.length === 9 && digits.startsWith("9")) return `51${digits}`;
  return digits;
}

/**
 * Clave de conversación (whatsapp_sessions.phone / wa_messages.phone):
 * BSUID tal cual; teléfono solo dígitos (con reparación de móvil PE sin "51").
 * @param {string} dest
 * @returns {string}
 */
export function waConversationKey(dest) {
  const s = String(dest ?? "").trim();
  if (!s) return "";
  if (isWaBsuid(s)) return s;
  return repairPeMobileDigits(s.replace(/\D/g, ""));
}

/**
 * Campos del body Cloud API: teléfono → `{ to }`; BSUID → `{ recipient }` (sin `to`).
 * @param {string} dest
 * @returns {{ to: string } | { recipient: string }}
 */
export function metaRecipientFields(dest) {
  const s = String(dest ?? "").trim();
  if (isWaBsuid(s)) {
    return { recipient: s };
  }
  return { to: repairPeMobileDigits(s.replace(/\D/g, "")) };
}

/**
 * ¿Es un teléfono E.164 (solo dígitos con código de país)?
 * No incluye BSUID — para eso usar `isWaSendableDest`.
 * @param {string} dest
 * @returns {boolean}
 */
export function isE164WaPhone(dest) {
  if (isWaBsuid(dest)) return false;
  const d = String(dest ?? "").replace(/\D/g, "");
  return d.length >= 8 && d.length <= 15;
}

/**
 * Destino válido para Cloud API (texto libre o plantilla):
 * E.164 **o** BSUID. Confirmado 2026-08-03: Meta acepta
 * `type:"template"` con `recipient` (smoke Tati / promo_zm_v1).
 * @param {string} dest
 * @returns {boolean}
 */
export function isWaSendableDest(dest) {
  const s = String(dest ?? "").trim();
  if (!s) return false;
  return isWaBsuid(s) || isE164WaPhone(s);
}

/**
 * Normaliza un destino (teléfono o BSUID) para comparar contra la lista de
 * bloqueo (`waba_config.blocked_phone_numbers`): BSUID tal cual; teléfono
 * a los últimos 9 dígitos (número local PE sin código de país).
 * @param {string} dest
 * @returns {string}
 */
export function normalizeBlockedDestination(dest) {
  const s = String(dest ?? "");
  if (s.startsWith("PE.")) return s;
  return s.replace(/\D/g, "").slice(-9);
}

/**
 * Segmento seguro para paths de Storage (BSUID sin puntos raros).
 * @param {string} dest
 * @returns {string}
 */
export function waStorageFolder(dest) {
  const key = waConversationKey(dest);
  if (isWaBsuid(key)) return key.replace(/\./g, "_");
  return key || "unknown";
}
