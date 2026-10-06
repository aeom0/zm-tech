/**
 * Portafolio visual WABA — fotos por servicio (tabla service_portfolio_images).
 * Los pies de foto indexan efectos/tipos que preguntan las clientas.
 */

import type { SupabaseClient } from "./supabase.ts";
import { sendImage, sendInteractiveList, sendMessage } from "../wa-api.ts";
import { truncateListTitle } from "../format.ts";
import { buildCtwaPricePhotoCaption } from "./emotional-selling.ts";
import type { WabaConfigMap } from "./waba-config.ts";
import { KARELIS_EFFECT_HINTS, STEPHANI_EFFECT_HINTS } from "./effect-hints.ts";

const LASH_EFFECT_HINT_WORDS = [
  ...KARELIS_EFFECT_HINTS,
  ...STEPHANI_EFFECT_HINTS,
].map((h) => h.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));

/**
 * Fibras / SKUs de extensiones que la clienta nombra al pedir fotos.
 * Distinto de DISEÑO/MAPEO (ojo de gato, ardilla…) — ver extension-effects-guide.
 * Orden: 4d antes que 3d para no mezclar.
 */
export type LashFiberKey =
  | "4d"
  | "3d"
  | "fox"
  | "rimel"
  | "mojado"
  | "clasicas"
  | "anime"
  | "hawaiana"
  | "mega"
  | "wispy";

const LASH_FIBER_DETECT: { key: LashFiberKey; re: RegExp }[] = [
  { key: "4d", re: /\b4d\b|volumen\s*tec\w*\s*4/ },
  { key: "3d", re: /\b3d\b|baby\s*vol|volumen\s*tec\w*\s*3/ },
  { key: "fox", re: /\bfoxy?\b/ },
  { key: "rimel", re: /\brimel\b/ },
  { key: "mojado", re: /\bmojado\b|\bhumedo\b|\bwet\b/ },
  { key: "clasicas", re: /\bclasic/ },
  { key: "anime", re: /\banime\b/ },
  { key: "hawaiana", re: /\bhawaian/ },
  { key: "mega", re: /\bmega\s*vol/ },
  { key: "wispy", re: /\bwispy\b/ },
];

/** Detecta fibras/SKU nombrados en el texto (p. ej. «3D, rimel y foxy»). */
export function detectLashFiberKeys(text: string): LashFiberKey[] {
  const t = normalizeText(text);
  if (!t.trim()) return [];
  const found: LashFiberKey[] = [];
  for (const { key, re } of LASH_FIBER_DETECT) {
    if (re.test(t) && !found.includes(key)) found.push(key);
  }
  return found;
}

function scoreIndexEntryForFiber(
  key: LashFiberKey,
  entry: PortfolioIndexEntry,
): number {
  const name = normalizeText(entry.serviceName);
  const cap = normalizeText(entry.caption);
  // Preferir set nuevo sobre retoque
  if (/retoque/.test(name)) return 0;

  switch (key) {
    case "3d":
      if (/\b4d\b/.test(name)) return 0;
      if (/\b3d\b/.test(name) || /baby\s*vol/.test(name)) {
        return 50 + (/efecto/.test(cap) ? 5 : 0);
      }
      return 0;
    case "4d":
      if (/\b4d\b/.test(name) || (/\b4d\b/.test(cap) && /volumen/.test(name))) {
        return 50;
      }
      return 0;
    case "fox":
      return /\bfox\b/.test(name) || /\bfox\b/.test(cap) ? 50 : 0;
    case "rimel":
      return /rimel/.test(name) || /rimel/.test(cap) ? 50 : 0;
    case "mojado":
      return /mojado|humedo|wet/.test(name) || /mojado|humedo/.test(cap)
        ? 50
        : 0;
    case "clasicas":
      return /clasic/.test(name) || /clasic/.test(cap) ? 50 : 0;
    case "anime":
      return /anime/.test(name) || /anime/.test(cap) ? 50 : 0;
    case "hawaiana":
      return /hawaian/.test(name) || /hawaian/.test(cap) ? 50 : 0;
    case "mega":
      return /mega\s*vol/.test(name) || /mega\s*vol/.test(cap) ? 50 : 0;
    case "wispy":
      return /wispy/.test(name) || /wispy/.test(cap) ? 50 : 0;
  }
}

/** Mejor foto anfitrión por fibra (1 slot). Clásicas sin portafolio → null. */
export function pickBestIndexEntryForFiber(
  key: LashFiberKey,
  index: PortfolioIndexEntry[],
): PortfolioIndexEntry | null {
  const scored: Array<{ entry: PortfolioIndexEntry; score: number }> = [];
  for (const entry of index) {
    const score = scoreIndexEntryForFiber(key, entry);
    if (score > 0) scored.push({ entry, score });
  }
  if (scored.length === 0) return null;
  scored.sort(
    (a, b) => b.score - a.score || a.entry.sortOrder - b.entry.sortOrder,
  );
  return scored[0].entry;
}

