/**
 * Venta emocional CTWA v1 — Extensiones y Lifting.
 *
 * Alcance v1: solo leads con `from_ad_at` y carrito 100 % cat-extensiones / cat-lifting.
 * Tras días de prueba en prod se ampliará (uñas, orgánico, más momentos del funnel).
 * Ver docs/waba/prompts/WABA_HAIKU_DIRECTRICES.md § Venta emocional CTWA.
 */

import type { ServiceCatalog } from "./services-catalog.ts";
import {
  getCampaignCollageUrl,
  pickCollageKindForService,
} from "./campaign-collage.ts";
import { getConfigText, type WabaConfigMap } from "./waba-config.ts";

export type CtwaEmotionalRubro = "extensiones" | "lifting";

const CTWA_EMOTIONAL_CATEGORY_IDS = new Set(["cat-extensiones", "cat-lifting"]);

export const EMOTIONAL_ALMOST_CLOSE_LINES_EXT_DEFAULT = [
  "Esa mirada que viste en el anuncio puede ser tuya ✨ Solo falta elegir el día — date ese momento para ti.",
  "No lo dejes para después: invertir en ti es sentirte valorada 💜 Tu {servicio} te está esperando.",
  "Libérate del estrés un rato y ven por ese look que ya elegiste ✨",
  "Imagina despertar con tu mirada lista cada día — estás a un paso con tu {servicio}.",
  "No es solo pestañas: es un espacio donde te sentimos valorada. Elige el día que te acomode 💜",
] as const;

export const EMOTIONAL_ALMOST_CLOSE_LINES_LIFT_DEFAULT = [
  "Tu mirada puede lucir espectacular sin maquillaje diario ✨ Solo falta elegir el día que te acomode.",
  "Invertir en ti es sentirte valorada 💜 Tu {servicio} te está esperando en el salón.",
  "Date ese momento para ti — el lifting que elegiste puede cambiar tu rutina ✨",
  "No lo dejes para después: esa mirada despierta que buscas está a un paso 💜",
  "Libérate del estrés un rato y ven por el look que ya tienes en tu selección ✨",
] as const;

export const EMOTIONAL_DECLINE_REPLY_CTWA_DEFAULT =
  "¡Por supuesto! 💜 Tómate tu tiempo — cuando quieras retomar, escribe *agendar* y te ayudamos con gusto. ¡Que tengas un lindo día! 🌸";

export const EMOTIONAL_NUDGE2_REPLY_CTWA_DEFAULT =
  "Sin presión 💜 Si más adelante quieres retomar tu cita, escribe *agendar* y te pasamos al calendario en segundos.";

export const EMOTIONAL_PRICE_CTA_EXT_DEFAULT =
  "Así puede quedar {parte} con {servicio} ✨\nEsa mirada que buscas puede ser tuya — ¿te agendo cuando te animes? 💜";

export const EMOTIONAL_SELLING_CTWA_EXT_LIFT_DEFAULT = `VENTA EMOCIONAL CTWA (Extensiones / Lifting) — solo si la clienta llegó por anuncio Meta:
- Tono: metáfora suave (valoración, invertir en ti, merecer verte bien). PROHIBIDO rol de psicóloga/terapeuta ni claims médicos.
- Máx 2 burbujas cortas; siempre anclar a un paso concreto (show_category, add_to_cart, calendario). Nunca inventar precios.
- Precio genérico pestañas: valida el deseo + beneficio emocional breve antes de la lista.
- Carrito armado / casi agenda: nombra el servicio elegido ({servicio}) + invitación suave a elegir día.
- Hesitación ("lo pienso", "gracias por la info"): empatía + puerta abierta; NO menú agresivo ni presión.
Frases guía (adaptar, no copiar literal todas a la vez):
- "Libérate del estrés un rato y date ese momento para ti en el salón."
- "No es solo extensiones: es un espacio donde te sentimos valorada."
- "No lo dejes para después — esa mirada que buscas puede ser tuya."
- "Imagina despertar con tu mirada lista cada día."`;

export function applyEmotionalPlaceholders(
  template: string,
  vars: { servicio?: string; rubro?: string; parte?: string },
): string {
  return template
    .replace(/\{servicio\}/gi, vars.servicio ?? "tu servicio")
    .replace(/\{rubro\}/gi, vars.rubro ?? "pestañas")
    .replace(/\{parte\}/gi, vars.parte ?? "tu look");
}

/** Lee array de líneas desde waba_config ({ lines: string[] } o texto multilínea). */
export function getConfigLines(
  wabaConfig: WabaConfigMap,
  key: string,
  defaults: readonly string[],
): string[] {
  const raw = wabaConfig.get(key);
  if (raw && Array.isArray(raw.lines)) {
    const lines = raw.lines
      .filter((l): l is string => typeof l === "string")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 0) return lines;
  }
  if (raw && typeof raw.text === "string" && raw.text.trim()) {
    const lines = raw.text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length > 0) return lines;
  }
  return [...defaults];
}

export function pickRotatingLine(phone: string, lines: string[]): string {
  if (lines.length === 0) return "";
  let h = 0;
  for (let i = 0; i < phone.length; i++) {
    h = (h + phone.charCodeAt(i) * (i + 1)) % 10007;
  }
  return lines[h % lines.length];
}

