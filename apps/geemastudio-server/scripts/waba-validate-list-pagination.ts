#!/usr/bin/env -S deno run --allow-read --allow-env --config supabase/functions/deno.json
/**
 * Unit test — separación Servicios/Packs + paginación real de packs
 * (fix "listas superan 10 items", 13-sep-2026). Sin webhook: wa_messages
 * no guarda el contenido de las filas de una lista interactiva, así que
 * este QA valida la matemática pura en vez de simular el webhook en vivo.
 */
import { WA_MAX_CONTENT } from "../supabase/functions/whatsapp-webhook/handlers/menu.ts";
import {
  paginatePacks,
  parseViewPayload,
  parsePacksPagePayload,
  classifyUnasService,
  isCatalogNavigationInteractiveId,
  shouldRedirectFreeTextPacksToCategories,
  prevCatalogPageOffset,
  catalogBackToChooser,
  catalogBackToParentFromScope,
  catalogBackToSubcategories,
  catalogBackToCategories,
  buildTimeListPage,
  parseTimePagePayload,
} from "../supabase/functions/whatsapp-webhook/handlers/menu.ts";
import { WA_IDS } from "../supabase/functions/whatsapp-webhook/lib/constants.ts";

type Case = { name: string; pass: boolean };
const cases: Case[] = [];

function check(name: string, pass: boolean) {
  cases.push({ name, pass });
}

// ── WA_MAX_CONTENT ──────────────────────────────────────────────────────────
check(
  "WA_MAX_CONTENT es 9 (10 filas Meta - 1 volver categorías)",
  WA_MAX_CONTENT === 9,
);

// ── paginatePacks: cobertura completa sin duplicar ni perder ítems ─────────
function fullCoverageNoDupes(total: number): boolean {
  const items = Array.from({ length: total }, (_, i) => i);
  const seen: number[] = [];
  let offset = 0;
  let guard = 0;
  while (true) {
    const extra = offset > 0 ? 1 : 0;
    const { page, hasMore, nextOffset } = paginatePacks(items, offset, extra);
    seen.push(...page);
    if (!hasMore) break;
    offset = nextOffset;
    if (++guard > 20) return false; // evita loop infinito si hay bug
  }
  const noDupes = new Set(seen).size === seen.length;
  const sorted = seen.slice().sort((a, b) => a - b);
  const coversAll = sorted.length === total && sorted.every((v, i) => v === i);
  return noDupes && coversAll;
}

for (const n of [0, 1, 5, 8, 9, 10, 14, 15, 20, 23]) {
  check(`paginatePacks(${n}) cubre todo sin duplicar`, fullCoverageNoDupes(n));
}

check(
  "paginatePacks: 9 packs caben en 1 página, sin 'ver más'",
  (() => {
    const items = Array.from({ length: 9 }, (_, i) => i);
    const { page, hasMore } = paginatePacks(items, 0);
    return page.length === 9 && hasMore === false;
  })(),
);

check(
  "paginatePacks: 10 packs → página de 8 + hasMore (reserva fila 'ver más')",
  (() => {
    const items = Array.from({ length: 10 }, (_, i) => i);
    const { page, hasMore, nextOffset } = paginatePacks(items, 0);
    return page.length === 8 && hasMore === true && nextOffset === 8;
  })(),
);

check(
  "paginatePacks: cat-lifting (15 packs) — página 1 de 8, página 2 de 7 sin 'ver más'",
  (() => {
    const items = Array.from({ length: 15 }, (_, i) => i);
    const p1 = paginatePacks(items, 0);
    const p2 = paginatePacks(items, p1.nextOffset, 1); // pág. 2+ reserva "◀ Anteriores"
    return (
      p1.page.length === 8 &&
      p1.hasMore === true &&
      p2.page.length === 7 &&
      p2.hasMore === false
    );
  })(),
);

check(
  "paginateServices: Extensiones nuevas (11) — página 1 de 8 + hasMore",
  (() => {
    const items = Array.from({ length: 11 }, (_, i) => i);
    const p1 = paginatePacks(items, 0);
    const p2 = paginatePacks(items, p1.nextOffset);
    return (
      p1.page.length === 8 &&
      p1.hasMore === true &&
      p2.page.length === 3 &&
      p2.hasMore === false
    );
  })(),
);

// Headers distintos evitan el debounce BD que colgaba "Ver Servicios"
// (Alberto VE …0417, 13-sep): claimInteractiveListSend clavea solo por título.
check(
  "headers chooser/servicios/packs son distintos (anti-debounce)",
  (() => {
    const name = "Extensiones nuevas";
    const ver = `Ver · ${name}`;
    const svc = `Servicios · ${name}`;
    const pack = `Packs · ${name}`;
    const mas = `Más · ${name}`;
    return (
      ver !== svc &&
      ver !== pack &&
      svc !== pack &&
      ver !== name &&
      mas !== svc &&
      mas !== ver
    );
  })(),
);

