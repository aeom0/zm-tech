// services-catalog.ts — Catálogo unificado de servicios, categorías, packs y promociones (una sola carga desde BD)

import type { SupabaseClient, CartItem } from "./supabase.ts";
import { getRequestTenantId } from "./tenant.ts";
import type { PortfolioIndexEntry } from "./portfolio.ts";
import { portfolioIndexFromRows, type PortfolioImageRow } from "./portfolio.ts";
import { cachedLoad } from "./ttl-cache.ts";
import {
  getDefaultOverlapCap,
  getExtensionesKarelisServiceIds,
  getExtensionesNoLaneServiceIds,
  getSpecialOverlapCap,
  getSpecialOverlapCategories,
  getSpecialOverlapExtraServiceIds,
} from "./constants.ts";

/** Servicio tal como viene de Supabase (snake_case). */
export interface CatalogService {
  id: string;
  name: string;
  short_name: string | null;
  category_id: string | null;
  subcategory: string | null;
  price: string;
  duration: number;
  is_active: boolean;
}

/** Categoría de servicios. */
export interface CatalogCategory {
  id: string;
  name: string;
  order: number;
}

/** Pack con precio y servicios. */
export interface CatalogPack {
  id: string;
  title: string;
  short_name: string | null;
  category_id: string;
  pack_price: string;
  service_ids: string | unknown;
  display_order: number;
  is_active: boolean;
  /** Minutos en agenda con turnover incluido; null = suma de servicios + turnover. */
  slot_minutes?: number | null;
}

/** Ítem de una promo (servicio o pack con precio rebajado). */
export interface CatalogPromotionItem {
  id: string;
  promotion_id: string;
  item_type: "service" | "pack";
  item_id: string;
  quantity: number;
  discounted_price: string;
  sort_order: number;
}

/** Promoción con sus ítems. */
export interface CatalogPromotion {
  id: string;
  title: string;
  description: string;
  emoji: string;
  badge: string;
  valid_until: string | null;
  /** Días en que aplica el descuento, ISO (1=lunes…7=domingo) separados por coma, ej. "1,2,3". Null = sin restricción. */
  valid_days: string | null;
  is_active: boolean;
  display_order: number;
  /** Minutos de agenda configurados en UI; si > 0 reemplaza la suma de duraciones de sus servicios. */
  slot_minutes?: number | null;
  items: CatalogPromotionItem[];
}

/** Catálogo completo para un único flujo (evita múltiples selects). */
export interface ServiceCatalog {
  categories: CatalogCategory[];
  services: CatalogService[];
  packs: CatalogPack[];
  promotions: CatalogPromotion[];
  /** Mapa category_id → servicios activos */
  servicesByCategory: Map<string, CatalogService[]>;
  /** Mapa category_id → packs activos */
  packsByCategory: Map<string, CatalogPack[]>;
  /** Mapa id → servicio (para nombres en carrito y ítems de promo) */
  servicesById: Map<string, CatalogService>;
  /** Mapa id → pack (para nombres en carrito y ítems de promo) */
  packsById: Map<string, CatalogPack>;
  /** Fotos de portafolio indexadas por pie de foto (puede estar vacío). */
  portfolioIndex: PortfolioIndexEntry[];
  /** Composición de servicios (ids ordenados) → minutos de agenda del pack. */
  packSlotMinutes?: Map<string, number>;
}

/** Clave estable de una composición de servicios (mismo multiconjunto de ids). */
export function compositionKey(serviceIds: string[]): string {
  return [...serviceIds].sort().join("|");
}

const now = () => new Date().toISOString();

/** Un precio editado en Geema puede tardar hasta este lapso en el bot. */
export const CATALOG_TTL_MS = 60_000;

const catalogCache = new Map<string, { value: ServiceCatalog; at: number }>();
const catalogInflight = new Map<string, Promise<ServiceCatalog>>();

/**
 * Carga en una sola pasada categorías, servicios, packs y promociones activas.
 * Reusa el resultado 60 s en el isolate: el catálogo no cambia en medio de un chat
 * y cada select cuenta en Log ingestion.
 */
