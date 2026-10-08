// supabase.ts — Cliente y helpers de sesión/carrito

import { createClient } from "@supabase/supabase-js";
import { isWaBsuid } from "./wa-recipient.mjs";
import { getRequestTenantId } from "./tenant.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function getSupabase() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}

export type SupabaseClient = ReturnType<typeof getSupabase>;

/** Ítem del carrito: servicio o pack con cantidad y precio (Yape/Plin). */
export interface CartItem {
  item_type: "service" | "pack";
  item_id: string;
  quantity: number;
  price: number;
}

function parseCartItems(raw: string | null | undefined): CartItem[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

/**
 * Normaliza número de teléfono: quita espacios, guiones y paréntesis.
 */
function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, "").trim();
}

/**
 * Extrae phone_country y phone_normalized desde un wa_id de Meta.
 * wa_id = código de país + número local, sin espacios ni signos (ej: "51987654321").
 *
 * Reglas:
 * - Si comienza con "51" y la parte restante es 9 dígitos → país = "PE"
 * - Si comienza con "1" y la parte restante es 10 dígitos → país = "1" (US/CA)
 * - Otros prefijos → tomamos los primeros 2–3 dígitos como país
 * - Nunca falla: si no se puede determinar, devuelve country = prefijo y normalized = resto
 */
export function getPhoneCountryAndNormalizedFromWa(waId: string): {
  country: string;
  normalized: string;
} {
  // wa_id solo tiene dígitos (Meta los envía así)
  const digits = waId.replace(/\D/g, "");

  // Perú: 51 + 9 dígitos (todos los móviles peruanos empiezan en 9)
  if (digits.startsWith("51") && digits.length === 11) {
    return { country: "PE", normalized: digits.slice(2) };
  }

  // Perú sin código de país: Meta a veces envía message.from así (caso
  // Vianei Rubio / Veronika Castillo, 19-ago-2026) — sin este branch cae al
  // fallback genérico de abajo y crea un cliente duplicado con country/
  // normalized distintos al resto de mensajes de la misma clienta.
  if (digits.length === 9 && digits.startsWith("9")) {
    return { country: "PE", normalized: digits };
  }

  // EEUU/Canadá: 1 + 10 dígitos
  if (digits.startsWith("1") && digits.length === 11) {
    return { country: "1", normalized: digits.slice(1) };
  }

  // Otros países con prefijo de 2 dígitos (ej: Venezuela 58, Argentina 54, Chile 56, Colombia 57)
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

  // Fallback: primeros 3 dígitos como país
  if (digits.length > 4) {
    return { country: digits.slice(0, 3), normalized: digits.slice(3) };
  }

  return { country: "XX", normalized: digits };
}

/**
 * Normaliza nombre: MAYÚSCULAS, sin espacios dobles, sin emojis.
 */
function normalizeName(name: string): string {
  // Eliminar emojis y caracteres no latinos
  const noEmoji = name
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/gu, "")
    .trim();
  return noEmoji.replace(/\s+/g, " ").trim().toUpperCase();
}

/**
 * Detecta si un nombre de perfil de WhatsApp parece ser un nombre real de persona.
 * Descarta: nombres de negocio, apodos con emojis, nombres demasiado cortos, etc.
 *
 * Reglas:
 * - Mínimo 3 caracteres alfabéticos
 * - No contiene "store", "shop", "beauty", "nail", "lash", "studio", "salon", números solos
 * - No es exactamente "Cliente WhatsApp" u otros placeholders
 * - Después de quitar emojis y espacios, queda algo con al menos 2 palabras O una palabra ≥4 chars
 */
function isLikelyRealName(raw: string): boolean {
  const PLACEHOLDERS = ["cliente whatsapp", "whatsapp user", "unknown", ""];
  const cleaned = normalizeName(raw);
  if (!cleaned || PLACEHOLDERS.includes(cleaned.toLowerCase())) return false;

  // Si tiene solo números → no es nombre
  if (/^\d+$/.test(cleaned)) return false;

  // Palabras de negocio en el nombre → guardar como display pero no como nombre principal
  const BUSINESS_KEYWORDS =
    /\b(store|shop|beauty|nail|lash|studio|salon|spa|centre|center|service|ventas|negocio|empresa)\b/i;
  if (BUSINESS_KEYWORDS.test(cleaned)) return false;

  // Debe tener al menos 3 letras del alfabeto
  const letters = (cleaned.match(/[A-ZÁÉÍÓÚÑ]/gi) ?? []).length;
  if (letters < 3) return false;

  // Al menos una palabra de 3+ chars
  const words = cleaned.split(/\s+/).filter((w) => /[A-ZÁÉÍÓÚÑ]{3,}/i.test(w));
  if (words.length === 0) return false;

  // Lemas / frases de perfil WA (≥5 palabras) no son nombre de persona
  // (ej. "CON DIOS TODO SIN EL NADA")
  if (cleaned.split(/\s+/).length >= 5) return false;

  return true;
}

