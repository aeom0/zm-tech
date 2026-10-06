/**
 * Clasifica caption de foto inbound para priorizar el push a staff.
 * Merillyn …7296: "Se me acaban de caer mis uñas Rubber" → no es diseño
 * de look, es uñas dañadas / otro salón. Deno + Node (QA unit).
 */

/**
 * @param {string | null | undefined} caption
 * @returns {boolean}
 */
export function isDamagedNailsImageCaption(caption) {
  const raw = typeof caption === "string" ? caption : "";
  const c = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
  if (!c) return false;

  const mentionsNails =
    /\bunas?\b/.test(c) ||
    /\b(rubber|ruber|soft\s*gel|poly\s*gel|polygel|builder(\s+gel)?)\b/.test(c);

  if (/\breclamo\b/.test(c)) return true;
  if (/\bgarant[ií]a\b/.test(c) && mentionsNails) return true;
  if (
    /\b(otro\s+salon|otro\s+local|otro\s+sitio)\b/.test(c) &&
    mentionsNails
  ) {
    return true;
  }

  // "se me acaban de caer", "se cayeron", "me caen"
  if (
    mentionsNails &&
    (/\b(se\s+me\s+)?(acaban?\s+de\s+)?caer/.test(c) ||
      /\b(caid|caen|cayeron|cayendo)\w*/.test(c) ||
      /\b(quebr|romp|lastim|dañad|danad)\w*/.test(c))
  ) {
    return true;
  }

  return false;
}

/**
 * @param {{
 *   alreadyPaused: boolean;
 *   firstName: string;
 *   hasImageUrl: boolean;
 *   caption?: string | null;
 * }} opts
 * @returns {{ title: string; body: string }}
 */
export function getDesignImagePushCopy(opts) {
  const {
    alreadyPaused,
    firstName,
    hasImageUrl,
    caption = null,
  } = opts;
  const name = (firstName || "Clienta").slice(0, 40);
  const damaged = isDamagedNailsImageCaption(caption);
  const bodyExtra = hasImageUrl
    ? "Abre el chat para ver la foto."
    : "La foto llegó pero no se pudo guardar en el panel; pídele que la reenvíe.";

  if (alreadyPaused) {
    if (damaged) {
      return {
        title: "📷 Otra foto · Uñas dañadas",
        body: `${name}: otra foto (uñas dañadas / reclamo). ${bodyExtra}`,
      };
    }
    return {
      title: "📷 Otra foto · WhatsApp",
      body: `${name}: mandó otra foto. ${bodyExtra}`,
    };
  }

  if (damaged) {
    return {
      title: "📷 Uñas dañadas · Revisar YA",
      body: `${name}: foto de uñas caídas/lastimadas (posible otro salón o reclamo). Bot en pausa. ${bodyExtra}`,
    };
  }

  return {
    title: "📷 Foto diseño · Revisar YA",
    body: `${name}: foto de diseño (puede cambiar precio/tiempo). Bot en pausa. ${bodyExtra}`,
  };
}
