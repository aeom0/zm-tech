#!/usr/bin/env node
/**
 * QA S3 — tenant isolation (flag OFF = regresión cero en prod ZM).
 *
 * A) Flag waba_tenant_routing_enabled = false en zm-lash-nails
 * B) Webhook con phone_number_id ZM → whatsapp_sessions.tenant_id = zm-lash-nails
 *
 * Teléfono QA: 51999000992 (cleanup incluido).
 * Cross-tenant con test-barberia requiere 2.º tenant en BD (S7).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { sleep } from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000992";
const ZM_TENANT = "zm-lash-nails";
const ZM_PHONE_NUMBER_ID = "1013353341861346";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function checkRoutingFlagOff() {
  console.log("\n── A: flag routing OFF (prod ZM) ──");
  const { data, error } = await supabase
    .from("waba_config")
    .select("config_value")
    .eq("tenant_id", ZM_TENANT)
    .eq("config_key", "waba_tenant_routing_enabled")
    .maybeSingle();

  if (error) throw error;
  const enabled = data?.config_value?.enabled === true;
  const pass = !enabled;
  console.log(
    `  ${pass ? "✅" : "❌"} waba_tenant_routing_enabled.enabled = ${JSON.stringify(data?.config_value?.enabled)}`,
  );
  return { name: "A flag OFF", pass };
}

async function checkWebhookSessionTenant() {
  console.log("\n── B: webhook → sesión tenant_id ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  const wamid = newWamid("wamid.qa.tenant");
  const payload = buildTextPayload(TEST_PHONE, "menu", { wamid });
  payload.entry[0].changes[0].value.metadata = {
    phone_number_id: ZM_PHONE_NUMBER_ID,
    display_phone_number: "51981444430",
  };

  const status = await postWebhook(webhookUrl, payload);
  if (status !== 200) {
    console.log(`  ❌ webhook HTTP ${status}`);
    return { name: "B session tenant", pass: false };
  }

  // Coalesce inbound puede tardar hasta ~9s antes de upsertSession.
  let session = null;
  for (let i = 0; i < 12; i++) {
    await sleep(1000);
    const { data, error } = await supabase
      .from("whatsapp_sessions")
      .select("tenant_id, step")
      .eq("tenant_id", ZM_TENANT)
      .eq("phone", TEST_PHONE)
      .maybeSingle();
    if (error) throw error;
    if (data?.tenant_id === ZM_TENANT) {
      session = data;
      break;
    }
  }

  const pass = session?.tenant_id === ZM_TENANT;
  console.log(
    `  ${pass ? "✅" : "❌"} whatsapp_sessions.tenant_id = ${session?.tenant_id ?? "null"} (step=${session?.step ?? "—"})`,
  );
  return { name: "B session tenant", pass };
}

async function main() {
  console.log("waba:validate:tenant-isolation — S3 QA");
  const results = [await checkRoutingFlagOff(), await checkWebhookSessionTenant()];
  const failed = results.filter((r) => !r.pass);
  if (failed.length) {
    console.error("\n❌ Falló:", failed.map((r) => r.name).join(", "));
    process.exit(1);
  }
  console.log("\n✅ tenant-isolation OK (flag OFF / ZM)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
