/**
 * Consultas del panel RepMAX contra tablas repmax_* (RLS por tienda).
 * Reemplaza las rutas Express /api/*.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ClienteWeb,
  DashboardData,
  ProductoWeb,
  VentaWeb,
} from "@/types/dashboard";
import type { ProductPublic, StorePublic } from "@/types/storefront";
import type { MlListingStatus } from "@repmax/repmax-schema/mlListing";
import {
  evaluarListoMl,
  evaluarListoVitrina,
  resolverBadgeMl,
  productoPasaFiltroMl,
  type FiltroMlWeb,
} from "@/lib/ml-readiness";

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function inicioDiaUtc(ref: Date = new Date()): Date {
  return new Date(
    Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth(), ref.getUTCDate(), 0, 0, 0, 0),
  );
}

function restarDiasUtc(d: Date, dias: number): Date {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() - dias);
  return x;
}

function fechasUltimos7Dias(inicioHoy: Date): string[] {
  const out: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = restarDiasUtc(inicioHoy, i);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function mapProducto(
  row: Record<string, unknown>,
  usdBsRate: number,
): ProductoWeb {
  const priceUsd = toNumber(row.price_usd);
  const priceBsRaw = row.price_bs;
  const photos = Array.isArray(row.photos)
    ? (row.photos as string[]).filter((u) => typeof u === "string" && u.length > 0)
    : [];
  const portada = photos[0] ?? null;
  const description = row.description ? String(row.description) : undefined;
  const mlPublishIntent = Boolean(row.ml_publish_intent);
  const listingRaw = row.repmax_ml_listings;
  const listing = Array.isArray(listingRaw)
    ? (listingRaw[0] as { status?: string } | undefined)
    : (listingRaw as { status?: string } | null);
  const mlListingStatus = listing?.status as MlListingStatus | undefined;
  const listoMl = evaluarListoMl({
    title: String(row.title ?? ""),
    partNumber: String(row.part_number ?? ""),
    description,
    priceUsd,
    stock: toNumber(row.stock),
    portadaUri: portada,
  });
  const vitrinaLista = evaluarListoVitrina({
    title: String(row.title ?? ""),
    priceUsd,
    stock: toNumber(row.stock),
    portadaUri: portada,
    isActive: Boolean(row.is_active),
  });
  const mlBadge = resolverBadgeMl(mlPublishIntent, mlListingStatus, listoMl);

  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description,
    brand: String(row.brand ?? ""),
    model: String(row.model ?? ""),
    priceUsd,
    priceBs:
      priceBsRaw !== null && priceBsRaw !== undefined
        ? toNumber(priceBsRaw)
        : priceUsd * usdBsRate,
    stock: toNumber(row.stock),
    minStock: toNumber(row.min_stock),
    condition: (row.condition as ProductoWeb["condition"]) ?? "NEW",
    vehicleType: (row.vehicle_type as ProductoWeb["vehicleType"]) ?? null,
    isActive: Boolean(row.is_active),
    partNumber: String(row.part_number ?? ""),
    photos,
    mlPublishIntent,
    mlListingStatus,
    mlBadge,
    vitrinaLista,
  };
}

const PRODUCT_DASHBOARD_SELECT = "*, repmax_ml_listings(status, ml_item_id)";

export async function fetchDashboard(
  client: SupabaseClient,
): Promise<DashboardData> {
  const inicioHoy = inicioDiaUtc();
  const inicioRango7 = restarDiasUtc(inicioHoy, 6);
  const hoyISO = inicioHoy.toISOString();
  const rangoISO = inicioRango7.toISOString();

  const [salesTodayRes, productsRes, customersRes, stockRes, sales7dRes] =
    await Promise.all([
      client
        .from("repmax_sales")
        .select("id, total_usd, payment_method, created_at")
        .eq("status", "COMPLETED")
        .gte("created_at", hoyISO),
      client
        .from("repmax_products")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true),
      client
        .from("repmax_customers")
        .select("id", { count: "exact", head: true }),
      client
        .from("repmax_products")
        .select("id, stock, min_stock")
        .eq("is_active", true),
      client
        .from("repmax_sales")
        .select("total_usd, created_at")
        .eq("status", "COMPLETED")
        .gte("created_at", rangoISO),
    ]);

  if (salesTodayRes.error) throw new Error(salesTodayRes.error.message);
  if (productsRes.error) throw new Error(productsRes.error.message);
  if (customersRes.error) throw new Error(customersRes.error.message);
  if (stockRes.error) throw new Error(stockRes.error.message);
  if (sales7dRes.error) throw new Error(sales7dRes.error.message);

  const ventasHoy = salesTodayRes.data?.length ?? 0;
  const ingresoHoy = (salesTodayRes.data ?? []).reduce(
    (s, r) => s + toNumber(r.total_usd),
    0,
  );

  const stockBajo = (stockRes.data ?? []).filter(
    (p) => toNumber(p.stock) <= toNumber(p.min_stock),
  ).length;

  const porDia = new Map<string, number>();
  for (const fecha of fechasUltimos7Dias(inicioHoy)) porDia.set(fecha, 0);
  for (const row of sales7dRes.data ?? []) {
    const fecha = String(row.created_at).slice(0, 10);
    if (porDia.has(fecha)) {
      porDia.set(fecha, (porDia.get(fecha) ?? 0) + toNumber(row.total_usd));
    }
  }
  const ventasUltimos7Dias = [...porDia.entries()].map(([fecha, total]) => ({
    fecha,
    total,
  }));

  const metodoMap = new Map<string, number>();
  for (const row of salesTodayRes.data ?? []) {
    const m = String(row.payment_method ?? "CASH_USD");
    metodoMap.set(m, (metodoMap.get(m) ?? 0) + toNumber(row.total_usd));
  }
  const metodoPago = [...metodoMap.entries()].map(([metodo, total]) => ({
    metodo,
    total,
  }));

  // Top productos del día vía sale_items
  const saleIds = (salesTodayRes.data ?? []).map((s) => s.id);
  let topProductos: { title: string; brand: string; cantidad: number }[] = [];
  if (saleIds.length > 0) {
    const { data: items, error: itemsErr } = await client
      .from("repmax_sale_items")
      .select("quantity, product_snapshot, product:repmax_products(title, brand)")
      .in("sale_id", saleIds);
    if (itemsErr) throw new Error(itemsErr.message);

    const agg = new Map<string, { title: string; brand: string; cantidad: number }>();
    for (const item of items ?? []) {
      const snap = (item.product_snapshot ?? {}) as Record<string, unknown>;
      const prod = item.product as { title?: string; brand?: string } | null;
      const title =
        String(prod?.title ?? snap.title ?? "Sin título");
      const brand = String(prod?.brand ?? snap.brand ?? "");
      const key = `${title}|${brand}`;
      const prev = agg.get(key) ?? { title, brand, cantidad: 0 };
      prev.cantidad += toNumber(item.quantity);
      agg.set(key, prev);
    }
    topProductos = [...agg.values()]
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);
  }

  return {
    ventasHoy,
    ingresoHoy,
    totalProductos: productsRes.count ?? 0,
    totalClientes: customersRes.count ?? 0,
    stockBajo,
    ventasUltimos7Dias,
    topProductos,
    metodoPago,
  };
}

export async function fetchProducts(
  client: SupabaseClient,
  params: URLSearchParams,
  usdBsRate: number,
): Promise<{ products: ProductoWeb[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 20) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const brand = params.get("brand");
  const condition = params.get("condition");
  const vehicleType = params.get("vehicleType");
  const q = params.get("q");
  const lowStock = params.get("lowStock");
  const mlFilter = (params.get("mlFilter") ?? "") as FiltroMlWeb;

  if (lowStock === "true" || lowStock === "1" || mlFilter) {
    let query = client
      .from("repmax_products")
      .select(PRODUCT_DASHBOARD_SELECT)
      .order("updated_at", { ascending: false });
    if (brand) query = query.ilike("brand", `%${brand}%`);
    if (condition) query = query.eq("condition", condition);
    if (vehicleType) query = query.eq("vehicle_type", vehicleType);
    if (q) {
      query = query.or(
        `title.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,part_number.ilike.%${q}%`,
      );
    }
    if (mlFilter === "para_ml") query = query.eq("ml_publish_intent", true);

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    let mapped = (data ?? []).map((r) =>
      mapProducto(r as Record<string, unknown>, usdBsRate),
    );

    if (mlFilter) {
      mapped = mapped.filter((p) =>
        productoPasaFiltroMl(
          mlFilter,
          p.mlPublishIntent ?? false,
          p.mlBadge ?? "none",
          p.vitrinaLista ?? false,
        ),
      );
    }
    if (lowStock === "true" || lowStock === "1") {
      mapped = mapped.filter((p) => p.stock <= p.minStock);
    }

    const slice = mapped.slice(from, to + 1);
    return {
      products: slice,
      total: mapped.length,
      page,
      limit,
    };
  }

  let query = client
    .from("repmax_products")
    .select(PRODUCT_DASHBOARD_SELECT, { count: "exact" })
    .order("updated_at", { ascending: false })
    .range(from, to);

  if (brand) query = query.ilike("brand", `%${brand}%`);
  if (condition) query = query.eq("condition", condition);
  if (vehicleType) query = query.eq("vehicle_type", vehicleType);
  if (q) {
    query = query.or(
      `title.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,part_number.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return {
    products: (data ?? []).map((r) =>
      mapProducto(r as Record<string, unknown>, usdBsRate),
    ),
    total: count ?? 0,
    page,
    limit,
  };
}

export async function patchProduct(
  client: SupabaseClient,
  id: string,
  body: Record<string, unknown>,
  usdBsRate: number,
): Promise<ProductoWeb> {
  const payload: Record<string, unknown> = {};
  if (body.title !== undefined) payload.title = body.title;
  if (body.brand !== undefined) payload.brand = body.brand;
  if (body.model !== undefined) payload.model = body.model;
  if (body.priceUsd !== undefined) {
    payload.price_usd = body.priceUsd;
    payload.price_bs = toNumber(body.priceUsd) * usdBsRate;
  }
  if (body.stock !== undefined) payload.stock = Math.floor(toNumber(body.stock));
  if (body.minStock !== undefined) payload.min_stock = Math.floor(toNumber(body.minStock));
  if (body.isActive !== undefined) payload.is_active = body.isActive;

  if (Object.keys(payload).length === 0) {
    throw new Error("No hay cambios");
  }

  const { data, error } = await client
    .from("repmax_products")
    .update(payload)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return mapProducto(data as Record<string, unknown>, usdBsRate);
}

export async function fetchSales(
  client: SupabaseClient,
  params: URLSearchParams,
): Promise<{ sales: VentaWeb[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 20) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = client
    .from("repmax_sales")
    .select(
      "id, invoice_number, total_usd, total_bs, payment_method, status, created_at, customer:repmax_customers(full_name)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  const fromDate = params.get("from");
  const toDate = params.get("to");
  if (fromDate) query = query.gte("created_at", fromDate);
  if (toDate) query = query.lte("created_at", toDate);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const sales: VentaWeb[] = (data ?? []).map((row) => {
    const cust = row.customer as { full_name?: string } | null;
    return {
      id: String(row.id),
      invoiceNumber: String(row.invoice_number ?? ""),
      totalUsd: toNumber(row.total_usd),
      totalBs: row.total_bs != null ? toNumber(row.total_bs) : null,
      paymentMethod: row.payment_method as VentaWeb["paymentMethod"],
      status: row.status as VentaWeb["status"],
      createdAt: String(row.created_at),
      customer: cust?.full_name ? { fullName: cust.full_name } : null,
    };
  });

  return { sales, total: count ?? 0, page, limit };
}

export async function fetchCustomers(
  client: SupabaseClient,
  params: URLSearchParams,
): Promise<{ customers: ClienteWeb[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.get("limit") ?? 20) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const q = params.get("q");

  let query = client
    .from("repmax_customers")
    .select("*", { count: "exact" })
    .order("full_name", { ascending: true })
    .range(from, to);

  if (q) {
    query = query.or(
      `full_name.ilike.%${q}%,phone.ilike.%${q}%,cedula_rif.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const customers: ClienteWeb[] = (data ?? []).map((row) => ({
    id: String(row.id),
    fullName: String(row.full_name ?? ""),
    phone: String(row.phone ?? ""),
    cedulaRif: String(row.cedula_rif ?? ""),
    email: String(row.email ?? ""),
    totalPurchases: toNumber(row.total_purchases),
    totalSpentUsd: toNumber(row.total_spent_usd),
    createdAt: String(row.created_at ?? ""),
  }));

  return { customers, total: count ?? 0, page, limit };
}

export async function fetchPublicStore(
  client: SupabaseClient,
  slug: string,
): Promise<StorePublic | null> {
  const { data, error } = await client
    .from("repmax_stores")
    .select(
      "id, name, slug, logo_url, phone, address, city, plan, usd_bs_rate, is_active",
    )
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    logoUrl: data.logo_url,
    phone: data.phone,
    address: data.address,
    city: data.city,
    plan: (data.plan as StorePublic["plan"]) ?? "basic",
    usdBsRate: toNumber(data.usd_bs_rate),
  };
}

export async function fetchPublicProducts(
  client: SupabaseClient,
  storeId: string,
  usdBsRate: number,
  params: URLSearchParams,
): Promise<{ products: ProductPublic[]; total: number; page: number; limit: number }> {
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(params.get("limit") ?? 20) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = client
    .from("repmax_products")
    .select("*", { count: "exact" })
    .eq("store_id", storeId)
    .eq("is_active", true)
    .gt("stock", 0)
    .order("created_at", { ascending: false })
    .range(from, to);

  const brand = params.get("brand");
  const condition = params.get("condition");
  const vehicleType = params.get("vehicleType");
  const q = params.get("q");
  if (brand) query = query.ilike("brand", `%${brand}%`);
  if (condition) query = query.eq("condition", condition);
  if (vehicleType) query = query.eq("vehicle_type", vehicleType);
  if (q) {
    query = query.or(
      `title.ilike.%${q}%,brand.ilike.%${q}%,model.ilike.%${q}%,part_number.ilike.%${q}%`,
    );
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const products: ProductPublic[] = (data ?? []).map((row) =>
    mapProductPublic(row as Record<string, unknown>, usdBsRate),
  );

  return { products, total: count ?? 0, page, limit };
}

function mapProductPublic(
  row: Record<string, unknown>,
  usdBsRate: number,
): ProductPublic {
  const priceUsd = toNumber(row.price_usd);
  const priceBs =
    row.price_bs != null ? toNumber(row.price_bs) : priceUsd * usdBsRate;
  return {
    id: String(row.id),
    title: String(row.title ?? ""),
    description: row.description ? String(row.description) : null,
    brand: String(row.brand ?? ""),
    model: String(row.model ?? ""),
    yearFrom: row.year_from != null ? Number(row.year_from) : null,
    yearTo: row.year_to != null ? Number(row.year_to) : null,
    vehicleType: (row.vehicle_type as ProductPublic["vehicleType"]) ?? null,
    condition: (row.condition as ProductPublic["condition"]) ?? "NEW",
    partNumber: row.part_number ? String(row.part_number) : null,
    priceUsd,
    priceBs,
    usdBsRate,
    stock: toNumber(row.stock),
    photos: (row.photos as string[] | null) ?? null,
  };
}

export async function fetchPublicProduct(
  client: SupabaseClient,
  storeId: string,
  productId: string,
  usdBsRate: number,
): Promise<ProductPublic | null> {
  const { data, error } = await client
    .from("repmax_products")
    .select("*")
    .eq("id", productId)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .gt("stock", 0)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;

  return mapProductPublic(data as Record<string, unknown>, usdBsRate);
}