export async function getOrCreateClient(
  supabase: SupabaseClient,
  waId: string,
  rawName: string,
  opts?: { username?: string | null },
) {
  const tenantId = getRequestTenantId();
  const usernameRaw = typeof opts?.username === "string"
    ? opts.username.trim()
    : "";
  const username = usernameRaw.replace(/^@+/, "").slice(0, 80) || null;

  // BSUID-only (Meta usernames / CTWA sin teléfono): clave = wa_user_id.
  if (isWaBsuid(waId)) {
    const isReal = isLikelyRealName(rawName);
    const displayName = isReal
      ? normalizeName(rawName)
      : `Cliente WA ${waId.slice(-4)}`;
    const notes = isReal
      ? "Cliente registrado desde WhatsApp (BSUID)"
      : `Nombre de perfil WA: "${rawName}" — pendiente de confirmar nombre real (BSUID)`;

    const { data: byBsuid } = await supabase
      .from("clients")
      .select(
        "id, name, phone, phone_country, phone_normalized, wa_user_id, wa_username",
      )
      .eq("tenant_id", tenantId)
      .eq("wa_user_id", waId)
      .maybeSingle();

    if (byBsuid) {
      const updates: Record<string, string> = {};
      const currentIsPlaceholder = /^cliente wa /i.test(byBsuid.name ?? "");
      if (currentIsPlaceholder && isReal) {
        updates.name = displayName;
      }
      if (
        username &&
        (!byBsuid.wa_username || byBsuid.wa_username !== username)
      ) {
        updates.wa_username = username;
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from("clients").update(updates).eq("id", byBsuid.id);
      }
      return { client: { ...byBsuid, ...updates }, isNew: false };
    }

    const { data: created } = await supabase
      .from("clients")
      .insert({
        tenant_id: tenantId,
        name: displayName,
        phone: null,
        phone_country: null,
        phone_normalized: null,
        wa_user_id: waId,
        wa_username: username,
        notes,
      })
      .select()
      .single();
    return { client: created, isNew: true };
  }

  // waId es el número de WhatsApp tal como lo envía Meta (ej: "51987654321")
  const { country, normalized } = getPhoneCountryAndNormalizedFromWa(waId);
  const displayPhone = normalizePhone(waId); // teléfono completo para el campo `phone`

  const isReal = isLikelyRealName(rawName);
  const displayName = isReal
    ? normalizeName(rawName)
    : `Cliente WA ${normalized.slice(-4)}`;
  const notes = isReal
    ? "Cliente registrado desde WhatsApp"
    : `Nombre de perfil WA: "${rawName}" — pendiente de confirmar nombre real`;

  // Buscar por phone_country + phone_normalized (índice único en BD)
  const { data: existing } = await supabase
    .from("clients")
    .select("id, name, phone, phone_country, phone_normalized, wa_user_id")
    .eq("tenant_id", tenantId)
    .eq("phone_country", country)
    .eq("phone_normalized", normalized)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, string> = {};
    // Si tenía nombre placeholder y ahora tenemos uno real, actualizar
    const currentIsPlaceholder = /^cliente wa \d{4}$/i.test(
      existing.name ?? "",
    );
    if (currentIsPlaceholder && isReal) {
      updates.name = displayName;
    }
    // Si el campo phone está vacío o distinto, actualizar
    if (!existing.phone || existing.phone !== displayPhone) {
      updates.phone = displayPhone;
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from("clients").update(updates).eq("id", existing.id);
    }
    return { client: existing, isNew: false };
  }

  // Fallback: buscar por phone exacto (clientes sin phone_normalized aún backfilleados)
  const { data: byPhone } = await supabase
    .from("clients")
    .select("id, name, phone, phone_country, phone_normalized, wa_user_id")
    .eq("tenant_id", tenantId)
    .eq("phone", displayPhone)
    .is("phone_normalized", null)
    .maybeSingle();

  if (byPhone) {
    // Aprovechar para rellenar phone_country y phone_normalized
    await supabase
      .from("clients")
      .update({ phone_country: country, phone_normalized: normalized })
      .eq("id", byPhone.id);
    return { client: byPhone, isNew: false };
  }

  // Fallback: mismo número con país mal partido (ej. app +584… → country 584 /
  // normalized 120519893 vs Meta 58 / 4120519893). Evita ficha duplicada.
  const digits = waId.replace(/\D/g, "");
  const last9 = digits.slice(-9);
  if (last9.length === 9) {
    const { data: bySuffixRows } = await supabase
      .from("clients")
      .select("id, name, phone, phone_country, phone_normalized, wa_user_id")
      .eq("tenant_id", tenantId)
      .or(`phone.ilike.%${last9},phone_normalized.ilike.%${last9}%`)
      .limit(5);
    const bySuffix = (bySuffixRows ?? []).find((row) => {
      const phoneDigits = String(row.phone ?? "").replace(/\D/g, "");
      const normDigits = String(row.phone_normalized ?? "").replace(/\D/g, "");
      return (
        phoneDigits.endsWith(last9) ||
        phoneDigits === digits ||
        normDigits.endsWith(last9) ||
        digits.endsWith(normDigits)
      );
    });
    if (bySuffix) {
      const updates: Record<string, string> = {
        phone: displayPhone,
        phone_country: country,
        phone_normalized: normalized,
      };
      const currentIsPlaceholder = /^cliente wa \d{4}$/i.test(
        bySuffix.name ?? "",
      );
      if (currentIsPlaceholder && isReal) {
        updates.name = displayName;
      }
      await supabase.from("clients").update(updates).eq("id", bySuffix.id);
      return {
        client: { ...bySuffix, ...updates },
        isNew: false,
      };
    }
  }

  // Crear nuevo cliente con ambas columnas normalizadas
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

