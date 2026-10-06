/**
 * Guías educativas de extensiones:
 * - pelo a pelo (maestra)
 * - fiber_* = fichas Extensiones_{Clásicas,Rimel,3D,4D}.jpeg (técnica + diseños)
 * - mapping_* = hojas finas de longitudes (Mapping_*.jpeg); Mojado solo mapping
 * Config: waba_config `edu_*` en categoría campanas.
 */

import { getConfigText, type WabaConfigMap } from "./waba-config.ts";
import { detectLashFiberKeys } from "./portfolio.ts";

export type EduGuideKind =
  | "pelo_a_pelo"
  | "fiber_clasicas"
  | "fiber_rimel"
  | "fiber_3d"
  | "fiber_4d"
  | "mapping_clasicas"
  | "mapping_rimel"
  | "mapping_mojado"
  | "mapping_3d"
  | "mapping_4d";

export type MappingTechnique = "clasicas" | "rimel" | "mojado" | "3d" | "4d";

const GUIDE_META: Record<
  EduGuideKind,
  { urlKey: string; captionKey: string; defaultCaption: string }
> = {
  pelo_a_pelo: {
    urlKey: "edu_pelo_a_pelo_url",
    captionKey: "edu_pelo_a_pelo_caption",
    defaultCaption:
      "Extensiones pelo a pelo 💜 Trabajamos fibra a fibra sobre tu pestaña natural. ¿Clásicas, Rímel, 3D o 4D?",
  },
  fiber_clasicas: {
    urlKey: "edu_fiber_clasicas_url",
    captionKey: "edu_fiber_clasicas_caption",
    defaultCaption:
      "Extensiones Clásicas 💜 Una fibra por pestaña — diseños ojo de gato, abierto, ardilla o muñeca. ¿Te gusta este look?",
  },
  fiber_rimel: {
    urlKey: "edu_fiber_rimel_url",
    captionKey: "edu_fiber_rimel_caption",
    defaultCaption:
      "Extensiones Rímel 💜 Más definición que Clásicas — mismos diseños sobre esta fibra. ¿Te agendo Rímel?",
  },
  fiber_3d: {
    urlKey: "edu_fiber_3d_url",
    captionKey: "edu_fiber_3d_caption",
    defaultCaption:
      "Volumen Tecnológico 3D 💜 3 fibras por pestaña — natural, ardilla o cat eyes. ¿Te gusta el 3D?",
  },
  fiber_4d: {
    urlKey: "edu_fiber_4d_url",
    captionKey: "edu_fiber_4d_caption",
    defaultCaption:
      "Volumen Tecnológico 4D 💜 Máximo volumen con diseños personalizados. ¿Te agendo el 4D?",
  },
  mapping_clasicas: {
    urlKey: "edu_mapping_clasicas_url",
    captionKey: "edu_mapping_clasicas_caption",
    defaultCaption:
      "Mapping fibra Clásicas 💜 Ojo de gato, abierto, ardilla o muñeca — el diseño es del mismo juego.",
  },
  mapping_rimel: {
    urlKey: "edu_mapping_rimel_url",
    captionKey: "edu_mapping_rimel_caption",
    defaultCaption:
      "Mapping fibra Rímel 💜 Diseños sobre el mismo juego — más definición que Clásicas.",
  },
  mapping_mojado: {
    urlKey: "edu_mapping_mojado_url",
    captionKey: "edu_mapping_mojado_caption",
    defaultCaption:
      "Mapping Mojado / Húmedo 💜 Diseños con acabado intenso sobre esa fibra.",
  },
  mapping_3d: {
    urlKey: "edu_mapping_3d_url",
    captionKey: "edu_mapping_3d_caption",
    defaultCaption:
      "Mapping Volumen Tecnológico 3D 💜 Ojo de gato, abierto, ardilla o muñeca.",
  },
  mapping_4d: {
    urlKey: "edu_mapping_4d_url",
    captionKey: "edu_mapping_4d_caption",
    defaultCaption:
      "Mapping Volumen Tecnológico 4D 💜 Máximo volumen con diseños personalizados.",
  },
};

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** “¿Son pelo a pelo / pelo por pelo / 1 a 1 / cómo funciona?” */
export function matchesPeloAPeloExplainIntent(text: string): boolean {
  const t = norm(text ?? "");
  if (!t) return false;
  if (/pelo\s*(a|por|x)\s*pelo/.test(t)) return true;
  if (/1\s*(a|por|x|:)\s*1/.test(t) && /(pestan|extension|fibra)/.test(t)) {
    return true;
  }
  if (
    /(como\s+funcion|que\s+es|que\s+son|explic)/.test(t) &&
    /(pestan|extension)/.test(t) &&
    /(pelo|fibra|una\s+a\s+una|1\s*a\s*1)/.test(t)
  ) {
    return true;
  }
  return false;
}

