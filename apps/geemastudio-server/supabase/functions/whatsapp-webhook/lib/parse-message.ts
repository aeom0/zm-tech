// parse-message.ts — Extracción segura de texto e interactivos del payload de WhatsApp

/**
 * Extrae el id de la opción seleccionada en un mensaje interactivo (lista o botón).
 * WhatsApp envía list_reply.id o button_reply.id (snake_case); algunos clientes envían listReply/buttonReply (camelCase).
 */
function getReplyField(
  obj: Record<string, unknown>,
  keySnake: string,
  keyCamel: string,
  field: string,
): string | undefined {
  const reply = obj[keySnake] ?? obj[keyCamel];
  if (!reply || typeof reply !== "object" || !(field in reply))
    return undefined;
  const val = (reply as Record<string, unknown>)[field];
  return val != null ? String(val) : undefined;
}

export function getInteractiveId(
  message: Record<string, unknown>,
): string | undefined {
  const interactive = message?.interactive;
  if (!interactive || typeof interactive !== "object") return undefined;
  const obj = interactive as Record<string, unknown>;

  const listId = getReplyField(obj, "list_reply", "listReply", "id");
  if (listId) return listId;

  const buttonId = getReplyField(obj, "button_reply", "buttonReply", "id");
  if (buttonId) return buttonId;

  // Fallback: cualquier subobjeto con "id" (p. ej. APIs que cambian nombres de claves)
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (val && typeof val === "object" && "id" in val) {
      const id = (val as { id: string }).id;
      if (id != null) return String(id);
    }
  }

  return undefined;
}

/**
 * Extrae el título legible de la opción seleccionada en un mensaje interactivo.
 * WhatsApp envía list_reply.title / button_reply.title junto con el id.
 */
export function getInteractiveTitle(
  message: Record<string, unknown>,
): string | undefined {
  const interactive = message?.interactive;
  if (!interactive || typeof interactive !== "object") return undefined;
  const obj = interactive as Record<string, unknown>;

  return (
    getReplyField(obj, "list_reply", "listReply", "title") ??
    getReplyField(obj, "button_reply", "buttonReply", "title")
  );
}

/**
 * Extrae el texto de la respuesta a un botón de PLANTILLA (quick reply).
 * Cuando la clienta toca un botón de una plantilla (p. ej. "Confirmar" en
 * `recordatorio_cita_zm`), WhatsApp envía `type: "button"` con el texto/payload
 * en `message.button` (NO en `message.interactive`). Sin esto, el historial
 * guardaba el mensaje vacío y el panel mostraba "[seleccionó una opción]".
 */
export function getButtonReplyText(
  message: Record<string, unknown>,
): string | undefined {
  const button = message?.button;
  if (!button || typeof button !== "object") return undefined;
  const b = button as Record<string, unknown>;
  const text = b.text ?? b.payload;
  const str = text != null ? String(text).trim() : "";
  return str.length > 0 ? str : undefined;
}

/**
 * Extrae el texto del mensaje cuando type === "text".
 */
export function getMessageText(message: Record<string, unknown>): string {
  if (message?.type !== "text") return "";
  const text = message.text;
  if (!text || typeof text !== "object") return "";
  const body = (text as Record<string, string>).body;
  return body != null ? String(body).trim() : "";
}

/**
 * Extrae el emoji cuando type === "reaction" (Meta envía `message.reaction.emoji`,
 * puede venir vacío "" si la clienta quitó la reacción).
 */
export function getReactionEmoji(
  message: Record<string, unknown>,
): string | undefined {
  if (message?.type !== "reaction") return undefined;
  const reaction = message.reaction;
  if (!reaction || typeof reaction !== "object") return undefined;
  const emoji = (reaction as Record<string, unknown>).emoji;
  const str = emoji != null ? String(emoji).trim() : "";
  return str.length > 0 ? str : undefined;
}

/** Estructura mínima del referral de Meta Ads (Click-to-WhatsApp). */
export interface WAReferal {
  source_type: string; // "ad" | "post" | "unknown"
  source_id?: string;
  headline?: string;
  ctwa_clid?: string;
}

/**
 * Extrae el objeto referral del mensaje si viene de un anuncio de Meta Ads.
 * El campo `referral` está presente en el mensaje cuando el usuario inició
 * la conversación haciendo clic en un anuncio Click-to-WhatsApp.
 */
export function getReferral(
  message: Record<string, unknown>,
): WAReferal | null {
  const ref = message?.referral;
  if (!ref || typeof ref !== "object") return null;
  const r = ref as Record<string, string>;
  return {
    source_type: r.source_type ?? "unknown",
    source_id: r.source_id,
    headline: r.headline,
    ctwa_clid: r.ctwa_clid,
  };
}

/** Valores de `referral.source_type` que indican origen publicitario (Meta CTWA). */
const AD_REFERRAL_SOURCE_TYPES = new Set(["ad", "post"]);

/**
 * Retorna true si el mensaje fue iniciado desde un anuncio de Meta Ads
 * (Click-to-WhatsApp). Incluye `source_type` ad/post y presencia de `ctwa_clid`.
 */
export function isFromAd(message: Record<string, unknown>): boolean {
  const referral = getReferral(message);
  if (!referral) return false;
  const sourceType = referral.source_type.trim().toLowerCase();
  if (AD_REFERRAL_SOURCE_TYPES.has(sourceType)) return true;
  // Meta a veces envía source_type "unknown" pero sí incluye ctwa_clid en CTWA.
  return Boolean(referral.ctwa_clid?.trim());
}

/**
 * Frase de texto reservada (solo letras/espacios, sin distinguir mayúsculas):
 * dispara el mismo flujo de creativos que una clienta nueva desde Meta Ads,
 * para revisar imágenes en WhatsApp sin pasar por un anuncio real.
 */
export function isMetaAdsTestMessage(messageText: string): boolean {
  const n = messageText.trim().replace(/\s+/g, " ").toLowerCase();
  return n === "prueba meta ads";
}