/** Una imagen por fibra nombrada (máx. PORTFOLIO_MAX_IMAGES). */
export function pickSlotsForFiberKeys(
  keys: LashFiberKey[],
  index: PortfolioIndexEntry[],
): PortfolioSlot[] {
  const slots: PortfolioSlot[] = [];
  const used = new Set<string>();
  for (const key of keys) {
    const entry = pickBestIndexEntryForFiber(key, index);
    if (!entry || used.has(entry.serviceId)) continue;
    used.add(entry.serviceId);
    slots.push({
      url: entry.url,
      caption: entry.caption || entry.serviceName,
    });
    if (slots.length >= PORTFOLIO_MAX_IMAGES) break;
  }
  return slots;
}

export const PORTFOLIO_MAX_IMAGES = 4;
/** Prefijo lista WA: elegir servicio con fotos (no agrega al carrito). */
export const PORTFOLIO_LIST_PREFIX = "portf_";

export const PORTFOLIO_CATEGORY_IDS = [
  "cat-unas",
  "cat-extensiones",
  "cat-lifting",
  "cat-cejas-rostro",
  "cat-microblading",
  "cat-depilacion",
] as const;

export type PortfolioCategoryId = (typeof PORTFOLIO_CATEGORY_IDS)[number];

export interface PortfolioSlot {
  url: string;
  caption: string;
}

/** Entrada del índice (caption → foto + servicio anfitrión). */
export interface PortfolioIndexEntry {
  serviceId: string;
  serviceName: string;
  categoryId: string | null;
  url: string;
  caption: string;
  sortOrder: number;
}

const INSTAGRAM_FALLBACK =
  "¡Claro! Puedes ver nuestros trabajos reales en Instagram @zmlashandnails 📸\n" +
  "Si quieres, cuéntanos qué estilo buscas y te orientamos aquí mismo 💜";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keywords de texto libre → categoría (orden: más específico primero). */