/** Pide ver diseños / mapeo / mapas de longitudes (no solo “foto del look”). */
export function matchesMappingExplainIntent(text: string): boolean {
  const t = norm(text ?? "");
  if (!t) return false;
  if (/\b(mapping|mapeo|mapas?\s+de\s+longitud)/.test(t)) return true;
  if (
    /\b(disenos?|diseños?)\b/.test(t) &&
    /(pestan|extension|ojo|gato|ardilla|muneca|abierto|clasic|rimel|3d|4d)/.test(
      t,
    )
  ) {
    return true;
  }
  // “quiero ver los diseños” / “qué diseños hay” sin foto de portafolio explícita
  if (
    /(ver|mostrar|pasan|pasa|mandan|manda)\s+(los\s+)?(disenos?|diseños?|mapas?)/.test(
      t,
    )
  ) {
    return true;
  }
  return false;
}

/**
 * Infere técnica de mapeo desde texto o nombre de servicio en carrito.
 * Default null si no hay señal (no adivinar 3D).
 */
export function pickMappingTechnique(
  text: string,
  cartServiceNames: string[] = [],
): MappingTechnique | null {
  const blob = norm([text, ...cartServiceNames].filter(Boolean).join(" "));
  if (!blob) return null;

  if (/\b(4d|volumen\s*tec.*4|baby\s*vol.*4)\b/.test(blob)) return "4d";
  if (/\b(3d|volumen\s*tec.*3|baby\s*vol)\b/.test(blob)) return "3d";
  if (/\b(mojado|humedo|wet)\b/.test(blob)) return "mojado";
  if (/\brimel\b/.test(blob)) return "rimel";
  if (/\bclasic/.test(blob)) return "clasicas";
  if (
    matchesMappingExplainIntent(text) &&
    /\b(pelo\s*(a|por)\s*pelo|1\s*(a|:)\s*1)\b/.test(blob)
  ) {
    return "clasicas";
  }
  return null;
}

export function mappingKindForTechnique(tech: MappingTechnique): EduGuideKind {
  switch (tech) {
    case "clasicas":
      return "mapping_clasicas";
    case "rimel":
      return "mapping_rimel";
    case "mojado":
      return "mapping_mojado";
    case "3d":
      return "mapping_3d";
    case "4d":
      return "mapping_4d";
  }
}

/** Ficha Extensiones_* (diseños + técnica). Mojado no tiene ficha → mapping. */
export function fiberKindForTechnique(tech: MappingTechnique): EduGuideKind {
  switch (tech) {
    case "clasicas":
      return "fiber_clasicas";
    case "rimel":
      return "fiber_rimel";
    case "3d":
      return "fiber_3d";
    case "4d":
      return "fiber_4d";
    case "mojado":
      return "mapping_mojado";
  }
}

/** Pide fotos/ficha de una fibra (no solo “portafolio de ojos”). */
export function matchesFiberCardIntent(text: string): boolean {
  const t = norm(text ?? "");
  if (!t) return false;
  if (!pickMappingTechnique(t)) return false;
  return /(foto|ver|mostrar|mand|pas|referenc|explic|que\s+es|como\s+es|ficha|info|precio|cuanto|estilo|queda)/.test(
    t,
  );
}

