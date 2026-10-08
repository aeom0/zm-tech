/**
 * Cliente Meta Graph API — sub-endpoint pricing_analytics (sin field expansion anidado).
 */

const GRAPH_API_VERSION = "v23.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/** Meta limita lookback a 1 año desde 1 dic 2025 10:00 AM PT (18:00 UTC). */
export const META_PRICING_ANALYTICS_MIN_START_UNIX = 1764612000;

export class MetaGraphApiError extends Error {
  readonly code: number;
  readonly type: string;
  readonly fbtraceId?: string;
  readonly errorSubcode?: number;

  constructor(payload: {
    message: string;
    code?: number;
    type?: string;
    fbtrace_id?: string;
    error_subcode?: number;
  }) {
    super(payload.message);
    this.name = "MetaGraphApiError";
    this.code = payload.code ?? 0;
    this.type = payload.type ?? "OAuthException";
    this.fbtraceId = payload.fbtrace_id;
    this.errorSubcode = payload.error_subcode;
  }
}

export class MetaPricingLookbackError extends Error {
  readonly requestedStartUnix: number;
  readonly minStartUnix: number;

  constructor(requestedStartUnix: number) {
    super(
      `El rango solicitado (${
        unixToDateKey(requestedStartUnix)
      }) es anterior al mínimo permitido por Meta (${
        unixToDateKey(META_PRICING_ANALYTICS_MIN_START_UNIX)
      }). pricing_analytics solo está disponible desde el 1 dic 2025.`,
    );
    this.name = "MetaPricingLookbackError";
    this.requestedStartUnix = requestedStartUnix;
    this.minStartUnix = META_PRICING_ANALYTICS_MIN_START_UNIX;
  }
}

export interface MetaPricingDataPoint {
  start: number;
  end: number;
  pricing_category?: string;
  pricing_type?: string;
  /** Meta devuelve `country` (ISO-2), no `country_code`. */
  country?: string;
  cost?: number;
  volume?: number;
}

export interface MetaPricingAnalyticsRow {
  data_points?: MetaPricingDataPoint[];
}

export interface MetaPricingAnalyticsResponse {
  data?: MetaPricingAnalyticsRow[];
  paging?: {
    cursors?: { before?: string; after?: string };
    next?: string;
    previous?: string;
  };
  error?: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
}

export interface FetchPricingAnalyticsOptions {
  wabaId: string;
  startUnix: number;
  endUnix: number;
  token: string;
}

function unixToDateKey(unix: number): string {
  return new Date(unix * 1000).toISOString().slice(0, 10);
}

function buildPricingAnalyticsUrl(
  wabaId: string,
  startUnix: number,
  endUnix: number,
): string {
  const params = new URLSearchParams();
  params.set("start", String(startUnix));
  params.set("end", String(endUnix));
  params.set("granularity", "DAILY");
  params.append("metric_types[]", "COST");
  params.append("metric_types[]", "VOLUME");
  params.append("dimensions[]", "PRICING_CATEGORY");
  params.append("dimensions[]", "PRICING_TYPE");
  params.append("dimensions[]", "COUNTRY");
  return `${GRAPH_BASE}/${
    encodeURIComponent(wabaId)
  }/pricing_analytics?${params}`;
}

async function parseGraphJson(
  res: Response,
): Promise<MetaPricingAnalyticsResponse> {
  const text = await res.text();
  let body: MetaPricingAnalyticsResponse;
  try {
    body = JSON.parse(text) as MetaPricingAnalyticsResponse;
  } catch {
    throw new MetaGraphApiError({
      message: `Respuesta Graph API no JSON (HTTP ${res.status}): ${
        text.slice(0, 200)
      }`,
      code: res.status,
      type: "ParseError",
    });
  }

  if (body.error) {
    throw new MetaGraphApiError(body.error);
  }

  if (!res.ok) {
    throw new MetaGraphApiError({
      message: `Graph API HTTP ${res.status}`,
      code: res.status,
      type: "HttpError",
    });
  }

  return body;
}

/**
 * Obtiene pricing_analytics paginado (sub-endpoint directo).
 * Valida lookback mínimo antes del fetch.
 */