const CATEGORY_HINTS: { cat: PortfolioCategoryId; keys: string[] }[] = [
  {
    cat: "cat-unas",
    keys: [
      "uña",
      "unas",
      "uñas",
      "builder",
      "gel",
      "rubber",
      "acrílic",
      "acrilic",
      "manicure",
      "pedicure",
      "soft gel",
      "poly gel",
    ],
  },
  {
    cat: "cat-extensiones",
    keys: [
      "extensi",
      "pestañ",
      "pestana",
      "rimel",
      "rímel",
      "volumen",
      "clásic",
      "clasic",
      "ardilla",
      "gato",
    ],
  },
  {
    cat: "cat-lifting",
    keys: ["lifting", "lash botox", "botox"],
  },
  {
    cat: "cat-cejas-rostro",
    keys: ["ceja", "laminado", "henna", "rostro", "planchado"],
  },
  {
    cat: "cat-microblading",
    keys: ["microblading", "micro"],
  },
  {
    cat: "cat-depilacion",
    keys: ["depil", "bikini", "axil"],
  },
];

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Quita emoji y ruido; deja texto útil del pie de foto. */
function cleanCaptionForMatch(caption: string): string {
  return normalizeText(caption)
    .replace(/efecto\s*:?\s*/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function captionTokens(cleaned: string): string[] {
  const parts = cleaned.split(/\s+/).filter((t) => t.length >= 4);
  // Softgel / PolyGel sin espacio también como token entero si ≥4
  return [...new Set(parts)];
}

export function isPortfolioCategoryId(
  id: string | null | undefined,
): id is PortfolioCategoryId {
  return !!id && (PORTFOLIO_CATEGORY_IDS as readonly string[]).includes(id);
}

export function isServiceUuid(id: string | null | undefined): boolean {
  return !!id && UUID_RE.test(id.trim());
}

export function inferPortfolioCategoryFromText(
  text: string,
): PortfolioCategoryId | null {
  const lower = normalizeText(text);
  for (const { cat, keys } of CATEGORY_HINTS) {
    if (keys.some((k) => lower.includes(normalizeText(k)))) return cat;
  }
  return null;
}

export function getPortfolioInstagramFallback(): string {
  return INSTAGRAM_FALLBACK;
}

/**
 * Haiku ofrece portafolio de forma condicional ("también te puedo mostrar
 * opciones con fotos reales si quieres ver ejemplos ✨") sin emitir
 * `show_portfolio` (action:none) — Jacqueline …2438, 19-sep. Un "Sii" corto
 * después debe abrir el portafolio, no el menú genérico.
 *
 * Exige mención de fotos/portafolio **y** invitación condicional
 * (si quieres / te puedo mostrar / ¿quieres ver…), para no marcar CTA
 * cuando el texto solo informa que hay fotos reales.
 */
export function matchesPortfolioOfferPhrase(text: string): boolean {
  const t = (text ?? "").toLowerCase();
  if (!t) return false;
  const mentionsPortfolio =
    /\bfotos?\s+reales?\b/.test(t) ||
    /\bver\s+ejemplos\b/.test(t) ||
    /\bfotos?\s+de\s+(trabajos|ejemplos|referencia)\b/.test(t) ||
    /\b(el\s+|la\s+)?portafolio\b/.test(t);
  if (!mentionsPortfolio) return false;
  return (
    /\b(si\s+quieres|si\s+deseas|si\s+te\s+gustar[ií]a)\b/.test(t) ||
    /\b(quieres|deseas)\s+(ver|que\s+te\s+(muestre|mande|env[ií]e))\b/.test(
      t,
    ) ||
    /\bte\s+puedo\s+(mostrar|enviar|mandar)\b/.test(t) ||
    /\b(mostrar|ver|enviar)\w*\s+(el\s+|la\s+)?portafolio\b/.test(t)
  );
}

export function isPortfolioListId(id: string): boolean {
  return (
    id.startsWith(PORTFOLIO_LIST_PREFIX) &&
    id.length > PORTFOLIO_LIST_PREFIX.length + 8
  );
}

export function parsePortfolioListServiceId(id: string): string {
  return id.slice(PORTFOLIO_LIST_PREFIX.length);
}

export type PortfolioImageRow = {
  service_id: string;
  image_url: string | null;
  caption: string | null;
  sort_order: number | null;
};

export type PortfolioServiceMeta = {
  id: string;
  name: string;
  category_id: string | null;
};

/** Arma el índice con servicios que ya están en memoria (sin otro select). */
export function portfolioIndexFromRows(
  imgs: PortfolioImageRow[],
  services: PortfolioServiceMeta[],
): PortfolioIndexEntry[] {
  const byId = new Map(
    services.map((s) => [
      s.id,
      {
        name: s.name ?? "",
        categoryId: s.category_id ?? null,
      },
    ]),
  );

  const out: PortfolioIndexEntry[] = [];
  for (const r of imgs) {
    const url = typeof r.image_url === "string" ? r.image_url.trim() : "";
    if (!url) continue;
    const sid = r.service_id;
    const meta = byId.get(sid);
    out.push({
      serviceId: sid,
      serviceName: meta?.name ?? "",
      categoryId: meta?.categoryId ?? null,
      url,
      caption: typeof r.caption === "string" ? r.caption.trim() : "",
      sortOrder: typeof r.sort_order === "number" ? r.sort_order : 0,
    });
  }
  return out;
}

/** Carga índice completo (URLs + captions + anfitrión). */
export async function loadPortfolioIndex(
  supabase: SupabaseClient,
): Promise<PortfolioIndexEntry[]> {
  const { data: imgs, error: imgErr } = await supabase
    .from("service_portfolio_images")
    .select("service_id, image_url, caption, sort_order")
    .order("sort_order", { ascending: true });

  if (imgErr || !imgs?.length) {
    if (imgErr) console.error("[portfolio] loadIndex imgs:", imgErr.message);
    return [];
  }

  const rows = imgs as PortfolioImageRow[];
  const serviceIds = [
    ...new Set(
      rows
        .map((r) => r.service_id)
        .filter((id) => typeof id === "string" && id),
    ),
  ];

  const { data: svcs, error: svcErr } = await supabase
    .from("services")
    .select("id, name, category_id")
    .in("id", serviceIds);

  if (svcErr) {
    console.error("[portfolio] loadIndex svcs:", svcErr.message);
  }

  return portfolioIndexFromRows(rows, (svcs ?? []) as PortfolioServiceMeta[]);
}

/**
 * Match por pie de foto / etiquetas.
 * Score alto si el caption limpio está en el mensaje; si no, suma tokens ≥4.
 * Si el caption tiene ≥2 tokens relevantes, exige ≥2 hits (evita "depilación"→cejas).
 */
export function matchPortfolioByCaption(
  text: string,
  index: PortfolioIndexEntry[],
  opts?: { categoryId?: string | null },
): Array<PortfolioIndexEntry & { score: number }> {
  const msg = normalizeText(text);
  if (!msg.trim() || index.length === 0) return [];

  const preferCat = opts?.categoryId ?? null;
  const scored: Array<PortfolioIndexEntry & { score: number }> = [];

  for (const entry of index) {
    if (preferCat && entry.categoryId && entry.categoryId !== preferCat) {
      continue;
    }
    const cleaned = cleanCaptionForMatch(entry.caption);
    if (!cleaned || cleaned.length < 3) continue;

    let score = 0;
    if (cleaned.length >= 4 && msg.includes(cleaned)) {
      score = cleaned.length * 10;
    } else {
      const toks = captionTokens(cleaned);
      const hitToks = toks.filter((tok) => msg.includes(tok));
      // Caption multi-etiqueta: exigir ≥2 tokens (evita "depilación"→"Depilación de cejas")
      // Excepción: un efecto conocido y sin ambigüedad (ej. "rímel" en "Rímel // Diseño
      // Ojo de gato") basta solo — la clienta rara vez repite el nombre del diseño
      // (Mirian …1781, "Pestañas efecto Rimel", 12-sep-2026: 0 imágenes enviadas).
      const hasKnownEffectHit = LASH_EFFECT_HINT_WORDS.some(
        (h) => msg.includes(h) && cleaned.includes(h),
      );
      if (toks.length >= 2 && hitToks.length < 2 && !hasKnownEffectHit) {
        continue;
      }
      for (const tok of hitToks) score += tok.length;
      // Soft gel ↔ softgel
      const compactCap = cleaned.replace(/\s+/g, "");
      const compactMsg = msg.replace(/\s+/g, "");
      if (compactCap.length >= 4 && compactMsg.includes(compactCap)) {
        score = Math.max(score, compactCap.length * 8);
      }
    }

    if (score > 0) scored.push({ ...entry, score });
  }

  scored.sort((a, b) => b.score - a.score || a.sortOrder - b.sortOrder);
  return scored;
}

/** Carga hasta 4 imágenes de un servicio. */
export async function getPortfolioSlotsForService(
  supabase: SupabaseClient,
  serviceId: string,
): Promise<PortfolioSlot[]> {
  const { data, error } = await supabase
    .from("service_portfolio_images")
    .select("image_url, caption, sort_order")
    .eq("service_id", serviceId)
    .order("sort_order", { ascending: true })
    .limit(PORTFOLIO_MAX_IMAGES);

  if (error || !data) {
    if (error) {
      console.error("[portfolio] getSlots:", error.message);
    }
    return [];
  }

  return data
    .filter((r) => typeof r.image_url === "string" && r.image_url.trim())
    .map((r) => ({
      url: (r.image_url as string).trim(),
      caption: typeof r.caption === "string" ? r.caption.trim() : "",
    }));
}

export type ServiceWithPortfolio = {
  id: string;
  name: string;
  short_name: string | null;
  category_id: string | null;
};

/** Servicios activos de una categoría que tienen ≥1 foto. */
export async function listServicesWithPortfolioInCategory(
  supabase: SupabaseClient,
  categoryId: string,
): Promise<ServiceWithPortfolio[]> {
  const { data: imgs, error: imgErr } = await supabase
    .from("service_portfolio_images")
    .select("service_id");

  if (imgErr || !imgs?.length) {
    if (imgErr) console.error("[portfolio] list imgs:", imgErr.message);
    return [];
  }

  const serviceIds = [...new Set(imgs.map((r) => r.service_id as string))];

  const { data: svcs, error: svcErr } = await supabase
    .from("services")
    .select("id, name, short_name, category_id, is_active")
    .in("id", serviceIds)
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (svcErr || !svcs) {
    if (svcErr) console.error("[portfolio] list svcs:", svcErr.message);
    return [];
  }

  return svcs as ServiceWithPortfolio[];
}

/**
 * Match servicio por nombre / short_name dentro de una lista candidata
 * (mensaje de la clienta o param Haiku).
 */
export function matchServiceFromText(
  text: string,
  candidates: ServiceWithPortfolio[],
): ServiceWithPortfolio | null {
  if (!text.trim() || candidates.length === 0) return null;
  const lower = normalizeText(text);

  let best: ServiceWithPortfolio | null = null;
  let bestLen = 0;

  for (const s of candidates) {
    const names = [s.name, s.short_name].filter(Boolean) as string[];
    for (const raw of names) {
      const n = normalizeText(raw);
      if (n.length < 3) continue;
      if (lower.includes(n) && n.length > bestLen) {
        best = s;
        bestLen = n.length;
      }
      for (const word of n.split(/\s+/)) {
        if (word.length >= 4 && lower.includes(word) && word.length > bestLen) {
          if (!best || bestLen < word.length) {
            best = s;
            bestLen = word.length;
          }
        }
      }
    }
  }
  return best;
}

/** Envía slots ordenando preferredUrls primero. */
export async function sendPortfolioImagesOrdered(
  phoneNumber: string,
  slots: PortfolioSlot[],
  preferredUrls?: string[],
  fallbackCaption?: string,
): Promise<boolean> {
  if (slots.length === 0) return false;

  const preferred = new Set((preferredUrls ?? []).filter(Boolean));
  const ordered =
    preferred.size === 0
      ? slots
      : [
          ...slots.filter((s) => preferred.has(s.url)),
          ...slots.filter((s) => !preferred.has(s.url)),
        ];

  for (const slot of ordered) {
    await sendImage(
      phoneNumber,
      slot.url,
      slot.caption || fallbackCaption || undefined,
    );
  }
  return true;
}

/** Envía las fotos de un servicio (caption vacío → nombre del servicio). */
export async function sendPortfolioImagesForService(
  supabase: SupabaseClient,
  phoneNumber: string,
  serviceId: string,
  serviceName?: string,
  preferredUrls?: string[],
): Promise<boolean> {
  const slots = await getPortfolioSlotsForService(supabase, serviceId);
  if (slots.length === 0) return false;

  let fallbackCaption = serviceName?.trim() ?? "";
  if (!fallbackCaption) {
    const { data } = await supabase
      .from("services")
      .select("name")
      .eq("id", serviceId)
      .maybeSingle();
    fallbackCaption = (data?.name as string | undefined)?.trim() ?? "";
  }

  return sendPortfolioImagesOrdered(
    phoneNumber,
    slots,
    preferredUrls,
    fallbackCaption,
  );
}

/**
 * Tras match por caption: envía preferred + hermanas del mismo anfitrión.
 * Si hay varios anfitriones, usa el del hit con mejor score.
 */
export function sendFromCaptionHits(
  supabase: SupabaseClient,
  phoneNumber: string,
  hits: Array<PortfolioIndexEntry & { score: number }>,
  index: PortfolioIndexEntry[],
): boolean | Promise<boolean> {
  if (hits.length === 0) return false;
  const bestScore = hits[0].score;
  const topHits = hits.filter((h) => h.score === bestScore);
  const hostId = topHits[0].serviceId;
  const preferredUrls = [
    ...new Set(hits.filter((h) => h.serviceId === hostId).map((h) => h.url)),
  ];
  const hostName =
    index.find((e) => e.serviceId === hostId)?.serviceName ??
    topHits[0].serviceName;
  return sendPortfolioImagesForService(
    supabase,
    phoneNumber,
    hostId,
    hostName,
    preferredUrls,
  );
}

/** Lista interactiva de servicios con portafolio (máx. 10 filas Meta). */
export function sendPortfolioServiceList(
  phoneNumber: string,
  services: ServiceWithPortfolio[],
  categoryName?: string,
): boolean | Promise<boolean> {
  const limited = services.slice(0, 9);
  if (limited.length === 0) return false;

  const rows = [
    ...limited.map((s) => {
      const name = (s.short_name || s.name).trim();
      return {
        id: `${PORTFOLIO_LIST_PREFIX}${s.id}`,
        title: truncateListTitle(name),
        description: s.name.trim().slice(0, 72),
      };
    }),
    {
      id: "menu",
      title: "🏠 Menú principal",
      description: "Volver al inicio",
    },
  ];

  const header = "Portafolio";
  const body = categoryName
    ? `Elige el servicio de *${categoryName}* para ver fotos reales 👇`
    : "Elige el servicio para ver fotos reales 👇";

  return sendInteractiveList(phoneNumber, header, body, "Ver fotos", [
    { title: "Servicios", rows },
  ]);
}

/**
 * Resuelve show_portfolio: caption → UUID → cat-* / vago → lista o Instagram.
 */
export async function resolveAndSendPortfolio(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  param: string | null | undefined;
  messageText: string;
  cartServiceIds?: string[];
  catalogServices?: {
    id: string;
    name: string;
    short_name?: string | null;
    category_id?: string | null;
  }[];
  categories?: { id: string; name: string }[];
  portfolioIndex?: PortfolioIndexEntry[];
}): Promise<void> {
  const {
    supabase,
    phoneNumber,
    param,
    messageText,
    cartServiceIds = [],
    catalogServices = [],
    categories = [],
  } = opts;

  const paramTrim = param?.trim() ?? "";
  const index = opts.portfolioIndex ?? (await loadPortfolioIndex(supabase));

  // ── 0) Fichas Extensiones_* (Clásicas/Rímel/3D/4D) + resto por portafolio ──
  // Nicole: «fotos 3D, rimel y foxy» → fichas edu (diseños) + Fox del portafolio.
  const fiberKeys = detectLashFiberKeys(messageText);
  const wantsFiberRefs =
    fiberKeys.length >= 1 &&
    /(foto|ver|mostrar|mand|pas|referenc|diseñ|diseno|estilo|explic|que\s+es)/i.test(
      messageText,
    );
  if (wantsFiberRefs && !isServiceUuid(paramTrim)) {
    try {
      const { fiberEduKindForLashKey, getEduGuideImage } = await import(
        "./edu-guides.ts"
      );
      const { data: cfgRows } = await supabase
        .from("waba_config")
        .select("config_key, config_value")
        .eq("tenant_id", "zm-lash-nails")
        .eq("is_active", true)
        .like("config_key", "edu_fiber_%");
      const wabaConfig: import("./waba-config.ts").WabaConfigMap = new Map();
      for (const row of cfgRows ?? []) {
        const k = row.config_key as string;
        const v = row.config_value;
        if (v && typeof v === "object") {
          wabaConfig.set(k, v as Record<string, unknown>);
        }
      }
      const eduSlots: PortfolioSlot[] = [];
      const leftover: typeof fiberKeys = [];
      for (const key of fiberKeys) {
        const kind = fiberEduKindForLashKey(key);
        if (!kind) {
          leftover.push(key);
          continue;
        }
        const img = getEduGuideImage(wabaConfig, kind);
        if (img) {
          eduSlots.push({ url: img.url, caption: img.caption });
        } else {
          leftover.push(key);
        }
      }
      let sentAny = false;
      if (eduSlots.length > 0) {
        await sendPortfolioImagesOrdered(
          phoneNumber,
          eduSlots.slice(0, PORTFOLIO_MAX_IMAGES),
        );
        sentAny = true;
      }
      if (leftover.length > 0) {
        const multiSlots = pickSlotsForFiberKeys(leftover, index);
        if (multiSlots.length > 0) {
          await sendPortfolioImagesOrdered(phoneNumber, multiSlots);
          sentAny = true;
        }
      }
      // Ya se mandó algo en este bloque (fichas edu y/o fotos de portafolio
      // para el leftover) — no caer en el bloque "multi-fibra sin fichas edu"
      // de abajo, que reenviaría las mismas fotos por segunda vez.
      if (sentAny) {
        return;
      }
    } catch (e) {
      console.error("[portfolio] fiber edu cards:", e);
    }
  }

  // Multi-fibra sin fichas edu (solo Fox/Anime/…) — 1 foto por anfitrión
  if (fiberKeys.length >= 2 && !isServiceUuid(paramTrim)) {
    const multiSlots = pickSlotsForFiberKeys(fiberKeys, index);
    if (multiSlots.length >= 2) {
      await sendPortfolioImagesOrdered(phoneNumber, multiSlots);
      return;
    }
  }

  // Categoría del param o del mensaje (para filtrar captions)
  let catId = isPortfolioCategoryId(paramTrim) ? paramTrim : "";
  if (!catId && !isServiceUuid(paramTrim)) {
    catId = inferPortfolioCategoryFromText(messageText) ?? "";
  }

  // ── 1) Caption match sobre el mensaje (prioridad) ─────────────────────
  // Alias: "foxy" → también buscar "fox" en pies de foto
  const captionQuery =
    /\bfoxy\b/i.test(messageText) && !/\bfox\b/i.test(messageText)
      ? `${messageText} fox`
      : messageText;
  const msgHits = matchPortfolioByCaption(captionQuery, index, {
    categoryId: isPortfolioCategoryId(catId) ? catId : null,
  });
  // Si filtrar por cat no dio hits, reintentar global (anfitrión puede estar en otra cat)
  const captionHits =
    msgHits.length > 0 ? msgHits : matchPortfolioByCaption(captionQuery, index);

  if (captionHits.length > 0 && !isServiceUuid(paramTrim)) {
    // Solo ganar por caption si el score es sólido (≥4 = un token útil)
    if (captionHits[0].score >= 4) {
      const ok = await sendFromCaptionHits(
        supabase,
        phoneNumber,
        captionHits,
        index,
      );
      if (ok) return;
    }
  }

  // ── 2–3) UUID de servicio ─────────────────────────────────────────────
  if (isServiceUuid(paramTrim)) {
    const slots = await getPortfolioSlotsForService(supabase, paramTrim);
    if (slots.length > 0) {
      const prefer = matchPortfolioByCaption(
        messageText,
        index.filter((e) => e.serviceId === paramTrim),
      ).map((h) => h.url);
      await sendPortfolioImagesOrdered(
        phoneNumber,
        slots,
        prefer,
        catalogServices.find((s) => s.id === paramTrim)?.name,
      );
      return;
    }

    // UUID sin fotos → buscar por nombre del servicio en captions
    const svc = catalogServices.find((s) => s.id === paramTrim);
    const nameHits = svc?.name ? matchPortfolioByCaption(svc.name, index) : [];
    if (nameHits.length > 0 && nameHits[0].score >= 4) {
      const ok = await sendFromCaptionHits(
        supabase,
        phoneNumber,
        nameHits,
        index,
      );
      if (ok) return;
    }

    // Caption del mensaje como última chance antes de IG
    if (captionHits.length > 0 && captionHits[0].score >= 4) {
      const ok = await sendFromCaptionHits(
        supabase,
        phoneNumber,
        captionHits,
        index,
      );
      if (ok) return;
    }

    await sendMessage(phoneNumber, getPortfolioInstagramFallback());
    return;
  }

  // ── 4) Carrito: primer servicio con fotos ─────────────────────────────
  if (cartServiceIds.length > 0) {
    for (const sid of cartServiceIds) {
      const slots = await getPortfolioSlotsForService(supabase, sid);
      if (slots.length === 0) continue;
      const svc = catalogServices.find((s) => s.id === sid);
      if (catId && svc?.category_id && svc.category_id !== catId) {
        continue;
      }
      const prefer = matchPortfolioByCaption(
        messageText,
        index.filter((e) => e.serviceId === sid),
      ).map((h) => h.url);
      await sendPortfolioImagesForService(
        supabase,
        phoneNumber,
        sid,
        svc?.name,
        prefer,
      );
      return;
    }
  }

  if (!isPortfolioCategoryId(catId)) {
    const ids = [...new Set(index.map((e) => e.serviceId))];
    if (ids.length > 0) {
      const withPhotos = catalogServices
        .filter((s) => ids.includes(s.id))
        .map((s) => ({
          id: s.id,
          name: s.name,
          short_name: s.short_name ?? null,
          category_id: s.category_id ?? null,
        }));
      const matched = matchServiceFromText(messageText, withPhotos);
      if (matched) {
        await sendPortfolioImagesForService(
          supabase,
          phoneNumber,
          matched.id,
          matched.name,
        );
        return;
      }
    }
    // «fotos del 3D» / «foxy» sin UUID ni cat en param
    if (fiberKeys.length >= 1) {
      const host = pickBestIndexEntryForFiber(fiberKeys[0], index);
      if (host) {
        await sendPortfolioImagesForService(
          supabase,
          phoneNumber,
          host.serviceId,
          host.serviceName,
        );
        return;
      }
    }
    await sendMessage(phoneNumber, getPortfolioInstagramFallback());
    return;
  }

  const withPhotos = await listServicesWithPortfolioInCategory(supabase, catId);

  // Caption ya intentado; si no hay anfitriones en esta cat, capturar vía caption global
  if (withPhotos.length === 0) {
    if (captionHits.length > 0 && captionHits[0].score >= 4) {
      const ok = await sendFromCaptionHits(
        supabase,
        phoneNumber,
        captionHits,
        index,
      );
      if (ok) return;
    }
    await sendMessage(phoneNumber, getPortfolioInstagramFallback());
    return;
  }

  const matched = matchServiceFromText(messageText, withPhotos);
  if (matched) {
    const prefer = matchPortfolioByCaption(
      messageText,
      index.filter((e) => e.serviceId === matched.id),
    ).map((h) => h.url);
    await sendPortfolioImagesForService(
      supabase,
      phoneNumber,
      matched.id,
      matched.name,
      prefer,
    );
    return;
  }

  // Fibra corta («3D», «foxy») que no entra en caption ni en nombre completo
  if (fiberKeys.length === 1) {
    const host = pickBestIndexEntryForFiber(fiberKeys[0], index);
    if (host) {
      await sendPortfolioImagesForService(
        supabase,
        phoneNumber,
        host.serviceId,
        host.serviceName,
      );
      return;
    }
  }

  if (withPhotos.length === 1) {
    await sendPortfolioImagesForService(
      supabase,
      phoneNumber,
      withPhotos[0].id,
      withPhotos[0].name,
    );
    return;
  }

  const catName = categories.find((c) => c.id === catId)?.name ?? catId;
  await sendPortfolioServiceList(phoneNumber, withPhotos, catName);
}

const BODY_PART_NOUNS: Record<string, string> = {
  "cat-unas": "tus manos",
  "cat-extensiones": "tu mirada",
  "cat-lifting": "tu mirada",
  "cat-cejas-rostro": "tus cejas",
  "cat-microblading": "tu look",
  "cat-depilacion": "tu piel",
};

/** Sustantivo de "parte del cuerpo" para el CTA de foto en respuesta de precio. */
export function getPortfolioBodyPartNoun(
  categoryId: string | null | undefined,
  serviceName?: string,
): string {
  if (
    categoryId === "cat-microblading" &&
    serviceName &&
    normalizeText(serviceName).includes("labios")
  ) {
    return "tus labios";
  }
  return (categoryId && BODY_PART_NOUNS[categoryId]) || "tu look";
}

/** Caption con CTA de agendar para el envío proactivo de foto tras responder precio. */
export function buildPriceAnswerPhotoCaption(
  serviceName: string,
  categoryId: string | null | undefined,
  opts?: { isCtwa?: boolean; wabaConfig?: WabaConfigMap },
): string {
  const noun = getPortfolioBodyPartNoun(categoryId, serviceName);
  if (opts?.isCtwa && opts.wabaConfig) {
    return buildCtwaPricePhotoCaption(opts.wabaConfig, serviceName, noun);
  }
  return `Mira cómo trabajamos en ${serviceName}, así puede quedar ${noun} ✨\n¿Te agendo el servicio ahora?`;
}

const GENERIC_QUOTE_TOKENS = new Set([
  "retoque",
  "extensiones",
  "extension",
  "efecto",
  "efectos",
  "diseno",
  "pestanas",
  "pestana",
  "servicio",
  "servicios",
  "precio",
  "cuanto",
  "cuesta",
]);

function cleanMatchText(text: string): string {
  return normalizeText(text)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Líneas del turno que traen un precio S/. Ahí está el servicio que Haiku cotizó. */
function extractPriceQuote(text: string): string | null {
  if (!/S\s*\/\s*\d/i.test(text)) return null;
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const priced = lines.filter((l) => /S\s*\/\s*\d/i.test(l));
  return priced.length > 0 ? priced.join("\n") : text;
}

function stripServicePrefix(name: string): string {
  return name
    .replace(/^(extensiones|retoque|lifting de|planchado de)\s+/, "")
    .replace(/^efect\s+/, "")
    .trim();
}

/** Nombre completo, sin prefijo genérico, y las dos primeras palabras distintivas. */
function serviceNameStems(serviceName: string): string[] {
  const cleaned = cleanMatchText(serviceName);
  if (!cleaned) return [];
  const stems: string[] = [];
  if (cleaned.length >= 5) stems.push(cleaned);
  const stripped = stripServicePrefix(cleaned);
  if (stripped.length >= 5 && !stems.includes(stripped)) stems.push(stripped);
  const toks = stripped.split(" ").filter((t) => t.length >= 2);
  if (toks.length >= 2) {
    const two = `${toks[0]} ${toks[1]}`;
    if (two.length >= 8 && !stems.includes(two)) stems.push(two);
  }
  return stems;
}

/**
 * Qué tanto el nombre del servicio anfitrión aparece en la cotización.
 * Set y retoque no se cruzan: "Retoque … Rímel" no elige "Extensiones Rímel".
 */
function scoreServiceNameInQuote(serviceName: string, quote: string): number {
  const name = cleanMatchText(serviceName);
  const q = cleanMatchText(quote);
  if (!name || !q) return 0;
  if (/\bretoque\b/.test(q) !== /\bretoque\b/.test(name)) return 0;

  let best = 0;
  for (const stem of serviceNameStems(serviceName)) {
    if (q.includes(stem)) best = Math.max(best, stem.length * 10);
  }
  if (best === 0) return 0;
  if (/\b3d\b/.test(name) && /\b3d\b/.test(q)) best += 15;
  if (/\b4d\b/.test(name) && /\b4d\b/.test(q)) best += 15;
  if (/\b3d\b/.test(name) && /\b4d\b/.test(q) && !/\b3d\b/.test(q)) best -= 30;
  if (/\b4d\b/.test(name) && /\b3d\b/.test(q) && !/\b4d\b/.test(q)) best -= 30;
  return best > 0 ? best : 0;
}

function captionConflictsWithQuote(
  quote: string,
  winnerName: string,
  index: PortfolioIndexEntry[],
): boolean {
  const winner = cleanMatchText(winnerName);
  const tokens = cleanMatchText(quote)
    .split(" ")
    .filter((t) => t.length >= 5 && !GENERIC_QUOTE_TOKENS.has(t));
  for (const tok of tokens) {
    if (winner.includes(tok)) continue;
    const ownedByOther = index.some((entry) => {
      const other = cleanMatchText(entry.serviceName);
      return other !== winner && other.includes(tok);
    });
    if (ownedByOther) return true;
  }
  return false;
}

function bestPhotoForService(
  serviceId: string,
  text: string,
  index: PortfolioIndexEntry[],
  categoryId?: string | null,
): (PortfolioIndexEntry & { score: number }) | null {
  const subset = index.filter((entry) => entry.serviceId === serviceId);
  const hits = matchPortfolioByCaption(text, subset, { categoryId });
  if (hits[0]) return hits[0];
  const fallback = [...subset].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  return fallback ? { ...fallback, score: 10 } : null;
}

/**
 * Mejor match único por caption (no toda la lista de hits) — usado para
 * adjuntar UNA foto real cuando Haiku responde el precio de un servicio.
 *
 * Si la cotización (línea con S/) nombra un servicio del índice, esa foto gana
 * sobre un pie que solo repite el efecto (ardilla, muñeca, ojo de gato).
 * Si el nombre cotizado no está en el índice pero choca con el ganador por
 * caption (retoque Rímel vs foto de Baby Vol), no adjunta la foto equivocada.
 */
export function findBestPortfolioMatchForText(
  text: string,
  index: PortfolioIndexEntry[],
  categoryId?: string | null,
): (PortfolioIndexEntry & { score: number }) | null {
  const quote = extractPriceQuote(text);
  const scoped = categoryId
    ? index.filter(
        (entry) => !entry.categoryId || entry.categoryId === categoryId,
      )
    : index;

  if (quote) {
    let bestScore = 0;
    let bestId: string | null = null;
    const seen = new Set<string>();
    for (const entry of scoped) {
      if (seen.has(entry.serviceId)) continue;
      seen.add(entry.serviceId);
      const score = scoreServiceNameInQuote(entry.serviceName, quote);
      if (score > bestScore) {
        bestScore = score;
        bestId = entry.serviceId;
      }
    }
    // 50 = un distintivo de 5 letras ("rimel"). Un efecto suelto no llega aquí.
    if (bestId && bestScore >= 50) {
      return bestPhotoForService(bestId, text, scoped, categoryId);
    }
  }

  const hits = matchPortfolioByCaption(text, index, { categoryId });
  if (hits.length === 0 || hits[0].score < 4) return null;
  if (quote && captionConflictsWithQuote(quote, hits[0].serviceName, scoped)) {
    return null;
  }
  return hits[0];
}

const PRICE_ANSWER_PHOTO_DEBOUNCE_MS = 60 * 60 * 1000;

/** Evita reenviar la misma foto de precio si la clienta repite la pregunta en poco tiempo. */
export async function wasPriceAnswerPhotoRecentlySent(
  supabase: SupabaseClient,
  phone: string,
  serviceName: string,
  windowMs: number = PRICE_ANSWER_PHOTO_DEBOUNCE_MS,
): Promise<boolean> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { data, error } = await supabase
    .from("wa_messages")
    .select("content")
    .eq("phone", phone)
    .eq("direction", "out")
    .eq("msg_type", "image")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(12);
  if (error) {
    console.error(
      "[portfolio] wasPriceAnswerPhotoRecentlySent:",
      error.message,
    );
    return false;
  }
  const needle = serviceName.trim().toLowerCase();
  if (!needle) return false;
  return (data ?? []).some((row) => {
    const c = String(row.content ?? "").toLowerCase();
    return c.includes(needle) || c.includes(`en ${needle},`);
  });
}

/** Agrupa captions por servicio anfitrión para el prompt de Haiku. */
export function formatPortfolioIndexForPrompt(
  index: PortfolioIndexEntry[],
): string {
  if (index.length === 0) return "";

  const byHost = new Map<string, { name: string; captions: string[] }>();
  for (const e of index) {
    if (!byHost.has(e.serviceId)) {
      byHost.set(e.serviceId, {
        name: e.serviceName || e.serviceId,
        captions: [],
      });
    }
    const cap = e.caption.trim();
    if (cap) byHost.get(e.serviceId)!.captions.push(cap);
  }

  const lines = [
    "PORTAFOLIO CON FOTOS (etiquetas = pies de foto; UUID = servicio anfitrión para show_portfolio):",
    "Si la clienta pide fotos de un efecto/tipo listado aquí, usa show_portfolio con el UUID anfitrión (no el UUID del catálogo si ese no aparece abajo).",
    "Precio y add_to_cart siguen usando IDs de SERVICIOS DISPONIBLES.",
  ];
  for (const [id, { name, captions }] of byHost) {
    const labels = captions.length > 0 ? captions.join(" | ") : "(sin pie)";
    lines.push(`- [${id}] ${name}: ${labels}`);
  }
  return lines.join("\n");
}
