#!/usr/bin/env node
/**
 * QA S4 — RPCs tenant-aware de crons (waba_find_silent_phones,
 * waba_find_idle_browse_phones, waba_find_ads_bounce_phones,
 * waba_find_quality_review_candidates) no cruzan tenants.
 *
 * Siembra un tenant sintético (qa-second-tenant) con filas en wa_messages /
 * whatsapp_sessions que harían "match" en cada RPC, sin necesitar un número
 * WABA real de un 2.º tenant (no depende de S7). Para cada RPC:
 *   A) invoca con p_tenant_id='zm-lash-nails' (prod real) → el teléfono QA
 *      NO debe aparecer (cero fuga hacia el tenant real).
 *   B) invoca con p_tenant_id='qa-second-tenant' → el teléfono QA SÍ debe
 *      aparecer (la RPC encuentra los datos de su propio tenant).
 *
 * Teléfonos QA (rango 51999000978-999, cleanup incluido):
 *   silent=…981, ads-bounce=…982, idle-browse=…983, quality-review=…984.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";

const QA_TENANT = "qa-second-tenant";
const ZM_TENANT = "zm-lash-nails";

const SILENT_PHONE = "51999000981";
const ADS_BOUNCE_PHONE = "51999000982";
const IDLE_BROWSE_PHONE = "51999000983";
const QUALITY_REVIEW_PHONE = "51999000984";
const ALL_PHONES = [
  SILENT_PHONE,
  ADS_BOUNCE_PHONE,
  IDLE_BROWSE_PHONE,
  QUALITY_REVIEW_PHONE,
];

const { url, serviceKey } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function minutesAgo(n) {
  return new Date(Date.now() - n * 60_000).toISOString();
}

async function cleanup() {
  await supabase
    .from("wa_messages")
    .delete()
    .eq("tenant_id", QA_TENANT)
    .in("phone", ALL_PHONES);
  await supabase
    .from("whatsapp_sessions")
    .delete()
    .eq("tenant_id", QA_TENANT)
    .in("phone", ALL_PHONES);
}

async function seed() {
  const { error: msgErr } = await supabase.from("wa_messages").insert([
    // A) waba_find_silent_phones: inbound hace 8 min (ventana 5-12 min)
    {
      tenant_id: QA_TENANT,
      phone: SILENT_PHONE,
      direction: "in",
      msg_type: "text",
      content: "qa-cron-tenant-isolation",
      created_at: minutesAgo(8),
    },
    // C) waba_find_idle_browse_phones: inbound dentro de 24h + último
    // outbound hace 25 min (ventana 15-60 min)
    {
      tenant_id: QA_TENANT,
      phone: IDLE_BROWSE_PHONE,
      direction: "in",
      msg_type: "text",
      content: "qa-cron-tenant-isolation",
      created_at: minutesAgo(26),
    },
    {
      tenant_id: QA_TENANT,
      phone: IDLE_BROWSE_PHONE,
      direction: "out",
      msg_type: "text",
      content: "qa-cron-tenant-isolation",
      created_at: minutesAgo(25),
    },
    // D) waba_find_quality_review_candidates: última actividad hace 10 min
    // (ventana 4-30 min) + al menos 1 in / 1 out dentro de 90 min
    {
      tenant_id: QA_TENANT,
      phone: QUALITY_REVIEW_PHONE,
      direction: "in",
      msg_type: "text",
      content: "qa-cron-tenant-isolation",
      created_at: minutesAgo(15),
    },
    {
      tenant_id: QA_TENANT,
      phone: QUALITY_REVIEW_PHONE,
      direction: "out",
      msg_type: "text",
      content: "qa-cron-tenant-isolation",
      created_at: minutesAgo(10),
    },
  ]);
  if (msgErr) throw msgErr;

  const { error: sessErr } = await supabase.from("whatsapp_sessions").insert([
    // B) waba_find_ads_bounce_phones: from_ad_at hace 30 min (ventana 15-60)
    {
      tenant_id: QA_TENANT,
      phone: ADS_BOUNCE_PHONE,
      step: "browsing",
      from_ad_at: minutesAgo(30),
    },
    // C) idle-browse usa INNER JOIN whatsapp_sessions — fila mínima requerida
    {
      tenant_id: QA_TENANT,
      phone: IDLE_BROWSE_PHONE,
      step: "browsing",
    },
  ]);
  if (sessErr) throw sessErr;
}

async function checkRpc(name, params, phone) {
  console.log(`\n── ${name} ──`);

  const { data: zmRows, error: zmErr } = await supabase.rpc(name, {
    ...params,
    p_tenant_id: ZM_TENANT,
  });
  if (zmErr) throw zmErr;
  const leaked = (zmRows ?? []).some((r) => r.phone === phone);
  console.log(
    `  ${!leaked ? "✅" : "❌"} p_tenant_id=${ZM_TENANT}: ${phone} ${leaked ? "SÍ apareció (fuga)" : "no aparece"}`,
  );

  const { data: qaRows, error: qaErr } = await supabase.rpc(name, {
    ...params,
    p_tenant_id: QA_TENANT,
  });
  if (qaErr) throw qaErr;
  const found = (qaRows ?? []).some((r) => r.phone === phone);
  console.log(
    `  ${found ? "✅" : "❌"} p_tenant_id=${QA_TENANT}: ${phone} ${found ? "encontrado" : "NO encontrado (esperado)"}`,
  );

  return { name, pass: !leaked && found };
}

async function main() {
  console.log("waba:validate:cron-tenant-isolation — S4 QA (4 RPCs)");
  await cleanup();
  try {
    await seed();

    const results = [
      await checkRpc(
        "waba_find_silent_phones",
        { min_minutes: 5, max_minutes: 12 },
        SILENT_PHONE,
      ),
      await checkRpc(
        "waba_find_ads_bounce_phones",
        { min_minutes: 15, max_minutes: 60 },
        ADS_BOUNCE_PHONE,
      ),
      await checkRpc(
        "waba_find_idle_browse_phones",
        { min_minutes: 15, max_minutes: 60 },
        IDLE_BROWSE_PHONE,
      ),
      await checkRpc(
        "waba_find_quality_review_candidates",
        {
          min_age_minutes: 4,
          max_age_minutes: 30,
          max_rows: 20,
          include_qa: true,
        },
        QUALITY_REVIEW_PHONE,
      ),
    ];

    const failed = results.filter((r) => !r.pass);
    if (failed.length) {
      console.error("\n❌ Falló:", failed.map((r) => r.name).join(", "));
      process.exit(1);
    }
    console.log("\n✅ cron-tenant-isolation OK (4/4 RPCs sin fuga cruzada)");
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
