#!/usr/bin/env -S deno run --allow-read --allow-env --config supabase/functions/deno.json
/**
 * Unit — pending-price-cta helpers (SOFI: "Cuánto está" → Anime S/110).
 */
import { shouldDeferHaikuAddToCart } from "../supabase/functions/whatsapp-webhook/lib/haiku-cart-defer.ts";
import {
  filterNonConflictingQuotedOfferIds,
  findQuotedOfferIdsInText,
  findServiceQuotedInHaikuText,
  haikuAlreadyAskedToConfirm,
  isBarePriceFollowUp,
  matchesQuotedOfferConfirm,
  quotedOfferIdsFromOutboundRows,
} from "../supabase/functions/whatsapp-webhook/lib/pending-price-cta.ts";
import { formatCatalogBulletNewlines } from "../supabase/functions/whatsapp-webhook/format.ts";
import type { ServiceCatalog } from "../supabase/functions/whatsapp-webhook/lib/services-catalog.ts";

type Case = { name: string; pass: boolean };
const cases: Case[] = [];
function check(name: string, pass: boolean) {
  cases.push({ name, pass });
}

const catalog = {
  servicesById: new Map([
    [
      "svc-anime",
      {
        id: "svc-anime",
        name: "Anime",
        short_name: "Anime",
        price: "110",
        duration: 120,
        category_id: "cat-extensiones",
      },
    ],
    [
      "svc-gel",
      {
        id: "svc-gel",
        name: "Builder Gel",
        price: "60",
        duration: 90,
        category_id: "cat-unas",
      },
    ],
    [
      "svc-mojado",
      {
        id: "svc-mojado",
        name: "Extensiones Efect Mojado",
        short_name: null,
        price: "85",
        duration: 120,
        category_id: "cat-extensiones",
      },
    ],
    [
      "svc-rimel",
      {
        id: "svc-rimel",
        name: "Extensiones Rímel",
        short_name: "Extensiones Rímel",
        price: "85",
        duration: 120,
        category_id: "cat-extensiones",
      },
    ],
    [
      "svc-retoque-rimel",
      {
        id: "svc-retoque-rimel",
        name: "Retoque Clásicas / Rímel",
        short_name: "Retoque Clásicas / Rimel",
        price: "50",
        duration: 90,
        category_id: "cat-extensiones",
      },
    ],
    [
      "svc-manos",
      {
        id: "svc-manos",
        name: "Manicure en Gel",
        short_name: null,
        price: "35",
        duration: 90,
        category_id: "cat-unas",
      },
    ],
    [
      "svc-pies",
      {
        id: "svc-pies",
        name: "Pedicure en Gel",
        short_name: null,
        price: "70",
        duration: 120,
        category_id: "cat-unas",
      },
    ],
    [
      "svc-pack-clone",
      {
        id: "svc-pack-clone",
        name: "Manos en Gel + Pies en Gel",
        short_name: null,
        price: "90",
        duration: 210,
        category_id: "cat-unas",
      },
    ],
  ]),
  packsById: new Map([
    [
      "pack-gel",
      {
        id: "pack-gel",
        title: "Manos en Gel + Pies en Gel",
        short_name: "Manos en Gel + Pies en Gel",
        pack_price: "90",
        service_ids: '["svc-manos","svc-pies"]',
      },
    ],
  ]),
} as unknown as ServiceCatalog;

check("cuánto está → bare price follow-up", isBarePriceFollowUp("Cuánto está"));
check("cuanto esta sin tilde", isBarePriceFollowUp("cuanto esta"));
check("anime no es bare", !isBarePriceFollowUp("Lo quisiera en modelo anime"));

const haiku =
  "Las Extensiones Anime están a S/110. La cita toma unos 120 min en el salón 💜";
const hit = findServiceQuotedInHaikuText(haiku, catalog);
check("Haiku Anime S/110 → svc-anime", hit?.id === "svc-anime");
check(
  "sin S/ → null",
  findServiceQuotedInHaikuText("El Anime es un look espectacular", catalog) ===
    null,
);
check(
  "Naila — Clásicas/Rímel sin espacios coincide con el catálogo",
  findServiceQuotedInHaikuText(
    "Retoque Clásicas/Rímel — S/50 ¿Te agendo?",
    catalog,
  )?.id === "svc-retoque-rimel",
);
check(
  "set Rímel no se confunde con el retoque",
  findServiceQuotedInHaikuText(
    "Extensiones Rímel con efecto ardilla — S/85",
    catalog,
  )?.id === "svc-rimel",
);

const quotePack =
  "Srta. Alberto, perfecto 💜 🌸 Manicure en Gel (manos) — S/35 🌸 Pedicure en Gel (pies) — S/70 También tenemos un pack: Manos en Gel + Pies en Gel — S/90";
const packIds = findQuotedOfferIdsInText(quotePack, catalog);
check(
  "cotización pack no duplica manicure/pedicure",
  packIds.length === 1 && packIds[0] === "pack-gel",
);
check(
  "pack no agrega el servicio clon del mismo nombre",
  !packIds.includes("svc-pack-clone"),
);

