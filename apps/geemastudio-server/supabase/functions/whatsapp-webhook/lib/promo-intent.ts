import { matchesQuotedOfferConfirm } from "./pending-price-cta.ts";

/** Navegación pura al listado de promos — sin filtro por categoría/servicio. */
export const PURE_PROMOS_NAV_KEYWORDS = [
  "ver promos",
  "ver promociones",
  "mostrar promos",
  "qué promos tienen",
  "que promos tienen",
  "cuáles promos",
  "cuales promos",
  "ver ofertas",
  "ver descuentos",
] as const;

/**
 * Intención de abrir el menú/lista genérica de promos.
 * "ver promos" / "promos" sueltos → lista. "la promo", "ver promos de uñas",
 * "vi la promo de Mirada de Impacto" → false (Haiku).
 */
export function matchesPurePromosNavigationIntent(lower: string): boolean {
  const t = lower.trim().normalize("NFD").replace(/\p{M}/gu, "");
  if (t === "2") return true;
  if (!/\bpromo|\boferta|\bdescuento/.test(t)) return false;
  if (matchesQuotedOfferConfirm(lower)) return false;
  const stripped = t
    .replace(
      /\b(ver|mostrar|ensename|enseneme|pasa(me)?)\s+(las\s+)?(promos?|promociones?|ofertas?|descuentos?)\b/gi,
      " ",
    )
    .replace(
      /\b(que|cuales)\s+(promos?|promociones?|ofertas?)\s*(tienen|hay)?\b/gi,
      " ",
    )
    .replace(/\b(promos?|promociones?|ofertas?|descuentos?)\b/gi, " ")
    .replace(/\b(ver|mostrar|quiero|necesito|me|las|los|un|una|el|la)\b/gi, " ")
    .replace(/[¿?¡!.,;:()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length <= 2;
}

/** Promos/ofertas acotadas a un rubro — Haiku responde en texto, sin lista genérica. */
const PROMO_FILTER_KEYWORDS = [
  "uñas",
  "unas",
  "pedicure",
  "manicure",
  "builder",
  "pestaña",
  "pestañas",
  "extensiones",
  "lifting",
  "cejas",
  "depil",
  "microblading",
  "rostro",
  "facial",
] as const;

export function matchesFilteredPromosIntent(lower: string): boolean {
  if (
    !/\bpromo/i.test(lower) &&
    !/\boferta/i.test(lower) &&
    !/\bdescuento/i.test(lower)
  ) {
    return false;
  }
  if (matchesPurePromosNavigationIntent(lower)) return false;
  return PROMO_FILTER_KEYWORDS.some((k) => lower.includes(k));
}
