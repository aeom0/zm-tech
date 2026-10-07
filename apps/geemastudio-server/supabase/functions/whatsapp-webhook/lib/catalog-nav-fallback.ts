/**
 * Contador de taps consecutivos de navegación pura de catálogo (subcategoría
 * → ver más → volver → categorías, sin seleccionar un ítem concreto).
 * Al llegar al umbral, se invita a contar en palabras propias qué busca en
 * vez de reenviar otra lista (caso Jerita PE...8523, laberinto de listas vía
 * taps — Haiku nunca interviene en navegación por IDs interactivos, solo en
 * texto libre). Tono alineado con venta emocional (tenants/zm-lash/directrices-haiku.md
 * § Venta emocional CTWA): acompañar, no apurar ni sonar transaccional.
 */

export const CATALOG_NAV_HELP_THRESHOLD = 4;

export function nextCatalogNavState(currentCount: number | null | undefined): {
  /** Valor a persistir en `whatsapp_sessions.catalog_nav_taps_count`. */
  nextCount: number;
  /** Si true: ofrecer cotizar por texto y resetear el contador. */
  shouldOfferHelp: boolean;
} {
  const count = (Number(currentCount) || 0) + 1;
  if (count >= CATALOG_NAV_HELP_THRESHOLD) {
    return { nextCount: 0, shouldOfferHelp: true };
  }
  return { nextCount: count, shouldOfferHelp: false };
}

export const CATALOG_NAV_HELP_TEXT =
  "Veo que estás explorando varias opciones 💜 Cuéntame con tus palabras qué buscas o cómo te gustaría lucir, y te ayudo directo — sin tanta lista de por medio.";
