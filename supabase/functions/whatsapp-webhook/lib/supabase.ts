// supabase.ts — Cliente y helpers de sesión/carrito (multi-tenant)

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export type SupabaseClient = ReturnType<typeof getSupabase>;

export interface CartItem {
  item_type: "service" | "pack";
  item_id: string;
  quantity: number;
  price: number;
}

function parseCartItemsRaw(raw: unknown): CartItem[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as CartItem[];
  if (typeof raw === "string") {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "").trim();
}

export function getPhoneCountryAndNormalizedFromWa(waId: string): {
  country: string;
  normalized: string;
} {
  const digits = waId.replace(/\D/g, "");
  if (digits.startsWith("51") && digits.length === 11) {
    return { country: "PE", normalized: digits.slice(2) };
  }
  if (digits.startsWith("1") && digits.length === 11) {
    return { country: "1", normalized: digits.slice(1) };
  }
  const TWO_DIGIT_CC = [
    "54",
    "56",
    "57",
    "58",
    "52",
    "55",
    "34",
    "33",
    "44",
    "49",
  ];
  for (const cc of TWO_DIGIT_CC) {
    if (digits.startsWith(cc)) {
      return { country: cc, normalized: digits.slice(cc.length) };
    }
  }
  if (digits.length > 4) {
    return { country: digits.slice(0, 3), normalized: digits.slice(3) };
  }
  return { country: "XX", normalized: digits };
}

function normalizeName(name: string): string {
  const noEmoji = name
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "")
    .trim();
  return noEmoji.replace(/\s+/g, " ").trim().toUpperCase();
}

function isLikelyRealName(raw: string): boolean {
  const PLACEHOLDERS = ["cliente whatsapp", "whatsapp user", "unknown", ""];
  const cleaned = normalizeName(raw);
  if (!cleaned || PLACEHOLDERS.includes(cleaned.toLowerCase())) return false;
  if (/^\d+$/.test(cleaned)) return false;
  const BUSINESS_KEYWORDS =
    /\b(store|shop|beauty|nail|lash|studio|salon|spa|centre|center|service|ventas|negocio|empresa)\b/i;
  if (BUSINESS_KEYWORDS.test(cleaned)) return false;
  const letters = (cleaned.match(/[A-ZÁÉÍÓÚÑ]/gi) ?? []).length;
  if (letters < 3) return false;
  const words = cleaned.split(/\s+/).filter((w) => /[A-ZÁÉÍÓÚÑ]{3,}/i.test(w));
  if (words.length === 0) return false;
  return true;
}

export async function getOrCreateClient(
  supabase: SupabaseClient,
  tenantId: string,
  waId: string,
  rawName: string,
) {
  const { country, normalized } = getPhoneCountryAndNormalizedFromWa(waId);
  const displayPhone = normalizePhone(waId);
  const isReal = isLikelyRealName(rawName);
  const displayName = isReal
    ? normalizeName(rawName)
    : `Cliente WA ${normalized.slice(-4)}`;
  const notes = isReal
    ? "Cliente registrado desde WhatsApp"
    : `Nombre de perfil WA: "${rawName}" — pendiente de confirmar nombre real`;

  const { data: existing } = await supabase
    .from("clients")
    .select("id, name, phone, phone_country, phone_normalized, tenant_id")
    .eq("tenant_id", tenantId)
    .eq("phone_country", country)
    .eq("phone_normalized", normalized)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, string> = {};
    const currentIsPlaceholder = /^cliente wa \d{4}$/i.test(
      (existing as { name?: string }).name ?? "",
    );
    if (currentIsPlaceholder && isReal) {
      updates.name = displayName;
    }
    if (
      !(existing as { phone?: string }).phone ||
      (existing as { phone?: string }).phone !== displayPhone
    ) {
      updates.phone = displayPhone;
    }
    if (Object.keys(updates).length > 0) {
      await supabase
        .from("clients")
        .update(updates)
        .eq("id", (existing as { id: string }).id);
    }
    return { client: existing, isNew: false };
  }

  const { data: byPhone } = await supabase
    .from("clients")
    .select("id, name, phone, phone_country, phone_normalized, tenant_id")
    .eq("tenant_id", tenantId)
    .eq("phone", displayPhone)
    .is("phone_normalized", null)
    .maybeSingle();

  if (byPhone) {
    await supabase
      .from("clients")
      .update({ phone_country: country, phone_normalized: normalized })
      .eq("id", (byPhone as { id: string }).id);
    return { client: byPhone, isNew: false };
  }

  const { data: created } = await supabase
    .from("clients")
    .insert({
      tenant_id: tenantId,
      name: displayName,
      phone: displayPhone,
      phone_country: country,
      phone_normalized: normalized,
      notes,
    })
    .select()
    .single();
  return { client: created, isNew: true };
}

