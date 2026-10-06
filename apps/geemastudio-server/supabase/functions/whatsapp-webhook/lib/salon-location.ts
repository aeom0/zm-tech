/**
 * Fuente única de dirección / referencia / Maps / estacionamiento para el bot WABA.
 * Runtime: `waba_config.ubicacion_text` pisa este default si está sembrado.
 * Haiku y fallbacks del webhook deben importar de aquí — no duplicar Wong/KFC/Maps.
 */

export const SALON_ADDRESS =
  "Calle Artesanos 150, Local 205, CC. Las Plazuelas de Surco, Santiago de Surco, Lima";

/** Dirección multilínea (mensaje WA / menú). */
export const SALON_ADDRESS_MULTILINE =
  "Calle Artesanos 150, Local 205\nCC. Las Plazuelas de Surco\nSantiago de Surco, Lima";

export const SALON_REFERENCE =
  "a la espalda del Supermercado Wong y el KFC de la Av. Benavides";

export const SALON_MAPS_URL = "https://maps.app.goo.gl/FpkdmdfS5wExRmiy8";

/**
 * Merillyn …7296: "¿cerca del Kennedy?" — confunden Parque Kennedy (Miraflores)
 * con la zona Surco (Benavides / Amistad / Plazuelas).
 */
export const SALON_NOT_AT_KENNEDY =
  "No estamos en Parque Kennedy (Miraflores). Estamos en Santiago de Surco — CC. Las Plazuelas, cerca de Av. Benavides / Av. Amistad.";

/**
 * En creativos PE, "movilidad gratis" = estacionamiento del mall (no Uber/taxi).
 * Caso Milagros …9602 (14-ago): Haiku negó movilidad y reafirmó cita fantasma.
 */
export const SALON_PARKING_NOTE =
  "En el creativo, *movilidad gratis* significa *estacionamiento gratis* del CC. Las Plazuelas (así se dice en Perú). El parking del centro comercial es sin costo.";

/** Respuesta fija cuando preguntan movilidad / estacionamiento. */
export const DEFAULT_ESTACIONAMIENTO_TEXT = `Sí 💜 Si te refieres a lo del creativo: *movilidad gratis* = *estacionamiento gratis* del CC. Las Plazuelas — en Perú se usa esa frase para el parking del mall.\n\nPuedes dejar el auto en el estacionamiento del centro comercial sin costo. No es taxi ni Uber: es el parking del CC.`;

/** Texto completo que envía el bot (fallback si no hay fila en waba_config). */
export const DEFAULT_UBICACION_TEXT = `📍 *Nuestra ubicación*\n\n${SALON_ADDRESS_MULTILINE}\n\n📌 *Referencia:* ${SALON_REFERENCE}\n\n🅿️ ${SALON_PARKING_NOTE}\n\n🗺️ Google Maps:\n${SALON_MAPS_URL}`;

/** True si pregunta por Kennedy / Amistad (landmark confuso o zona correcta). */
export function mentionsKennedyOrAmistadLandmark(lower: string): boolean {
  return (
    /\bkennedy\b/.test(lower) ||
    /\bamistad\b/.test(lower) ||
    /\bparque\s+kennedy\b/.test(lower)
  );
}

/** True si pregunta por estacionamiento / "movilidad gratis" del creativo. */
export function matchesParkingOrMovilidadQuestion(lower: string): boolean {
  return (
    /\bestacionamiento\b/.test(lower) ||
    /\bparking\b/.test(lower) ||
    /\bcochera\b/.test(lower) ||
    /\bmovilidad\b/.test(lower) ||
    (/\b(auto|carro|veh[ií]culo)\b/.test(lower) &&
      /\b(dejar|estacion|gratis|libre|pag[ao])\b/.test(lower))
  );
}

/**
 * Prefija aclaración Kennedy cuando aplica; no duplica si el CMS ya lo dice.
 */
export function resolveUbicacionReply(
  lower: string,
  ubicacionText: string,
): string {
  const base = (ubicacionText || "").trim() || DEFAULT_UBICACION_TEXT;
  if (!mentionsKennedyOrAmistadLandmark(lower)) return base;
  if (/kennedy/i.test(base)) return base;
  return `${SALON_NOT_AT_KENNEDY}\n\n${base}`;
}

/**
 * ¿La burbuja es (casi) un dump de dirección/Maps del salón?
 * Danae …6318 (09-sep): el claim `location_reply` ya había ganado el turno
 * determinístico, pero Haiku — al cotizar Wispy con "Donde se ubican?" en el
 * historial — volvió a pegar Calle Artesanos + Maps ~23 s después. Este
 * detector alimenta el filtro en `sendHaikuTextBubbles` (claim atómico).
 */
export function looksLikeSalonLocationDump(text: string): boolean {
  const t = (text || "").toLowerCase();
  if (!t.trim()) return false;
  if (/calle\s+artesanos\s*150/.test(t)) return true;
  if (
    /maps\.app\.goo\.gl/i.test(text) &&
    /artesanos|plazuelas|surco|benavides|wong|kfc/.test(t)
  ) {
    return true;
  }
  return false;
}

/**
 * True si, tras quitar el boilerplate de dirección, casi no queda contenido
 * útil (evita tumbar una burbuja mixta precio+Maps).
 */
export function isMostlySalonLocationDump(text: string): boolean {
  if (!looksLikeSalonLocationDump(text)) return false;
  const stripped = (text || "")
    .replace(/calle\s+artesanos[\s\S]{0,120}/gi, " ")
    .replace(/https?:\/\/maps\.app\.goo\.gl\/\S+/gi, " ")
    .replace(/📍|📌|🗺️|🅿️/g, " ")
    .replace(/nuestra\s+ubicaci[oó]n/gi, " ")
    .replace(/google\s+maps:?/gi, " ")
    .replace(/referencia:?/gi, " ")
    .replace(/cc\.?\s*las\s+plazuelas[^\n.]*/gi, " ")
    .replace(/santiago\s+de\s+surco[^\n.]*/gi, " ")
    .replace(/a\s+la\s+espalda\s+del[^\n.]*/gi, " ")
    .replace(/wong y (el )?kfc[^\n.]*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (stripped.length < 48) return true;
  return stripped.length < text.trim().length * 0.4;
}