export function parseEduGuideActionParam(param: string): EduGuideKind | null {
  const p = norm(param).replace(/\s+/g, "_");
  if (p === "pelo_a_pelo" || p === "peloapelo") return "pelo_a_pelo";
  if (p === "fiber_clasicas") return "fiber_clasicas";
  if (p === "fiber_rimel") return "fiber_rimel";
  if (p === "fiber_3d") return "fiber_3d";
  if (p === "fiber_4d") return "fiber_4d";
  if (p === "mapping_clasicas" || p === "clasicas") return "mapping_clasicas";
  if (p === "mapping_rimel" || p === "rimel") return "mapping_rimel";
  if (p === "mapping_mojado" || p === "mojado") return "mapping_mojado";
  if (p === "mapping_3d" || p === "3d") return "mapping_3d";
  if (p === "mapping_4d" || p === "4d") return "mapping_4d";
  return null;
}

export function getEduGuideImage(
  wabaConfig: WabaConfigMap,
  kind: EduGuideKind,
): { url: string; caption: string } | null {
  const meta = GUIDE_META[kind];
  const url = getConfigText(wabaConfig, meta.urlKey, "").trim();
  if (!url) return null;
  const caption =
    getConfigText(wabaConfig, meta.captionKey, "").trim() ||
    meta.defaultCaption;
  return { url, caption };
}

/** Claves de ficha fibra para un LashFiberKey de portafolio (3d/rimel/…). */
export function fiberEduKindForLashKey(key: string): EduGuideKind | null {
  switch (key) {
    case "clasicas":
      return "fiber_clasicas";
    case "rimel":
      return "fiber_rimel";
    case "3d":
      return "fiber_3d";
    case "4d":
      return "fiber_4d";
    default:
      return null;
  }
}

/**
 * Compara 2+ fibras/SKU (Nicole: «fotos 3D, rimel y foxy») → guía pelo a pelo.
 * Reusa `detectLashFiberKeys` (portfolio.ts) como fuente única de fibras
 * reconocidas — antes esta función mantenía su propia lista de regex en
 * paralelo, con riesgo de que ambas quedaran desincronizadas al agregar SKU.
 */
export function matchesFiberCompareGuideIntent(text: string): boolean {
  const t = norm(text ?? "");
  if (!t) return false;
  if (detectLashFiberKeys(text).length < 2) return false;
  return /(foto|ver|mostrar|mand|pas|diferenc|compar|estilo|queda|tipo\s+de\s+fibra|referenc)/.test(
    t,
  );
}

/**
 * Elige guía a enviar según el mensaje + servicios en carrito.
 * Prioridad: pelo a pelo > ficha Extensiones_* (diseños) > mapping fino > compare.
 */
export function pickEduGuideToSend(
  text: string,
  cartServiceNames: string[] = [],
): EduGuideKind | null {
  if (matchesPeloAPeloExplainIntent(text)) {
    if (matchesMappingExplainIntent(text)) {
      const tech = pickMappingTechnique(text, cartServiceNames);
      if (tech) return fiberKindForTechnique(tech);
    }
    return "pelo_a_pelo";
  }
  // Varias fibras → guía maestra (las fichas Extensiones_* las manda portafolio)
  if (matchesFiberCompareGuideIntent(text)) {
    return "pelo_a_pelo";
  }
  const tech = pickMappingTechnique(text, cartServiceNames);
  const t = norm(text ?? "");
  const wantsMappingSheet = /\b(mapping|mapeo|mapas?\s+de\s+longitud)\b/.test(
    t,
  );
  if (matchesMappingExplainIntent(text) || matchesFiberCardIntent(text)) {
    if (tech) {
      return wantsMappingSheet
        ? mappingKindForTechnique(tech)
        : fiberKindForTechnique(tech);
    }
    return "pelo_a_pelo";
  }
  return null;
}
