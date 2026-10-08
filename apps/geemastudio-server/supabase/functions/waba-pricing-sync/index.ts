// waba-pricing-sync — Sync Meta pricing_analytics + template_analytics → BD.
// Auth: verify_jwt = true (gateway) + header X-Sync-Secret (WABA_SYNC_SECRET).
// Cron: Authorization Bearer service_role + X-Sync-Secret.
// Deploy: MCP o CLI con verify_jwt (sin --no-verify-jwt).

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  extractTemplateAmountSpent,
  fetchAllTemplateAnalytics,
  fetchPricingAnalytics,
  listApprovedMessageTemplates,
  MetaGraphApiError,
  type MetaMessageTemplateRow,
  type MetaPricingDataPoint,
  MetaPricingLookbackError,
  type MetaTemplateAnalyticsDataPoint,
  unixToDateKey,
} from "../_shared/meta-pricing-client.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_LOOKBACK_DAYS = 8;
const UPSERT_BATCH_SIZE = 200;

interface SyncRequestBody {
  start?: string | number;
  end?: string | number;
}

interface NormalizedDailyRow {
  waba_id: string;
  date: string;
  pricing_category: string;
  pricing_type: string;
  country_code: string | null;
  cost: string;
  volume: number;
  synced_at: string;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function parseDateOrUnix(value: string | number, endOfDay: boolean): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.floor(value);
  }
  const raw = String(value).trim();
  if (/^\d+$/.test(raw)) {
    return Number.parseInt(raw, 10);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split("-").map(Number);
    if (endOfDay) {
      return Math.floor(Date.UTC(y, m - 1, d, 23, 59, 59) / 1000);
    }
    return Math.floor(Date.UTC(y, m - 1, d, 0, 0, 0) / 1000);
  }
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    throw new Error(`Fecha inválida: ${value}`);
  }
  return Math.floor(parsed / 1000);
}

function defaultRangeUnix(): { startUnix: number; endUnix: number } {
  const endUnix = Math.floor(Date.now() / 1000);
  const startUnix = endUnix - DEFAULT_LOOKBACK_DAYS * 24 * 60 * 60;
  return { startUnix, endUnix };
}

function normalizeDataPoints(
  wabaId: string,
  points: MetaPricingDataPoint[],
  syncedAt: string,
): NormalizedDailyRow[] {
  const rows: NormalizedDailyRow[] = [];

  for (const point of points) {
    if (!point.pricing_category || !point.pricing_type) {
      console.warn(
        "[waba-pricing-sync] data_point sin category/type, omitido:",
        JSON.stringify(point).slice(0, 160),
      );
      continue;
    }

    const dateKey = unixToDateKey(point.start);
    const costNum = Number(point.cost ?? 0);
    const volumeNum = Number.parseInt(String(point.volume ?? 0), 10);

    rows.push({
      waba_id: wabaId,
      date: dateKey,
      pricing_category: point.pricing_category,
      pricing_type: point.pricing_type,
      country_code: point.country?.trim().toUpperCase() || null,
      cost: Number.isFinite(costNum) ? costNum.toFixed(4) : "0.0000",
      volume: Number.isFinite(volumeNum) ? volumeNum : 0,
      synced_at: syncedAt,
    });
  }

  return rows;
}

async function upsertDailyRows(
  supabase: SupabaseClient,
  rows: NormalizedDailyRow[],
): Promise<number> {
  if (rows.length === 0) return 0;

  let total = 0;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await supabase.from("waba_pricing_daily").upsert(batch, {
      onConflict: "waba_id,date,pricing_category,pricing_type,country_code",
      ignoreDuplicates: false,
    });
    if (error) {
      console.error("[waba-pricing-sync] upsert batch error:", error);
      throw new Error(`Upsert waba_pricing_daily: ${error.message}`);
    }
    total += batch.length;
    console.log(
      `[waba-pricing-sync] upsert batch ${
        Math.floor(i / UPSERT_BATCH_SIZE) + 1
      }: ${batch.length} filas`,
    );
  }
  return total;
}

