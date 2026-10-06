#!/usr/bin/env -S deno run -A --config supabase/functions/deno.json
/**
 * Smoke local de prompt caching (2 llamadas Messages con cache_control).
 * No toca WhatsApp. Solo lectura de catálogo + Anthropic.
 *
 * Uso: deno run -A --config supabase/functions/deno.json scripts/waba-smoke-prompt-cache.ts
 */
import { createClient } from "@supabase/supabase-js";
import {
  composeHaikuChatSystemBlocks,
  FINAL_FORMAT_REMINDER,
} from "../supabase/functions/whatsapp-webhook/lib/haiku-prompt.ts";
import { HAIKU_SYSTEM_PROMPT_BASE_DEFAULT } from "../supabase/functions/whatsapp-webhook/lib/haiku-cms-defaults.ts";
import type { ServiceCatalog } from "../supabase/functions/whatsapp-webhook/lib/services-catalog.ts";

const MODEL = "claude-haiku-4-5-20251001";
const ROOT = new URL("..", import.meta.url).pathname;

function loadEnv(): { url: string; serviceKey: string; apiKey: string } {
  const raw = Deno.readTextFileSync(`${ROOT}/.env`);
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  const url = env.EXPO_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!url || !serviceKey || !apiKey) {
    throw new Error(
      "Faltan EXPO_PUBLIC_SUPABASE_URL/SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o ANTHROPIC_API_KEY",
    );
  }
  return { url, serviceKey, apiKey };
}

async function loadCatalog(
  sb: ReturnType<typeof createClient>,
): Promise<ServiceCatalog> {
  const today = new Date().toISOString();
  const [catRes, svcRes, packRes, promosRes, imgsRes] = await Promise.all([
    sb.from("service_categories").select("id, name, order").order("name"),
    sb
      .from("services")
      .select(
        "id, name, short_name, category_id, subcategory, price, duration, is_active",
      )
      .eq("is_active", true)
      .order("name"),
    sb
      .from("packs")
      .select(
        "id, title, short_name, category_id, pack_price, service_ids, display_order, is_active",
      )
      .eq("is_active", true)
      .order("display_order", { ascending: true }),
    sb
      .from("promotions")
      .select(
        "id, title, description, emoji, badge, valid_until, valid_days, is_active, display_order",
      )
      .eq("is_active", true)
      .or(`valid_until.is.null,valid_until.gte.${today}`)
      .order("display_order", { ascending: true }),
    sb
      .from("service_portfolio_images")
      .select("service_id, image_url, caption, sort_order")
      .order("sort_order", { ascending: true }),
  ]);

  const categories = (catRes.data ?? []) as ServiceCatalog["categories"];
  const services = (svcRes.data ?? []) as ServiceCatalog["services"];
  const packs = (packRes.data ?? []) as ServiceCatalog["packs"];
  const promosRaw = (promosRes.data ?? []) as Omit<
    ServiceCatalog["promotions"][number],
    "items"
  >[];
  const promotionIds = promosRaw.map((p) => p.id);
  const { data: itemsRows } = promotionIds.length
    ? await sb
        .from("promotion_items")
        .select(
          "id, promotion_id, item_type, item_id, quantity, discounted_price, sort_order",
        )
        .in("promotion_id", promotionIds)
        .order("sort_order", { ascending: true })
    : { data: [] };

  const itemsByPromo = new Map<
    string,
    ServiceCatalog["promotions"][number]["items"]
  >();
  for (const it of (itemsRows ??
    []) as ServiceCatalog["promotions"][number]["items"][number][]) {
    if (!itemsByPromo.has(it.promotion_id))
      itemsByPromo.set(it.promotion_id, []);
    itemsByPromo.get(it.promotion_id)!.push(it);
  }
  const promotions = promosRaw.map((p) => ({
    ...p,
    items: itemsByPromo.get(p.id) ?? [],
  }));

  const imgs = imgsRes.data ?? [];
  const serviceIds = [
    ...new Set(
      imgs
        .map((r) => r.service_id as string)
        .filter((id) => typeof id === "string" && id),
    ),
  ];
  const { data: portSvcs } = serviceIds.length
    ? await sb
        .from("services")
        .select("id, name, category_id")
        .in("id", serviceIds)
    : { data: [] };
  const byId = new Map(
    (portSvcs ?? []).map((s) => [
      s.id as string,
      {
        name: (s.name as string) ?? "",
        categoryId: (s.category_id as string | null) ?? null,
      },
    ]),
  );
  const portfolioIndex: ServiceCatalog["portfolioIndex"] = [];
  for (const r of imgs) {
    const imageUrl = typeof r.image_url === "string" ? r.image_url.trim() : "";
    if (!imageUrl) continue;
    const sid = r.service_id as string;
    const meta = byId.get(sid);
    portfolioIndex.push({
      serviceId: sid,
      serviceName: meta?.name ?? "",
      categoryId: meta?.categoryId ?? null,
      url: imageUrl,
      caption: typeof r.caption === "string" ? r.caption.trim() : "",
      sortOrder: typeof r.sort_order === "number" ? r.sort_order : 0,
    });
  }

  const servicesByCategory = new Map<string, typeof services>();
  for (const s of services) {
    const cid = s.category_id ?? "";
    if (!servicesByCategory.has(cid)) servicesByCategory.set(cid, []);
    servicesByCategory.get(cid)!.push(s);
  }
  const packsByCategory = new Map<string, typeof packs>();
  for (const p of packs) {
    if (!packsByCategory.has(p.category_id))
      packsByCategory.set(p.category_id, []);
    packsByCategory.get(p.category_id)!.push(p);
  }

  return {
    categories,
    services,
    packs,
    promotions,
    servicesByCategory,
    packsByCategory,
    servicesById: new Map(services.map((s) => [s.id, s])),
    packsById: new Map(packs.map((p) => [p.id, p])),
    portfolioIndex,
  };
}

