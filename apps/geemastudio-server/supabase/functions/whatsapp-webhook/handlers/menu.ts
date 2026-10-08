// handlers/menu.ts — Menú principal, categorías, servicios, promos y opciones de carrito

import { sendInteractiveList, sendMessage } from "../wa-api.ts";
import { formatSoles, LIST_TITLE_MAX } from "../format.ts";
import type { SupabaseClient } from "../lib/supabase.ts";
import type { CatalogPack } from "../lib/services-catalog.ts";
import { WA_IDS } from "../lib/constants.ts";
import { isMostlyPacksNav } from "./menu-remap.ts";

const TITLE_MAX_CHARS = LIST_TITLE_MAX;
const DESCRIPTION_MAX_CHARS = 72;
/** Meta: máximo 10 filas en total entre todas las secciones de una lista. */
const WABA_LIST_ROW_MAX = 10;
/** Filas de contenido disponibles tras reservar 1 fila para "↩ Ver categorías". */
export const WA_MAX_CONTENT = WABA_LIST_ROW_MAX - 1;

/** Título para listas WABA (máx 24 chars). Sin "…"; preferir short_name. */
function listTitle(text: string | null | undefined): string {
  return (text ?? "").trim().slice(0, TITLE_MAX_CHARS);
}

// ── Subcategorías virtuales: Uñas ─────────────────────────────────────────────

export type UnasSubcategoryKey = "clasicas" | "polygel" | "softgel" | "otros";

const UNAS_SUBCATEGORY_LABELS: Record<UnasSubcategoryKey, string> = {
  // Key interno `clasicas` = gel/Rubber (no manicure clásico: esos servicios
  // están is_active=false a propósito). Label viejo "Uñas clásicas y gel"
  // confundía a clientas (Alberto VE …0417, 13-sep).
  clasicas: "Gel y Rubber",
  polygel: "Uñas PolyGel",
  softgel: "Uñas Soft Gel",
  otros: "Otros servicios de uñas",
};

/**
 * Complementos (retiro) o add-ons de una sola uña (ej. "Extensión de uña" S/5)
 * — no son un set completo; sacarlos de "clasicas" evita que el orden
 * alfabético los ponga antes que Manicure/Rubber/etc. (Cielo …625683,
 * 13-sep-2026: quedó como único ítem del carrito con S/5 de abono S/25).
 */
function isUnasAddOnOrRetiro(name: string): boolean {
  return name.includes("retiro") || /extensi[oó]n de u[ñn]a\b/.test(name);
}

export function classifyUnasService(nameRaw: string): UnasSubcategoryKey {
  const name = nameRaw.toLowerCase();
  // Acrílico no se trabaja — no hay subcategoría; cae en "otros" si aparece en nombre legacy
  if (
    name.includes("poly gel") ||
    name.includes("polygel") ||
    name.includes("polly gel")
  ) {
    return "polygel";
  }
  if (
    name.includes("soft gel") ||
    name.includes("softgel") ||
    (name.includes("soft") && name.includes("gel")) ||
    name.includes("tips")
  ) {
    return "softgel";
  }
  if (name.includes("acríl") || name.includes("acril")) return "otros";
  if (isUnasAddOnOrRetiro(name)) return "otros";
  return "clasicas";
}

export function getUnasSubcategoryLabel(key: UnasSubcategoryKey): string {
  return UNAS_SUBCATEGORY_LABELS[key] ?? UNAS_SUBCATEGORY_LABELS.clasicas;
}

// ── Subcategorías virtuales: Extensiones ─────────────────────────────────────

export type ExtensionesSubcategoryKey =
  | "extensiones_nuevas"
  | "extensiones_retoques";

const EXTENSIONES_SUBCATEGORY_LABELS: Record<
  ExtensionesSubcategoryKey,
  string
> = {
  extensiones_nuevas: "Extensiones nuevas",
  extensiones_retoques: "Retoques de extensiones",
};

export function classifyExtensionesService(
  nameRaw: string,
): ExtensionesSubcategoryKey {
  const name = nameRaw.toLowerCase();
  if (name.includes("retoque")) return "extensiones_retoques";
  return "extensiones_nuevas";
}

export function getExtensionesSubcategoryLabel(
  key: ExtensionesSubcategoryKey,
): string {
  return (
    EXTENSIONES_SUBCATEGORY_LABELS[key] ??
      EXTENSIONES_SUBCATEGORY_LABELS.extensiones_nuevas
  );
}

/** `after_meta_ads`: cuerpo corto; no repetir bienvenida ni dirección (solo tráfico promo nueva + ad). */
export type SendMenuWithPromosOptions = {
  variant?: "default" | "after_meta_ads";
};

