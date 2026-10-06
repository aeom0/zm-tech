import { assertMatch, assertStringIncludes } from "@std/assert";
import { buildCatalogAppendix } from "./haiku-prompt.ts";
import type { ServiceCatalog } from "./services-catalog.ts";

/** Catálogo mínimo con un servicio, un pack y una promo con centavos reales. */
function buildFixtureCatalog(): ServiceCatalog {
  const service = {
    id: "svc-1",
    name: "Servicio con centavos",
    short_name: null,
    category_id: "cat-1",
    subcategory: null,
    price: "99.90",
    duration: 60,
    is_active: true,
  };
  const pack = {
    id: "pack-1",
    title: "Pack con centavos",
    short_name: null,
    category_id: "cat-1",
    pack_price: "99.90",
    service_ids: "[]",
    display_order: 1,
    is_active: true,
  };
  const promoItem = {
    id: "promo-item-1",
    promotion_id: "promo-1",
    item_type: "service" as const,
    item_id: "svc-1",
    quantity: 1,
    discounted_price: "99.90",
    sort_order: 1,
  };
  const promo = {
    id: "promo-1",
    title: "Promo con centavos",
    description: "",
    emoji: "🌸",
    badge: "",
    valid_until: null,
    valid_days: null,
    is_active: true,
    display_order: 1,
    items: [promoItem],
  };

  return {
    categories: [{ id: "cat-1", name: "Categoría", order: 1 }],
    services: [service],
    packs: [pack],
    promotions: [promo],
    servicesByCategory: new Map([["cat-1", [service]]]),
    packsByCategory: new Map([["cat-1", [pack]]]),
    servicesById: new Map([["svc-1", service]]),
    packsById: new Map([["pack-1", pack]]),
    portfolioIndex: [],
  };
}

// LYM …5765 (10-sep-2026): `.toFixed(0)` redondeaba S/99.90 a "S/100" en el
// catálogo del prompt de Haiku, igualándolo al precio sin descuento — Haiku
// cotizaba S/100 mientras el carrito real cobraba S/99.90. Fix: `formatPromptPrice()`
// solo redondea enteros; conserva los centavos si el precio no es entero.
Deno.test("buildCatalogAppendix no trunca centavos de un servicio", () => {
  const appendix = buildCatalogAppendix(buildFixtureCatalog());
  assertMatch(appendix, /Servicio con centavos — S\/99\.90/);
});

Deno.test("buildCatalogAppendix no trunca centavos de un pack", () => {
  const appendix = buildCatalogAppendix(buildFixtureCatalog());
  assertMatch(appendix, /Pack con centavos — S\/99\.90/);
});

Deno.test("buildCatalogAppendix no trunca centavos del precio de promo", () => {
  const appendix = buildCatalogAppendix(buildFixtureCatalog());
  assertStringIncludes(appendix, "S/99.90");
  assertMatch(appendix, /Servicio con centavos.*—.*S\/99\.90/);
});

Deno.test(
  "buildCatalogAppendix sí redondea precios enteros (sin .00 de sobra)",
  () => {
    const catalog = buildFixtureCatalog();
    catalog.services[0].price = "100";
    catalog.servicesById.get("svc-1")!.price = "100";
    catalog.promotions = []; // sin promo de por medio, el precio a listar es el del servicio
    const appendix = buildCatalogAppendix(catalog);
    assertMatch(appendix, /Servicio con centavos — S\/100 /);
  },
);
