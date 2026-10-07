/**
 * Detecta si el primer mensaje CTWA es solo el boilerplate de Meta Ads
 * ("¡Hola! Quiero más información") vs. trae intención extra (ej. "extensiones").
 * En boilerplate → pregunta de interés (o welcome legacy) y esperar 2.º mensaje.
 * Con intención extra → continuar a Haiku en el mismo turno.
 *
 * Coalesce puede pegar 2+ CTAs idénticos con `\n` (anti-dup paralelo) y superar
 * 55 chars — eso NO es intención extra: cada línea boilerplate sigue siendo CTA vacío.
 *
 * Mix CTWA boilerplate + orgánico (Jessi …6106: "Informacion y precio" + Mirada
 * Espectacular) → `splitCtwaBoilerplateAndIntent` (no tratar el bloque entero
 * como intención larga ni como boilerplate puro).
 */
export function isMetaAdsBoilerplateCta(text: string): boolean {
  return splitCtwaBoilerplateAndIntent(text).allBoilerplate;
}

/**
 * Separa líneas CTWA boilerplate de la intención orgánica en un coalesce.
 * - allBoilerplate: solo CTA vacío (interés list).
 * - hasBoilerplate + intentText: mix → Haiku solo con intentText (sin avalancha).
 */
export function splitCtwaBoilerplateAndIntent(text: string): {
  allBoilerplate: boolean;
  hasBoilerplate: boolean;
  intentText: string;
} {
  const trimmed = text.trim();
  if (!trimmed) {
    return { allBoilerplate: true, hasBoilerplate: true, intentText: "" };
  }

  const lines = trimmed
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    const bp = isMetaAdsBoilerplateCtaSingle(trimmed);
    return {
      allBoilerplate: bp,
      hasBoilerplate: bp,
      intentText: bp ? "" : trimmed,
    };
  }

  const intentLines = lines.filter((l) => !isMetaAdsBoilerplateCtaSingle(l));
  const hasBoilerplate = intentLines.length < lines.length;
  return {
    allBoilerplate: intentLines.length === 0,
    hasBoilerplate,
    intentText: intentLines.join("\n").trim(),
  };
}

function isMetaAdsBoilerplateCtaSingle(trimmed: string): boolean {
  if (!trimmed) return true;

  // Strip emoji antes del gate de longitud (UTF-16 cuenta 💜 como 2 unidades).
  const withoutEmoji = trimmed
    .replace(/\p{Extended_Pictographic}/gu, "")
    .trim();
  if (withoutEmoji.length > 55) return false;

  const normalized = withoutEmoji
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[!?.,¡¿]/g, "")
    .trim();

  if (/^hola\s+quiero\s+mas\s+informacion\s*$/.test(normalized)) return true;
  if (
    /^hola\s+me\s+gustaria\s+conseguir\s+mas\s+informacion\s+sobre\s+esto\s*$/
      .test(
        normalized,
      )
  ) {
    return true;
  }
  // Campaña Set 2026 — "¡Hola! Quiero despertar con una Mirada Espectacular 💜"
  if (
    /^hola\s+quiero\s+despertar\s+con\s+una\s+mirada\s+espectacular\s*$/.test(
      normalized,
    )
  ) {
    return true;
  }
  // Set-Oct 2026 — autofill "estilo de pestañas" es INTENCIÓN (no BP):
  // length >55 → false arriba; no listar aquí como boilerplate.

  return false;
}

/**
 * Copy pre-filled por creativos CTWA conocidos — atribución cuando Meta omite
 * referral/ctwa_clid (Milagros PE.…5190, Gladys, análisis 09–13 ago [P2]).
 * No sustituye isFromAd; solo habilita markSessionFromAd / ads-bounce.
 */
export function isKnownCtwaCampaignCopy(text: string): boolean {
  const n = text.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (!n || n.length < 20) return false;
  // Campaña activa "15% manos y pies" (QA CTWA_AGENDAR / Milagros)
  if (
    /15\s*%/.test(n) &&
    /manos/.test(n) &&
    /pies/.test(n) &&
    /agendar/.test(n)
  ) {
    return true;
  }
  // Campaña "Mirada de Impacto" (extensiones; Maruja …8481)
  if (/mirada\s+de\s+impacto/.test(n) && /agendar/.test(n)) {
    return true;
  }
  // Campaña Set 2026 — "Mirada Espectacular" (BSUID sin referral; análisis 31-ago [P1])
  if (/mirada\s+espectacular/.test(n)) return true;
  // Campaña Set-Oct 2026 — autofill CTWA (BSUID sin referral)
  // "¡Hola! Quiero saber qué estilo de pestañas me queda mejor 💜"
  // Strip ¡¿ como en boilerplate: si no, /^hola/ no matchea.
  const nBare = n
    .replace(/[!?.,¡¿]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (/estilo\s+de\s+pestanas/.test(nBare) && /me\s+queda/.test(nBare)) {
    return true;
  }
  if (/que\s+mirada\s+quieres\s+llevar/.test(nBare)) return true;
  // Fiestas Patrias (histórico LECCIONES …3356)
  if (/fiestas\s+patrias/.test(n) && /quiero\s+mas\s+info/.test(n)) {
    return true;
  }
  return false;
}

/** Cierre del texto Meta Ads: pregunta abierta, sin menú interactivo. */
export const META_ADS_SERVICES_TEXT_CLOSING_DEFAULT =
  "¿Cuál servicio te llama más la atención? Escríbenos y te contamos precios y opciones 💜";