interface NormalizedTemplateRow {
  tenant_id: string;
  waba_id: string;
  date: string;
  template_id: string;
  template_name: string;
  sent: number;
  delivered: number;
  read_count: number;
  clicked: number;
  cost: string | null;
  synced_at: string;
}

function normalizeTemplatePoints(
  wabaId: string,
  points: MetaTemplateAnalyticsDataPoint[],
  nameById: Map<string, string>,
  syncedAt: string,
): NormalizedTemplateRow[] {
  const rows: NormalizedTemplateRow[] = [];
  for (const point of points) {
    const templateId = String(point.template_id ?? "").trim();
    if (!templateId) continue;
    const dateKey = unixToDateKey(point.start);
    const amount = extractTemplateAmountSpent(point.cost);
    rows.push({
      tenant_id: "zm-lash-nails",
      waba_id: wabaId,
      date: dateKey,
      template_id: templateId,
      template_name: nameById.get(templateId) ?? "",
      sent: Number(point.sent ?? 0) || 0,
      delivered: Number(point.delivered ?? 0) || 0,
      read_count: Number(point.read ?? 0) || 0,
      clicked: Number(point.clicked ?? 0) || 0,
      cost: amount == null ? null : amount.toFixed(4),
      synced_at: syncedAt,
    });
  }
  return rows;
}

async function upsertTemplateRows(
  supabase: SupabaseClient,
  rows: NormalizedTemplateRow[],
): Promise<number> {
  if (rows.length === 0) return 0;
  let total = 0;
  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE);
    const { error } = await supabase
      .from("waba_template_analytics_daily")
      .upsert(batch, {
        onConflict: "waba_id,date,template_id",
        ignoreDuplicates: false,
      });
    if (error) {
      console.error("[waba-pricing-sync] template upsert error:", error);
      throw new Error(`Upsert waba_template_analytics_daily: ${error.message}`);
    }
    total += batch.length;
  }
  return total;
}

async function syncTemplateAnalytics(
  supabase: SupabaseClient,
  wabaId: string,
  metaToken: string,
  startUnix: number,
  endUnix: number,
  syncedAt: string,
): Promise<{ rows: number; templates: number; error?: string }> {
  try {
    const templates: MetaMessageTemplateRow[] =
      await listApprovedMessageTemplates(wabaId, metaToken);
    if (templates.length === 0) {
      return { rows: 0, templates: 0 };
    }
    const nameById = new Map(templates.map((t) => [t.id, t.name]));
    const points = await fetchAllTemplateAnalytics(
      wabaId,
      startUnix,
      endUnix,
      templates,
      metaToken,
    );
    const rows = normalizeTemplatePoints(wabaId, points, nameById, syncedAt);
    const upserted = await upsertTemplateRows(supabase, rows);
    return { rows: upserted, templates: templates.length };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[waba-pricing-sync] template_analytics:", message);
    return { rows: 0, templates: 0, error: message };
  }
}

