// sync-anthropic-billing — Sincroniza costo USD oficial del mes (Anthropic Cost Report API).
// Secret: ANTHROPIC_ADMIN_API_KEY (sk-ant-admin...). verify_jwt = true.
import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const USER_AGENT = "ZM-Lash-Nails-Beauty/sync-anthropic-billing/1.0";
const CACHE_MS = 12 * 60 * 1000;
const ANTHROPIC_VERSION = "2023-06-01";
const COST_REPORT_URL =
  "https://api.anthropic.com/v1/organizations/cost_report";

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const LIMA_TZ = "America/Lima";

/** Alineado con apps/mobile/lib/lima-time.ts (sin parsear toLocaleString). */
function getLimaYmdParts(date = new Date()): {
  year: number;
  monthIndex: number;
  day: number;
} {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: LIMA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    const u = new Date();
    return {
      year: u.getUTCFullYear(),
      monthIndex: u.getUTCMonth(),
      day: u.getUTCDate(),
    };
  }
  return { year: y, monthIndex: m - 1, day: d };
}

/**
 * Rango para Anthropic cost_report: buckets son días UTC (snap en 00:00Z).
 * Si usamos medianoche Lima como starting_at (p. ej. 2026-04-01T05:00:00Z),
 * el bucket del 1 abr UTC (00:00Z) queda fuera y se pierde ~un día de gasto
 * → consumo bajo y “saldo” frente al cupo inflado.
 * Usamos mes calendario UTC con el mismo año/mes que el calendario Lima (Finanzas).
 */
