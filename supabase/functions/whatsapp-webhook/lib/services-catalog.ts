// services-catalog.ts — Catálogo unificado (PostgREST GeemaStudio, multi-tenant)

import type { SupabaseClient } from "./supabase.ts";

export interface CatalogService {
  id: string;
  name: string;
  short_name: string | null;
  category_id: string | null;
  subcategory: string | null;
  price: string;
  price_card: string | null;
  duration: number;
  is_active: boolean;
}

export interface CatalogCategory {
  id: string;
  name: string;
  order: number;
}

export interface CatalogPack {
  id: string;
  title: string;
  short_name: string | null;
  category_id: string;
  pack_price: string;
  pack_price_card: string | null;
  service_ids: string | unknown;
  display_order: number;
  is_active: boolean;
}

export interface CatalogPromotionItem {
  id: string;
  promotion_id: string;
  item_type: "service" | "pack";
  item_id: string;
  quantity: number;
  discounted_price: string;
  discounted_price_card: string | null;
  sort_order: number;
}

export interface CatalogPromotion {
  id: string;
  title: string;
  description: string;
  emoji: string;
  badge: string;
  valid_until: string | null;
  is_active: boolean;
  display_order: number;
  items: CatalogPromotionItem[];
}

export interface ServiceCatalog {
  categories: CatalogCategory[];
  services: CatalogService[];
  packs: CatalogPack[];
  promotions: CatalogPromotion[];
  servicesByCategory: Map<string, CatalogService[]>;
  packsByCategory: Map<string, CatalogPack[]>;
  servicesById: Map<string, CatalogService>;
  packsById: Map<string, CatalogPack>;
}

const now = () => new Date().toISOString();

function normalizeServiceIds(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const a = JSON.parse(raw);
      return Array.isArray(a) ? a.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function loadCatalog(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<ServiceCatalog> {
  const today = now();

  const [catRes, svcRes, packRes, promosRes] = await Promise.all([
    supabase
      .from("service_categories")
      .select("id, name, order")
      .eq("tenant_id", tenantId)
      .order("order", { ascending: true }),
    supabase
      .from("services")
      .select(
        "id, name, category_id, price, duration, is_active",
      )
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("packs")
      .select("id, name, description, price, service_ids, is_active")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name", { ascending: true }),
    supabase
      .from("promotions")
      .select(
        "id, title, description, badge, promo_price, is_active, expires_at",
      )
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gte.${today}`)
      .order("title", { ascending: true }),
  ]);

  const categories = (catRes.data ?? []) as CatalogCategory[];
  const servicesRaw = (svcRes.data ?? []) as {
    id: string;
    name: string;
    category_id: string | null;
    price: unknown;
    duration: number;
    is_active: boolean;
  }[];

  const services: CatalogService[] = servicesRaw.map((s) => ({
    id: s.id,
    name: s.name,
    short_name: null,
    category_id: s.category_id,
    subcategory: null,
    price: String(s.price),
    price_card: null,
    duration: s.duration,
    is_active: s.is_active,
  }));

  const serviceCategoryById = new Map<string, string | null>();
  for (const s of services) {
    serviceCategoryById.set(s.id, s.category_id);
  }

  const packsRaw = (packRes.data ?? []) as {
    id: string;
    name: string;
    description: string | null;
    price: unknown;
    service_ids: unknown;
    is_active: boolean;
  }[];

  const packs: CatalogPack[] = packsRaw.map((p, idx) => {
    const sids = normalizeServiceIds(p.service_ids);
    const firstCat = sids.length
      ? (serviceCategoryById.get(sids[0]) ?? "")
      : "";
    return {
      id: p.id,
      title: p.name,
      short_name: p.name,
      category_id: firstCat ?? "",
      pack_price: String(p.price),
      pack_price_card: null,
      service_ids: p.service_ids,
      display_order: idx,
      is_active: p.is_active,
    };
  });

  const promosRaw = (promosRes.data ?? []) as {
    id: string;
    title: string;
    description: string | null;
    badge: string | null;
    promo_price: unknown;
    is_active: boolean;
    expires_at: string | null;
  }[];

  const promotionIds = promosRaw.map((p) => p.id);
  const { data: itemsRows } = promotionIds.length
    ? await supabase
      .from("promotion_items")
      .select(
        "id, promo_id, item_type, item_id, quantity, discounted_price",
      )
      .in("promo_id", promotionIds)
    : { data: [] };

  const items = (itemsRows ?? []) as {
    id: string;
    promo_id: string;
    item_type: string;
    item_id: string;
    quantity: number;
    discounted_price: unknown;
  }[];

  const itemsByPromo = new Map<string, CatalogPromotionItem[]>();
  for (const it of items) {
    const pid = it.promo_id;
    if (!itemsByPromo.has(pid)) itemsByPromo.set(pid, []);
    itemsByPromo.get(pid)!.push({
      id: it.id,
      promotion_id: it.promo_id,
      item_type: it.item_type === "pack" ? "pack" : "service",
      item_id: it.item_id,
      quantity: it.quantity,
      discounted_price: String(it.discounted_price),
      discounted_price_card: null,
      sort_order: 0,
    });
  }

  const promotions: CatalogPromotion[] = promosRaw.map((p, i) => ({
    id: p.id,
    title: p.title,
    description: p.description ?? "",
    emoji: "",
    badge: p.badge ?? "",
    valid_until: p.expires_at,
    is_active: p.is_active,
    display_order: i,
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

  return {
    categories,
    services,
    packs,
    promotions,
    servicesByCategory,
    packsByCategory,
    servicesById,
    packsById,
  };
}
