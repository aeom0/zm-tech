/**
 * Resolución 1B: última cita → servicio de retoque del catálogo si existe.
 * Intervalos Vanessa (ago 2026): extensiones 15d; lifting→Botox@30; Botox→lifting@25.
 *
 * Plantilla Meta:
 *   name: retoque_reenganche_zm | lang: es_PE | UTILITY
 *   body params: {{1}} nombre, {{2}} servicio, {{3}} antigüedad
 *   buttons: Agendar | Otro servicio | Más adelante
 *
 * Tip cuidados (plantilla aparte): lifting_cuidados_ricino_zm ~día 10 post-lifting.
 */

export const RETOUCH_TEMPLATE_NAME = "retoque_reenganche_zm";
export const RETOUCH_TEMPLATE_LANG = "es_PE";
export const RETOUCH_COOLDOWN_DAYS = 30;
export const RETOUCH_OFFER_TTL_DAYS = 14;

/** Tip aceite de ricino post-lifting (cuidado en casa, no servicio). */
export const LIFTING_RICINO_TEMPLATE_NAME = "lifting_cuidados_ricino_zm";
export const LIFTING_RICINO_TEMPLATE_LANG = "es_PE";
/** Ventana inclusiva de días desde la cita completed de lifting. */
export const LIFTING_RICINO_MIN_DAYS = 10;
export const LIFTING_RICINO_MAX_DAYS = 14;

/**
 * Fallback grueso por categoría (si el nombre no matchea reglas Vanessa).
 * Lookback del cron usa el máximo de estos + reglas por servicio.
 */
export const RETOUCH_INTERVAL_BY_CATEGORY: Record<string, number> = {
  "cat-extensiones": 15,
  "cat-lifting": 30,
  "cat-cejas-rostro": 30,
  "cat-unas": 21,
  "cat-microblading": 180,
  "cat-depilacion": 30,
};

/** Intervalos Vanessa (días). */
export const RETOUCH_INTERVAL = {
  /** Ideal 15 / tope 18 — reenganche desde 15. */
  extensiones: 15,
  manosGel: 15,
  builderRubberPoly: 21,
  pedicureGel: 21,
  /** Tras Lash Botox → ofrecer Lifting. */
  postBotoxLifting: 25,
  /** Tras Lifting → ofrecer Lash Botox. */
  lifting: 30,
  default: 30,
} as const;

export interface RetouchServiceRow {
  id: string;
  name: string;
  category_id: string | null;
  price?: string | number | null;
  is_active?: boolean | null;
}

