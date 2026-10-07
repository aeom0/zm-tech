// sync-meta-ads-spend — diario ~4 AM Lima.
// Graph insights de ayer (cuenta ZM act_2097809460557755) → meta_ads_spend_daily.
// Token: META_SYSTEM_USER_TOKEN (Edge secret; puede ser distinto de WHATSAPP_ACCESS_TOKEN).
// No usa Pipeboard.
// Auth: CRON_SECRET o service_role (verify_jwt = false).
// Fallos (token vencido, Graph down): log en meta_ads_sync_log, no tira el cron.

import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LIMA_TZ = "America/Lima";
const DEFAULT_TENANT_ID = "zm-lash-nails";
const DEFAULT_ACCOUNT_ID = "act_2097809460557755";
const GRAPH_VERSION = "v22.0";

// Batch F (Sprint 4, docs/plans/geema-migration/04-ROADMAP-SPRINTS.md § S4):
// hoy solo existe 1 tenant real con cuenta Meta Ads (zm-lash-nails), así que
// el swap DEFAULT_TENANT_ID/DEFAULT_ACCOUNT_ID → loop de tenants activos
// queda documentado pero sin activar hasta que un 2.º tenant tenga su propia
// cuenta Ads (S7). Se necesitaría (mismo patrón que _shared/tenant-waba.ts):
//
// interface ActiveMetaAdsTenant { tenantId: string; accountId: string }
// async function getActiveMetaAdsTenants(supabase): Promise<ActiveMetaAdsTenant[]> {
//   // leer de una tabla tenant_meta_ads_accounts (is_active=true) join tenants (status='active')
// }
// async function getTenantMetaAdsToken(supabase, tenantId: string): Promise<string | null> {
//   // supabase.rpc("get_tenant_meta_ads_token", { p_tenant_id: tenantId })
//   // Vault secret meta_ads_token_<tenant_id>, mismo patrón que get_tenant_waba_token
// }
//
// for (const tenant of await getActiveMetaAdsTenants(supabase)) {
//   const token = await getTenantMetaAdsToken(supabase, tenant.tenantId);
//   if (!token) continue;
//   await syncTenantMetaAdsSpend(supabase, tenant.tenantId, tenant.accountId, token, start, end);
// }

/** action_type de CTWA que Meta reporta en insights.actions */
const CTWA_ACTION_TYPES = new Set([
  "onsite_conversion.total_messaging_connection",
  "onsite_conversion.messaging_conversation_started_7d",
  "onsite_conversion.messaging_first_reply",
]);

interface SyncBody {
  date?: string;
  start?: string;
  end?: string;
}

interface InsightRow {
  spend?: string;
  impressions?: string;
  clicks?: string;
  actions?: { action_type?: string; value?: string }[];
  date_start?: string;
  date_stop?: string;
}

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function limaYmd(d = new Date()): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LIMA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
    day: Number(parts.find((p) => p.type === "day")?.value),
  };
}

function limaDateOffset(days: number): string {
  const { year, month, day } = limaYmd();
  const utc = new Date(Date.UTC(year, month - 1, day + days));
  return `${utc.getUTCFullYear()}-${
    String(utc.getUTCMonth() + 1).padStart(2, "0")
  }-${
    String(
      utc.getUTCDate(),
    ).padStart(2, "0")
  }`;
}

function parseYmd(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  return value.trim();
}

