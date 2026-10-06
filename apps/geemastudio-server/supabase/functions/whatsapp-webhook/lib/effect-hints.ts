/**
 * Palabras clave de efecto de pestañas por chica (Karelis vs Stephani).
 * Módulo sin dependencias: portfolio.ts y campaign-collage.ts lo importan a
 * ambos; antes campaign-collage.ts declaraba estas listas y portfolio.ts las
 * importaba desde ahí, formando un ciclo con services-catalog.ts
 * (portfolio.ts -> campaign-collage.ts -> services-catalog.ts -> portfolio.ts)
 * que causaba "Cannot access '...' before initialization" en cold start.
 */

export const KARELIS_EFFECT_HINTS = [
  "mega volumen",
  "megavolumen",
  "fox",
  "hawaiana",
  "wispy",
  "anime",
  "ánime",
  "animes",
];

export const STEPHANI_EFFECT_HINTS = [
  "ojo de gato",
  "cat eye",
  "cat eyes",
  "cateye",
  "ardilla",
  "húmedo",
  "humedo",
  "mojado",
  "muñeca",
  "muneca",
  "ojo abierto",
  "rimel",
  "rímel",
  "baby vol",
  "vt 3d",
  "vt 4d",
  "3d",
  "4d",
];