export function normalizeServiceName(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function isRetouchServiceName(name: string): boolean {
  const n = normalizeServiceName(name);
  return n.includes("retoque") || n.includes("mantenimiento");
}

export function isLashBotoxServiceName(name: string): boolean {
  const n = normalizeServiceName(name);
  return (
    n.includes("lash botox") ||
    (n.includes("botox") && (n.includes("pestana") || n.includes("ceja")))
  );
}

export function isLiftingServiceName(name: string): boolean {
  const n = normalizeServiceName(name);
  if (isLashBotoxServiceName(name)) return false;
  return n.includes("lifting");
}

/** Tokens de estilo para emparejar juego completo → retoque. */
export function styleTokens(name: string): string[] {
  const n = normalizeServiceName(name);
  const tokens: string[] = [];
  if (n.includes("clasic") || n.includes("rimel"))
    tokens.push("clasicas_rimel");
  if (n.includes("mojado")) tokens.push("mojado");
  if (n.includes("baby") && n.includes("3d")) tokens.push("baby3d");
  if (n.includes("baby") && n.includes("4d")) tokens.push("baby4d");
  if (n.includes("soft gel") || n.includes("softgel")) tokens.push("soft_gel");
  if (n.includes("poly gel") || n.includes("polygel")) tokens.push("poly_gel");
  if (n.includes("builder")) tokens.push("builder");
  if (n.includes("rubber")) tokens.push("rubber");
  if (n.includes("acrilic") || n.includes("acrylic")) tokens.push("acrylic");
  if (n.includes("volumen") || n.includes("volume") || n.includes("vol.")) {
    tokens.push("volumen");
  }
  if (n.includes("lifting")) tokens.push("lifting");
  if (n.includes("laminado")) tokens.push("laminado");
  if (n.includes("microblading")) tokens.push("microblading");
  return tokens;
}

/**
 * Intervalo de reenganche según el último servicio (reglas Vanessa).
 * Prioridad uñas: Builder/Rubber/Poly → Pedi → Soft/Manicure/Manos.
 */
export function intervalDaysForService(
  service: Pick<RetouchServiceRow, "name" | "category_id"> | null | undefined,
): number {
  if (!service?.name) {
    return intervalDaysForCategory(service?.category_id ?? null);
  }
  const n = normalizeServiceName(service.name);
  const cat = service.category_id;

  if (cat === "cat-extensiones") {
    if (n.includes("retiro")) {
      return RETOUCH_INTERVAL.default;
    }
    return RETOUCH_INTERVAL.extensiones;
  }

  // Post Lash Botox → lifting a los 25 días
  if (isLashBotoxServiceName(service.name)) {
    return RETOUCH_INTERVAL.postBotoxLifting;
  }
  if (isLiftingServiceName(service.name) || cat === "cat-lifting") {
    // Laminado/planchado de cejas: fallback categoría
    if (n.includes("laminado") || n.includes("planchado")) {
      return intervalDaysForCategory(cat);
    }
    if (n.includes("lifting") || cat === "cat-lifting") {
      return RETOUCH_INTERVAL.lifting;
    }
  }

  if (
    cat === "cat-unas" ||
    /gel|rubber|builder|poly|mani|pedi|uña|una/.test(n)
  ) {
    if (n.includes("retiro")) {
      return RETOUCH_INTERVAL.default;
    }
    // Builder / Rubber / Polygel → 3 semanas
    if (
      n.includes("builder") ||
      n.includes("rubber") ||
      n.includes("poly gel") ||
      n.includes("polygel")
    ) {
      return RETOUCH_INTERVAL.builderRubberPoly;
    }
    // Pedicure / pies en gel (sin soft/manicure/manos)
    const isPedi =
      n.includes("pedicure") ||
      n.includes("pedi gel") ||
      n.includes("pies en gel") ||
      n.includes("pies gel");
    const isManos =
      n.includes("soft gel") ||
      n.includes("softgel") ||
      n.includes("manicure") ||
      n.includes("manos en gel") ||
      n.includes("manos gel");
    if (isPedi && !isManos) {
      return RETOUCH_INTERVAL.pedicureGel;
    }
    if (isManos) {
      return RETOUCH_INTERVAL.manosGel;
    }
    return intervalDaysForCategory("cat-unas");
  }

  return intervalDaysForCategory(cat);
}

/** Busca Lash Botox activo en catálogo (hidratación post-lifting). */
export function findLashBotoxService(
  catalog: RetouchServiceRow[],
): RetouchServiceRow | null {
  const hit = catalog.find(
    (s) => s.is_active !== false && isLashBotoxServiceName(s.name),
  );
  return hit ?? null;
}

/**
 * Lifting de pestañas “base” (no packs cejas, no botox).
 * Prefiere el nombre más corto / sin “+”.
 */
export function findBaseLiftingService(
  catalog: RetouchServiceRow[],
): RetouchServiceRow | null {
  const candidates = catalog.filter(
    (s) =>
      s.is_active !== false &&
      isLiftingServiceName(s.name) &&
      (s.category_id === "cat-lifting" ||
        normalizeServiceName(s.name).includes("pestana")),
  );
  if (candidates.length === 0) {
    const anyLift = catalog.find(
      (s) => s.is_active !== false && isLiftingServiceName(s.name),
    );
    return anyLift ?? null;
  }
  candidates.sort((a, b) => {
    const aPlus = a.name.includes("+") ? 1 : 0;
    const bPlus = b.name.includes("+") ? 1 : 0;
    if (aPlus !== bPlus) return aPlus - bPlus;
    return a.name.length - b.name.length;
  });
  return candidates[0] ?? null;
}

/**
 * Elige el service_id a ofrecer en la plantilla.
 * Ciclo Vanessa: lifting → Lash Botox; Botox → lifting; extensiones → retoque homólogo.
 */
export function resolveRetouchServiceId(
  lastService: RetouchServiceRow,
  catalog: RetouchServiceRow[],
): string {
  // Post-lifting → Lash Botox (hidratación del ciclo)
  if (
    isLiftingServiceName(lastService.name) &&
    !isLashBotoxServiceName(lastService.name)
  ) {
    const botox = findLashBotoxService(catalog);
    if (botox) return botox.id;
    return lastService.id;
  }

  // Post Lash Botox → Lifting de pestañas
  if (isLashBotoxServiceName(lastService.name)) {
    const lifting = findBaseLiftingService(catalog);
    if (lifting) return lifting.id;
    return lastService.id;
  }

  if (isRetouchServiceName(lastService.name)) {
    return lastService.id;
  }

  const catId = lastService.category_id;
  const peers = catalog.filter(
    (s) =>
      s.id !== lastService.id &&
      (catId == null || s.category_id === catId) &&
      s.is_active !== false &&
      isRetouchServiceName(s.name),
  );

  if (peers.length === 0) return lastService.id;

  const lastTok = styleTokens(lastService.name);
  if (lastTok.length > 0) {
    const scored = peers
      .map((p) => {
        const pt = styleTokens(p.name);
        const overlap = lastTok.filter((t) => pt.includes(t)).length;
        return { id: p.id, overlap };
      })
      .filter((x) => x.overlap > 0)
      .sort((a, b) => b.overlap - a.overlap);
    if (scored[0]) return scored[0]!.id;
  }

  if (peers.length === 1) return peers[0]!.id;
  return lastService.id;
}

/** "{{3}}" de la plantilla: frase humana de antigüedad. */
export function formatDaysSincePhrase(days: number): string {
  if (!Number.isFinite(days) || days < 0) return "un tiempo";
  if (days === 0) return "menos de un día";
  if (days === 1) return "1 día";
  if (days < 14) return `${days} días`;
  if (days < 60) {
    const weeks = Math.round(days / 7);
    return weeks <= 1 ? "1 semana" : `${weeks} semanas`;
  }
  const months = Math.round(days / 30);
  return months <= 1 ? "1 mes" : `${months} meses`;
}

export function intervalDaysForCategory(categoryId: string | null): number {
  if (!categoryId) return RETOUCH_INTERVAL.default;
  return RETOUCH_INTERVAL_BY_CATEGORY[categoryId] ?? RETOUCH_INTERVAL.default;
}

/** Máximo intervalo conocido (lookback cron = esto + colchón). */
export function maxRetouchIntervalDays(): number {
  const fromCat = Math.max(...Object.values(RETOUCH_INTERVAL_BY_CATEGORY), 30);
  const fromSvc = Math.max(...Object.values(RETOUCH_INTERVAL));
  return Math.max(fromCat, fromSvc);
}