function parseLegacyServiceIds(raw: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") {
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

export async function getSession(supabase: SupabaseClient, tenantId: string, phone: string) {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .maybeSingle();
  if (!data) return null;
  const cartItems = parseCartItemsRaw(data.cart_items);
  const legacyIds = parseLegacyServiceIds(data.cart_service_ids);
  return {
    ...data,
    step: data.step as string,
    serviceIds: legacyIds,
    cartItems:
      cartItems.length > 0
        ? cartItems
        : legacyIds.map((id) => ({
            item_type: "service" as const,
            item_id: id,
            quantity: 1,
            price: 0,
          })),
    parsedDatetime: data.parsed_datetime
      ? new Date(data.parsed_datetime as string)
      : null,
    employeeAssignments: data.employee_assignments
      ? (typeof data.employee_assignments === "string"
          ? JSON.parse(data.employee_assignments)
          : data.employee_assignments) as Record<string, string>
      : ({} as Record<string, string>),
    awaiting_screenshot: Boolean(data.awaiting_screenshot),
    pending_photo_areas: data.pending_photo_areas as string | null,
  };
}

function jsonish(val: unknown): unknown {
  if (typeof val === "string") {
    try {
      return JSON.parse(val);
    } catch {
      return val;
    }
  }
  return val;
}

export async function upsertSession(
  supabase: SupabaseClient,
  tenantId: string,
  phone: string,
  patch: Record<string, unknown>,
) {
  const row: Record<string, unknown> = {
    tenant_id: tenantId,
    phone,
    ...patch,
  };
  for (const k of ["cart_items", "cart_service_ids", "employee_assignments"] as const) {
    if (k in row) row[k] = jsonish(row[k]);
  }
  await supabase.from("whatsapp_sessions").upsert(row, {
    onConflict: "tenant_id,phone",
  });
}

export async function expandCartItemsToServiceIds(
  supabase: SupabaseClient,
  tenantId: string,
  items: CartItem[],
): Promise<string[]> {
  const out: string[] = [];
  for (const it of items) {
    if (it.item_type === "service") {
      for (let i = 0; i < it.quantity; i++) out.push(it.item_id);
      continue;
    }
    const { data: pack } = await supabase
      .from("packs")
      .select("service_ids")
      .eq("tenant_id", tenantId)
      .eq("id", it.item_id)
      .maybeSingle();
    const raw = pack?.service_ids;
    const ids: string[] = Array.isArray(raw)
      ? raw.map(String)
      : typeof raw === "string"
        ? (JSON.parse(raw) as string[])
        : [];
    for (let q = 0; q < it.quantity; q++) {
      for (const id of ids) out.push(id);
    }
  }
  return out;
}

export interface CartLineForAppointment {
  service_id: string;
  price: number;
  duration?: number;
  pack_id?: string | null;
}

function splitTotalEqually(total: number, parts: number): number[] {
  if (parts <= 0 || !Number.isFinite(total)) return [];
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / parts);
  const remainder = cents - base * parts;
  return Array.from(
    { length: parts },
    (_, i) => (base + (i < remainder ? 1 : 0)) / 100,
  );
}

export async function cartItemsToDisplayLabel(
  supabase: SupabaseClient,
  tenantId: string,
  items: CartItem[],
): Promise<string> {
  const parts: string[] = [];
  for (const it of items) {
    if (it.item_type === "service") {
      const { data: svc } = await supabase
        .from("services")
        .select("name")
        .eq("tenant_id", tenantId)
        .eq("id", it.item_id)
        .maybeSingle();
      const nm = (svc as { name?: string })?.name ?? it.item_id;
      parts.push(it.quantity > 1 ? `${it.quantity}× ${nm}` : nm);
    } else {
      const { data: pack } = await supabase
        .from("packs")
        .select("name")
        .eq("tenant_id", tenantId)
        .eq("id", it.item_id)
        .maybeSingle();
      const nm =
        (pack as { name?: string })?.name ?? it.item_id;
      const label = `Pack · ${nm}`;
      parts.push(it.quantity > 1 ? `${it.quantity}× ${label}` : label);
    }
  }
  return parts.join(" + ");
}