function billingMonthUtcContext(now = new Date()): {
  monthKey: string;
  periodStart: Date;
  periodEnd: Date;
} {
  const { year, monthIndex } = getLimaYmdParts(now);
  const periodStart = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const periodEnd = new Date(Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0));
  const monthKey = `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
  return { monthKey, periodStart, periodEnd };
}

function sumCostReportMinorUnits(payload: {
  data?: { results?: { amount?: string | number }[] }[];
}): number {
  let minor = 0;
  for (const bucket of payload.data ?? []) {
    for (const result of bucket.results ?? []) {
      const raw = result.amount;
      const n = typeof raw === "string"
        ? Number.parseFloat(raw)
        : typeof raw === "number"
        ? raw
        : Number.NaN;
      if (Number.isFinite(n)) minor += n;
    }
  }
  return minor;
}

async function fetchAllCostReportPages(
  adminKey: string,
  startingAtIso: string,
  endingAtIso: string,
): Promise<{ totalUsd: number; pages: number }> {
  let totalMinor = 0;
  let pages = 0;
  const maxPages = 25;
  let nextPage: string | null = null;

  do {
    const params = new URLSearchParams({
      starting_at: startingAtIso,
      ending_at: endingAtIso,
      bucket_width: "1d",
      limit: "31",
    });
    if (nextPage) params.set("page", nextPage);

    const res = await fetch(`${COST_REPORT_URL}?${params}`, {
      headers: {
        "anthropic-version": ANTHROPIC_VERSION,
        "x-api-key": adminKey,
        "User-Agent": USER_AGENT,
      },
    });

    const text = await res.text();
    let body: Record<string, unknown>;
    try {
      body = JSON.parse(text) as Record<string, unknown>;
    } catch {
      return Promise.reject(
        new Error(
          `Anthropic cost_report no-JSON (${res.status}): ${
            text.slice(0, 200)
          }`,
        ),
      );
    }

    if (!res.ok) {
      const msg = typeof body.error === "object" &&
          body.error !== null &&
          "message" in (body.error as object)
        ? String((body.error as { message?: string }).message)
        : text.slice(0, 300);
      return Promise.reject(new Error(`Anthropic ${res.status}: ${msg}`));
    }

    totalMinor += sumCostReportMinorUnits(
      body as Parameters<typeof sumCostReportMinorUnits>[0],
    );
    pages++;

    const hasMore = Boolean(body["has_more"]);
    const np = body["next_page"];
    nextPage = hasMore && typeof np === "string" && np.length > 0 ? np : null;
  } while (nextPage && pages < maxPages);

  return { totalUsd: totalMinor / 100, pages };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (req.method !== "POST") {
    return json({ error: "Método no permitido" }, 405);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader) {
    return json({ error: "No autorizado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userErr,
  } = await supabaseUser.auth.getUser();
  if (userErr || !user) {
    return json({ error: "No autorizado" }, 401);
  }

  const { data: profile, error: profileError } = await supabaseUser
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return json({ error: "No se pudo validar el rol" }, 500);
  }
  if (!profile || (profile.role !== "dev" && profile.role !== "owner")) {
    return json({ error: "Solo administración" }, 403);
  }

  let force = false;
  let customRange: { startingAtIso: string; endingAtIso: string } | null = null;
  try {
    const b = await req.json();
    if (b && typeof b === "object") {
      if ((b as { force?: boolean }).force === true) {
        force = true;
      }
      const rangeBody = b as { starting_at?: string; ending_at?: string };
      if (rangeBody.starting_at && rangeBody.ending_at) {
        const s = new Date(rangeBody.starting_at);
        const e = new Date(rangeBody.ending_at);
        if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
          customRange = {
            startingAtIso: s.toISOString(),
            endingAtIso: e.toISOString(),
          };
        }
      }
    }
  } catch {
    // body vacío OK
  }

  // Rango custom (diagnóstico): consulta puntual fuera del mes calendario,
  // sin caché ni escritura en anthropic_billing_snapshots (esa tabla asume
  // 1 fila por billing_month_key, no sirve para rangos arbitrarios).
  if (customRange) {
    const adminKeyRange = Deno.env.get("ANTHROPIC_ADMIN_API_KEY")?.trim() ?? "";
    if (!adminKeyRange.startsWith("sk-ant-admin")) {
      return json(
        {
          ok: false,
          error:
            "Falta ANTHROPIC_ADMIN_API_KEY válida en secrets del proyecto.",
        },
        503,
      );
    }
    try {
      const { totalUsd, pages } = await fetchAllCostReportPages(
        adminKeyRange,
        customRange.startingAtIso,
        customRange.endingAtIso,
      );
      return json(
        {
          ok: true,
          cached: false,
          custom_range: true,
          period_start: customRange.startingAtIso,
          period_end: customRange.endingAtIso,
          total_cost_usd: totalUsd,
          source: "anthropic_cost_report",
          pages_fetched: pages,
        },
        200,
      );
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return json({ ok: false, error: message }, 502);
    }
  }

  const { monthKey, periodStart, periodEnd } = billingMonthUtcContext();
  const startingAtIso = periodStart.toISOString();
  const endingAtIso = periodEnd.toISOString();

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  if (!force) {
    const { data: recent, error: recentErr } = await supabaseAdmin
      .from("anthropic_billing_snapshots")
      .select(
        "id, created_at, total_cost_usd, period_start, period_end, billing_month_key",
      )
      .eq("billing_month_key", monthKey)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!recentErr && recent?.created_at) {
      const age = Date.now() - new Date(recent.created_at).getTime();
      if (age < CACHE_MS) {
        return json(
          {
            ok: true,
            cached: true,
            billing_month_key: recent.billing_month_key,
            total_cost_usd: Number(recent.total_cost_usd),
            period_start: recent.period_start,
            period_end: recent.period_end,
            fetched_at: recent.created_at,
            source: "anthropic_cost_report",
          },
          200,
        );
      }
    }
  }

  const adminKey = Deno.env.get("ANTHROPIC_ADMIN_API_KEY")?.trim() ?? "";
  if (!adminKey.startsWith("sk-ant-admin")) {
    return json(
      {
        ok: false,
        error:
          "Falta ANTHROPIC_ADMIN_API_KEY válida (sk-ant-admin...) en secrets del proyecto. Consola Anthropic → Admin API keys.",
        billing_month_key: monthKey,
      },
      503,
    );
  }

  try {
    const { totalUsd, pages } = await fetchAllCostReportPages(
      adminKey,
      startingAtIso,
      endingAtIso,
    );

    const { data: inserted, error: insErr } = await supabaseAdmin
      .from("anthropic_billing_snapshots")
      .insert({
        billing_month_key: monthKey,
        period_start: startingAtIso,
        period_end: endingAtIso,
        total_cost_usd: totalUsd,
        source: "anthropic_cost_report",
      })
      .select(
        "id, created_at, total_cost_usd, period_start, period_end, billing_month_key",
      )
      .single();

    if (insErr || !inserted) {
      console.error("[sync-anthropic-billing] insert:", insErr);
      return json(
        { ok: false, error: "No se pudo guardar el snapshot en BD" },
        500,
      );
    }

    return json(
      {
        ok: true,
        cached: false,
        billing_month_key: inserted.billing_month_key,
        total_cost_usd: Number(inserted.total_cost_usd),
        period_start: inserted.period_start,
        period_end: inserted.period_end,
        fetched_at: inserted.created_at,
        source: "anthropic_cost_report",
        pages_fetched: pages,
      },
      200,
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[sync-anthropic-billing]", message);
    return json(
      { ok: false, error: message, billing_month_key: monthKey },
      502,
    );
  }
});
