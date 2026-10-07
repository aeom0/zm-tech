// client-identity.ts — Pedir nombre + DNI/CE tras cerrar cita (dato adicional, no bloquea)

import { sendMessage } from "../wa-api.ts";
import {
  findClientByWaRecipient,
  getPhoneCountryAndNormalizedFromWa,
  type SupabaseClient,
  upsertSession,
} from "../lib/supabase.ts";
import { isWaBsuid } from "../lib/wa-recipient.mjs";

export const AWAITING_CLIENT_IDENTITY = "awaiting_client_identity";

export const IDENTITY_ASK_MESSAGE =
  "Para tener tu ficha completa, ¿me pasas tu *nombre y apellido* y tu *DNI o CE*? (ej: María García 87654321) 💜";

const PLACEHOLDER_NAME_RE = /^cliente wa \d{4}$/i;

/** Clienta dice que ya tenemos sus datos (caso Maribel 2026-07-19). */
export function matchesAlreadyHaveDataIntent(text: string): boolean {
  const t = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!t.trim()) return false;
  return (
    /\bya\s+(los\s+|me\s+)?tienen\b/.test(t) ||
    /\bustedes\s+ya\s+tienen\b/.test(t) ||
    /\bya\s+tienen\s+(mis\s+)?datos\b/.test(t) ||
    /\bmis\s+datos\b.*\b(ya|tienen|tienen)\b/.test(t) ||
    /\bya\s+(estan|está|esta)\s+(en\s+)?(el\s+)?(sistema|ficha|base|agenda)\b/
      .test(
        t,
      ) ||
    /\bya\s+me\s+registr/.test(t) ||
    /\bya\s+los\s+tienen\b/.test(t) ||
    /\bya\s+(te\s+)?(deje|pase|envie|mande)\s+(los\s+)?datos/.test(t) ||
    /\bya\s+agende\b/.test(t)
  );
}

/**
 * Mensaje que no parece intento de ficha (queja, emoji, corrección de cita).
 * Caso Pati Cavana 2026-07-20: "No toque nada" / "Malaso este robot" spameaba DNI.
 */
export function looksLikeIdentityAttempt(text: string): boolean {
  const raw = text
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw || raw.length < 5) return false;
  // DNI/CE típicos o mención explícita
  if (/\b\d{8}\b/.test(raw)) return true;
  if (/\b(?:dni|ce|carnet|documento)\b/i.test(raw)) return true;
  if (/\b(?:c\.?\s*e\.?)\s*[:\-]?\s*[a-zA-Z0-9]{8,12}\b/i.test(raw)) {
    return true;
  }
  // Nombre + algo numérico (parcial)
  const letters = raw.replace(/[^a-záéíóúñüA-ZÁÉÍÓÚÑÜ\s]/g, " ").trim();
  const words = letters.split(/\s+/).filter((w) => w.length >= 2);
  if (words.length >= 2 && /\d{6,}/.test(raw)) return true;
  return false;
}

type IdentityClient = {
  name?: string | null;
  dni?: string | null;
};

/**
 * Explica qué hay en ficha y qué falta (actualizar agenda), sin sonar a error de parseo.
 */