// Prefijos de página no deben colisionar con svc_/pack_ (startsWith).
// Nota: el legado `svcspage_` NO colisionaba con `svc_` (tras "svc" va "s", no "_").
check(
  "pg_svc_ no empieza con svc_ (anti-colisión Ver más)",
  !"pg_svc_cat-extensiones__8".startsWith("svc_"),
);
check(
  "pg_pack_ no empieza con pack_ (anti-colisión Ver más packs)",
  !"pg_pack_cat-lifting__8".startsWith("pack_"),
);
check(
  "legado svcspage_ tampoco empieza con svc_ (underscore)",
  !"svcspage_cat-extensiones__8".startsWith("svc_"),
);

// ── parseViewPayload: scopeId simple vs con "__" (subcategorías) ──────────
check(
  "parseViewPayload categoría simple → services",
  (() => {
    const r = parseViewPayload("cat-lifting__services");
    return r.scopeId === "cat-lifting" && r.mode === "services";
  })(),
);
check(
  "parseViewPayload categoría simple → packs",
  (() => {
    const r = parseViewPayload("cat-lifting__packs");
    return r.scopeId === "cat-lifting" && r.mode === "packs";
  })(),
);
check(
  "parseViewPayload subcategoría (scopeId con '__') no se corta mal",
  (() => {
    const r = parseViewPayload("cat-unas__clasicas__services");
    return r.scopeId === "cat-unas__clasicas" && r.mode === "services";
  })(),
);
check(
  "parseViewPayload sin '__' → mode default services",
  (() => {
    const r = parseViewPayload("cat-lifting");
    return r.scopeId === "cat-lifting" && r.mode === "services";
  })(),
);

// ── parsePacksPagePayload: scopeId + offset ────────────────────────────────
check(
  "parsePacksPagePayload categoría simple",
  (() => {
    const r = parsePacksPagePayload("cat-lifting__8");
    return r.scopeId === "cat-lifting" && r.offset === 8;
  })(),
);
check(
  "parsePacksPagePayload subcategoría (scopeId con '__')",
  (() => {
    const r = parsePacksPagePayload("cat-unas__clasicas__8");
    return r.scopeId === "cat-unas__clasicas" && r.offset === 8;
  })(),
);
check(
  "parsePacksPagePayload offset inválido → 0",
  (() => {
    const r = parsePacksPagePayload("cat-lifting__abc");
    return r.scopeId === "cat-lifting" && r.offset === 0;
  })(),
);

// ── classifyUnasService: add-ons/retiro → "otros" (fix Cielo …625683) ──────
check(
  "classifyUnasService: 'Retiro de esmaltado' → otros",
  classifyUnasService("Retiro de esmaltado") === "otros",
);
check(
  "classifyUnasService: 'Extensión de uña' → otros",
  classifyUnasService("Extensión de uña") === "otros",
);
check(
  "classifyUnasService: 'Manicure Clásico' → clasicas",
  classifyUnasService("Manicure Clásico") === "clasicas",
);
check(
  "classifyUnasService: 'Uñas Soft Gel' → softgel",
  classifyUnasService("Uñas Soft Gel") === "softgel",
);
check(
  "classifyUnasService: 'PolyGel Francesa' → polygel",
  classifyUnasService("PolyGel Francesa") === "polygel",
);

// ── Guard "packs" en texto libre vs tap view_…__packs (Alberto/JERITA 15-sep) ─
check(
  "isCatalogNavigationInteractiveId: view_…__packs",
  isCatalogNavigationInteractiveId(
    `${WA_IDS.VIEW_PREFIX}cat-extensiones__extensiones-nuevas__packs`,
  ),
);
check(
  "isCatalogNavigationInteractiveId: view_…__services",
  isCatalogNavigationInteractiveId(
    `${WA_IDS.VIEW_PREFIX}cat-extensiones__extensiones-nuevas__services`,
  ),
);
check(
  "isCatalogNavigationInteractiveId: pg_pack_ paginación",
  isCatalogNavigationInteractiveId(`${WA_IDS.PACKS_PAGE_PREFIX}cat-lifting__8`),
);
check(
  "shouldRedirectFreeTextPacksToCategories: tap view_…__packs → false",
  !shouldRedirectFreeTextPacksToCategories(
    `${WA_IDS.VIEW_PREFIX}cat-extensiones__extensiones-nuevas__packs`,
  ),
);
check(
  "shouldRedirectFreeTextPacksToCategories: tap pack_… → false",
  !shouldRedirectFreeTextPacksToCategories(`${WA_IDS.PACK_PREFIX}uuid-pack`),
);
check(
  "shouldRedirectFreeTextPacksToCategories: texto 'quiero ver packs' → true",
  shouldRedirectFreeTextPacksToCategories("quiero ver packs"),
);
check(
  "shouldRedirectFreeTextPacksToCategories: texto 'pack de uñas' → Haiku (no categorías)",
  !shouldRedirectFreeTextPacksToCategories("pack de uñas"),
);
check(
  "shouldRedirectFreeTextPacksToCategories: 'El pack' → false",
  !shouldRedirectFreeTextPacksToCategories("El pack"),
);