export async function fetchPricingAnalytics(
  wabaId: string,
  startUnix: number,
  endUnix: number,
  token: string,
): Promise<MetaPricingDataPoint[]> {
  if (!wabaId.trim()) {
    throw new Error("wabaId requerido");
  }
  if (!token.trim()) {
    throw new Error("token Meta requerido");
  }
  if (endUnix < startUnix) {
    throw new Error(
      `Rango inválido: end (${endUnix}) es anterior a start (${startUnix})`,
    );
  }
  if (startUnix < META_PRICING_ANALYTICS_MIN_START_UNIX) {
    throw new MetaPricingLookbackError(startUnix);
  }

  const allPoints: MetaPricingDataPoint[] = [];
  let nextUrl: string | null = buildPricingAnalyticsUrl(
    wabaId,
    startUnix,
    endUnix,
  );
  let page = 0;
  const maxPages = 50;

  while (nextUrl && page < maxPages) {
    page += 1;
    console.log(
      `[meta-pricing-client] GET pricing_analytics page=${page} waba=${wabaId} start=${startUnix} end=${endUnix}`,
    );

    const res = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const body = await parseGraphJson(res);
    for (const row of body.data ?? []) {
      if (row.data_points?.length) {
        allPoints.push(...row.data_points);
      }
    }

    nextUrl = body.paging?.next ?? null;
  }

  if (page >= maxPages && nextUrl) {
    console.warn(
      `[meta-pricing-client] paginación truncada en ${maxPages} páginas (${allPoints.length} data_points)`,
    );
  }

  console.log(
    `[meta-pricing-client] pricing_analytics OK: ${allPoints.length} data_points en ${page} página(s)`,
  );

  return allPoints;
}

export { unixToDateKey };

// ─── template_analytics (Fase 5) ─────────────────────────────────────────────

export interface MetaTemplateCostItem {
  type?: string;
  value?: number;
}

export interface MetaTemplateAnalyticsDataPoint {
  template_id?: string;
  start: number;
  end: number;
  sent?: number;
  delivered?: number;
  read?: number;
  clicked?: number;
  cost?: MetaTemplateCostItem[];
}

export interface MetaMessageTemplateRow {
  id: string;
  name: string;
  status?: string;
}

export interface FetchTemplateAnalyticsOptions {
  wabaId: string;
  startUnix: number;
  endUnix: number;
  templateIds: string[];
  token: string;
}

/** Lookback máximo Meta template_analytics ≈ 90 días. */
export const META_TEMPLATE_ANALYTICS_MAX_LOOKBACK_DAYS = 90;

function buildTemplateAnalyticsUrl(
  wabaId: string,
  startUnix: number,
  endUnix: number,
  templateIds: string[],
): string {
  const params = new URLSearchParams();
  params.set("start", String(startUnix));
  params.set("end", String(endUnix));
  params.set("granularity", "daily");
  params.set("metric_types", "sent,delivered,read,clicked,cost");
  params.set("template_ids", `[${templateIds.join(",")}]`);
  return `${GRAPH_BASE}/${
    encodeURIComponent(wabaId)
  }/template_analytics?${params}`;
}

/**
 * Lista plantillas APPROVED del WABA (paginado).
 */
export async function listApprovedMessageTemplates(
  wabaId: string,
  token: string,
): Promise<MetaMessageTemplateRow[]> {
  const out: MetaMessageTemplateRow[] = [];
  let nextUrl: string | null = `${GRAPH_BASE}/${
    encodeURIComponent(wabaId)
  }/message_templates?fields=id,name,status&limit=100`;
  let page = 0;
  const maxPages = 20;

  while (nextUrl && page < maxPages) {
    page += 1;
    const res = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    const text = await res.text();
    let body: {
      data?: MetaMessageTemplateRow[];
      paging?: { next?: string };
      error?: {
        message: string;
        code?: number;
        type?: string;
        fbtrace_id?: string;
      };
    };
    try {
      body = JSON.parse(text);
    } catch {
      throw new MetaGraphApiError({
        message: `message_templates no JSON (HTTP ${res.status})`,
        code: res.status,
        type: "ParseError",
      });
    }
    if (body.error) throw new MetaGraphApiError(body.error);
    if (!res.ok) {
      throw new MetaGraphApiError({
        message: `message_templates HTTP ${res.status}`,
        code: res.status,
        type: "HttpError",
      });
    }
    for (const row of body.data ?? []) {
      if (row.status === "APPROVED" && row.id && row.name) {
        out.push({ id: row.id, name: row.name, status: row.status });
      }
    }
    nextUrl = body.paging?.next ?? null;
  }

  console.log(
    `[meta-pricing-client] message_templates APPROVED=${out.length} páginas=${page}`,
  );
  return out;
}

