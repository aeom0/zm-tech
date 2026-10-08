/**
 * Pending price CTA — set/recover after Haiku quotes a concrete service.
 * Caso SOFI (28-ago): "Cuánto está" → S/110 Anime con action:none → sin pending → "Si" cae a menú.
 */

import type { ServiceCatalog } from "./services-catalog.ts";
import {
  parsePackServiceIds,
  resolveCartItemPrice,
} from "./services-catalog.ts";
import type { CartItem, SupabaseClient } from "./supabase.ts";
import { addCartItems, upsertSession } from "./supabase.ts";

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Igual que norm, pero une "Clásicas/Rímel" con "Clásicas / Rímel". */
function normForMatch(s: string): string {
  return norm(s)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Servicio del catálogo (ext/lift preferido) nombrado en el texto de Haiku. */
export function findServiceQuotedInHaikuText(
  text: string,
  catalog: ServiceCatalog,
  preferCategoryIds: string[] = ["cat-extensiones", "cat-lifting"],
): {
  id: string;
  name: string;
  price: string;
  category_id: string | null;
} | null {
  const t = normForMatch(text ?? "");
  if (!t || !/S\s*\/\s*\d/i.test(text ?? "")) return null;

  let best: {
    id: string;
    name: string;
    price: string;
    category_id: string | null;
    score: number;
  } | null = null;

  for (const svc of catalog.servicesById.values()) {
    const cat = svc.category_id ?? null;
    const nameN = normForMatch(svc.name ?? "");
    const shortN = normForMatch(svc.short_name ?? "");
    let hit = 0;
    if (nameN.length >= 3 && t.includes(nameN)) hit = nameN.length;
    if (shortN.length >= 3 && t.includes(shortN)) {
      hit = Math.max(hit, shortN.length + 1);
    }
    if (hit === 0) continue;
    const prefer = cat && preferCategoryIds.includes(cat) ? 100 : 0;
    const score = prefer + hit;
    if (!best || score > best.score) {
      best = {
        id: svc.id,
        name: svc.name,
        price: String(svc.price),
        category_id: cat,
        score,
      };
    }
  }
  return best
    ? {
      id: best.id,
      name: best.name,
      price: best.price,
      category_id: best.category_id,
    }
    : null;
}

/** Pack del catálogo nombrado en el texto de Haiku (con S/). */
export function findPackQuotedInHaikuText(
  text: string,
  catalog: ServiceCatalog,
): { id: string; name: string; price: string } | null {
  const t = normForMatch(text ?? "");
  if (!t || !/S\s*\/\s*\d/i.test(text ?? "")) return null;

  let best: { id: string; name: string; price: string; score: number } | null =
    null;
  for (const pack of catalog.packsById.values()) {
    const titleN = normForMatch(pack.title ?? "");
    const shortN = normForMatch(pack.short_name ?? "");
    let hit = 0;
    if (titleN.length >= 5 && t.includes(titleN)) hit = titleN.length;
    if (shortN.length >= 5 && t.includes(shortN)) {
      hit = Math.max(hit, shortN.length + 1);
    }
    if (hit === 0) continue;
    if (!best || hit > best.score) {
      best = {
        id: pack.id,
        name: pack.short_name ?? pack.title,
        price: String(pack.pack_price),
        score: hit,
      };
    }
  }
  return best ? { id: best.id, name: best.name, price: best.price } : null;
}

/**
 * Confirmación del pack/servicio que Haiku acaba de cotizar.
 * "Si claro el pack" / "quiero el pack que me ofreció" / "Si confirmamos"
 * (Alberto VE …0417, 16-sep).
 */
export function matchesQuotedOfferConfirm(text: string): boolean {
  const t = norm(text ?? "").trim();
  if (!t || t.length > 160) return false;
  if (
    /\b(que packs|ver packs?|tienen packs?|que pack tienen|ver promos?|que promos?)\b/
      .test(
        t,
      ) &&
    !/\b(si|claro|dale|quiero|ofrec|dij|confirm)\b/.test(t)
  ) {
    return false;
  }
  if (
    /^(si|claro|dale|va|ok|okay)\b.{0,80}\bpack\b/.test(t) ||
    /\b(quiero|ese)\s+pack\b/.test(t) ||
    /\bpack que me (ofrec|dij|cotiz)/.test(t) ||
    /\bel pack (es mejor|que me)\b/.test(t) ||
    /^(el|ese|este)\s+(pack|combo)(\s+es mejor)?\s*$/.test(t) ||
    /^(pack|combo)\s*$/.test(t) ||
    /^(la|esa|esta)\s+(promo|promocion)(\s+es mejor)?\s*$/.test(t) ||
    /^(si|claro|dale|va|ok|okay)\b.{0,80}\bpromo/.test(t) ||
    /^(si|claro|dale|va|ok|okay)\b.{0,50}\bconfirm/.test(t) ||
    /^confirmamos\b/.test(t) ||
    /^(si|ok|okay|claro|dale|va)\b.{0,70}\bme gusta/.test(t)
  ) {
    return true;
  }
  return false;
}

/** True si Haiku ya cerró cotizando y preguntó confirmar — no reenviar collage CTA. */
export function haikuAlreadyAskedToConfirm(text: string): boolean {
  const t = text ?? "";
  return (
    /\bconfirmamos\b/i.test(t) ||
    /\bquedar[ií]a\b/i.test(t) ||
    /\btotal\s*[:=]\s*S\s*\//i.test(t)
  );
}

/**
 * Packs y servicios cotizados (S/ + nombre) en un texto Haiku.
 * Si hay pack, no duplica los servicios que ya incluye.
 */
export function findQuotedOfferIdsInText(
  text: string,
  catalog: ServiceCatalog,
): string[] {
  const t = normForMatch(text ?? "");
  if (!t || !/S\s*\/\s*\d/i.test(text ?? "")) return [];

  const ids: string[] = [];
  const packMemberIds = new Set<string>();
  const quotedPackNameNorms = new Set<string>();
  for (const pack of catalog.packsById.values()) {
    const titleN = normForMatch(pack.title ?? "");
    const shortN = normForMatch(pack.short_name ?? "");
    // Haiku suele parafrasear el pack ("Lifting de Pestañas + Planchado de
    // Cejas: S/90" vs título "Lifting + Planchado", …7393): también es pack
    // cotizado si el texto trae el precio del pack y TODOS sus servicios.
    const memberIds = parsePackServiceIds(pack);
    const priceN = Math.round(Number(pack.pack_price));
    const byMembers = memberIds.length >= 2 && priceN > 0 &&
      new RegExp(`S\\s*/\\s*${priceN}(?!\\d)`, "i").test(text ?? "") &&
      memberIds.every((sid) => {
        const svc = catalog.servicesById.get(sid);
        const n = normForMatch(svc?.name ?? "");
        return n.length >= 3 && t.includes(n);
      });
    const hit = byMembers ||
      (titleN.length >= 5 && t.includes(titleN)) ||
      (shortN.length >= 5 && t.includes(shortN));
    if (!hit) continue;
    ids.push(pack.id);
    if (titleN) quotedPackNameNorms.add(titleN);
    if (shortN) quotedPackNameNorms.add(shortN);
    for (const sid of parsePackServiceIds(pack)) packMemberIds.add(sid);
  }

  for (const svc of catalog.servicesById.values()) {
    if (packMemberIds.has(svc.id)) continue;
    const nameN = normForMatch(svc.name ?? "");
    const shortN = normForMatch(svc.short_name ?? "");
    // SKU clon: servicio con el mismo nombre que el pack cotizado (Manos+Pies).
    if (
      (nameN && quotedPackNameNorms.has(nameN)) ||
      (shortN && quotedPackNameNorms.has(shortN))
    ) {
      continue;
    }
    let hit = false;
    if (nameN.length >= 3 && t.includes(nameN)) hit = true;
    if (shortN.length >= 3 && t.includes(shortN)) hit = true;
    if (!hit) {
      const stripped = nameN
        .replace(/^extensiones\s+(efect\s+)?/, "")
        .replace(/^retoque\s+/, "")
        .trim();
      if (
        stripped.length >= 6 &&
        t.includes(stripped) &&
        /\bextension/.test(t)
      ) {
        hit = true;
      }
    }
    if (hit) ids.push(svc.id);
  }
  return ids;
}

/** True si el texto pregunta precio suelto ("cuánto está", "precio?") sin efecto. */
export function isBarePriceFollowUp(text: string): boolean {
  const t = norm(text ?? "").trim();
  if (!t) return false;
  return /^(precios?|cuanto(s)?(\s+(esta|está|cuesta|vale|sale|es|cuesta))?\??|y\s+el\s+precio\??|tarifas?)\s*\??$/
    .test(
      t,
    );
}

const QUOTE_CLUSTER_MS = 20_000;

/**
 * IDs cotizados en el último turno Haiku (burbujas a ≤20 s).
 * Pack + servicio extra (Mojado) salen juntos; no pisa el pack con un SKU viejo.
 */
export async function findRecentQuotedOfferIds(
  supabase: SupabaseClient,
  phone: string,
  catalog: ServiceCatalog,
  lookbackMs = 30 * 60 * 1000,
): Promise<string[]> {
  const since = new Date(Date.now() - lookbackMs).toISOString();
  const { data } = await supabase
    .from("wa_messages")
    .select("content, created_at")
    .eq("phone", phone)
    .eq("direction", "out")
    .eq("msg_type", "text")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(8);
  const rows = data ?? [];
  if (rows.length === 0) return [];
  const newest = new Date(String(rows[0]!.created_at)).getTime();
  const cluster = rows.filter(
    (row) =>
      newest - new Date(String(row.created_at)).getTime() <= QUOTE_CLUSTER_MS,
  );
  const blob = cluster.map((row) => String(row.content ?? "")).join("\n");
  return findQuotedOfferIdsInText(blob, catalog);
}

/**
 * Busca en OUT recientes un pack o servicio cotizado (S/ + nombre).
 * Pack gana si ambos aparecen — Alberto VE …0417 cotizó el pack manos+pies.
 */
export async function findRecentQuotedServiceId(
  supabase: SupabaseClient,
  phone: string,
  catalog: ServiceCatalog,
  lookbackMs = 30 * 60 * 1000,
): Promise<string | null> {
  const ids = await findRecentQuotedOfferIds(
    supabase,
    phone,
    catalog,
    lookbackMs,
  );
  return ids[0] ?? null;
}

/**
 * Filtra IDs cotizados para evitar meter al carrito múltiples alternativas
 * excluyentes de una misma categoría (ej. Clásicas, Híbridas, Volumen).
 * Si la clienta nombró uno específico en `confirmText`, retorna solo ese.
 * Si son servicios complementarios de distintas categorías (ej. Pack Manos+Pies + Mojado),
 * los conserva todos.
 * Si son alternativas en conflicto sin elección explícita, retorna [] para no forzar la cita
 * y dejar que Haiku o la clienta aclare la opción deseada.
 */
export function filterNonConflictingQuotedOfferIds(
  offerIds: string[],
  catalog: ServiceCatalog,
  confirmText?: string,
): string[] {
  if (offerIds.length <= 1) return offerIds;

  const confirmNorm = norm(confirmText ?? "");
  if (confirmNorm) {
    const matched = offerIds.filter((id) => {
      const pack = catalog.packsById.get(id);
      const svc = catalog.servicesById.get(id);
      const name = norm(
        pack?.title ?? pack?.short_name ?? svc?.name ?? svc?.short_name ?? "",
      );
      const short = norm(pack?.short_name ?? svc?.short_name ?? "");
      const stripped = name
        .replace(/^extensiones\s+(efect[o]?\s+)?/, "")
        .replace(/^retoque\s+/, "")
        .trim();
      return (
        (name.length >= 4 && confirmNorm.includes(name)) ||
        (short.length >= 4 && confirmNorm.includes(short)) ||
        (stripped.length >= 4 && confirmNorm.includes(stripped))
      );
    });
    if (matched.length === 1) {
      return matched;
    }
  }

  const categoriesCount = new Map<string, number>();
  for (const id of offerIds) {
    const svc = catalog.servicesById.get(id);
    const cat = svc?.category_id ?? (catalog.packsById.get(id) ? "pack" : null);
    if (cat) {
      categoriesCount.set(cat, (categoriesCount.get(cat) ?? 0) + 1);
    }
  }

  const hasDuplicateCategory = Array.from(categoriesCount.values()).some(
    (c) => c > 1,
  );
  if (hasDuplicateCategory) {
    return [];
  }

  return offerIds;
}

/**
 * Última cotización dentro de filas OUT ya ordenadas de la más nueva a la
 * más vieja. Si lo más nuevo no trae precio (nudge, menú, "se venció"),
 * sigue hacia atrás y arma el racimo de ≤20 s de la cotización.
 */
export function quotedOfferIdsFromOutboundRows(
  rows: { content?: string | null; created_at?: string | null }[],
  catalog: ServiceCatalog,
): string[] {
  for (let i = 0; i < rows.length; i++) {
    const anchorMs = new Date(String(rows[i]?.created_at ?? "")).getTime();
    if (!Number.isFinite(anchorMs)) continue;
    const parts: string[] = [];
    for (let j = i; j < rows.length; j++) {
      const t = new Date(String(rows[j]?.created_at ?? "")).getTime();
      if (!Number.isFinite(t)) continue;
      if (anchorMs - t > QUOTE_CLUSTER_MS) break;
      parts.push(String(rows[j]?.content ?? ""));
    }
    const ids = findQuotedOfferIdsInText(parts.join("\n"), catalog);
    if (ids.length > 0) return ids;
  }
  return [];
}

/**
 * Carrito vacío pero Haiku ya cotizó una oferta (con precio promo): la
 * recupera de los OUT recientes, la mete al carrito y deja la sesión en
 * `awaiting_datetime`. Nancy Alvites …9158 (4-oct): sin esto, "10 am" caía a
 * "Agrega servicios de nuevo" + listado de categorías en vez de seguir.
 * La ventana es de verdad `lookbackMs` (default 6 h): un nudge posterior
 * sin precio no tapa la cotización.
 * Retorna true si quedó un carrito válido.
 */
export async function recoverCartFromQuotedOffer(
  supabase: SupabaseClient,
  phone: string,
  catalog: ServiceCatalog,
  confirmText = "",
  lookbackMs = 6 * 60 * 60 * 1000,
): Promise<boolean> {
  const since = new Date(Date.now() - lookbackMs).toISOString();
  const { data } = await supabase
    .from("wa_messages")
    .select("content, created_at")
    .eq("phone", phone)
    .eq("direction", "out")
    .eq("msg_type", "text")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(40);
  const quoted = filterNonConflictingQuotedOfferIds(
    quotedOfferIdsFromOutboundRows(data ?? [], catalog),
    catalog,
    confirmText,
  );
  const toAdd = quoted.flatMap((id): CartItem[] => {
    const pack = catalog.packsById.get(id);
    if (pack) {
      return [{
        item_type: "pack" as const,
        item_id: pack.id,
        quantity: 1,
        price: resolveCartItemPrice(
          catalog,
          "pack",
          pack.id,
          parseFloat(String(pack.pack_price)) || 0,
        ),
      }];
    }
    const svc = catalog.servicesById.get(id);
    if (!svc) return [];
    return [{
      item_type: "service" as const,
      item_id: svc.id,
      quantity: 1,
      price: resolveCartItemPrice(
        catalog,
        "service",
        svc.id,
        parseFloat(String(svc.price)) || 0,
      ),
    }];
  });
  if (toAdd.length === 0) return false;
  await addCartItems(supabase, phone, toAdd);
  await upsertSession(supabase, phone, { step: "awaiting_datetime" });
  return true;
}