const combo =
  "Extensiones Efect Mojado — S/85. Entonces tu sábado 26 quedaría: Manos en Gel + Pies en Gel (S/90) + Extensiones Mojado (S/85) = S/175 total. ¿Confirmamos todo junto?";
const comboIds = findQuotedOfferIdsInText(combo, catalog);
check(
  "combo pack + mojado",
  comboIds.includes("pack-gel") && comboIds.includes("svc-mojado"),
);
check("Si confirmamos", matchesQuotedOfferConfirm("Si confirmamos"));
check("haiku ya preguntó confirmar", haikuAlreadyAskedToConfirm(combo));

const corrido =
  "Srta. Alberto, te presento nuestras opciones principales: 🌸 Clásicas — S/70 (natural y elegante) 🌸 Rímel — S/85 (más definido e intenso) 🌸 Baby Vol. Tecnológica 3D — S/100";
const listed = formatCatalogBulletNewlines(corrido);
check(
  "viñetas 🌸 en líneas separadas",
  listed.includes("\n🌸 Clásicas") &&
    listed.includes("\n🌸 Rímel") &&
    listed.includes("\n🌸 Baby") &&
    !listed.includes("principales: 🌸"),
);
check(
  "viñetas no rompen estrellas continuas (⭐⭐⭐⭐⭐)",
  formatCatalogBulletNewlines("Calificación: ⭐⭐⭐⭐⭐ cinco estrellas") ===
    "Calificación: ⭐⭐⭐⭐⭐ cinco estrellas",
);
check(
  "viñetas preservan saltos dobles existentes",
  formatCatalogBulletNewlines(
    "Hola\n\n🌸 Clásicas — S/70\n\n🌸 Rímel — S/85",
  ) === "Hola\n\n🌸 Clásicas — S/70\n\n🌸 Rímel — S/85",
);

// Múltiples alternativas vs combo
check(
  "filtro no permite múltiples servicios de la misma categoría juntos con confirmación ambigua",
  filterNonConflictingQuotedOfferIds(["svc-mojado", "svc-anime"], catalog, "Sí")
    .length === 0,
);
check(
  "filtro permite combo de distintas categorías (pack + extensiones)",
  filterNonConflictingQuotedOfferIds(
    ["pack-gel", "svc-mojado"],
    catalog,
    "Si confirmamos",
  ).length === 2,
);
check(
  "filtro rescata servicio específico si la clienta lo nombra",
  filterNonConflictingQuotedOfferIds(
    ["svc-mojado", "svc-anime"],
    catalog,
    "Me gusta el efecto mojado",
  )[0] === "svc-mojado",
);

const haikuPregunta =
  "🌸 Pack 2 Lifting — S/90\n\n¿Te agendo este pack? Solo dime qué día te funciona mejor 💜";
check(
  "difiere add_to_cart si solo pidió el pack",
  shouldDeferHaikuAddToCart(haikuPregunta, "quiero el pack de 2 lifting"),
);
check(
  "no difiere si ya dijo día y hora",
  shouldDeferHaikuAddToCart(haikuPregunta, "mañana a las 4") === false,
);
check(
  "no difiere si dijo agéndame",
  shouldDeferHaikuAddToCart(haikuPregunta, "agéndame el lifting") === false,
);
check(
  "no difiere un sí corto",
  shouldDeferHaikuAddToCart(haikuPregunta, "sí") === false,
);
check(
  "no difiere sí, el pack",
  shouldDeferHaikuAddToCart(haikuPregunta, "sí, el pack") === false,
);
check(
  "no difiere si Haiku no preguntó",
  shouldDeferHaikuAddToCart(
    "El Pack 2 Lifting es para ti y una acompañante.",
    "quiero el pack de 2 lifting",
  ) === false,
);

const quoteAt = "2026-10-04T02:00:00.000Z";
const nudgeAt = "2026-10-04T14:00:00.000Z";
check(
  "rescate ignora el nudge posterior y toma la cotización",
  quotedOfferIdsFromOutboundRows(
    [
      {
        content: "Sin presión. Si quieres retomar, escribe agendar.",
        created_at: nudgeAt,
      },
      {
        content: "Extensiones Rímel — S/85. ¿Te agendo?",
        created_at: quoteAt,
      },
    ],
    catalog,
  )[0] === "svc-rimel",
);
check(
  "rescate se queda con la cotización más nueva",
  quotedOfferIdsFromOutboundRows(
    [
      {
        content: "Extensiones Anime están a S/110.",
        created_at: nudgeAt,
      },
      {
        content: "Extensiones Rímel — S/85.",
        created_at: quoteAt,
      },
    ],
    catalog,
  )[0] === "svc-anime",
);

const failed = cases.filter((c) => !c.pass);
for (const c of cases) console.log(`  ${c.pass ? "✅" : "❌"} ${c.name}`);
console.log(
  `\n${failed.length === 0 ? "✅" : "❌"} ${
    cases.length - failed.length
  }/${cases.length}`,
);
if (failed.length > 0) Deno.exit(1);