/**
 * Extrae amount_spent de cost[] (puede venir sin value cuando es 0).
 */
export function extractTemplateAmountSpent(
  cost: MetaTemplateCostItem[] | undefined,
): number | null {
  if (!cost?.length) return null;
  const spent = cost.find((c) => c.type === "amount_spent");
  if (!spent) return null;
  // Meta omite `value` cuando no hay gasto (no es lo mismo que 0 explícito).
  if (spent.value == null) return null;
  const n = Number(spent.value);
  return Number.isFinite(n) ? n : null;
}

/**
 * Obtiene template_analytics para hasta 10 template_ids (límite Meta).
 * Requiere WABA con is_enabled_for_insights=true.
 */
export async function fetchTemplateAnalytics(
  opts: FetchTemplateAnalyticsOptions,
): Promise<MetaTemplateAnalyticsDataPoint[]> {
  const { wabaId, startUnix, endUnix, templateIds, token } = opts;
  if (!wabaId.trim()) throw new Error("wabaId requerido");
  if (!token.trim()) throw new Error("token Meta requerido");
  if (endUnix < startUnix) {
    throw new Error(
      `Rango inválido: end (${endUnix}) es anterior a start (${startUnix})`,
    );
  }
  if (!templateIds.length) return [];
  if (templateIds.length > 10) {
    throw new Error(
      `template_analytics acepta máx. 10 IDs por request (recibidos ${templateIds.length})`,
    );
  }

  const allPoints: MetaTemplateAnalyticsDataPoint[] = [];
  let nextUrl: string | null = buildTemplateAnalyticsUrl(
    wabaId,
    startUnix,
    endUnix,
    templateIds,
  );
  let page = 0;
  const maxPages = 50;

  while (nextUrl && page < maxPages) {
    page += 1;
    console.log(
      `[meta-pricing-client] GET template_analytics page=${page} ids=${templateIds.length} start=${startUnix} end=${endUnix}`,
    );

    const res = await fetch(nextUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const text = await res.text();
    let body: {
      data?: Array<{
        data_points?: MetaTemplateAnalyticsDataPoint[];
        granularity?: string;
      }>;
      paging?: { next?: string };
      error?: {
        message: string;
        code?: number;
        type?: string;
        fbtrace_id?: string;
        error_subcode?: number;
      };
    };
    try {
      body = JSON.parse(text);
    } catch {
      throw new MetaGraphApiError({
        message: `template_analytics no JSON (HTTP ${res.status}): ${
          text.slice(0, 200)
        }`,
        code: res.status,
        type: "ParseError",
      });
    }
    if (body.error) throw new MetaGraphApiError(body.error);
    if (!res.ok) {
      throw new MetaGraphApiError({
        message: `template_analytics HTTP ${res.status}`,
        code: res.status,
        type: "HttpError",
      });
    }

    for (const row of body.data ?? []) {
      if (row.data_points?.length) {
        allPoints.push(...row.data_points);
      }
    }
    nextUrl = body.paging?.next ?? null;
  }

  console.log(
    `[meta-pricing-client] template_analytics OK: ${allPoints.length} data_points`,
  );
  return allPoints;
}

/**
 * Fetch en lotes de ≤10 IDs (límite Meta).
 */
export async function fetchAllTemplateAnalytics(
  wabaId: string,
  startUnix: number,
  endUnix: number,
  templates: MetaMessageTemplateRow[],
  token: string,
): Promise<MetaTemplateAnalyticsDataPoint[]> {
  const all: MetaTemplateAnalyticsDataPoint[] = [];
  for (let i = 0; i < templates.length; i += 10) {
    const chunk = templates.slice(i, i + 10);
    const points = await fetchTemplateAnalytics({
      wabaId,
      startUnix,
      endUnix,
      templateIds: chunk.map((t) => t.id),
      token,
    });
    all.push(...points);
  }
  return all;
}