export function buildIdentityStatusReply(
  client: IdentityClient | null,
): string {
  const rawName = client?.name?.trim() ?? "";
  const hasRealName = !!rawName && !isPlaceholderClientName(rawName);
  const nameWords = hasRealName ? rawName.split(/\s+/).filter(Boolean) : [];
  const hasFullName = nameWords.length >= 2;
  const dni = client?.dni?.trim() ?? "";
  const hasDni = !!dni;

  const haveParts: string[] = [];
  if (hasRealName) haveParts.push(`*${rawName}*`);
  if (hasDni) haveParts.push(`documento *${dni}*`);

  const missingParts: string[] = [];
  if (!hasFullName) {
    if (hasRealName && nameWords.length === 1) {
      missingParts.push("tu *apellido*");
    } else {
      missingParts.push("tu *nombre y apellido*");
    }
  }
  if (!hasDni) missingParts.push("tu *DNI o CE*");

  if (missingParts.length === 0) {
    return "Tu ficha ya está completa 💜 ¡Gracias!";
  }

  const missingJoin = missingParts.length === 1
    ? missingParts[0]
    : `${missingParts.slice(0, -1).join(", ")} y ${
      missingParts[missingParts.length - 1]
    }`;

  const example = hasRealName && nameWords.length === 1
    ? `(ej: ${nameWords[0].charAt(0)}${
      nameWords[0].slice(1).toLowerCase()
    } López 87654321)`
    : "(ej: María García 87654321)";

  if (haveParts.length > 0) {
    const haveJoin = haveParts.length === 1
      ? haveParts[0]
      : `${haveParts[0]} y ${haveParts[1]}`;
    const passPronoun = missingParts.length === 1 ? "lo" : "los";
    return (
      `En tu ficha tengo: ${haveJoin}. Me falta ${missingJoin} — es para *actualizar nuestra agenda* 📋 ` +
      `¿Me ${passPronoun} pasas en un solo mensaje? ${example} 💜`
    );
  }

  const passPronoun = missingParts.length === 1 ? "lo" : "los";
  return (
    `Aún no tengo tu ficha completa: me falta ${missingJoin}. ` +
    `Es para *actualizar nuestra agenda* 📋 ¿Me ${passPronoun} pasas en un solo mensaje? ${example} 💜`
  );
}

export function isPlaceholderClientName(
  name: string | null | undefined,
): boolean {
  if (!name?.trim()) return true;
  return PLACEHOLDER_NAME_RE.test(name.trim());
}

export function clientNeedsIdentity(
  client: {
    name?: string | null;
    dni?: string | null;
  } | null,
): boolean {
  if (!client) return true;
  const missingName = isPlaceholderClientName(client.name);
  const missingDni = !client.dni?.trim();
  return missingName || missingDni;
}

/** Normaliza nombre a MAYÚSCULAS sin emojis (mismo criterio que getOrCreateClient). */
export function normalizeClientName(name: string): string {
  return name
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

/** Últimos 9 dígitos del teléfono WA (celular PE u otros con sufijo local). */
function localPhoneDigits9(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 9) return null;
  return digits.slice(-9);
}

/** True si el token de 9 dígitos es el mismo celular del remitente (no un CE). */
function isNineDigitSenderPhone(
  candidate: string,
  senderPhone?: string,
): boolean {
  if (!senderPhone || !/^\d{9}$/.test(candidate)) return false;
  const local = localPhoneDigits9(senderPhone);
  return local === candidate;
}

/**
 * Extrae nombre (≥2 palabras) + DNI (8 dígitos) o CE (alfanum) del texto libre.
 * En post-cita (`senderPhone`), un número de 9 dígitos se acepta como CE salvo que
 * coincida con el celular del remitente (caso María Acosta …4706, 27-jul).
 */
