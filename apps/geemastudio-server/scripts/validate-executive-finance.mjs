#!/usr/bin/env node
/**
 * QA Panel Ejecutivo de Finanzas
 *  U) parseSunatNpsJson + expenseMonthFromPeriod (unit)
 *  A) cron generate-recurring-expenses force día 10 → 4 gastos fijos del mes Lima
 *  B) mismo cron de nuevo → no duplica (UNIQUE)
 *  D) PDF desde número no-admin → no crea fila Sunat
 *  E) JSON Haiku ok:false → no se consideraría registro (unit)
 *  F) sync-meta-ads-spend responde 200 aunque Graph falle; loguea en meta_ads_sync_log
 *  G+H) RPC get_monthly_financial_summary 24 meses, gastos 0 no rompen
 *
 * Caso C (PDF NPS real de Vanessa) es smoke manual — Haiku + media Meta.
 *
 * Tel extraño D: 51911100001. No escribe operational_expenses.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildDocumentPayload,
  newWamid,
  postWebhook,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import {
  expenseMonthFromPeriod,
  isAuthorizedSunatNpsPhone,
  parseSunatNpsJson,
} from "../supabase/functions/whatsapp-webhook/lib/sunat-nps.mjs";
import { isQaWaPhone } from "../supabase/functions/whatsapp-webhook/lib/qa-phone.mjs";

const STRANGER = "51911100001";
const TENANT = "zm-lash-nails";
const FIXED_LABELS = [
  "Alquiler local",
  "Arbitrios",
  "Contadora",
  "Servicios del CC.",
];

const { url, serviceKey, cronSecret, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function limaMonthStart() {
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return `${s.slice(0, 7)}-01`;
}

function shiftMonth(iso, delta) {
  const [y, m] = iso.slice(0, 10).split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

async function invokeFn(name, { headers = {}, body = {} } = {}) {
  const res = await fetch(`${url}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cronSecret || serviceKey}`,
      ...headers,
    },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

function runUnits() {
  const fails = [];
  const mes = expenseMonthFromPeriod("202607");
  if (mes !== "2026-08-01") {
    fails.push(`expenseMonthFromPeriod 202607 → ${mes}`);
  }
  const dic = expenseMonthFromPeriod("202612");
  if (dic !== "2027-01-01") {
    fails.push(`expenseMonthFromPeriod 202612 → ${dic}`);
  }
  if (expenseMonthFromPeriod("2026") !== null) {
    fails.push("período corto debía ser null");
  }
  const ok = parseSunatNpsJson(
    JSON.stringify({
      ok: true,
      periodo: "202607",
      total: 183.5,
      tributos: [{ codigo: "3111", monto: 50 }],
    }),
  );
  if (!ok.ok || ok.periodo !== "202607" || ok.total !== 183.5) {
    fails.push(`parse ok=${JSON.stringify(ok)}`);
  }
  const bad = parseSunatNpsJson('{"ok":false,"reason":"not_nps"}');
  if (bad.ok || bad.reason !== "not_nps") {
    fails.push(`parse fail → ${JSON.stringify(bad)}`);
  }
  const invented = parseSunatNpsJson(
    '{"ok":true,"periodo":"xx","total":0}',
  );
  if (invented.ok) fails.push("no debía aceptar total 0 / período inválido");
  if (!isAuthorizedSunatNpsPhone("51932535512")) {
    fails.push("932 staff debe poder enviar NPS");
  }
  if (isAuthorizedSunatNpsPhone("51911100001")) {
    fails.push("911100001 no debe autorizar NPS");
  }
  if (isAuthorizedSunatNpsPhone("51999000978")) {
    fails.push("rango 978 no debe autorizar NPS");
  }
  if (!isQaWaPhone("51911100001") || !isQaWaPhone("+51 911 100 001")) {
    fails.push("911100001 debe ser QA (sin push)");
  }
  return fails;
}

async function countFixed(month) {
  const { data, error } = await supabase
    .from("operational_expenses")
    .select("id, label, amount, source")
    .eq("tenant_id", TENANT)
    .eq("expense_month", month)
    .in("label", FIXED_LABELS)
    .eq("source", "recurring_template");
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function main() {
  console.log("QA Panel Ejecutivo de Finanzas\n");
  let passed = 0;
  let failed = 0;
  const fail = (name, detail) => {
    failed++;
    console.log(`  ❌ ${name} — ${detail}`);
  };
  const ok = (name, detail) => {
    passed++;
    console.log(`  ✅ ${name}${detail ? ` — ${detail}` : ""}`);
  };

  try {
  const unitFails = runUnits();
  if (unitFails.length === 0) {
    ok("U parse NPS + mes de pago");
  } else {
    fail("U parse NPS + mes de pago", unitFails.join("; "));
  }

  const month = limaMonthStart();

  const a = await invokeFn("generate-recurring-expenses", {
    headers: { "X-QA-Force-Day": "10" },
  });
  if (a.status !== 200 || a.json?.success !== true) {
    fail("A cron día 10", `HTTP ${a.status} ${JSON.stringify(a.json)}`);
  } else {
    const rows = await countFixed(month);
    const amounts = Object.fromEntries(
      rows.map((r) => [r.label, Number(r.amount)]),
    );
    const expected = {
      "Alquiler local": 1200,
      Arbitrios: 138.21,
      Contadora: 200,
      "Servicios del CC.": 200,
    };
    const missing = Object.entries(expected).filter(
      ([label, amt]) => Math.abs((amounts[label] ?? -1) - amt) > 0.001,
    );
    if (rows.length !== 4 || missing.length) {
      fail(
        "A cron día 10",
        `filas=${rows.length} missing=${JSON.stringify(missing)}`,
      );
    } else {
      ok("A cron día 10", `4 fijos en ${month}`);
    }
  }

  const beforeB = await countFixed(month);
  const b = await invokeFn("generate-recurring-expenses", {
    headers: { "X-QA-Force-Day": "10" },
  });
  const afterB = await countFixed(month);
  if (
    b.status === 200 &&
    b.json?.success === true &&
    afterB.length === beforeB.length &&
    afterB.length === 4
  ) {
    ok("B retry no duplica", `inserted=${b.json.inserted} skipped=${b.json.skipped}`);
  } else {
    fail(
      "B retry no duplica",
      `before=${beforeB.length} after=${afterB.length} ${JSON.stringify(b.json)}`,
    );
  }

  const wamid = newWamid("wamid.qa.sunat");
  await postWebhook(
    webhookUrl,
    buildDocumentPayload(STRANGER, {
      wamid,
      filename: "constancia-nps.pdf",
    }),
  );
  const { data: sunatStranger } = await supabase
    .from("operational_expenses")
    .select("id")
    .eq("source_ref", wamid)
    .maybeSingle();
  if (sunatStranger?.id) {
    fail("D PDF no-admin", "creó fila");
    await supabase.from("operational_expenses").delete().eq("id", sunatStranger.id);
  } else {
    ok("D PDF no-admin ignorado");
  }

  const badParse = parseSunatNpsJson('{"ok":false,"reason":"blurry"}');
  if (!badParse.ok && badParse.reason === "blurry") {
    ok("E JSON no-NPS no se registra");
  } else {
    fail("E JSON no-NPS", JSON.stringify(badParse));
  }

  const sinceLog = new Date(Date.now() - 60_000).toISOString();
  const f = await invokeFn("sync-meta-ads-spend");
  const { data: logs } = await supabase
    .from("meta_ads_sync_log")
    .select("id, status, error_message")
    .gte("executed_at", sinceLog)
    .order("executed_at", { ascending: false })
    .limit(1);
  if (f.status === 200 && logs?.[0]) {
    ok(
      "F sync-meta-ads-spend",
      `HTTP 200 status=${logs[0].status}${
        logs[0].status === "error"
          ? ` (${String(logs[0].error_message ?? "").slice(0, 80)})`
          : ""
      }`,
    );
  } else {
    fail(
      "F sync-meta-ads-spend",
      `HTTP ${f.status} log=${JSON.stringify(logs)} body=${JSON.stringify(f.json)}`,
    );
  }

  const from24 = shiftMonth(month, -23);
  const { data: summary, error: rpcErr } = await supabase.rpc(
    "get_monthly_financial_summary",
    { p_tenant_id: TENANT, p_from: from24, p_to: month },
  );
  if (rpcErr) {
    fail("G+H RPC 24 meses", rpcErr.message);
  } else if (!Array.isArray(summary) || summary.length !== 24) {
    fail("G+H RPC 24 meses", `filas=${summary?.length}`);
  } else {
    const zerosOk = summary.every(
      (r) =>
        Number(r.expenses ?? 0) >= 0 &&
        Number(r.revenue ?? 0) >= 0 &&
        Number(r.ads_spend ?? 0) >= 0,
    );
    if (!zerosOk) {
      fail("G+H RPC 24 meses", "valores no numéricos / negativos inesperados");
    } else {
      ok("G+H RPC 24 meses", "24 filas, gastos 0 no rompen");
    }
  }
  } finally {
    await cleanupQaPhone(supabase, STRANGER, { deleteClient: true });
  }

  console.log(`\n${passed} pasados · ${failed} fallidos`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