export async function loadCatalog(
  supabase: SupabaseClient,
  tenantId?: string,
): Promise<ServiceCatalog> {
  const scopedTenantId = tenantId?.trim() || getRequestTenantId();
  return cachedLoad(
    catalogCache,
    catalogInflight,
    scopedTenantId,
    CATALOG_TTL_MS,
    () => loadCatalogFromDb(supabase, scopedTenantId),
  );
}

async function loadCatalogFromDb(
  supabase: SupabaseClient,
  scopedTenantId: string,
): Promise<{ value: ServiceCatalog; store: boolean }> {
  const today = now();

  const [catRes, svcRes, packRes, promosRes, imgRes] = await Promise.all([
    supabase
      .from("service_categories")
      .select("id, name, order")
      .eq("tenant_id", scopedTenantId)
      .order("name"),
    supabase
      .from("services")
      .select(
        "id, name, short_name, category_id, subcategory, price, duration, is_active",
      )
      .eq("tenant_id", scopedTenantId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("packs")
      .select(
        "id, title, short_name, category_id, pack_price, service_ids, display_order, is_active, slot_minutes",
      )
      .eq("tenant_id", scopedTenantId)
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("promotions")
      .select(
        "id, title, description, emoji, badge, valid_until, valid_days, is_active, display_order, slot_minutes",
      )
      .eq("tenant_id", scopedTenantId)
      .eq("is_active", true)
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .order("display_order", { ascending: true }),
    supabase
      .from("service_portfolio_images")
      .select("service_id, image_url, caption, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  const categories = (catRes.data ?? []) as CatalogCategory[];
  const services = (svcRes.data ?? []) as CatalogService[];
  const packs = (packRes.data ?? []) as CatalogPack[];
  const promosRaw = (promosRes.data ?? []) as Omit<CatalogPromotion, "items">[];
  const portfolioIndex = portfolioIndexFromRows(
    (imgRes.data ?? []) as PortfolioImageRow[],
    services.map((s) => ({
      id: s.id,
      name: s.name,
      category_id: s.category_id,
    })),
  );

  const promotionIds = promosRaw.map((p) => p.id);
  const itemsQuery = promotionIds.length
    ? await supabase
        .from("promotion_items")
        .select(
          "id, promotion_id, item_type, item_id, quantity, discounted_price, sort_order",
        )
        .in("promotion_id", promotionIds)
        .order("sort_order", { ascending: true })
    : { data: [], error: null };
  const itemsRows = itemsQuery.data;

  const items = (itemsRows ?? []) as CatalogPromotionItem[];
  const itemsByPromo = new Map<string, CatalogPromotionItem[]>();
  for (const it of items) {
    const pid = it.promotion_id;
    if (!itemsByPromo.has(pid)) itemsByPromo.set(pid, []);
    itemsByPromo.get(pid)!.push(it);
  }

  const promotions: CatalogPromotion[] = promosRaw.map((p) => ({
    ...p,
    items: itemsByPromo.get(p.id) ?? [],
  }));

  const servicesByCategory = new Map<string, CatalogService[]>();
  for (const s of services) {
    const cid = s.category_id ?? "";
    if (!servicesByCategory.has(cid)) servicesByCategory.set(cid, []);
    servicesByCategory.get(cid)!.push(s);
  }

  const packsByCategory = new Map<string, CatalogPack[]>();
  for (const p of packs) {
    const cid = p.category_id;
    if (!packsByCategory.has(cid)) packsByCategory.set(cid, []);
    packsByCategory.get(cid)!.push(p);
  }

  const servicesById = new Map<string, CatalogService>();
  for (const s of services) servicesById.set(s.id, s);
  const packsById = new Map<string, CatalogPack>();
  for (const p of packs) packsById.set(p.id, p);
  const packSlotMinutes = new Map<string, number>();
  for (const p of packs) {
    const minutes = Number(p.slot_minutes);
    if (!(minutes > 0)) continue;
    const ids = parsePackServiceIds(p);
    if (ids.length > 0) packSlotMinutes.set(compositionKey(ids), minutes);
  }
  // Promos: expanden sus ítems (pack → sus servicios × cantidad) y pisan al pack con la misma composición.
  for (const promo of promotions) {
    const minutes = Number(promo.slot_minutes);
    if (!(minutes > 0)) continue;
    const ids: string[] = [];
    for (const it of promo.items) {
      const qty = Math.max(1, Number(it.quantity) || 1);
      const base =
        it.item_type === "pack"
          ? parsePackServiceIds(packsById.get(it.item_id) ?? null)
          : [it.item_id];
      for (let i = 0; i < qty; i++) ids.push(...base);
    }
    if (ids.length > 0) packSlotMinutes.set(compositionKey(ids), minutes);
  }

  const catalog: ServiceCatalog = {
    categories,
    services,
    packs,
    promotions,
    servicesByCategory,
    packsByCategory,
    servicesById,
    packsById,
    portfolioIndex,
    packSlotMinutes,
  };
  const store =
    !catRes.error &&
    !svcRes.error &&
    !packRes.error &&
    !promosRes.error &&
    !imgRes.error &&
    !itemsQuery.error;
  if (!store) {
    console.warn(
      "[catalog] carga incompleta, no se cachea:",
      catRes.error?.message ??
        svcRes.error?.message ??
        packRes.error?.message ??
        promosRes.error?.message ??
        imgRes.error?.message ??
        itemsQuery.error?.message,
    );
  }
  return { value: catalog, store };
}

/**
 * True SOLO si TODOS los servicios del carrito son especiales
 * (Vanessa puede ejecutarlos). Un solo servicio no-especial en el carrito
 * hace que la cita completa cuente como normal (tope 1) — ver caso
 * "Builder Gel + Laminado de Cejas" (confirmado con Alberto 22-ago-2026):
 * esa cita ocupa el slot como normal porque Stephani es la única que puede
 * ejecutar el Builder Gel, aunque el laminado sea especial.
 */
export function isSpecialOverlapCart(
  serviceIds: string[],
  catalog: ServiceCatalog,
): boolean {
  if (serviceIds.length === 0) return false;
  const extra = getSpecialOverlapExtraServiceIds();
  const cats = getSpecialOverlapCategories();
  return serviceIds.every((id) => {
    const svc = catalog.servicesById.get(id);
    if (!svc) return false;
    if (extra.includes(id)) return true;
    return cats.includes(svc.category_id ?? "");
  });
}

/** Tope de citas simultáneas para un carrito dado. */
export function overlapCapForCart(
  serviceIds: string[],
  catalog: ServiceCatalog,
): number {
  return isSpecialOverlapCart(serviceIds, catalog)
    ? getSpecialOverlapCap()
    : getDefaultOverlapCap();
}

/** Carril de especialista en cat-extensiones (Stephani todo el día / Karelis tarde). */
export type ExtensionesLane = "stephani" | "karelis";

/**
 * Carril para un servicio de cat-extensiones.
 * Null si no es de esa categoría, o si es Retiro (sin carril).
 * Para capacidad de slot (carrito + ocupación) ver `classifyOccupiedCapacityLane`.
 */
export function classifyExtensionesLane(
  serviceId: string,
  catalog: ServiceCatalog,
): ExtensionesLane | null {
  const svc = catalog.servicesById.get(serviceId);
  if (!svc || svc.category_id !== "cat-extensiones") return null;
  const noLane = getExtensionesNoLaneServiceIds();
  if (noLane.includes(serviceId)) return null;
  const karelis = getExtensionesKarelisServiceIds();
  if (karelis.includes(serviceId)) return "karelis";
  return "stephani";
}

/**
 * Carril de capacidad (carrito entrante u ocupación del slot).
 * Extensiones + categorías 100 % Stephani (`cat-unas`; `cat-cejas-rostro`
 * salvo Bozo/Cejas). Sin esto, Manicure con Fox ocupando caía al cap plano
 * y bloqueaba aunque Karelis y Stephani sean recursos distintos.
 */
export function classifyOccupiedCapacityLane(
  serviceId: string,
  catalog: ServiceCatalog,
): ExtensionesLane | null {
  const fromExt = classifyExtensionesLane(serviceId, catalog);
  if (fromExt) return fromExt;
  const svc = catalog.servicesById.get(serviceId);
  if (!svc) return null;
  const cat = svc.category_id ?? "";
  if (cat === "cat-unas") return "stephani";
  if (cat === "cat-cejas-rostro") {
    const extras = getSpecialOverlapExtraServiceIds();
    if (extras.includes(serviceId)) return null;
    return "stephani";
  }
  return null;
}

/**
 * Carriles que exige el carrito entrante (extensiones + unas/cejas Stephani).
 * Vacío si solo trae Retiro, Bozo/Cejas especiales, o categorías Vanessa-ambiguas.
 */
export function cartExtensionesLanes(
  serviceIds: string[],
  catalog: ServiceCatalog,
): Set<ExtensionesLane> {
  const lanes = new Set<ExtensionesLane>();
  for (const id of serviceIds) {
    const lane = classifyOccupiedCapacityLane(id, catalog);
    if (lane) lanes.add(lane);
  }
  return lanes;
}

/**
 * True si el carrito exige el carril Karelis → solo horarios desde la 1 PM Lima.
 * Solo mira técnicas Karelis (no unas/cejas).
 */
export function cartRequiresKarelisAfternoon(
  serviceIds: string[],
  catalog: ServiceCatalog,
): boolean {
  return serviceIds.some(
    (id) => classifyExtensionesLane(id, catalog) === "karelis",
  );
}

/** service_ids de un pack (JSONB o string JSON). */
export function parsePackServiceIds(
  pack: Pick<CatalogPack, "service_ids"> | { service_ids?: unknown } | null,
): string[] {
  if (!pack?.service_ids) return [];
  const raw = pack.service_ids;
  if (Array.isArray(raw)) return raw.map(String).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
    } catch {
      return [];
    }
  }
  return [];
}

/**
 * True si la promo aplica el día indicado (ISO 1=lunes…7=domingo).
 * `valid_days` null/vacío = sin restricción, aplica todos los días (compatibilidad
 * con promos existentes que nunca tuvieron esta columna en uso).
 */
export function promoAppliesOnWeekday(
  promo: Pick<CatalogPromotion, "valid_days">,
  isoWeekday: number,
): boolean {
  if (!promo.valid_days) return true;
  const days = promo.valid_days
    .split(",")
    .map((d) => parseInt(d.trim(), 10))
    .filter((d) => Number.isFinite(d));
  if (!days.length) return true;
  return days.includes(isoWeekday);
}

/** Texto legible de `valid_days` (ej. "lunes, martes y miércoles") para avisos al cliente. */
export function formatValidDaysEs(validDays: string): string {
  const days = new Set<string>();
  for (const d of validDays.split(",")) {
    const n = parseInt(d.trim(), 10);
    const name = WEEKDAY_NAMES_ES[n];
    if (name) days.add(name);
  }
  const sorted = WEEKDAY_ORDER_ES.filter((d) => days.has(d));
  if (sorted.length <= 1) return sorted.join("");
  return `${sorted.slice(0, -1).join(", ")} y ${sorted[sorted.length - 1]}`;
}

/**
 * Precio rebajado activo más bajo para un servicio/pack en promotion_items.
 * Null si no hay promo aplicable (usar pack_price / price de catálogo).
 * `isoWeekday` (1=lunes…7=domingo): si se pasa, descarta promos cuyo
 * `valid_days` no incluya ese día — ej. "15% de dscto Lunes a Miércoles".
 */
export function getPromoDiscountedPrice(
  catalog: ServiceCatalog,
  itemType: "service" | "pack",
  itemId: string,
  isoWeekday?: number,
): number | null {
  let best: number | null = null;
  for (const promo of catalog.promotions) {
    if (!promo.is_active) continue;
    if (isoWeekday != null && !promoAppliesOnWeekday(promo, isoWeekday)) {
      continue;
    }
    for (const it of promo.items) {
      if (it.item_type !== itemType || it.item_id !== itemId) continue;
      const p = parseFloat(String(it.discounted_price));
      if (!Number.isFinite(p)) continue;
      if (best == null || p < best) best = p;
    }
  }
  return best;
}

/**
 * Precio a cobrar: promo si existe (y aplica ese día), si no catálogo.
 * `isoWeekday` es opcional para no romper llamadas existentes (ej. al agregar
 * al carrito, antes de saber la fecha de la cita) — se vuelve obligatorio
 * en la práctica al recalcular el precio final una vez elegida la fecha
 * (ver `recomputeCartPricesForDate` en payment.ts).
 */
export function resolveCartItemPrice(
  catalog: ServiceCatalog,
  itemType: "service" | "pack",
  itemId: string,
  catalogPrice: number,
  isoWeekday?: number,
): number {
  const promo = getPromoDiscountedPrice(catalog, itemType, itemId, isoWeekday);
  return promo != null ? promo : catalogPrice;
}

/** Ítem de carrito cuyo precio cambió al recalcular contra el día real de la cita. */
export interface CartPriceAdjustment {
  itemType: "service" | "pack";
  itemId: string;
  name: string;
  before: number;
  after: number;
}

/**
 * Recalcula el precio de cada ítem del carrito para el día ISO de la cita elegida
 * (1=lunes…7=domingo). Necesario porque el precio se congela al agregar al carrito
 * (antes de saber la fecha), y promos como "15% Lunes a Miércoles" solo deben
 * cobrarse si la cita realmente cae en esos días — ver caso Brescia Macutela
 * (13-ago-2026): promo cotizada y agendada para un viernes, fuera de ventana.
 */
export function recomputeCartItemsForWeekday(
  catalog: ServiceCatalog,
  items: CartItem[],
  isoWeekday: number,
): { items: CartItem[]; adjustments: CartPriceAdjustment[] } {
  const adjustments: CartPriceAdjustment[] = [];
  const next = items.map((it) => {
    const svc =
      it.item_type === "service" ? catalog.servicesById.get(it.item_id) : null;
    const pack =
      it.item_type === "pack" ? catalog.packsById.get(it.item_id) : null;
    const catalogPrice = svc
      ? parseFloat(String(svc.price))
      : pack
        ? parseFloat(String(pack.pack_price))
        : it.price;
    if (!Number.isFinite(catalogPrice)) return it;
    const correctPrice = resolveCartItemPrice(
      catalog,
      it.item_type,
      it.item_id,
      catalogPrice,
      isoWeekday,
    );
    if (Math.abs(correctPrice - it.price) < 0.01) return it;
    adjustments.push({
      itemType: it.item_type,
      itemId: it.item_id,
      name: svc?.name ?? pack?.title ?? it.item_id,
      before: it.price,
      after: correctPrice,
    });
    return { ...it, price: correctPrice };
  });
  return { items: next, adjustments };
}

/** Línea de `appointment_services` (BD) mínima para recalcular precio. */
export interface AppointmentServiceLine {
  id: string;
  service_id: string;
  pack_id: string | null;
  price: number;
}

/**
 * Reparte un total en N partes iguales (céntimos) — mismo criterio que
 * `splitTotalEqually` en `lib/supabase.ts` (packs reparten precio entre líneas).
 */
function splitEqually(total: number, parts: number): number[] {
  if (parts <= 0 || !Number.isFinite(total)) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / parts);
  const remainder = cents - base * parts;
  return Array.from(
    { length: parts },
    (_, i) => (base + (i < remainder ? 1 : 0)) / 100,
  );
}

/**
 * Recalcula el precio de las líneas de una cita YA CREADA (`appointment_services`)
 * contra el día ISO real de una nueva fecha de reprogramación. A diferencia del
 * agendado inicial (que congela el precio en el carrito antes de saber la fecha),
 * reprogramar una cita `scheduled` solo hacía UPDATE de `date` sin recotizar —
 * si la cita se mueve a un día donde una promo por-día ya no aplica (o donde
 * aplica una que antes no aplicaba), el monto quedaba desactualizado (gap
 * reportado en la revisión de PR #22, distinto al caso original de Brescia).
 * Líneas de un mismo pack (`pack_id` compartido) se tratan como un solo ítem y
 * el nuevo total se reparte proporcional entre ellas, igual que al crear la cita.
 */
export function recomputeAppointmentLinesForWeekday(
  catalog: ServiceCatalog,
  lines: AppointmentServiceLine[],
  isoWeekday: number,
): { lines: AppointmentServiceLine[]; adjustments: CartPriceAdjustment[] } {
  const adjustments: CartPriceAdjustment[] = [];
  const groups = new Map<string, AppointmentServiceLine[]>();
  for (const line of lines) {
    const key = line.pack_id ?? `svc:${line.id}`;
    const arr = groups.get(key) ?? [];
    arr.push(line);
    groups.set(key, arr);
  }

  const nextLines: AppointmentServiceLine[] = [];
  for (const group of groups.values()) {
    const packId = group[0].pack_id;
    const currentTotal = group.reduce((s, l) => s + l.price, 0);

    let catalogPrice: number;
    let itemType: "service" | "pack";
    let itemId: string;
    let name: string;
    if (packId) {
      const pack = catalog.packsById.get(packId);
      if (!pack) {
        nextLines.push(...group);
        continue;
      }
      catalogPrice = parseFloat(String(pack.pack_price));
      itemType = "pack";
      itemId = packId;
      name = pack.title;
    } else {
      const svc = catalog.servicesById.get(group[0].service_id);
      if (!svc) {
        nextLines.push(...group);
        continue;
      }
      catalogPrice = parseFloat(String(svc.price));
      itemType = "service";
      itemId = svc.id;
      name = svc.name;
    }
    if (!Number.isFinite(catalogPrice)) {
      nextLines.push(...group);
      continue;
    }

    const correctTotal = resolveCartItemPrice(
      catalog,
      itemType,
      itemId,
      catalogPrice,
      isoWeekday,
    );
    if (Math.abs(correctTotal - currentTotal) < 0.01) {
      nextLines.push(...group);
      continue;
    }

    adjustments.push({
      itemType,
      itemId,
      name,
      before: currentTotal,
      after: correctTotal,
    });

    if (group.length === 1) {
      nextLines.push({ ...group[0], price: correctTotal });
    } else {
      const shares = splitEqually(correctTotal, group.length);
      group.forEach((l, i) => {
        nextLines.push({ ...l, price: shares[i] ?? 0 });
      });
    }
  }
  return { lines: nextLines, adjustments };
}

const WEEKDAY_NAMES_ES: Record<number, string> = {
  1: "lunes",
  2: "martes",
  3: "miércoles",
  4: "jueves",
  5: "viernes",
  6: "sábado",
  7: "domingo",
};
const WEEKDAY_ORDER_ES = Object.values(WEEKDAY_NAMES_ES);

/**
 * Aviso corto si algún ítem del carrito tiene su precio actual atado a una promo
 * con días de vigencia restringidos (`valid_days`). Mientras arma el carrito, el
 * precio se congela sin conocer todavía la fecha de la cita (`resolveCartItemPrice`
 * se llama sin `isoWeekday`) — este aviso evita que la clienta piense que el
 * descuento aplica cualquier día; el precio final se confirma/ajusta recién al
 * elegir fecha (`recomputeAndPersistCartPricesForDate` en payment.ts).
 */
export function getCartDayRestrictionCaveat(
  catalog: ServiceCatalog,
  items: { item_type: "service" | "pack"; item_id: string }[],
): string | null {
  const days = new Set<string>();
  for (const it of items) {
    for (const promo of catalog.promotions) {
      if (!promo.is_active || !promo.valid_days) continue;
      const hasItem = promo.items.some(
        (pi) => pi.item_type === it.item_type && pi.item_id === it.item_id,
      );
      if (!hasItem) continue;
      for (const d of promo.valid_days.split(",")) {
        const n = parseInt(d.trim(), 10);
        const name = WEEKDAY_NAMES_ES[n];
        if (name) days.add(name);
      }
    }
  }
  if (!days.size) return null;
  const sorted = WEEKDAY_ORDER_ES.filter((d) => days.has(d));
  return `💜 El precio con descuento aplica ${sorted.join(", ")} — se confirma al elegir tu fecha.`;
}