/** Busca clienta por BSUID o por phone_country+normalized. */
export async function findClientByWaRecipient(
  supabase: SupabaseClient,
  waRecipient: string,
): Promise<{ id: string; name: string; dni: string | null } | null> {
  const tenantId = getRequestTenantId();
  if (isWaBsuid(waRecipient)) {
    const { data } = await supabase
      .from("clients")
      .select("id, name, dni")
      .eq("tenant_id", tenantId)
      .eq("wa_user_id", waRecipient)
      .maybeSingle();
    return data ?? null;
  }
  const { country, normalized } = getPhoneCountryAndNormalizedFromWa(
    waRecipient,
  );
  const { data } = await supabase
    .from("clients")
    .select("id, name, dni")
    .eq("tenant_id", tenantId)
    .eq("phone_country", country)
    .eq("phone_normalized", normalized)
    .maybeSingle();
  return data ?? null;
}

/** Teléfono E.164 para citas; null si es BSUID (sin número). */
export function appointmentPhoneForRecipient(
  waRecipient: string,
): string | null {
  return isWaBsuid(waRecipient) ? null : waRecipient;
}

export async function getSession(supabase: SupabaseClient, phone: string) {
  const tenantId = getRequestTenantId();
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .maybeSingle();
  if (!data) return null;
  const cartItems = parseCartItems(data.cart_items as string | null);
  const legacyIds = data.cart_service_ids
    ? (JSON.parse(data.cart_service_ids) as string[])
    : ([] as string[]);
  const rescheduleId = (data as { reschedule_appointment_id?: string | null })
    .reschedule_appointment_id ?? null;

  return {
    ...data,
    step: data.step as string,
    reschedule_appointment_id: rescheduleId,
    serviceIds: legacyIds,
    cartItems: cartItems.length > 0 ? cartItems : legacyIds.map((id) => ({
      item_type: "service" as const,
      item_id: id,
      quantity: 1,
      price: 0,
    })),
    parsedDatetime: data.parsed_datetime
      ? new Date(data.parsed_datetime)
      : null,
    employeeAssignments: data.employee_assignments
      ? (JSON.parse(data.employee_assignments) as Record<string, string>)
      : ({} as Record<string, string>),
  };
}