export async function sendMenuWithPromos(
  to: string,
  supabase: SupabaseClient,
  opts?: SendMenuWithPromosOptions,
) {
  const variant = opts?.variant ?? "default";
  const menuBody = variant === "after_meta_ads"
    ? "¿Qué te gustaría hacer ahora? Toca *Ver opciones* y elige promos, servicios o agendar 💜"
    : "ZM Lash & Nails Beauty 💜\nEspecialistas en extensiones, lifting, uñas, cejas y más. Estamos en Las Plazuelas de Surco, Local 205. ¿En qué podemos ayudarte?";

  const now = new Date().toISOString();
  const { data: promosData } = await supabase
    .from("promotions")
    .select("title, emoji, badge")
    .eq("is_active", true)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order("display_order", { ascending: true })
    .limit(3);

  const promos = promosData ?? [];
  const hasPromos = promos.length > 0;

  // Máx DESCRIPTION_MAX_CHARS caracteres para la descripción del list (WhatsApp). Mostrar solo primeras 2 promos para no cortar texto.
  const promoDescription = hasPromos
    ? promos
      .slice(0, 2)
      .map((p: { emoji: string; title: string }) => `${p.emoji} ${p.title}`)
      .join(" · ")
      .slice(0, DESCRIPTION_MAX_CHARS)
    : "Promos activas y paquetes especiales";

  const ok = await sendInteractiveList(
    to,
    "ZM Lash & Nails Beauty",
    menuBody,
    "Ver opciones",
    [
      {
        title: "Servicios",
        rows: [
          {
            id: "ver_promos",
            title: hasPromos ? `${promos[0].emoji} Promos` : "💜 Promos",
            description: hasPromos
              ? promoDescription.slice(0, DESCRIPTION_MAX_CHARS)
              : promoDescription,
          },
          {
            id: "ver_servicios",
            title: "✨ Ver Servicios y Packs",
            description: "Servicios y paquetes con precios",
          },
          {
            id: "agendar_cita",
            title: "📅 Agendar cita",
            description: "Reserva tu próxima cita",
          },
          {
            id: "mi_cita",
            title: "📋 Mi cita",
            description: "Citas pendientes o cambiar hora",
          },
        ],
      },
      {
        title: "Información",
        rows: [
          {
            id: "horarios",
            title: "🕐 Horarios",
            description: "Consulta nuestros horarios de atención",
          },
          {
            id: "ubicacion",
            title: "📍 Ubicación",
            description: "Cómo llegar al salón",
          },
        ],
      },
    ],
  );

  if (!ok) {
    const fallbackIntro = variant === "after_meta_ads"
      ? "¿Qué te gustaría hacer ahora?\n\n"
      : "ZM Lash & Nails Beauty 💜\nEspecialistas en extensiones, lifting, uñas, cejas y más. Las Plazuelas de Surco, Local 205.\n\n";
    await sendMessage(
      to,
      fallbackIntro +
        "1️⃣ 💜 Promos\n" +
        "2️⃣ ✨ Ver Servicios y Packs\n" +
        "3️⃣ 📅 Agendar cita\n" +
        "4️⃣ 📋 Mi cita\n" +
        "5️⃣ 🕐 Horarios\n" +
        "6️⃣ 📍 Ubicación\n\n" +
        "Responde con el número y te muestro el menú interactivo.",
    );
  }
}

export async function sendCategoriesList(
  to: string,
  categories: { id: string; name: string }[],
) {
  const mainCats = categories.filter((c) => c.id.startsWith("cat-"));
  const displayCats = mainCats.length > 0 ? mainCats : categories;

  const catRows = displayCats.map((c) => {
    const name = c.name.trim();
    const title = name.slice(0, TITLE_MAX_CHARS);
    const baseDesc = "Ver servicios de esta categoría";
    const description = name.length > TITLE_MAX_CHARS
      ? `${name} — ${baseDesc}`.slice(0, DESCRIPTION_MAX_CHARS)
      : baseDesc;
    return {
      id: `${WA_IDS.CATEGORY_PREFIX}${c.id}`,
      title,
      description,
    };
  });
  // Botón volver al menú principal (último slot; máx 9 categorías)
  const rows = [
    ...catRows.slice(0, WABA_LIST_ROW_MAX - 1),
    { id: "menu", title: "🏠 Menú principal", description: "Volver al inicio" },
  ];
  const fallback = displayCats.map((c) => `🌸 ${c.name}`).join("\n");
  const ok = await sendInteractiveList(
    to,
    "Categorías",
    "Selecciona una categoría:",
    "Ver categorías",
    [{ title: "Elige una categoría", rows }],
  );
  if (!ok) {
    await sendMessage(
      to,
      "Te muestro nuestras categorías:\n\n" +
        `${fallback}\n\n` +
        "Si no ves los botones interactivos, responde con *menu* para volver al inicio y reintentar.",
    );
  }
}

/** Lista "Agregar otro" desde catálogo (categorías + si hay promos). Sin llamadas a BD. */
export async function sendCategoriesAndPromosListFromCatalog(
  to: string,
  categories: { id: string; name: string }[],
  hasPromos: boolean,
) {
  const mainCats = categories.filter((c) => c.id.startsWith("cat-"));
  const displayCats = mainCats.length > 0 ? mainCats : categories;

  const categoryRows = displayCats.map((c) => {
    const name = c.name.trim();
    const title = listTitle(name);
    const baseDesc = "Ver servicios de esta categoría";
    const description = name.length > TITLE_MAX_CHARS
      ? `${name} — ${baseDesc}`.slice(0, DESCRIPTION_MAX_CHARS)
      : baseDesc;
    return {
      id: `${WA_IDS.CATEGORY_PREFIX}${c.id}`,
      title,
      description,
    };
  });

  const sections: {
    title: string;
    rows: { id: string; title: string; description: string }[];
  }[] = [];

  // Categorías primero; promos al final — máx 10 filas Meta.
  // Reserva: Ver mi selección + Menú (+ promo opcional).
  const promoRowsTotal = hasPromos ? 1 : 0;
  const maxCategoryRows = WABA_LIST_ROW_MAX - promoRowsTotal -
    2; /* selección + menú */
  sections.push({
    title: "Categorías",
    rows: [
      ...categoryRows.slice(0, maxCategoryRows),
      {
        id: WA_IDS.VER_SELECCION,
        title: "↩ Ver mi selección",
        description: "Volver al carrito",
      },
      {
        id: "menu",
        title: "🏠 Menú principal",
        description: "Volver al inicio",
      },
    ],
  });

  if (hasPromos) {
    sections.push({
      title: "Promos",
      rows: [
        {
          id: "ver_promos",
          title: "Promos",
          description: "Ver promos activas",
        },
      ],
    });
  }

  const fallback = displayCats.map((c) => `🌸 ${c.name}`).join("\n") +
    (hasPromos ? "\n🌸 Promos" : "");

  const ok = await sendInteractiveList(
    to,
    "Agregar más servicios",
    "Elige una categoría (servicios y packs) o una promo:",
    "Ver opciones",
    sections,
  );

  if (!ok) {
    await sendMessage(
      to,
      "Opciones para agregar más:\n\n" +
        fallback +
        "\n\nResponde *menu* para volver al inicio o elige una categoría.",
    );
  }
}