function ctwaCount(actions: InsightRow["actions"]): number | null {
  if (!Array.isArray(actions) || actions.length === 0) return null;
  for (const type of CTWA_ACTION_TYPES) {
    const hit = actions.find((a) => a.action_type === type);
    if (hit) {
      const n = Number.parseInt(String(hit.value ?? "0"), 10);
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

async function insertSyncLog(
  // Tabla nueva: el cliente de Deno aún no tiene tipos generados.
  // deno-lint-ignore no-explicit-any
  supabase: any,
  payload: {
    tenant_id: string;
    account_id: string;
    spend_date: string | null;
    status: "success" | "error";
    error_message: string | null;
    rows_upserted: number;
  },
): Promise<void> {
  const { error } = await supabase.from("meta_ads_sync_log").insert(payload);
  if (error) {
    console.error("[sync-meta-ads-spend] sync_log:", error.message);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ success: false, error: "Método no permitido" }, 405);
  }

  const cronSecret = Deno.env.get("CRON_SECRET")?.trim() ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const authHeader = req.headers.get("Authorization") ?? "";
  const isCron = Boolean(cronSecret) && authHeader === `Bearer ${cronSecret}`;
  const isServiceRole = Boolean(serviceKey) &&
    authHeader === `Bearer ${serviceKey}`;
  if (!isCron && !isServiceRole) {
    return json({ success: false, error: "No autorizado" }, 401);
  }

  const accountId = (
    Deno.env.get("META_ADS_ACCOUNT_ID")?.trim() || DEFAULT_ACCOUNT_ID
  ).replace(/^act_/, "act_");
  const metaToken = Deno.env.get("META_SYSTEM_USER_TOKEN")?.trim() ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let body: SyncBody = {};
  try {
    body = (await req.json()) as SyncBody;
  } catch {
    /* body vacío = ayer Lima */
  }

  const yesterday = limaDateOffset(-1);
  const start = parseYmd(body.date) ?? parseYmd(body.start) ?? yesterday;
  const end = parseYmd(body.date) ?? parseYmd(body.end) ?? start;

  if (!metaToken) {
    const msg = "Falta META_SYSTEM_USER_TOKEN";
    await insertSyncLog(supabase, {
      tenant_id: DEFAULT_TENANT_ID,
      account_id: accountId,
      spend_date: start,
      status: "error",
      error_message: msg,
      rows_upserted: 0,
    });
    console.error("[sync-meta-ads-spend]", msg);
    return json({ success: false, error: msg }, 200);
  }

  const url = new URL(
    `https://graph.facebook.com/${GRAPH_VERSION}/${accountId}/insights`,
  );
  url.searchParams.set("fields", "spend,impressions,clicks,actions");
  url.searchParams.set("time_increment", "1");
  url.searchParams.set("level", "account");
  url.searchParams.set(
    "time_range",
    JSON.stringify({ since: start, until: end }),
  );
  url.searchParams.set("access_token", metaToken);

  try {
    const res = await fetch(url);
    const payload = (await res.json()) as {
      data?: InsightRow[];
      error?: { message?: string; code?: number; type?: string };
    };
    if (!res.ok || payload.error) {
      const errMsg = `Meta Graph API (${payload.error?.code ?? res.status}): ${
        payload.error?.message ?? res.statusText
      }`;
      console.error("[sync-meta-ads-spend]", errMsg);
      await insertSyncLog(supabase, {
        tenant_id: DEFAULT_TENANT_ID,
        account_id: accountId,
        spend_date: start,
        status: "error",
        error_message: errMsg.slice(0, 2000),
        rows_upserted: 0,
      });
      return json({ success: false, error: errMsg }, 200);
    }

    const points = Array.isArray(payload.data) ? payload.data : [];
    const rows = points.map((p) => {
      const spendNum = Number.parseFloat(String(p.spend ?? "0"));
      const impressions = Number.parseInt(String(p.impressions ?? ""), 10);
      const clicks = Number.parseInt(String(p.clicks ?? ""), 10);
      return {
        tenant_id: DEFAULT_TENANT_ID,
        account_id: accountId,
        spend_date: p.date_start || start,
        spend_pen: Number.isFinite(spendNum) ? spendNum.toFixed(2) : "0.00",
        impressions: Number.isFinite(impressions) ? impressions : null,
        clicks: Number.isFinite(clicks) ? clicks : null,
        ctwa_conversations: ctwaCount(p.actions),
        synced_at: new Date().toISOString(),
      };
    });

    let rowsUpserted = 0;
    if (rows.length > 0) {
      const { error: upsertErr } = await supabase
        .from("meta_ads_spend_daily")
        .upsert(rows, {
          onConflict: "account_id,spend_date",
          ignoreDuplicates: false,
        });
      if (upsertErr) {
        throw new Error(`Upsert meta_ads_spend_daily: ${upsertErr.message}`);
      }
      rowsUpserted = rows.length;
    }

    await insertSyncLog(supabase, {
      tenant_id: DEFAULT_TENANT_ID,
      account_id: accountId,
      spend_date: start,
      status: "success",
      error_message: null,
      rows_upserted: rowsUpserted,
    });

    console.log(
      `[sync-meta-ads-spend] OK account=${accountId} ${start}..${end} rows=${rowsUpserted}`,
    );
    return json({
      success: true,
      account_id: accountId,
      range: { start, end },
      rows_upserted: rowsUpserted,
    });
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error("[sync-meta-ads-spend] error:", errorMessage);
    await insertSyncLog(supabase, {
      tenant_id: DEFAULT_TENANT_ID,
      account_id: accountId,
      spend_date: start,
      status: "error",
      error_message: errorMessage.slice(0, 2000),
      rows_upserted: 0,
    });
    return json({ success: false, error: errorMessage }, 200);
  }
});