export async function upsertSession(
  supabase: SupabaseClient,
  phone: string,
  patch: Record<string, unknown>,
) {
  // Instrumentación temporal (Bug 1, sep-2026): capturar quién pone step→browsing
  // cuando la sesión estaba en un flujo activo (awaiting_datetime, etc.).
  if (patch.step === "browsing") {
    try {
      const prev = await getSession(supabase, phone);
      if (prev?.step && prev.step !== "browsing") {
        const stack = (new Error().stack ?? "")
          .split("\n")
          .slice(2, 8)
          .map((l) => l.trim())
          .join(" | ");
        console.warn("[upsertSession] step reset → browsing", phone.slice(-4), {
          from: prev.step,
          selected_day_before:
            (prev as { selected_day?: string | null }).selected_day ?? null,
          patch_keys: Object.keys(patch),
          clears_day: Object.prototype.hasOwnProperty.call(
            patch,
            "selected_day",
          ),
          stack,
        });
      }
    } catch (err) {
      console.warn(
        "[upsertSession] step-reset probe falló:",
        err instanceof Error ? err.message : err,
      );
    }
  }
  const { error } = await supabase.from("whatsapp_sessions").upsert(
    {
      phone,
      tenant_id: getRequestTenantId(),
      updated_at: new Date().toISOString(),
      ...patch,
    },
    { onConflict: "tenant_id,phone" },
  );
  if (error) console.error("[upsertSession]", phone, error.message, patch);
}

/**
 * Marca la sesión como llegada desde Meta Ads (CTWA).
 * Escribe `from_ad_at` y resetea `ads_bounce_nudge_sent_at` para el reenganche
 * ~90–150 min (`ads-bounce-nudge`). Llamar en todo camino fromAd (Camino A y B).
 *
 * No pisa `awaiting_datetime`: re-atribuir CTWA mid-agenda no debe tumbar el
 * calendario (hipótesis Bug 1 — markSessionFromAd forzaba browsing).
 */
export async function markSessionFromAd(
  supabase: SupabaseClient,
  phone: string,
) {
  const session = await getSession(supabase, phone);
  const keepDatetime = session?.step === "awaiting_datetime";
  await upsertSession(supabase, phone, {
    ...(keepDatetime ? {} : { step: "browsing" }),
    from_ad_at: new Date().toISOString(),
    ads_bounce_nudge_sent_at: null,
  });
}

/** Expande ítems de carrito a lista de service_id para compatibilidad y creación de citas. */
export async function expandCartItemsToServiceIds(
  supabase: SupabaseClient,
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
      .eq("id", it.item_id)
      .maybeSingle();
    const ids: string[] = pack?.service_ids
      ? typeof pack.service_ids === "string"
        ? (JSON.parse(pack.service_ids) as string[])
        : (pack.service_ids as string[])
      : [];
    for (let q = 0; q < it.quantity; q++) {
      for (const id of ids) out.push(id);
    }
  }
  return out;
}

/** Una línea para crear cita: service_id + precio (repartido si es pack). */
export interface CartLineForAppointment {
  service_id: string;
  price: number;
  duration?: number;
  /** Id del pack cuando la línea proviene de un pack (precio propio del pack, no suma de lista). */
  pack_id?: string | null;
}

/** Reparte total en N partes iguales (céntimos), sin usar precios de catálogo. */
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

/** Etiqueta legible del carrito (packs como "Pack · …", no solo servicios expandidos). */
export async function cartItemsToDisplayLabel(
  supabase: SupabaseClient,
  items: CartItem[],
): Promise<string> {
  const parts: string[] = [];
  for (const it of items) {
    if (it.item_type === "service") {
      const { data: svc } = await supabase
        .from("services")
        .select("name")
        .eq("id", it.item_id)
        .maybeSingle();
      const nm = (svc as { name?: string })?.name ?? it.item_id;
      parts.push(it.quantity > 1 ? `${it.quantity}× ${nm}` : nm);
    } else {
      const { data: pack } = await supabase
        .from("packs")
        .select("title, short_name")
        .eq("id", it.item_id)
        .maybeSingle();
      const nm =
        (pack as { short_name?: string; title?: string })?.short_name ||
        (pack as { title?: string })?.title ||
        it.item_id;
      const label = `Pack · ${nm}`;
      parts.push(it.quantity > 1 ? `${it.quantity}× ${label}` : label);
    }
  }
  return parts.join(" + ");
}