export async function expandCartItemsToLines(
  supabase: SupabaseClient,
  tenantId: string,
  items: CartItem[],
): Promise<CartLineForAppointment[]> {
  const out: CartLineForAppointment[] = [];
  for (const it of items) {
    if (it.item_type === "service") {
      const { data: svc } = await supabase
        .from("services")
        .select("id, duration")
        .eq("tenant_id", tenantId)
        .eq("id", it.item_id)
        .maybeSingle();
      const duration = (svc as { duration?: number })?.duration ?? 60;
      for (let i = 0; i < it.quantity; i++) {
        out.push({
          service_id: it.item_id,
          price: it.price,
          duration,
          pack_id: null,
        });
      }
      continue;
    }
    const { data: pack } = await supabase
      .from("packs")
      .select("service_ids")
      .eq("tenant_id", tenantId)
      .eq("id", it.item_id)
      .maybeSingle();
    const raw = pack?.service_ids;
    const ids: string[] = Array.isArray(raw)
      ? raw.map(String)
      : typeof raw === "string"
        ? (JSON.parse(raw) as string[])
        : [];
    const n = ids.length || 1;
    const { data: svcs } = await supabase
      .from("services")
      .select("id, duration")
      .eq("tenant_id", tenantId)
      .in("id", ids);
    const durationBy = new Map(
      (svcs ?? []).map((s: { id: string; duration?: number }) => [
        s.id,
        s.duration ?? 60,
      ]),
    );
    for (let q = 0; q < it.quantity; q++) {
      const shares = splitTotalEqually(it.price, n);
      for (let i = 0; i < ids.length; i++) {
        out.push({
          service_id: ids[i],
          price: shares[i] ?? 0,
          duration: durationBy.get(ids[i]),
          pack_id: it.item_id,
        });
      }
    }
  }
  return out;
}

export async function addToCart(
  supabase: SupabaseClient,
  tenantId: string,
  phone: string,
  serviceId: string,
  price?: number,
): Promise<CartItem[]> {
  const session = await getSession(supabase, tenantId, phone);
  const current = session?.cartItems ?? [];
  let usePrice = price;
  if (usePrice == null) {
    const { data: svc } = await supabase
      .from("services")
      .select("price")
      .eq("tenant_id", tenantId)
      .eq("id", serviceId)
      .maybeSingle();
    usePrice = svc ? parseFloat(String((svc as { price?: unknown }).price)) : 0;
  }
  const newItem: CartItem = {
    item_type: "service",
    item_id: serviceId,
    quantity: 1,
    price: usePrice ?? 0,
  };
  const next = [...current, newItem];
  const serviceIds = await expandCartItemsToServiceIds(supabase, tenantId, next);
  await upsertSession(supabase, tenantId, phone, {
    cart_items: next,
    cart_service_ids: serviceIds,
    step: "browsing",
  });
  return next;
}

export async function addCartItems(
  supabase: SupabaseClient,
  tenantId: string,
  phone: string,
  items: CartItem[],
): Promise<CartItem[]> {
  if (items.length === 0) {
    return (await getSession(supabase, tenantId, phone))?.cartItems ?? [];
  }
  const session = await getSession(supabase, tenantId, phone);
  const current = session?.cartItems ?? [];
  const next = [...current, ...items];
  const serviceIds = await expandCartItemsToServiceIds(supabase, tenantId, next);
  await upsertSession(supabase, tenantId, phone, {
    cart_items: next,
    cart_service_ids: serviceIds,
    step: "browsing",
  });
  return next;
}

export async function clearCart(
  supabase: SupabaseClient,
  tenantId: string,
  phone: string,
) {
  await upsertSession(supabase, tenantId, phone, {
    cart_items: [],
    cart_service_ids: [],
    step: "browsing",
    parsed_datetime: null,
    employee_assignments: {},
    awaiting_screenshot: false,
    pre_service_photo_url: null,
    pre_service_photo_url_2: null,
    pre_service_photo_requested: false,
    pending_photo_areas: null,
    verification_id: null,
    nudge1_sent_at: null,
    nudge2_sent_at: null,
  });
}

export function logMessage(
  supabase: SupabaseClient,
  tenantId: string,
  phone: string,
  direction: "in" | "out",
  content: string,
  opts?: { msg_type?: string; step_before?: string },
): void {
  supabase
    .from("wa_messages")
    .insert({
      tenant_id: tenantId,
      phone,
      direction,
      msg_type: opts?.msg_type ?? "text",
      content: content.slice(0, 2000),
      step_before: opts?.step_before ?? null,
    })
    .then(() => {})
    .catch(() => {});
}

export async function isRecurringClient(
  supabase: SupabaseClient,
  tenantId: string,
  phone: string,
): Promise<boolean> {
  const normalized = phone.replace(/\D/g, "").slice(-9);
  const { data } = await supabase
    .from("appointments")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .ilike("client_phone", `%${normalized}`);
  return (data?.length ?? 0) > 0;
}

export async function getLastCompletedService(
  supabase: SupabaseClient,
  tenantId: string,
  phone: string,
): Promise<string | null> {
  const normalized = phone.replace(/\D/g, "").slice(-9);
  const { data } = await supabase
    .from("appointments")
    .select("services(name)")
    .eq("tenant_id", tenantId)
    .eq("status", "completed")
    .ilike("client_phone", `%${normalized}`)
    .order("date", { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return null;
  const svc = (data[0] as { services: { name: string } | null }).services;
  return svc?.name ?? null;
}