export function parseClientIdentity(
  text: string,
  opts?: { senderPhone?: string },
): {
  name: string;
  dni: string;
} | null {
  const raw = text
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw || raw.length < 8) return null;

  // CE con prefijo
  const cePrefixed = raw.match(
    /\b(?:c\.?\s*e\.?|ce)\s*[:\-]?\s*([a-zA-Z0-9]{8,12})\b/i,
  );
  // DNI 8 dígitos o CE sin prefijo 9–12 alfanum (evitar confundir con teléfonos 9 dígitos PE)
  const dniEight = raw.match(/\b(\d{8})\b/);
  const ceLoose = raw.match(/\b([a-zA-Z]\d{7,11}|\d{9,12})\b/);

  let dni: string | null = null;
  if (cePrefixed) {
    dni = cePrefixed[1].toUpperCase();
  } else if (dniEight) {
    dni = dniEight[1];
  } else if (ceLoose) {
    const token = ceLoose[1];
    if (/^\d{9}$/.test(token)) {
      if (!isNineDigitSenderPhone(token, opts?.senderPhone)) {
        dni = token;
      }
    } else {
      dni = token.toUpperCase();
    }
  }

  if (!dni) return null;

  const namePart = raw
    .replace(
      new RegExp(`\\b(?:c\\.?\\s*e\\.?|ce)\\s*[:\\-]?\\s*${dni}\\b`, "i"),
      " ",
    )
    .replace(new RegExp(`\\b${dni}\\b`, "i"), " ")
    .replace(/\b(dni|ce|documento|carnet)\b/gi, " ")
    .replace(/\b(?:mi\s+nombre\s+es|nombre(?:\s+completo)?\s*[:\-]?)\s*/gi, " ")
    // Copy de boleta pide celular + día/hora en el mismo mensaje (Edgar …2122).
    // Si quedan en namePart, words.length > 5 y el parse falla en loop.
    .replace(/\b(?:whats?app|celular|tel[eé]fono|n[uú]mero)\b[:\-]?\s*/gi, " ")
    .replace(/\b(?:\+?51[\s-]*)?9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g, " ")
    .replace(
      /\b(?:a\s+las?|las?)\s*\d{1,2}(?:[:.,]\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?\b/gi,
      " ",
    )
    .replace(/\b\d{1,2}(?:[:.,]\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)\b/gi, " ")
    .replace(/\b(?:al\s+)?medio\s*d[ií]as?\b/gi, " ")
    .replace(/\bde\s+la\s+(?:mañana|manana|tarde|noche)\b/gi, " ")
    .replace(
      /\b(?:el\s+)?\d{1,2}\s+de\s+(?:enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre)\b/gi,
      " ",
    )
    .replace(
      /\b(?:el\s+|este\s+|para\s+el\s+|del\s+)?(?:lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado)\b/gi,
      " ",
    )
    .replace(/\b(?:el\s+|este\s+|para\s+el\s+|del\s+)domingo\b/gi, " ")
    .replace(/\bdomingo\s+(?:\d{1,2}|que viene|pr[oó]ximo|a\s+las?)\b/gi, " ")
    .replace(/\b(?:para\s+el|para\s+la)\b/gi, " ")
    .replace(/\b(?:d[ií]a|hora|fecha)\b/gi, " ")
    // "Hola, María…" no forma parte del nombre (caso Pam 2026-07-16)
    .replace(
      /^(hola|hi|hello|buenas?\s+(días|dias|tardes|noches)|buenos\s+días|buenos\s+dias)\b[,!.:\s]*/i,
      "",
    )
    .replace(/[.,;:_/\-]+/g, " ")
    .replace(/^[^a-zA-ZáéíóúñÁÉÍÓÚÑ]+/g, "")
    .replace(/[^a-zA-ZáéíóúñÁÉÍÓÚÑ]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();

  const name = normalizeClientName(namePart);
  const words = name.split(" ").filter(Boolean);
  if (words.length < 2) return null;
  if (name.length < 5) return null;
  // Una plantilla de reserva reenviada puede contener DNI, celular y políticas
  // después del nombre; no guardar todo ese texto como `clients.name`.
  if (words.length > 5 || name.length > 50) return null;

  return { name, dni };
}

/** Junta varios inbound (boleta en varios mensajes) y parsea. */
export function parseClientIdentityFromTexts(
  texts: string[],
  opts?: { senderPhone?: string },
): { name: string; dni: string } | null {
  const parts = texts.map((t) => t.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  const joined = parts.join("\n");
  return parseClientIdentity(joined, opts);
}

/**
 * Igual que parseClientIdentityFromTexts, pero descarta el chat que no es ficha.
 * Mirta …8754 (30-sep-2026): juntar los últimos 6 inbound metía "Clásicas" y
 * "temprano" en el nombre, el parse devolvía null y el DNI suelto no se guardaba.
 */
export function parseClientIdentityStitchingFragments(
  texts: string[],
  opts?: { senderPhone?: string },
): { name: string; dni: string } | null {
  const seen = new Set<string>();
  const fragments: string[] = [];
  for (const raw of texts) {
    const t = raw.trim();
    if (!t || seen.has(t)) continue;
    seen.add(t);
    if (!looksLikeIdentityAttempt(t)) continue;
    fragments.push(t);
  }
  if (fragments.length === 0) return null;
  const all = parseClientIdentityFromTexts(fragments, opts);
  if (all) return all;
  const head = fragments[0]!;
  for (let i = 1; i < fragments.length; i++) {
    const pair = parseClientIdentityFromTexts([head, fragments[i]!], opts);
    if (pair) return pair;
  }
  return null;
}

export function fetchClientIdentityRow(
  supabase: SupabaseClient,
  phone: string,
): Promise<{ id: string; name: string; dni: string | null } | null> {
  // LION / Lu_septiembre (BSUID): ficha vive en wa_user_id, sin phone_normalized.
  return findClientByWaRecipient(supabase, phone);
}

/** Tras confirmar cita: pide identidad solo si falta en BD. No bloquea la cita. */
export async function askClientIdentityIfNeeded(
  supabase: SupabaseClient,
  phone: string,
): Promise<boolean> {
  const client = await fetchClientIdentityRow(supabase, phone);
  if (!clientNeedsIdentity(client)) return false;

  await upsertSession(supabase, phone, {
    step: AWAITING_CLIENT_IDENTITY,
  });
  await sendMessage(phone, IDENTITY_ASK_MESSAGE);
  return true;
}

export async function updateClientIdentity(
  supabase: SupabaseClient,
  phone: string,
  identity: { name: string; dni: string },
): Promise<{ ok: true; clientId: string } | { ok: false; reason: string }> {
  const client = await fetchClientIdentityRow(supabase, phone);
  if (!client?.id) {
    return { ok: false, reason: "no_client" };
  }

  const { error } = await supabase
    .from("clients")
    .update({ name: identity.name, dni: identity.dni })
    .eq("id", client.id);

  if (error) {
    if (
      /unique|duplicate|clients_dni/i.test(error.message) ||
      error.code === "23505"
    ) {
      return { ok: false, reason: "dni_taken" };
    }
    console.error("[WABA] updateClientIdentity:", error.message);
    return { ok: false, reason: "db_error" };
  }

  // Patch citas scheduled de esta clienta / teléfono WA
  const orParts = [`client_id.eq.${client.id}`, `whatsapp_phone.eq.${phone}`];
  const phoneOnlyParts = [`client_phone.eq.${phone}`];
  if (!isWaBsuid(phone)) {
    const { normalized } = getPhoneCountryAndNormalizedFromWa(phone);
    orParts.push(`client_phone.eq.${phone}`, `client_phone.eq.${normalized}`);
    phoneOnlyParts.push(`client_phone.eq.${normalized}`);
  }
  await supabase
    .from("appointments")
    .update({
      client_name: identity.name,
      client_document: identity.dni,
    })
    .eq("status", "scheduled")
    .or(orParts.join(","));

  // Patch verificaciones de pago pendientes (comprobante aún sin aprobar): la
  // plantilla Meta `pago_recibido_validar_zm` lee `client_name` de acá, no de
  // `clients`, así que si no se corrige acá el nombre corrupto sigue llegando
  // a Vanessa en el mensaje de aprobación pese a estar ya corregido en la ficha.
  await supabase
    .from("appointment_verifications")
    .update({ client_name: identity.name })
    .eq("status", "payment_submitted")
    .or(phoneOnlyParts.join(","));

  return { ok: true, clientId: client.id };
}

/**
 * Celular PE (9 dígitos que empiezan en 9, o 51+9) en texto libre.
 * No toma DNI de 8 dígitos. Lucero …9087: "955102486" en hilo BSUID.
 */
export function extractPeMobileE164(text: string): string | null {
  const runs = String(text ?? "").match(/\d{9,11}/g) ?? [];
  for (const run of runs) {
    if (run.length === 11 && /^519\d{8}$/.test(run)) return run;
    if (run.length === 9 && /^9\d{8}$/.test(run)) return `51${run}`;
  }
  return null;
}

/**
 * Si el hilo es BSUID y la ficha no tiene teléfono, guarda el celular que
 * la clienta escribió (Vanessa lo pidió a Lucero; el panel seguía "Sin teléfono").
 */
export async function attachPeMobileToBsuidClient(
  supabase: SupabaseClient,
  waRecipient: string,
  messageText: string,
): Promise<boolean> {
  if (!isWaBsuid(waRecipient)) return false;
  const e164 = extractPeMobileE164(messageText);
  if (!e164) return false;

  const { data: row } = await supabase
    .from("clients")
    .select("id, phone")
    .eq("wa_user_id", waRecipient)
    .maybeSingle();
  if (!row?.id) return false;
  const existing = String(row.phone ?? "").replace(/\D/g, "");
  if (existing.length >= 9) return false;

  const { country, normalized } = getPhoneCountryAndNormalizedFromWa(e164);
  const { error } = await supabase
    .from("clients")
    .update({
      phone: e164,
      phone_country: country,
      phone_normalized: normalized,
    })
    .eq("id", row.id);
  if (error) {
    console.warn("[WABA] attachPeMobileToBsuidClient:", error.message);
    return false;
  }
  await supabase
    .from("appointments")
    .update({ client_phone: e164 })
    .eq("client_id", row.id)
    .is("client_phone", null);
  return true;
}

/**
 * True si el mensaje parece salir del paso (menú / cancelar / queja), no un intento de ficha.
 * No escapar si el texto trae nombre+documento parseable (Pam: "Hola, Pamela Illich, DNI …").
 */
export function isIdentityEscapeMessage(
  text: string,
  senderPhone?: string,
): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  if (/\b(menu|menú|cancelar|empezar de nuevo)\b/.test(t)) return true;
  // Si ya trae ficha válida, no es escape aunque empiece con "Hola"
  if (parseClientIdentity(text, { senderPhone })) return false;
  // Queja / corrección de cita / emoji solo (Pati: no spamear DNI)
  if (!looksLikeIdentityAttempt(text)) {
    const norm = t.normalize("NFD").replace(/\p{M}/gu, "");
    if (
      /\b(malaso|malo|error|bug|robot|bot|cuelga|colgo|equivoc|otra fecha|no toque|no toqué|incorrect)\b/
        .test(
          norm,
        )
    ) {
      return true;
    }
    // Solo emoji / muy corto sin dígitos de documento
    const stripped = text
      .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "")
      .replace(/\s+/g, "")
      .trim();
    // Acks cortos ("Ok", "Ya", "Sí", "No"...) NO son escape — caso Melisa
    // …9414 (27-sep-2026, QA replay `waba-validate-melisa-full-flow.mjs`):
    // "Ok" tras la cita ya anotada (paso identidad) vaciaba el carrito y
    // reabría el catálogo completo en vez de solo recordar el DNI pendiente.
    const normalizedStripped = stripped
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, "");
    const SHORT_ACK_WORDS = new Set([
      "ok",
      "oka",
      "okey",
      "okay",
      "ya",
      "si",
      "no",
    ]);
    if (stripped.length <= 2 && !SHORT_ACK_WORDS.has(normalizedStripped)) {
      return true;
    }
  }
  // Saludo solo / corto sin datos
  return /^(hola|hi|hello|buenos|buenas)\b/.test(t) && t.length < 48;
}
