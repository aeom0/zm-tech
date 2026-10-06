// generate-recurring-expenses — diario ~6 AM Lima.
// Inserta gastos fijos cuyo day_of_month = hoy Lima; variables (Sunat) el día 1.
// Idempotente: UNIQUE (tenant_id, category, label, expense_month) + ON CONFLICT DO NOTHING.
// Auth: CRON_SECRET o service_role (verify_jwt = false).

import { createClient } from "@supabase/supabase-js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-qa-force-day",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LIMA_TZ = "America/Lima";
const DEFAULT_TENANT_ID = "zm-lash-nails";

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
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
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
  const isServiceRole =
    Boolean(serviceKey) && authHeader === `Bearer ${serviceKey}`;
  if (!isCron && !isServiceRole) {
    return json({ success: false, error: "No autorizado" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const lima = limaYmd();
  const forceDayRaw = req.headers.get("X-QA-Force-Day")?.trim() ?? "";
  const forceDay = Number.parseInt(forceDayRaw, 10);
  const day =
    Number.isInteger(forceDay) && forceDay >= 1 && forceDay <= 28
      ? forceDay
      : lima.day;

  const expenseMonth = `${lima.year}-${String(lima.month).padStart(2, "0")}-01`;

  const { data: templates, error: loadErr } = await supabase
    .from("recurring_expense_templates")
    .select(
      "id, tenant_id, category, label, day_of_month, default_amount, is_variable, is_active",
    )
    .eq("is_active", true);

  if (loadErr) {
    console.error("[generate-recurring-expenses] load:", loadErr.message);
    return json({ success: false, error: loadErr.message }, 500);
  }

  const due = (templates ?? []).filter((t) => {
    if (t.day_of_month === day) return true;
    // Sunat (variable, sin día fijo): queda "pendiente" desde el día 1 del mes.
    if (t.is_variable && t.day_of_month == null && day === 1) return true;
    return false;
  });

  const rows = due.map((t) => ({
    tenant_id: t.tenant_id || DEFAULT_TENANT_ID,
    category: t.category,
    label: t.label,
    amount: t.is_variable ? null : t.default_amount,
    expense_month: expenseMonth,
    expense_date:
      t.is_variable || t.day_of_month == null
        ? null
        : `${lima.year}-${String(lima.month).padStart(2, "0")}-${String(
            t.day_of_month,
          ).padStart(2, "0")}`,
    is_estimated: Boolean(t.is_variable),
    source: "recurring_template",
    source_ref: t.id,
  }));

  let inserted = 0;
  let skipped = 0;
  if (rows.length > 0) {
    const { data: upserted, error: insertErr } = await supabase
      .from("operational_expenses")
      .upsert(rows, {
        onConflict: "tenant_id,category,label,expense_month",
        ignoreDuplicates: true,
      })
      .select("id");
    if (insertErr) {
      console.error("[generate-recurring-expenses] upsert:", insertErr.message);
      return json({ success: false, error: insertErr.message }, 500);
    }
    inserted = upserted?.length ?? 0;
    skipped = rows.length - inserted;
  }

  console.log(
    `[generate-recurring-expenses] lima=${expenseMonth} day=${day} due=${due.length} inserted=${inserted} skipped=${skipped}`,
  );

  return json({
    success: true,
    expense_month: expenseMonth,
    day,
    due: due.length,
    inserted,
    skipped,
  });
});
