/**
 * Tratamiento hacia la clienta (Vanessa / Rose …3618, 04-ago).
 * Un solo ¡Hola! al abrir el episodio; después "Srta. {nombre}" + tuteo (tú).
 */

import type { SupabaseClient } from "./supabase.ts";

const PLACEHOLDERS = new Set([
  "cliente whatsapp",
  "whatsapp user",
  "unknown",
  "",
]);

/** Nombre de pila usable (sin placeholder ni lema). */
export function clientFirstName(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;
  const cleaned = raw
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned) return null;
  if (PLACEHOLDERS.has(cleaned.toLowerCase())) return null;
  if (/^cliente wa\b/i.test(cleaned)) return null;
  if (/^\d+$/.test(cleaned)) return null;
  if (cleaned.split(/\s+/).length >= 5) return null; // lema

  const words = cleaned
    .split(/\s+/)
    .filter((w) => /[A-Za-zÁÉÍÓÚÑáéíóúñ]{2,}/.test(w));
  if (words.length === 0) return null;

  const first = words[0]!;
  if (first.length < 3) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

/** "Srta. Rose" o null si no hay nombre real. */
export function srtaLabel(raw: string | null | undefined): string | null {
  const first = clientFirstName(raw);
  return first ? `Srta. ${first}` : null;
}

/**
 * Saludo de apertura (welcome / primer OUT del episodio).
 * Con nombre → "¡Hola Srta. Rose!"; sin nombre → "¡Hola!".
 */
export function openingHello(raw: string | null | undefined): string {
  const srta = srtaLabel(raw);
  return srta ? `¡Hola ${srta}!` : "¡Hola!";
}

/**
 * Reenganche / turno mid-chat: sin ¡Hola!.
 * Con nombre → "Srta. Rose, {resto}"; sin nombre → resto capitalizado.
 * `srtaAllowed=false` (usado por Haiku tras alcanzar el tope por episodio,
 * ver SRTA_MAX_PER_EPISODE en ai-assistant.ts) omite el tratamiento — evita
 * "Srta." en cada burbuja de un mismo turno/episodio largo.
 */
export function addressWithoutHello(
  raw: string | null | undefined,
  body: string,
  opts?: { srtaAllowed?: boolean },
): string {
  const srtaAllowed = opts?.srtaAllowed ?? true;
  const rest = body
    .replace(/^(¡?Hola[!¡]?\s*)(Srta\.?\s+\S+\s*[,:]?\s*)?/i, "")
    .replace(/^[,.:\-\s]+/, "")
    .trim();
  if (!rest) {
    const srta = srtaAllowed ? srtaLabel(raw) : null;
    return srta ? `${srta} 💜` : "💜";
  }
  let capitalized = rest.charAt(0).toUpperCase() + rest.slice(1);
  const srta = srtaAllowed ? srtaLabel(raw) : null;
  if (!srta) return capitalized;
  const first = clientFirstName(raw);
  // Haiku a veces pone "Srta." huérfano sin nombre (Yelitza …1186, 16-sep)
  if (first) {
    capitalized = capitalized
      .replace(
        // Coma opcional entre el punto y el espacio: Haiku a veces pega
        // "Srta.," (Luz …2637, 18-sep) en vez de "Srta. ".
        new RegExp(`\\b[Ss]rta\\.?,?\\s+(?!${escapeRegExp(first)}\\b)`, "g"),
        "",
      )
      // [^\S\n] en vez de \s: preserva los \n reales que forceBulletLineBreaks()
      // ya insertó antes de esta función (Alberto …0417, 17-sep-2026: listas
      // de precios con viñetas llegaban en texto corrido pese al fix previo).
      .replace(/[^\S\n]+/g, " ")
      .replace(/^[,.:\-\s]+/, "")
      .trim();
    if (capitalized) {
      capitalized = capitalized.charAt(0).toUpperCase() + capitalized.slice(1);
    }
  }
  // Ya empieza con Srta. o Haiku incrustó "Srta. Nombre" a mitad (Luciana/Vania 09-sep)
  if (/^srta\.?,?\s/i.test(capitalized)) return capitalized;
  if (
    first &&
    // Coma opcional (mismo patrón que el strip de huérfano): "Srta., Luz"
    new RegExp(`\\bsrta\\.?,?\\s+${escapeRegExp(first)}\\b`, "i").test(
      capitalized,
    )
  ) {
    return capitalized;
  }
  // Haiku a veces menciona el nombre suelto sin "Srta." (ej. "Perfecto, Alberto...",
  // Alberto …0417 17-sep): anteponer el trato ahí en vez de repetir el nombre al
  // inicio ("Srta. Alberto, perfecto, Alberto.").
  if (first) {
    const bareNameRe = new RegExp(`\\b${escapeRegExp(first)}\\b`, "i");
    if (bareNameRe.test(capitalized)) {
      return capitalized.replace(bareNameRe, srta);
    }
  }
  if (!capitalized) return `${srta} 💜`;
  return `${srta}, ${capitalized.charAt(0).toLowerCase()}${capitalized.slice(1)}`;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Si el hilo ya tuvo saliente, quita ¡Hola! inicial y antepone Srta.
 * Si es el primer saliente del episodio (sin OUT previo en historial), deja el texto
 * pero normaliza "¡Hola Nombre!" → "¡Hola Srta. Nombre!" cuando hay nombre.
 */
export function applyAddressStyle(
  text: string,
  contactName: string | null | undefined,
  opts: { alreadyGreeted: boolean; srtaAllowed?: boolean },
): string {
  const t = text.trim();
  if (!t) return t;
  const srtaAllowed = opts.srtaAllowed ?? true;
  if (opts.alreadyGreeted) {
    return addressWithoutHello(contactName, t, { srtaAllowed });
  }
  // Primer turno: si empieza con Hola + nombre suelto, unificar a Srta.
  const srta = srtaAllowed ? srtaLabel(contactName) : null;
  if (srta && /^¡?Hola\b/i.test(t) && !/^¡?Hola\s+Srta\./i.test(t)) {
    const first = clientFirstName(contactName);
    const rest = t
      .replace(/^¡?Hola[!¡]?\s*/i, "")
      .replace(first ? new RegExp(`^${first}\\b[,!]\\s*`, "i") : /^$/, "")
      .trim();
    if (!rest) return openingHello(contactName);
    return `${openingHello(contactName)} ${rest}`;
  }
  return t;
}

/** Nombre en clients por teléfono E.164 o BSUID. */
export async function loadClientNameForPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<string | null> {
  const key = phone.trim();
  if (!key) return null;
  if (key.startsWith("PE.")) {
    const { data } = await supabase
      .from("clients")
      .select("name")
      .eq("wa_user_id", key)
      .maybeSingle();
    return (data as { name?: string } | null)?.name ?? null;
  }
  const { data } = await supabase
    .from("clients")
    .select("name")
    .or(`phone.eq.${key},phone_normalized.eq.${key.slice(-9)}`)
    .maybeSingle();
  return (data as { name?: string } | null)?.name ?? null;
}

/**
 * Preferir ficha (clients.name) sobre display name de WhatsApp.
 * Pati …165951: perfil WA "Gatohockey" vs ficha "PATI CAVANA".
 */
export function preferClientDisplayName(
  fichaName: string | null | undefined,
  waProfileName: string | null | undefined,
): string {
  if (fichaName && clientFirstName(fichaName)) {
    return fichaName.trim();
  }
  const wa = (waProfileName ?? "").trim();
  return wa || "Cliente WhatsApp";
}