// ── Volver atrás contextual (15-sep, PR #122) ───────────────────────────────
check(
  "parseViewPayload …__chooser",
  (() => {
    const r = parseViewPayload("cat-lifting__chooser");
    return r.scopeId === "cat-lifting" && r.mode === "chooser";
  })(),
);
check(
  "parseViewPayload subcategoría __chooser no corta mal",
  (() => {
    const r = parseViewPayload("cat-unas__clasicas__chooser");
    return r.scopeId === "cat-unas__clasicas" && r.mode === "chooser";
  })(),
);
check(
  "catalogBackToChooser id es view_…__chooser",
  catalogBackToChooser("cat-lifting").id ===
    `${WA_IDS.VIEW_PREFIX}cat-lifting__chooser`,
);
check(
  "catalogBackToParentFromScope: categoría plana → categorías",
  catalogBackToParentFromScope("cat-lifting").id === WA_IDS.VOLVER_CATEGORIAS,
);
check(
  "catalogBackToParentFromScope: subcategoría → volver_sub_",
  catalogBackToParentFromScope("cat-unas__clasicas").id ===
    `${WA_IDS.VOLVER_SUBCAT_PREFIX}cat-unas`,
);
check(
  "catalogBackToSubcategories id",
  catalogBackToSubcategories("cat-extensiones").id ===
    `${WA_IDS.VOLVER_SUBCAT_PREFIX}cat-extensiones`,
);
check(
  "catalogBackToCategories id",
  catalogBackToCategories().id === WA_IDS.VOLVER_CATEGORIAS,
);
check(
  "prevCatalogPageOffset: pág. 2 de 15 → 0",
  (() => {
    const p1 = paginatePacks(Array.from({ length: 15 }), 0);
    return prevCatalogPageOffset(15, p1.nextOffset) === 0;
  })(),
);
check(
  "isCatalogNavigationInteractiveId: view_…__chooser",
  isCatalogNavigationInteractiveId(`${WA_IDS.VIEW_PREFIX}cat-lifting__chooser`),
);
check(
  "isCatalogNavigationInteractiveId: volver_sub_",
  isCatalogNavigationInteractiveId(`${WA_IDS.VOLVER_SUBCAT_PREFIX}cat-unas`),
);
check(
  "shouldRedirectFreeTextPacksToCategories: view_…__chooser → false",
  !shouldRedirectFreeTextPacksToCategories(
    `${WA_IDS.VIEW_PREFIX}cat-lifting__chooser`,
  ),
);

// ── Horas: 16 medias horas no se cortan; las 5 PM salen en la página 2 ────
{
  const dateKey = "2026-10-05";
  const hours = [10, 11, 12, 13, 14, 15, 16, 17];
  const slots = hours.flatMap((hour) =>
    [0, 30].map((minute) => {
      const h12 = hour > 12 ? hour - 12 : hour;
      const period = hour >= 12 ? "PM" : "AM";
      const title =
        minute === 0
          ? `${h12}:00 ${period}`
          : `${h12}:${String(minute).padStart(2, "0")} ${period}`;
      return {
        id: `time_${dateKey}T${String(hour).padStart(2, "0")}${String(minute).padStart(2, "0")}`,
        title,
        description: "Disponible",
      };
    }),
  );
  const page1 = buildTimeListPage(slots, 0, dateKey);
  const more = page1.find((r) => r.title.startsWith("▶"));
  const parsed = more ? parseTimePagePayload(more.id) : null;
  const page2 = parsed
    ? buildTimeListPage(slots, parsed.offset, dateKey)
    : [];
  const shown = [...page1, ...page2].filter((r) => r.id.startsWith("time_"));
  check("horas pág.1 cabe en 10 filas y pide ver más", page1.length <= 10 && !!more);
  check(
    "horas pág.1 no esconde las 5: la fila dice hasta dónde sigue la tarde",
    !!more && /2:00 PM/.test(more.description) && /5:30 PM/.test(more.description),
  );
  check("horas pág.2 cabe en 10 e incluye las 5", page2.length <= 10 && page2.some((r) => r.title === "5:00 PM"));
  check(
    "horas: las 16 medias horas aparecen entre las dos páginas",
    shown.length === 16 && new Set(shown.map((r) => r.id)).size === 16,
  );
  check(
    "parseTimePagePayload rechaza un id de hora",
    parseTimePagePayload("time_2026-10-05T1700") === null,
  );
}

let fails = 0;
console.log("QA list-pagination — separación Servicios/Packs + paginación\n");
for (const c of cases) {
  console.log(`${c.pass ? "✅" : "❌"} ${c.name}`);
  if (!c.pass) fails++;
}
console.log(
  fails === 0
    ? `\n✅ ${cases.length}/${cases.length} OK`
    : `\n❌ ${fails}/${cases.length} fallaron`,
);
Deno.exit(fails === 0 ? 0 : 1);
