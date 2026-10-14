// anti-spam.ts — Números bloqueados y copy de operadores (Plan 08)

import {
  FALLBACK_BLOCKED_PHONE_NUMBERS,
  getConfigStringArray,
  type WabaConfigMap,
} from "../../lib/waba-config.ts";

const SPAM_PATTERNS: string[] = [
  "por favor, escoge una de las siguientes opciones",
  "#juevesentel",
  "botm.cc/",
  "app mi entel",
  "en entel te escuchamos",
  "¡tranqui! puedes volver a escribirme para iniciar una nueva conversación",
  "estoy listo para ayudarte. 🤖",
  "el número de teléfono ingresado es incorrecto",
  "número postpago válido",
  "no pude completar tu solicitud debido a que no ingresaste",
  "ingresa tu número entel postpago",
  "participa hoy mismo por",
  "inscríbete ahora",
  "inscribete ahora",
  "llévate tu nueva consola",
  "llevate tu nueva consola",
  "sorteazo",
  "en qué te puedo ayudar",
  "en que te puedo ayudar",
  "gracias por contactarnos",
  "gracias por comunicarte",
  "este chat es atendido por",
  "responderemos lo antes posible",
];

/**
 * Copy de horario de un autorespondedor. Solo cuenta si NO es pregunta:
 * «¿Hasta qué hora es su horario de atención?» es una clienta (caso Nisset 13-oct).
 */
const HOURS_AUTO_REPLY_PATTERNS: string[] = [
  "horario de atención es",
  "nuestro horario de atencion",
  "nuestro horario de atención",
];

function isQuestion(messageText: string): boolean {
  return /[¿?]/.test(messageText);
}

export function isBlockedPhone(
  phoneNumber: string,
  wabaConfig: WabaConfigMap,
): boolean {
  const configuredBlocked = getConfigStringArray(
    wabaConfig,
    "blocked_phone_numbers",
    "phones",
    [],
  );
  const blockedSet = new Set<string>([
    ...FALLBACK_BLOCKED_PHONE_NUMBERS,
    ...configuredBlocked,
  ]);
  return blockedSet.has(phoneNumber);
}

export function isSpamOperatorCopy(messageText: string): boolean {
  const msgNormalized = messageText.trim().toLowerCase();
  const patterns = isQuestion(messageText)
    ? SPAM_PATTERNS
    : [...SPAM_PATTERNS, ...HOURS_AUTO_REPLY_PATTERNS];
  return patterns.some((pattern) =>
    msgNormalized.includes(pattern.toLowerCase())
  );
}

export function isWaBusinessAutoReply(messageText: string): boolean {
  const msgNormalized = messageText.trim().toLowerCase();
  return (
    /^(hola[,!]?\s+)?(gracias por (contactarnos|escribirnos|comunicarte)|en qu[eé] te puedo ayudar)/i
      .test(
        messageText.trim(),
      ) ||
    (!isQuestion(messageText) &&
      msgNormalized.length > 40 &&
      msgNormalized.length < 280 &&
      /\b(horario de atenci[oó]n|responderemos lo antes posible|este chat es atendido)\b/
        .test(
          msgNormalized,
        ) &&
      !/\b(cita|agendar|precio|cu[aá]nto|lifting|u[nñ]as|pesta[nñ]as)\b/.test(
        msgNormalized,
      ))
  );
}

/** `blocked` | `spam` | null. Caller hace return en silencio. */
export function inboundSilenceReason(
  phoneNumber: string,
  messageText: string,
  wabaConfig: WabaConfigMap,
): "blocked" | "spam" | null {
  if (isBlockedPhone(phoneNumber, wabaConfig)) return "blocked";
  if (isSpamOperatorCopy(messageText) || isWaBusinessAutoReply(messageText)) {
    return "spam";
  }
  return null;
}
