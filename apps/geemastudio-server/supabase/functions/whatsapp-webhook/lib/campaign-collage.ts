/**
 * Collages de campaña CTWA (Extensiones / Lifting) — capa visual de carriles.
 * No nombra chicas a la clienta; el cupo sigue en classifyExtensionesLane.
 */

import type { ServiceCatalog } from "./services-catalog.ts";
import { classifyExtensionesLane } from "./services-catalog.ts";
import { getConfigText, type WabaConfigMap } from "./waba-config.ts";
import { KARELIS_EFFECT_HINTS, STEPHANI_EFFECT_HINTS } from "./effect-hints.ts";

export type CampaignCollageKind =
  | "extensiones_stephani"
  | "extensiones_karelis"
  | "lifting";

export { KARELIS_EFFECT_HINTS, STEPHANI_EFFECT_HINTS };

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Elige collage de extensiones según texto (Karelis vs Stephani).
 * Default Stephani (Mirada de Impacto) si no hay señal clara.
 */
export function pickExtensionesCollageKindFromText(
  text: string,
): "extensiones_stephani" | "extensiones_karelis" {
  const t = norm(text);
  if (KARELIS_EFFECT_HINTS.some((h) => t.includes(norm(h)))) {
    return "extensiones_karelis";
  }
  if (STEPHANI_EFFECT_HINTS.some((h) => t.includes(norm(h)))) {
    return "extensiones_stephani";
  }
  return "extensiones_stephani";
}

export function pickCollageKindForService(
  serviceId: string,
  catalog: ServiceCatalog,
  fallbackText = "",
): CampaignCollageKind | null {
  const svc = catalog.servicesById.get(serviceId);
  if (!svc) return pickExtensionesCollageKindFromText(fallbackText);
  if (svc.category_id === "cat-lifting") return "lifting";
  if (svc.category_id === "cat-extensiones") {
    const lane = classifyExtensionesLane(serviceId, catalog);
    if (lane === "karelis") return "extensiones_karelis";
    if (lane === "stephani") return "extensiones_stephani";
    return pickExtensionesCollageKindFromText(
      `${fallbackText} ${svc.name} ${svc.short_name ?? ""}`,
    );
  }
  return null;
}

export function getCampaignCollageUrl(
  wabaConfig: WabaConfigMap,
  kind: CampaignCollageKind,
): { url: string; caption: string } | null {
  // Los collages "Mirada de Impacto" / "Mirada Espectacular" viven en el
  // portafolio (service_portfolio_images). Los slots meta_ads_extensiones_* y
  // meta_ads_lifting_image_1 son creativos de campaña (p. ej. Halloween) y no
  // deben usarse como foto de respuesta de precio + CTA.
  const map: Partial<
    Record<
      CampaignCollageKind,
      { urlKey: string; captionKey: string; defaultCaption: string }
    >
  > = {
    lifting: {
      urlKey: "meta_ads_lifting_image_2_url",
      captionKey: "meta_ads_lifting_image_2_caption",
      defaultCaption:
        "Lifting de pestañas — Antes/Después 💜 ¿Te agendo tu lifting?",
    },
  };
  const cfg = map[kind];
  if (!cfg) return null;
  const url = getConfigText(wabaConfig, cfg.urlKey, "").trim();
  if (!url) return null;
  const caption =
    getConfigText(wabaConfig, cfg.captionKey, "").trim() || cfg.defaultCaption;
  return { url, caption };
}

/**
 * True si el texto ya nombra un efecto/servicio concreto de pestañas
 * (no solo "extensiones" / "pestañas" genérico).
 * Ignora el bloque citado (`↳` / `[Respondiendo a]`) y "Precio" solo —
 * si no, un reply al collage dispara falso positivo (JNKM …0611).
 */
export function hasSpecificLashEffectIntent(text: string): boolean {
  // Import dinámico evitado: duplicamos el strip mínimo aquí para no ciclo Deno
  let typed = (text ?? "").trim();
  const arrow = typed.indexOf(" ↳ ");
  if (arrow >= 0) typed = typed.slice(0, arrow);
  const respIdx = typed.search(/\n\[Respondiendo a\]/i);
  if (respIdx >= 0) typed = typed.slice(0, respIdx);
  typed = typed.replace(/^\[Respondiendo a\][\s\S]*$/i, "").trim();

  const barePrice =
    /^(precios?|cuanto(s)?(\s+(cuesta|vale|sale|es))?\??|tarifas?)\s*\??$/i.test(
      typed
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim(),
    );
  if (barePrice) return false;

  const t = norm(typed);
  if (!t) return false;
  const hints = [
    ...KARELIS_EFFECT_HINTS,
    ...STEPHANI_EFFECT_HINTS,
    "lifting",
    "lash botox",
  ];
  return hints.some((h) => t.includes(norm(h)));
}

/**
 * Consulta genérica de precio en rubro pestañas/extensiones/lifting
 * (sin efecto concreto). Ej. "precio de las pestañas", "cuánto cuestan extensiones".
 */
export function hasGenericLashRubroPriceIntent(text: string): boolean {
  let typed = (text ?? "").trim();
  const arrow = typed.indexOf(" ↳ ");
  if (arrow >= 0) typed = typed.slice(0, arrow);
  const respIdx = typed.search(/\n\[Respondiendo a\]/i);
  if (respIdx >= 0) typed = typed.slice(0, respIdx);
  typed = typed.replace(/^\[Respondiendo a\][\s\S]*$/i, "").trim();

  if (hasSpecificLashEffectIntent(typed)) return false;

  const t = norm(typed);
  if (!t) return false;

  const asksPrice =
    /\b(precio|precios|cuanto|cuanta|cuesta|cuestan|vale|valen|costo|costos|tarifa|tarifas|cotiza|cotizacion)\b/.test(
      t,
    );
  const rubroLash = /(pestan|extension|lifting|lash\s*botox)/.test(t);

  return asksPrice && rubroLash;
}