async function insertSyncLog(
  supabase: SupabaseClient,
  payload: {
    waba_id: string;
    range_start: string;
    range_end: string;
    status: "success" | "error" | "partial";
    error_message: string | null;
    rows_upserted: number;
  },
): Promise<void> {
  const { error } = await supabase
    .from("waba_pricing_sync_log")
    .insert(payload);
  if (error) {
    console.error("[waba-pricing-sync] sync_log insert error:", error);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Método no permitido" }, 405);
  }

  const syncSecret = Deno.env.get("WABA_SYNC_SECRET")?.trim() ?? "";
  const headerSecret = req.headers.get("X-Sync-Secret")?.trim() ?? "";
  if (!syncSecret || headerSecret !== syncSecret) {
    console.warn("[waba-pricing-sync] X-Sync-Secret inválido o ausente");
    return json({ success: false, error: "No autorizado" }, 401);
  }

  const wabaId = Deno.env.get("WABA_ID")?.trim() ?? "";
  const metaToken = Deno.env.get("META_SYSTEM_USER_TOKEN")?.trim() ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!wabaId || !metaToken) {
    console.error(
      "[waba-pricing-sync] faltan secrets WABA_ID o META_SYSTEM_USER_TOKEN",
    );
    return json(
      {
        success: false,
        error: "Configuración incompleta (WABA_ID / META_SYSTEM_USER_TOKEN)",
      },
      503,
    );
  }

  let startUnix: number;
  let endUnix: number;

  try {
    let body: SyncRequestBody = {};
    try {
      body = (await req.json()) as SyncRequestBody;
    } catch {
      // body vacío → rango por defecto
    }

    if (body.start != null && body.end != null) {
      startUnix = parseDateOrUnix(body.start, false);
      endUnix = parseDateOrUnix(body.end, true);
    } else if (body.start != null || body.end != null) {
      return json(
        {
          success: false,
          error:
            "Para backfill manual envía start y end juntos (YYYY-MM-DD o unix)",
        },
        400,
      );
    } else {
      ({ startUnix, endUnix } = defaultRangeUnix());
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return json({ success: false, error: message }, 400);
  }

  const range = {
    start: unixToDateKey(startUnix),
    end: unixToDateKey(endUnix),
    start_unix: startUnix,
    end_unix: endUnix,
  };

  console.log(
    `[waba-pricing-sync] inicio sync waba=${wabaId} range=${range.start}..${range.end}`,
  );

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    const dataPoints = await fetchPricingAnalytics(
      wabaId,
      startUnix,
      endUnix,
      metaToken,
    );
    const syncedAt = new Date().toISOString();
    const rows = normalizeDataPoints(wabaId, dataPoints, syncedAt);
    const rowsUpserted = await upsertDailyRows(supabase, rows);

    const templateSync = await syncTemplateAnalytics(
      supabase,
      wabaId,
      metaToken,
      startUnix,
      endUnix,
      syncedAt,
    );

    const status = templateSync.error ? "partial" : "success";
    const logMsg = templateSync.error
      ? `pricing_ok=${rowsUpserted}; templates_error=${
        templateSync.error.slice(0, 1500)
      }`
      : `pricing=${rowsUpserted}; templates=${templateSync.rows} (${templateSync.templates} APPROVED)`;

    await insertSyncLog(supabase, {
      waba_id: wabaId,
      range_start: range.start,
      range_end: range.end,
      status,
      error_message: templateSync.error ? logMsg : null,
      rows_upserted: rowsUpserted + templateSync.rows,
    });

    console.log(
      `[waba-pricing-sync] OK pricing=${rowsUpserted} templates=${templateSync.rows} status=${status}`,
    );

    return json(
      {
        success: true,
        status,
        rows_upserted: rowsUpserted,
        template_rows_upserted: templateSync.rows,
        template_count: templateSync.templates,
        template_error: templateSync.error ?? null,
        data_points_fetched: dataPoints.length,
        range,
      },
      200,
    );
  } catch (e) {
    let errorMessage: string;
    if (e instanceof MetaPricingLookbackError) {
      errorMessage = e.message;
    } else if (e instanceof MetaGraphApiError) {
      errorMessage = `Meta Graph API (${e.code}): ${e.message}`;
      console.error(
        `[waba-pricing-sync] Meta error code=${e.code} type=${e.type} fbtrace=${
          e.fbtraceId ?? "n/a"
        }`,
      );
    } else {
      errorMessage = e instanceof Error ? e.message : String(e);
      console.error("[waba-pricing-sync] error:", errorMessage);
    }

    await insertSyncLog(supabase, {
      waba_id: wabaId,
      range_start: range.start,
      range_end: range.end,
      status: "error",
      error_message: errorMessage.slice(0, 2000),
      rows_upserted: 0,
    });

    const status = e instanceof MetaGraphApiError && e.code === 100 ? 400 : 502;
    return json(
      {
        success: false,
        rows_upserted: 0,
        range,
        error: errorMessage,
      },
      status,
    );
  }
});