/** Expande ítems del carrito a líneas (service_id + price) para crear citas. */
export async function expandCartItemsToLines(
  supabase: SupabaseClient,
  items: CartItem[],
): Promise<CartLineForAppointment[]> {
  const out: CartLineForAppointment[] = [];
  for (const it of items) {
    if (it.item_type === "service") {
      const { data: svc } = await supabase
        .from("services")
        .select("id, duration")
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
      .eq("id", it.item_id)
      .maybeSingle();
    const ids: string[] = pack?.service_ids
      ? typeof pack.service_ids === "string"
        ? (JSON.parse(pack.service_ids) as string[])
        : (pack.service_ids as string[])
      : [];
    const n = ids.length || 1;
    const { data: svcs } = await supabase
      .from("services")
      .select("id, duration")
      .in("id", ids);
    const durationBy = new Map<string, number>(
      (svcs ?? []).map(
        (s: { id: string; duration?: number }) =>
          [s.id, s.duration ?? 60] as [string, number],
      ),
    );
    for (let q = 0; q < it.quantity; q++) {
      const shares = splitTotalEqually(it.price, n);
      for (let i = 0; i < ids.length; i++) {
        out.push({
          service_id: ids[i],
          price: shares[i] ?? 0,
          duration: durationBy.get(ids[i]) ?? 60,
          pack_id: it.item_id,
        });
      }
    }
  }
  return out;
}

/** service_ids de un pack desde BD. */
async function loadPackServiceIds(
  supabase: SupabaseClient,
  packId: string,
): Promise<string[]> {
  const { data: pack } = await supabase
    .from("packs")
    .select("service_ids")
    .eq("id", packId)
    .maybeSingle();
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
 * Fusiona carrito evitando CART_MISMATCH (Yoja):
 * - al entrar un pack, quita servicios sueltos cubiertos por ese pack;
 * - al entrar un servicio ya cubierto por un pack en el carrito, lo omite.
 */
export async function mergeCartItemsDedup(
  supabase: SupabaseClient,
  current: CartItem[],
  incoming: CartItem[],
): Promise<CartItem[]> {
  let next = [...current];
  for (const it of incoming) {
    if (it.item_type === "pack") {
      const covered = await loadPackServiceIds(supabase, it.item_id);
      const coveredSet = new Set(covered);
      next = next.filter(
        (c) =>
          !(c.item_type === "service" && coveredSet.has(c.item_id)) &&
          !(c.item_type === "pack" && c.item_id === it.item_id),
      );
      next.push(it);
      continue;
    }
    // servicio: skip si ya está en un pack del carrito o duplicado exacto
    let coveredByPack = false;
    for (const c of next) {
      if (c.item_type !== "pack") continue;
      const ids = await loadPackServiceIds(supabase, c.item_id);
      if (ids.includes(it.item_id)) {
        coveredByPack = true;
        break;
      }
    }
    if (coveredByPack) continue;
    if (
      next.some((c) => c.item_type === "service" && c.item_id === it.item_id)
    ) {
      continue;
    }
    next.push(it);
  }
  return next;
}

/**
 * Un add/replace explícito gana sobre el CTA de una foto anterior.
 * Si no se limpia, el tap de fecha/hora vuelve a imponer ese servicio.
 */
const CLEARED_PENDING_PRICE_CTA = {
  pending_price_cta_service_id: null,
  pending_price_cta_at: null,
} as const;

/** Añade un servicio al carrito (precio desde BD). */
export async function addToCart(
  supabase: SupabaseClient,
  phone: string,
  serviceId: string,
  price?: number,
): Promise<CartItem[]> {
  const session = await getSession(supabase, phone);
  const current = session?.cartItems ?? [];
  let usePrice = price;
  if (usePrice == null) {
    const { data: svc } = await supabase
      .from("services")
      .select("price")
      .eq("id", serviceId)
      .maybeSingle();
    usePrice = svc ? parseFloat(String(svc.price)) : 0;
  }
  const newItem: CartItem = {
    item_type: "service",
    item_id: serviceId,
    quantity: 1,
    price: usePrice,
  };
  const next = await mergeCartItemsDedup(supabase, current, [newItem]);
  const serviceIds = await expandCartItemsToServiceIds(supabase, next);
  const keepDatetime = session?.step === "awaiting_datetime";
  await upsertSession(supabase, phone, {
    cart_items: JSON.stringify(next),
    cart_service_ids: JSON.stringify(serviceIds),
    step: keepDatetime ? "awaiting_datetime" : "browsing",
    // Mirta …8754 (30-sep-2026): la foto había dejado pending Rímel y el
    // add_to_cart de Clásicas no lo limpiaba; el tap de hora reemplazó el carrito.
    ...CLEARED_PENDING_PRICE_CTA,
  });
  return next;
}

/** Añade varios ítems al carrito (ej. promo con promotion_items). */
export async function addCartItems(
  supabase: SupabaseClient,
  phone: string,
  items: CartItem[],
): Promise<CartItem[]> {
  if (items.length === 0) {
    return (await getSession(supabase, phone))?.cartItems ?? [];
  }
  const session = await getSession(supabase, phone);
  const current = session?.cartItems ?? [];
  const next = await mergeCartItemsDedup(supabase, current, items);
  const serviceIds = await expandCartItemsToServiceIds(supabase, next);
  const keepDatetime = session?.step === "awaiting_datetime";
  await upsertSession(supabase, phone, {
    cart_items: JSON.stringify(next),
    cart_service_ids: JSON.stringify(serviceIds),
    step: keepDatetime ? "awaiting_datetime" : "browsing",
    ...CLEARED_PENDING_PRICE_CTA,
  });
  return next;
}

export async function clearCart(supabase: SupabaseClient, phone: string) {
  await upsertSession(supabase, phone, {
    cart_items: JSON.stringify([]),
    cart_service_ids: JSON.stringify([]),
    step: "browsing",
    parsed_datetime: null,
    selected_day: null,
    employee_assignments: JSON.stringify({}),
    awaiting_screenshot: false,
    pre_service_photo_url: null,
    pre_service_photo_url_2: null,
    pre_service_photo_requested: false,
    pending_photo_areas: null,
    verification_id: null,
    reschedule_appointment_id: null,
    nudge1_sent_at: null,
    nudge2_sent_at: null,
  });
}

/**
 * Reemplaza el carrito por estos ítems sin romper reprogramación
 * (conserva reschedule_appointment_id, selected_day y step).
 */
export async function replaceCartKeepingSchedule(
  supabase: SupabaseClient,
  phone: string,
  items: CartItem[],
): Promise<CartItem[]> {
  const session = await getSession(supabase, phone);
  const serviceIds = await expandCartItemsToServiceIds(supabase, items);
  const selectedDay =
    (session as { selected_day?: string | null } | null)?.selected_day ?? null;
  await upsertSession(supabase, phone, {
    cart_items: JSON.stringify(items),
    cart_service_ids: JSON.stringify(serviceIds),
    step: session?.step === "awaiting_datetime"
      ? "awaiting_datetime"
      : "browsing",
    reschedule_appointment_id: session?.reschedule_appointment_id ?? null,
    ...(selectedDay ? { selected_day: selectedDay } : {}),
    employee_assignments: JSON.stringify({}),
    ...CLEARED_PENDING_PRICE_CTA,
  });
  return items;
}

/** Registra un mensaje entrante/saliente en wa_messages (fire-and-forget). */
export function logMessage(
  supabase: SupabaseClient,
  phone: string,
  direction: "in" | "out",
  content: string,
  opts?: { msg_type?: string; step_before?: string; media_id?: string | null },
): void {
  void supabase
    .from("wa_messages")
    .insert({
      phone,
      direction,
      msg_type: opts?.msg_type ?? "text",
      content: content.slice(0, 2000), // evitar filas enormes con payloads de imagen
      step_before: opts?.step_before ?? null,
      media_id: opts?.media_id ?? null,
    })
    .then(
      () => {},
      () => {},
    );
}

/** True si el cliente tiene al menos una cita completada (por teléfono). */
export async function isRecurringClient(
  supabase: SupabaseClient,
  phone: string,
): Promise<boolean> {
  const normalized = phone.replace(/\D/g, "").slice(-9);
  const { data } = await supabase
    .from("appointments")
    .select("id")
    .eq("status", "completed")
    .ilike("client_phone", `%${normalized}`);
  return (data?.length ?? 0) > 0;
}

/** Último servicio completado de un cliente (por teléfono). Retorna null si no existe. */
export async function getLastCompletedService(
  supabase: SupabaseClient,
  phone: string,
): Promise<string | null> {
  const normalized = phone.replace(/\D/g, "").slice(-9);
  const { data } = await supabase
    .from("appointments")
    .select("services(name)")
    .eq("status", "completed")
    .ilike("client_phone", `%${normalized}`)
    .order("date", { ascending: false })
    .limit(1);
  if (!data || data.length === 0) return null;
  const row = data[0] as {
    services?: { name: string } | { name: string }[] | null;
  };
  const svc = row.services;
  if (!svc) return null;
  if (Array.isArray(svc)) return svc[0]?.name ?? null;
  return svc.name ?? null;
}