export function cartServiceIdsAreExtOrLift(
  serviceIds: string[],
  catalog: ServiceCatalog,
): boolean {
  if (serviceIds.length === 0) return false;
  return serviceIds.every((id) => {
    const svc = catalog.servicesById.get(id);
    return (
      svc?.category_id != null &&
      CTWA_EMOTIONAL_CATEGORY_IDS.has(svc.category_id)
    );
  });
}

export function primaryRubroFromServiceIds(
  serviceIds: string[],
  catalog: ServiceCatalog,
): CtwaEmotionalRubro | null {
  if (serviceIds.length === 0) return null;
  const cats = new Set(
    serviceIds
      .map((id) => catalog.servicesById.get(id)?.category_id)
      .filter(Boolean),
  );
  if (cats.size !== 1) return null;
  const only = [...cats][0];
  if (only === "cat-extensiones") return "extensiones";
  if (only === "cat-lifting") return "lifting";
  return null;
}

export function primaryServiceLabel(
  serviceIds: string[],
  catalog: ServiceCatalog,
): string {
  const id = serviceIds[0];
  if (!id) return "tu servicio";
  const svc = catalog.servicesById.get(id);
  return svc?.short_name?.trim() || svc?.name?.trim() || "tu servicio";
}

export function isCtwaEmotionalEligible(
  fromAdAt: string | null | undefined,
  serviceIds: string[],
  catalog: ServiceCatalog,
): boolean {
  return Boolean(fromAdAt) && cartServiceIdsAreExtOrLift(serviceIds, catalog);
}

export function resolveAlmostCloseImage(
  wabaConfig: WabaConfigMap,
  catalog: ServiceCatalog,
  serviceIds: string[],
  fallbackText = "",
): { url: string; caption?: string } | null {
  const primaryId = serviceIds[0];
  if (primaryId && catalog.portfolioIndex?.length) {
    const entry = catalog.portfolioIndex.find(
      (p) => p.serviceId === primaryId && p.url?.trim(),
    );
    if (entry?.url) return { url: entry.url };
  }
  if (primaryId) {
    const kind = pickCollageKindForService(primaryId, catalog, fallbackText);
    if (kind) {
      const collage = getCampaignCollageUrl(wabaConfig, kind);
      if (collage?.url) {
        return { url: collage.url, caption: collage.caption };
      }
    }
  }
  return null;
}

/** True si la línea invita a "elegir el día" — no vale si la clienta ya lo eligió y solo falta la hora. */
function lineMentionsDay(line: string): boolean {
  return /\bd[ií]a\b/i.test(line);
}

export function buildAlmostCloseNudge1Text(
  wabaConfig: WabaConfigMap,
  phone: string,
  rubro: CtwaEmotionalRubro,
  serviceName: string,
  dayAlreadyPicked = false,
): string {
  const key =
    rubro === "lifting"
      ? "emotional_almost_close_lines_lift"
      : "emotional_almost_close_lines_ext";
  const defaults =
    rubro === "lifting"
      ? EMOTIONAL_ALMOST_CLOSE_LINES_LIFT_DEFAULT
      : EMOTIONAL_ALMOST_CLOSE_LINES_EXT_DEFAULT;
  const allLines = getConfigLines(wabaConfig, key, defaults);
  // Si el día ya está elegido (falta solo la hora), evita líneas que invitan
  // a "elegir el día" — Doris …8088 recibió "Solo falta elegir el día" con
  // el día ya elegido, reenviando en realidad el selector de hora (12-sep-2026).
  const lines = dayAlreadyPicked
    ? allLines.filter((l) => !lineMentionsDay(l))
    : allLines;
  const picked = pickRotatingLine(phone, lines.length > 0 ? lines : allLines);
  const body = applyEmotionalPlaceholders(picked, {
    servicio: serviceName,
    rubro: rubro === "lifting" ? "lifting" : "pestañas",
  });
  const closing = dayAlreadyPicked
    ? "Te reenviamos el horario disponible 👇"
    : "Te reenviamos el calendario 👇";
  return `${body}\n\n${closing}`;
}

export function buildEmotionalNudge2Text(
  wabaConfig: WabaConfigMap,
  cartDesc: string,
): string {
  const template = getConfigText(
    wabaConfig,
    "emotional_nudge2_reply_ctwa",
    EMOTIONAL_NUDGE2_REPLY_CTWA_DEFAULT,
  );
  return applyEmotionalPlaceholders(template, { servicio: cartDesc });
}

export function buildEmotionalDeclineReply(wabaConfig: WabaConfigMap): string {
  return getConfigText(
    wabaConfig,
    "emotional_decline_reply_ctwa",
    EMOTIONAL_DECLINE_REPLY_CTWA_DEFAULT,
  );
}

export function buildCtwaPricePhotoCaption(
  wabaConfig: WabaConfigMap,
  serviceName: string,
  parteDelCuerpo: string,
): string {
  const template = getConfigText(
    wabaConfig,
    "emotional_price_cta_ext",
    EMOTIONAL_PRICE_CTA_EXT_DEFAULT,
  );
  return applyEmotionalPlaceholders(template, {
    servicio: serviceName,
    parte: parteDelCuerpo,
  });
}

export function resolveEmotionalSellingPromptBlock(
  wabaConfig: WabaConfigMap,
): string {
  return getConfigText(
    wabaConfig,
    "haiku_emotional_selling_ctwa_ext_lift",
    EMOTIONAL_SELLING_CTWA_EXT_LIFT_DEFAULT,
  );
}