async function callMessages(apiKey: string, system: unknown, userMsg: string) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 80,
      system,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      `Messages ${res.status}: ${JSON.stringify(data).slice(0, 500)}`,
    );
  }
  return (data.usage ?? {}) as {
    input_tokens?: number;
    output_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
  };
}

const { url, serviceKey, apiKey } = loadEnv();
// Evitar que lib/supabase.ts lea Deno.env al importar portfolio/wa-api transitivo
Deno.env.set("SUPABASE_URL", url);
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", serviceKey);

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });
console.log("Cargando catálogo…");
const catalog = await loadCatalog(sb);
const blocks = composeHaikuChatSystemBlocks(
  HAIKU_SYSTEM_PROMPT_BASE_DEFAULT,
  catalog,
  "PE",
);
const dynamic =
  "CLIENTA: Primera visita (cliente nueva)\nSIN CITA PROGRAMADA: este número no tiene ninguna reserva activa.\n\n" +
  FINAL_FORMAT_REMINDER;
blocks.push({ type: "text", text: dynamic });

console.log(`bloques system: ${blocks.length}`);
for (let i = 0; i < blocks.length; i++) {
  const b = blocks[i]!;
  const cc = b.cache_control ? JSON.stringify(b.cache_control) : "(sin cache)";
  console.log(`  [${i}] chars=${b.text.length} cache_control=${cc}`);
}
const last = blocks[blocks.length - 1]!;
const lastIsReminder =
  !last.cache_control && last.text.includes("RECORDATORIO FINAL");
console.log(
  `\nÚltimo bloque = RECORDATORIO FINAL sin cache: ${lastIsReminder ? "OK" : "FAIL"}`,
);
if (!lastIsReminder) {
  throw new Error("El último bloque del system NO es FINAL_FORMAT_REMINDER");
}

console.log("\nLlamada 1 (esperamos cache_creation > 0)…");
const u1 = await callMessages(
  apiKey,
  blocks,
  "cuánto cuesta el efecto ardilla",
);
console.log(JSON.stringify(u1, null, 2));

console.log("\nLlamada 2 (esperamos cache_read ~20k+)…");
const u2 = await callMessages(
  apiKey,
  blocks,
  "cuánto cuesta el efecto ardilla",
);
console.log(JSON.stringify(u2, null, 2));

console.log("\n=== RESUMEN ===");
console.log(
  `1ª: creation=${u1.cache_creation_input_tokens ?? 0} read=${u1.cache_read_input_tokens ?? 0} input=${u1.input_tokens ?? 0}`,
);
console.log(
  `2ª: creation=${u2.cache_creation_input_tokens ?? 0} read=${u2.cache_read_input_tokens ?? 0} input=${u2.input_tokens ?? 0}`,
);