/** Lista interactiva para "Agregar otro servicio": incluye Promos + Categorías (consulta BD). */
export async function sendCategoriesAndPromosList(
  to: string,
  supabase: SupabaseClient,
  categories: { id: string; name: string }[],
) {
  const now = new Date().toISOString();
  const { data: promosData } = await supabase
    .from("promotions")
    .select("id, title, emoji")
    .eq("is_active", true)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order("display_order", { ascending: true })
    .limit(1);
  await sendCategoriesAndPromosListFromCatalog(
    to,
    categories,
    (promosData?.length ?? 0) > 0,
  );
}

/** Deduplica servicios por nombre (trim) + precio para evitar duplicados en BD (ej. "Lifting + Tinturado" y "Lifting + Tinturado "). */
function dedupeServicesByIdentity<
  T extends { id: string; name: string; price: string; duration: number },
>(services: T[]): T[] {
  const seen = new Set<string>();
  return services.filter((s) => {
    const key = `${s.name.trim().toLowerCase()}|${String(s.price)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Lista interactiva de subcategorías para Uñas.
 *  Si el servicio tiene `subcategory`, se respeta; si no, se usa heurística por nombre.
 */
export async function sendUnasSubcategoriesList(
  to: string,
  services: {
    id: string;
    name: string;
    price: string;
    duration: number;
    subcategory?: string | null;
  }[],
  packs: PackForList[] = [],
) {
  if (services.length === 0) {
    await sendServicesList(to, "Uñas", [], false, packs);
    return;
  }

  const groups: Record<
    UnasSubcategoryKey,
    {
      id: string;
      name: string;
      price: string;
      duration: number;
      subcategory?: string | null;
    }[]
  > = {
    clasicas: [],
    polygel: [],
    softgel: [],
    otros: [],
  };

  const validKeys: UnasSubcategoryKey[] = [
    "clasicas",
    "polygel",
    "softgel",
    "otros",
  ];

  for (const svc of services) {
    const raw = (svc.subcategory ?? "").toLowerCase();
    const fromDb = validKeys.find((k) => k === raw) ?? null;
    const key = fromDb ?? classifyUnasService(svc.name);
    groups[key].push(svc);
  }

  const subcatRows = (Object.keys(groups) as UnasSubcategoryKey[])
    .filter((key) => groups[key].length > 0)
    .map((key) => {
      const list = groups[key];
      const count = list.length;
      const title = listTitle(getUnasSubcategoryLabel(key));
      const description = `${count} servicio${
        count > 1 ? "s" : ""
      } disponibles`;
      return {
        // id: subcat_cat-unas__clasicas
        id: `${WA_IDS.SUBCATEGORY_PREFIX}cat-unas__${key}`,
        title,
        description: description.slice(0, DESCRIPTION_MAX_CHARS),
      };
    });

  const fallbackLines = subcatRows.map((r) => `🌸 ${r.title}`).join("\n");

  if (subcatRows.length === 0) {
    await sendServicesList(to, "Uñas", services, false, packs);
    return;
  }

  const rows = [
    ...subcatRows.slice(0, WABA_LIST_ROW_MAX - 1),
    {
      id: WA_IDS.VOLVER_CATEGORIAS,
      title: "↩ Ver categorías",
      description: "Volver al listado",
    },
  ];

  const packsHint = packs.length > 0
    ? " También hay packs en cada subcategoría."
    : "";

  const ok = await sendInteractiveList(
    to,
    "Uñas",
    `Elige una subcategoría de Uñas:${packsHint}`,
    "Ver subcategorías",
    [{ title: "Subcategorías Uñas", rows }],
  );

  if (!ok) {
    await sendMessage(
      to,
      "Te muestro subcategorías de Uñas:\n\n" +
        fallbackLines +
        "\n\nEscribe *menu* para volver al inicio si no ves los botones interactivos.",
    );
  }
}

/** Lista interactiva de subcategorías virtuales para Extensiones de Pestañas. */
export async function sendExtensionesSubcategoriesList(
  to: string,
  services: {
    id: string;
    name: string;
    price: string;
    duration: number;
    subcategory?: string | null;
  }[],
  packs: PackForList[] = [],
) {
  if (services.length === 0) {
    await sendServicesList(to, "Extensiones de Pestañas", [], false, packs);
    return;
  }

  const groups: Record<ExtensionesSubcategoryKey, typeof services> = {
    extensiones_nuevas: [],
    extensiones_retoques: [],
  };
  const validKeys: ExtensionesSubcategoryKey[] = [
    "extensiones_nuevas",
    "extensiones_retoques",
  ];
  for (const svc of services) {
    const raw = (svc.subcategory ?? "").toLowerCase();
    const fromDb = validKeys.find((k) => k === raw) ?? null;
    const key = fromDb ?? classifyExtensionesService(svc.name);
    groups[key].push(svc);
  }

  const subcatRows = (Object.keys(groups) as ExtensionesSubcategoryKey[])
    .filter((key) => groups[key].length > 0)
    .map((key) => {
      const list = groups[key];
      const count = list.length;
      const title = listTitle(getExtensionesSubcategoryLabel(key));
      const description = `${count} servicio${
        count > 1 ? "s" : ""
      } disponibles`;
      return {
        // id: subcat_cat-extensiones__extensiones_nuevas
        id: `${WA_IDS.SUBCATEGORY_PREFIX}cat-extensiones__${key}`,
        title,
        description: description.slice(0, DESCRIPTION_MAX_CHARS),
      };
    });

  const fallbackLines = subcatRows.map((r) => `🌸 ${r.title}`).join("\n");

  if (subcatRows.length === 0) {
    await sendServicesList(
      to,
      "Extensiones de Pestañas",
      services,
      false,
      packs,
    );
    return;
  }

  const rows = [
    ...subcatRows.slice(0, WABA_LIST_ROW_MAX - 1),
    {
      id: WA_IDS.VOLVER_CATEGORIAS,
      title: "↩ Ver categorías",
      description: "Volver al listado",
    },
  ];

  const packsHint = packs.length > 0
    ? " También hay packs en cada subcategoría."
    : "";

  const ok = await sendInteractiveList(
    to,
    "Extensiones de Pestañas",
    `Elige una subcategoría:${packsHint}`,
    "Ver subcategorías",
    [{ title: "Subcategorías Extensiones", rows }],
  );
  if (!ok) {
    await sendMessage(
      to,
      "Te muestro subcategorías de Extensiones:\n\n" +
        fallbackLines +
        "\n\nEscribe *menu* para volver al inicio si no ves los botones.",
    );
  }
}

/** Pack para listar junto a servicios (misma categoría). */
export type PackForList = {
  id: string;
  title: string;
  short_name?: string | null;
  pack_price: string;
};

export function catalogPacksToForList(packs: CatalogPack[]): PackForList[] {
  return packs.map((p) => ({
    id: p.id,
    title: p.title,
    short_name: p.short_name,
    pack_price: p.pack_price,
  }));
}

function parsePackServiceIds(service_ids: string | unknown): string[] {
  if (Array.isArray(service_ids)) {
    return service_ids.filter((id): id is string => typeof id === "string");
  }
  if (typeof service_ids === "string") {
    try {
      const parsed = JSON.parse(service_ids) as unknown;
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === "string")
        : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Packs de la categoría ligados a servicios de la subcategoría; si no hay match, todos los de la categoría. */
export function filterPacksForSubcategory(
  categoryPacks: CatalogPack[],
  serviceIdsInSubcat: string[],
): PackForList[] {
  if (categoryPacks.length === 0) return [];
  const idSet = new Set(serviceIdsInSubcat);
  let matched = categoryPacks;
  if (idSet.size > 0) {
    matched = categoryPacks.filter((p) => {
      const ids = parsePackServiceIds(p.service_ids);
      return ids.length === 0 || ids.some((id) => idSet.has(id));
    });
    if (matched.length === 0) matched = categoryPacks;
  }
  return catalogPacksToForList(matched);
}

export async function sendServicesList(
  to: string,
  categoryName: string,
  services: {
    id: string;
    name: string;
    short_name?: string | null;
    price: string;
    duration: number;
  }[],
  preserveDuplicates = false,
  packs: PackForList[] = [],
  backNav?: ListNavRow,
) {
  const list = preserveDuplicates
    ? services
    : dedupeServicesByIdentity(services);
  // Por precio (el servicio full, no la promo), luego nombre.
  const sortedSvcs = [...list].sort(
    (a, b) =>
      (parseFloat(String(a.price)) || 0) -
        (parseFloat(String(b.price)) || 0) ||
      a.name.trim().localeCompare(b.name.trim()),
  );

  // Máx (WABA_LIST_ROW_MAX − 1) ítems + 1 row volver
  const packRows = packs.slice(0, WA_MAX_CONTENT).map((p) => {
    const name = (p.short_name || p.title).trim();
    const priceNumber = parseFloat(String(p.pack_price)) || 0;
    return {
      id: `${WA_IDS.PACK_PREFIX}${p.id}`,
      title: listTitle(name),
      description: `Pack · S/ ${formatSoles(priceNumber)}`.slice(
        0,
        DESCRIPTION_MAX_CHARS,
      ),
    };
  });
  const remaining = WA_MAX_CONTENT - packRows.length;
  const limitedSvcs = sortedSvcs.slice(0, remaining);
  const serviceRows = limitedSvcs.map((s, index) => {
    const name = s.name.trim();
    const priceNumber = parseFloat(String(s.price)) || 0;
    const priceLine = `S/ ${formatSoles(priceNumber)} | ${s.duration} min`;
    const rowId = preserveDuplicates
      ? `${WA_IDS.SERVICE_PREFIX}${s.id}_i${index}`
      : `${WA_IDS.SERVICE_PREFIX}${s.id}`;
    const title = listTitle(s.short_name ?? name);
    const descriptionSource = `${name} — ${priceLine}`;
    const description = descriptionSource.slice(0, DESCRIPTION_MAX_CHARS);
    return { id: rowId, title, description };
  });

  const rows = [
    ...packRows,
    ...serviceRows,
    backNav ?? catalogBackToCategories(),
  ];

  const fallback = [
    ...packs.map(
      (p) =>
        `${(p.short_name || p.title).trim()} — S/ ${
          formatSoles(parseFloat(String(p.pack_price)) || 0)
        }`,
    ),
    ...list.map(
      (s) =>
        `${s.name.trim()} — S/ ${
          formatSoles(parseFloat(String(s.price)) || 0)
        }`,
    ),
  ].join("\n");

  const packsNote = packs.length > 0
    ? ` Incluye ${packs.length} pack${
      packs.length > 1 ? "s" : ""
    } al inicio de la lista.`
    : "";
  const ok = await sendInteractiveList(
    to,
    categoryName,
    `Servicios y packs de ${categoryName}:${packsNote}`,
    "Ver opciones",
    [{ title: listTitle(categoryName), rows }],
  );
  if (!ok) {
    await sendMessage(
      to,
      `💅 *${categoryName}:*\n\n${fallback}\n\n` +
        "Si no ves los botones, responde con *menu* para volver al inicio.",
    );
  }
}

/**
 * Cuando servicios + packs de una categoría/subcategoría superan las
 * WA_MAX_CONTENT filas disponibles, se ofrece elegir "Ver Servicios" o
 * "Ver Packs" por separado en vez de una sola lista mezclada que recorta
 * contenido en silencio (validación 13-sep-2026: cat-lifting 5 svcs + 15
 * packs mostraba 0 servicios; cat-depilacion 12 svcs + 4 packs ocultaba 7).
 * `scopeId` identifica de dónde viene (categoría: "cat-lifting"; subcategoría:
 * "cat-unas__clasicas") para que el tap de vuelta pueda re-derivar la lista.
 */
export async function sendCategoryViewChoice(
  to: string,
  categoryName: string,
  scopeId: string,
  servicesCount: number,
  packsCount: number,
) {
  const rows = [
    ...(servicesCount > 0
      ? [
        {
          id: `${WA_IDS.VIEW_PREFIX}${scopeId}__services`,
          title: listTitle(`✨ Ver Servicios (${servicesCount})`),
          description: `${servicesCount} servicio${
            servicesCount > 1 ? "s" : ""
          } disponibles`,
        },
      ]
      : []),
    ...(packsCount > 0
      ? [
        {
          id: `${WA_IDS.VIEW_PREFIX}${scopeId}__packs`,
          title: listTitle(`📦 Ver Packs (${packsCount})`),
          description: `${packsCount} pack${
            packsCount > 1 ? "s" : ""
          } disponibles`,
        },
      ]
      : []),
    catalogBackToParentFromScope(scopeId),
  ];
  const ok = await sendInteractiveList(
    to,
    // Header distinto de "Servicios · …" / "Packs · …" — el debounce BD
    // `claimInteractiveListSend` clavea solo por título (~30s). Si coincide
    // con la lista siguiente (Alberto VE …0417, 13-sep), el OUT se traga
    // en silencio y el bot queda colgado en "Ver Servicios".
    listTitle(`Ver · ${categoryName}`),
    `${categoryName} tiene varias opciones — elige qué quieres ver:`,
    "Ver opciones",
    [{ title: listTitle(categoryName), rows }],
  );
  if (!ok) {
    await sendMessage(
      to,
      `💅 *${categoryName}:*\n\n` +
        `Tenemos ${servicesCount} servicio${
          servicesCount === 1 ? "" : "s"
        } y ${packsCount} pack${packsCount === 1 ? "" : "s"}.\n\n` +
        "Escribe *menu* para volver al inicio si no ves los botones interactivos.",
    );
  }
}

/**
 * Matemática pura de paginación de filas de contenido: si sobran ítems tras
 * la página actual, reserva 1 fila para "▶ Ver más …" (de ahí
 * `contentCap - 1`); si no, usa `contentCap` completo.
 * `extraNavRows`: filas de nav adicionales además del "volver" que el caller
 * siempre agrega (ej. 1 = "◀ Anteriores" en pág. 2+).
 */
export function paginatePacks<T>(
  items: T[],
  offset: number,
  extraNavRows = 0,
): { page: T[]; hasMore: boolean; nextOffset: number } {
  const contentCap = Math.max(1, WA_MAX_CONTENT - Math.max(0, extraNavRows));
  const hasMore = items.length > offset + contentCap;
  const pageSize = hasMore ? contentCap - 1 : contentCap;
  return {
    page: items.slice(offset, offset + pageSize),
    hasMore,
    nextOffset: offset + pageSize,
  };
}

/** Alias semántico — misma matemática que packs. */
export const paginateServices = paginatePacks;

/**
 * Selector de hora: misma matemática que packs. Un lunes libre son 16 medias
 * horas y Meta acepta 10 filas; antes se cortaba la tarde (las 5 no salían).
 * Página 1 reserva "▶ Ver más horarios"; página 2+ reserva "◀ Anteriores".
 * Siempre cierra con "↩ Elegir otro día".
 */
export function parseTimePagePayload(
  id: string,
): { dateKey: string; offset: number } | null {
  if (!id.startsWith(WA_IDS.TIME_PAGE_PREFIX)) return null;
  const payload = id.slice(WA_IDS.TIME_PAGE_PREFIX.length);
  const sep = payload.lastIndexOf("__");
  if (sep < 0) return null;
  const dateKey = payload.slice(0, sep);
  const offset = parseInt(payload.slice(sep + 2), 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;
  if (!Number.isFinite(offset) || offset < 0) return null;
  return { dateKey, offset };
}

export function buildTimeListPage(
  slots: ListNavRow[],
  offset: number,
  dateKey: string,
): ListNavRow[] {
  const safeOffset = offset > 0 && offset < slots.length ? offset : 0;
  const extra = safeOffset > 0 ? 1 : 0;
  const { page, hasMore, nextOffset } = paginatePacks(slots, safeOffset, extra);
  const rows: ListNavRow[] = [...page];
  if (hasMore) {
    const upcoming = slots.slice(nextOffset);
    const first = upcoming[0]?.title ?? "";
    const last = upcoming[upcoming.length - 1]?.title ?? "";
    const range = first && last ? `${first} a ${last}` : "Siguientes horarios";
    rows.push({
      id: `${WA_IDS.TIME_PAGE_PREFIX}${dateKey}__${nextOffset}`,
      title: "▶ Ver más horarios",
      description: range.slice(0, 72),
    });
  }
  if (safeOffset > 0) {
    rows.push({
      id: `${WA_IDS.TIME_PAGE_PREFIX}${dateKey}__${
        prevCatalogPageOffset(slots.length, safeOffset)
      }`,
      title: "◀ Anteriores",
      description: "Horarios anteriores",
    });
  }
  rows.push({
    id: WA_IDS.VOLVER_FECHAS,
    title: "↩ Elegir otro día",
    description: "Cambiar la fecha",
  });
  return rows;
}

/**
 * Offset de la página anterior al caminar desde 0 con la misma matemática
 * de `paginatePacks` (incluye `extraNavRows` en pág. 2+).
 */
export function prevCatalogPageOffset(
  itemCount: number,
  currentOffset: number,
): number {
  if (currentOffset <= 0) return 0;
  const items = Array.from({ length: itemCount });
  let offset = 0;
  for (let guard = 0; guard < 30; guard++) {
    const extra = offset > 0 ? 1 : 0;
    const { hasMore, nextOffset } = paginatePacks(items, offset, extra);
    if (nextOffset >= currentOffset) return offset;
    if (!hasMore) return offset;
    offset = nextOffset;
  }
  return 0;
}

export type ListNavRow = {
  id: string;
  title: string;
  description: string;
};

export function catalogBackToCategories(): ListNavRow {
  return {
    id: WA_IDS.VOLVER_CATEGORIAS,
    title: "↩ Ver categorías",
    description: "Volver al listado",
  };
}

/** Desde Packs· / Servicios· → chooser Ver · … */
export function catalogBackToChooser(scopeId: string): ListNavRow {
  return {
    id: `${WA_IDS.VIEW_PREFIX}${scopeId}__chooser`,
    title: "↩ Atrás",
    description: "Ver Servicios y Packs",
  };
}

export function catalogBackToSubcategories(categoryId: string): ListNavRow {
  return {
    id: `${WA_IDS.VOLVER_SUBCAT_PREFIX}${categoryId}`,
    title: "↩ Ver subcategorías",
    description: "Volver un nivel",
  };
}

/** Desde chooser: subcategoría → subcats; categoría plana → categorías. */
export function catalogBackToParentFromScope(scopeId: string): ListNavRow {
  const categoryId = scopeId.split("__")[0] ?? scopeId;
  if (
    scopeId.includes("__") &&
    (categoryId === "cat-unas" || categoryId === "cat-extensiones")
  ) {
    return catalogBackToSubcategories(categoryId);
  }
  return catalogBackToCategories();
}

/** Payload de `WA_IDS.VIEW_PREFIX`: `<scopeId>__services` | `__packs` | `__chooser`. */
export function parseViewPayload(payload: string): {
  scopeId: string;
  mode: "services" | "packs" | "chooser";
} {
  const sep = payload.lastIndexOf("__");
  const scopeId = sep >= 0 ? payload.slice(0, sep) : payload;
  const modeRaw = sep >= 0 ? payload.slice(sep + 2) : "";
  const mode = modeRaw === "packs"
    ? "packs"
    : modeRaw === "chooser"
    ? "chooser"
    : "services";
  return { scopeId, mode };
}

/** Payload de `WA_IDS.PACKS_PAGE_PREFIX` / `SERVICES_PAGE_PREFIX`: `<scopeId>__<offset>`. */
export function parsePacksPagePayload(payload: string): {
  scopeId: string;
  offset: number;
} {
  const sep = payload.lastIndexOf("__");
  const scopeId = sep >= 0 ? payload.slice(0, sep) : payload;
  const offsetStr = sep >= 0 ? payload.slice(sep + 2) : "";
  return { scopeId, offset: parseInt(offsetStr, 10) || 0 };
}

export const parseServicesPagePayload = parsePacksPagePayload;

/**
 * IDs interactivos de navegación de catálogo (chooser, paginación, volver sub).
 * No deben caer en handlers de texto libre ni en svc_/pack_.
 */
export function isCatalogNavigationInteractiveId(id: string): boolean {
  return (
    id.startsWith(WA_IDS.VIEW_PREFIX) ||
    id.startsWith(WA_IDS.SERVICES_PAGE_PREFIX) ||
    id.startsWith(WA_IDS.PACKS_PAGE_PREFIX) ||
    id.startsWith(WA_IDS.VOLVER_SUBCAT_PREFIX) ||
    id.startsWith("svcspage_") ||
    id.startsWith("packspage_")
  );
}

/**
 * Texto libre que pide packs → menú de categorías.
 * Excluye taps `view_…__packs` (Alberto VE / JERITA BSUID, 15-sep-2026:
 * el guard `lower.includes("packs")` los interceptaba antes del handler VIEW).
 * Acotado a navegación pura (Alberto …0417, 17-sep-2026: "Y algún pack más
 * económico" es una pregunta con contexto y debe pasar por Haiku primero,
 * no cortar directo al menú genérico sin respuesta — Haiku primero, listas
 * como fallback, no como default).
 */
export function shouldRedirectFreeTextPacksToCategories(
  userInput: string,
): boolean {
  if (isCatalogNavigationInteractiveId(userInput)) return false;
  if (userInput.startsWith(WA_IDS.PACK_PREFIX)) return false;
  return isMostlyPacksNav(userInput.toLowerCase());
}

/**
 * Lista solo de servicios, con paginación real (mismo patrón que packs).
 * Header `Servicios · …` para no chocar con el debounce del chooser `Ver · …`.
 */
export async function sendServicesOnlyList(
  to: string,
  categoryName: string,
  services: {
    id: string;
    name: string;
    short_name?: string | null;
    price: string;
    duration: number;
  }[],
  scopeId: string,
  offset = 0,
) {
  const list = dedupeServicesByIdentity(services);
  // Por precio (el servicio full, no la promo), luego nombre.
  const sorted = [...list].sort(
    (a, b) =>
      (parseFloat(String(a.price)) || 0) -
        (parseFloat(String(b.price)) || 0) ||
      a.name.trim().localeCompare(b.name.trim()),
  );
  if (sorted.length === 0) {
    await sendMessage(to, `No hay servicios disponibles en ${categoryName}.`);
    return;
  }
  const extraNav = offset > 0 ? 1 : 0;
  const { page, hasMore, nextOffset } = paginateServices(
    sorted,
    offset,
    extraNav,
  );

  const serviceRows = page.map((s) => {
    const name = s.name.trim();
    const priceNumber = parseFloat(String(s.price)) || 0;
    const priceLine = `S/ ${formatSoles(priceNumber)} | ${s.duration} min`;
    return {
      id: `${WA_IDS.SERVICE_PREFIX}${s.id}`,
      title: listTitle(s.short_name ?? name),
      description: `${name} — ${priceLine}`.slice(0, DESCRIPTION_MAX_CHARS),
    };
  });

  const rows = [
    ...serviceRows,
    ...(hasMore
      ? [
        {
          id: `${WA_IDS.SERVICES_PAGE_PREFIX}${scopeId}__${nextOffset}`,
          title: "▶ Ver más servicios",
          description: `${sorted.length - nextOffset} servicio(s) más`,
        },
      ]
      : []),
    ...(offset > 0
      ? [
        {
          id: `${WA_IDS.SERVICES_PAGE_PREFIX}${scopeId}__${
            prevCatalogPageOffset(sorted.length, offset)
          }`,
          title: "◀ Anteriores",
          description: "Página anterior",
        },
      ]
      : []),
    catalogBackToChooser(scopeId),
  ];

  const fallback = page
    .map(
      (s) =>
        `${s.name.trim()} — S/ ${
          formatSoles(parseFloat(String(s.price)) || 0)
        }`,
    )
    .join("\n");

  // offset>0 → header distinto ("Más · …") para no chocar con el debounce BD
  // del mismo título en ~30s (página 1 = "Servicios · …").
  const listHeader = offset > 0
    ? listTitle(`Más · ${categoryName}`)
    : listTitle(`Servicios · ${categoryName}`);
  const ok = await sendInteractiveList(
    to,
    listHeader,
    `Servicios de ${categoryName}:`,
    "Ver opciones",
    [{ title: listTitle(categoryName), rows }],
  );
  if (!ok) {
    await sendMessage(
      to,
      `💅 *Servicios de ${categoryName}:*\n\n${fallback}\n\n` +
        "Si no ves los botones, responde con *menu* para volver al inicio.",
    );
  }
}

export async function sendPacksOnlyList(
  to: string,
  categoryName: string,
  packs: PackForList[],
  scopeId: string,
  offset = 0,
) {
  if (packs.length === 0) {
    await sendMessage(to, `No hay packs disponibles en ${categoryName}.`);
    return;
  }
  const extraNav = offset > 0 ? 1 : 0;
  const { page, hasMore, nextOffset } = paginatePacks(packs, offset, extraNav);

  const packRows = page.map((p) => {
    const name = (p.short_name || p.title).trim();
    const priceNumber = parseFloat(String(p.pack_price)) || 0;
    return {
      id: `${WA_IDS.PACK_PREFIX}${p.id}`,
      title: listTitle(name),
      description: `Pack · S/ ${formatSoles(priceNumber)}`.slice(
        0,
        DESCRIPTION_MAX_CHARS,
      ),
    };
  });

  const rows = [
    ...packRows,
    ...(hasMore
      ? [
        {
          id: `${WA_IDS.PACKS_PAGE_PREFIX}${scopeId}__${nextOffset}`,
          title: "▶ Ver más packs",
          description: `${packs.length - nextOffset} pack(s) más`,
        },
      ]
      : []),
    ...(offset > 0
      ? [
        {
          id: `${WA_IDS.PACKS_PAGE_PREFIX}${scopeId}__${
            prevCatalogPageOffset(packs.length, offset)
          }`,
          title: "◀ Anteriores",
          description: "Página anterior",
        },
      ]
      : []),
    catalogBackToChooser(scopeId),
  ];

  const fallback = page
    .map(
      (p) =>
        `${(p.short_name || p.title).trim()} — S/ ${
          formatSoles(parseFloat(String(p.pack_price)) || 0)
        }`,
    )
    .join("\n");

  const listHeader = offset > 0
    ? listTitle(`Más packs · ${categoryName}`)
    : listTitle(`Packs · ${categoryName}`);
  const ok = await sendInteractiveList(
    to,
    listHeader,
    `Packs de ${categoryName}:`,
    "Ver opciones",
    [{ title: listTitle(categoryName), rows }],
  );
  if (!ok) {
    await sendMessage(
      to,
      `📦 *Packs de ${categoryName}:*\n\n${fallback}\n\n` +
        "Si no ves los botones, responde con *menu* para volver al inicio.",
    );
  }
}

/** Tipo mínimo de promo para listar (desde catálogo o BD). */
export type PromoForList = {
  id: string;
  title: string;
  description: string | null;
  emoji: string;
  badge: string | null;
};

/** Lista de promos desde catálogo pre-cargado (evita select a BD). */
export async function sendPromosListFromCatalog(
  to: string,
  promos: PromoForList[],
) {
  if (!promos.length) {
    await sendMessage(
      to,
      "Ahorita no tenemos promos activas 🫶 Puedes ver todos los servicios en el menú principal.",
    );
    return;
  }
  // Hasta 9 promos + fila menú (salida clara sin *menu* en texto)
  const promoRows = promos
    .slice(0, WABA_LIST_ROW_MAX - 1)
    .map((p: PromoForList) => {
      const fullName = `${p.emoji} ${p.title}`;
      const title = listTitle(fullName);
      const description = (p.description ?? fullName)
        .trim()
        .slice(0, DESCRIPTION_MAX_CHARS);
      return {
        id: `promo_${p.id}`,
        title,
        description: description || fullName.slice(0, DESCRIPTION_MAX_CHARS),
      };
    });
  const rows = [
    ...promoRows,
    {
      id: "menu",
      title: "🏠 Menú principal",
      description: "Volver al inicio",
    },
  ];
  const fallback = promos
    .map(
      (p: PromoForList) =>
        `${p.emoji} *${p.title}*\n  ${
          (p.description ?? "").trim() || "Ver ítems"
        }`,
    )
    .join("\n\n");
  const ok = await sendInteractiveList(
    to,
    "🌟 Promos ZM Lash & Nails",
    "Nuestras promos activas 💜 Elige una para ver los ítems y precios:",
    "Ver promos",
    [{ title: "Promos activas", rows }],
  );
  if (!ok) {
    await sendMessage(
      to,
      `💜 *Promos activas:*\n\n${fallback}\n\n` +
        "Escribe *agendar* para reservar una cita o *menu* para ver más opciones.",
    );
  }
}

/** Lista de promos: solo título y descripción. Las promos son contenedores; no se muestran precios ni duraciones totales. */
export async function sendPromosList(to: string, supabase: SupabaseClient) {
  const now = new Date().toISOString();
  const { data: promosData } = await supabase
    .from("promotions")
    .select("id, title, description, emoji, badge")
    .eq("is_active", true)
    .or(`valid_until.is.null,valid_until.gte.${now}`)
    .order("display_order", { ascending: true });

  const promos = promosData ?? [];
  if (!promos.length) {
    await sendMessage(
      to,
      "Ahorita no tenemos promos activas 🫶 Puedes ver todos los servicios en el menú principal.",
    );
    return;
  }

  type PromoRow = {
    id: string;
    title: string;
    description: string | null;
    emoji: string;
    badge: string | null;
  };
  // Hasta 9 promos + fila menú
  const promoRows = promos
    .slice(0, WABA_LIST_ROW_MAX - 1)
    .map((p: PromoRow) => {
      const fullName = `${p.emoji} ${p.title}`;
      const title = listTitle(fullName);
      const description = (p.description ?? fullName)
        .trim()
        .slice(0, DESCRIPTION_MAX_CHARS);
      return {
        id: `promo_${p.id}`,
        title,
        description: description || fullName.slice(0, DESCRIPTION_MAX_CHARS),
      };
    });
  const rows = [
    ...promoRows,
    {
      id: "menu",
      title: "🏠 Menú principal",
      description: "Volver al inicio",
    },
  ];

  const fallback = promos
    .map(
      (p: PromoRow) =>
        `${p.emoji} *${p.title}*\n  ${
          (p.description ?? "").trim() || "Ver ítems"
        }`,
    )
    .join("\n\n");

  const ok = await sendInteractiveList(
    to,
    "🌟 Promos ZM Lash & Nails",
    "Nuestras promos activas 💜 Elige una para ver los ítems y precios:",
    "Ver promos",
    [{ title: "Promos activas", rows }],
  );

  if (!ok) {
    await sendMessage(
      to,
      `💜 *Promos activas:*\n\n${fallback}\n\n` +
        "Escribe *agendar* para reservar una cita o *menu* para ver más opciones.",
    );
  }
}

/** Opciones al enviar acciones de carrito: body/header cortos para no totalizar al añadir un ítem. */
export type SendCartOptionsOpts = {
  /** Si se pasa, se usa en lugar de summary+total (ej. "¿Reservamos tu cita?" o "✅ X agregado. ¿Reservamos tu cita?"). */
  bodyOverride?: string;
  /** Si se pasa, se usa como título de la lista (ej. "Opciones" en lugar de "Servicio agregado"). */
  headerOverride?: string;
};

export async function sendCartOptions(
  to: string,
  summary: string,
  hasItems: boolean,
  opts?: SendCartOptionsOpts,
) {
  const rows = [
    {
      id: WA_IDS.AGREGAR_OTRO,
      title: "Agregar otro servicio",
      description: "Elegir más servicios",
    },
    ...(hasItems
      ? [
        {
          id: WA_IDS.VER_SELECCION,
          title: "Ver mi selección",
          description: "Revisar servicios elegidos",
        },
      ]
      : []),
    ...(hasItems
      ? [
        {
          id: WA_IDS.AGENDAR_YA,
          title: "Agendar cita",
          description: "Reservar con los servicios elegidos",
        },
        {
          id: WA_IDS.VACIAR_CARRITO,
          title: "Vaciar carrito",
          description: "Eliminar todo y empezar de cero",
        },
      ]
      : []),
    {
      id: "menu",
      title: "🏠 Menú principal",
      description: "Volver al inicio",
    },
  ];
  const body = opts?.bodyOverride !== undefined
    ? opts.bodyOverride
    : hasItems
    ? `${summary}\n\n¿Reservamos tu cita? Elige *Agendar cita* 👇`
    : "¿Reservamos tu cita? Elige *Agendar cita* 👇";
  const header = opts?.headerOverride ?? "Servicio agregado";
  const ok = await sendInteractiveList(to, header, body, "Opciones", [
    { title: "Acciones", rows },
  ]);
  if (!ok) {
    await sendMessage(
      to,
      hasItems
        ? `${summary}\n\nEscribe *agregar* para más o *agendar* para reservar.`
        : "Escribe *agregar* para más o *agendar* para reservar.",
    );
  }
}
