#!/usr/bin/env node
/**
 * QA — mid-`awaiting_datetime` nombra otra categoría (Jessi …6106).
 *
 * A: Pack VIP (extensiones) + "Manicure" → gate de conflicto (no cotiza cejas/uñas a ciegas)
 * B: Pack VIP + "Información y precios" → resumen del carrito actual (precios? regex)
 *
 * Tel: 51999000991 (compartido booking/jessi-stale — no paralelizar).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import {
  pollOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000991";
const PACK_VIP_ID = "e440201f-f882-4bda-8bf5-18375b9af465";

const CONFLICT_GATE_RE = /Ahora tienes en tu selección|Si quieres \*cambiar\*/i;
const CART_SUMMARY_RE = /Tu selección:|Total: S\//i;
const BLIND_QUOTE_RE = /Te cotizo ambos|Diseño de Cejas \+ Manicure|¿Te agendo este pack/i;
const LOCATION_DUMP_RE = /Calle Artesanos 150/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedVipAwaiting() {
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "awaiting_datetime",
    cart_items: JSON.stringify([
      {
        item_type: "pack",
        item_id: PACK_VIP_ID,
        quantity: 1,
        price: 200,
      },
    ]),
    cart_service_ids: JSON.stringify([
      "5cf5f5c1-d22d-47b8-9a45-2f5738fcb743",
      "8a37afe6-59e9-45cd-8fc7-292ec2979bfb",
      "dd693fc1-3034-443b-beb6-a53076854a94",
    ]),
    employee_assignments: "{}",
    selected_day: null,
    bot_paused_at: null,
    updated_at: new Date().toISOString(),
  });
}

async function caseConflictManicure() {
  console.log(
    "\n── Jessi-B: VIP mid-agenda + «Manicure» → gate conflicto ──",
  );
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await seedVipAwaiting();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Manicure", {
      wamid: newWamid("wamid.qa.jessi.conflict"),
      contactName: "QA Jessi Conflict",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [CONFLICT_GATE_RE],
    mustNotMatch: [BLIND_QUOTE_RE],
  });

  logCaseResult("Jessi-B conflict gate", result, outbound);
  return {
    name: "Jessi-B (manicure conflict)",
    pass: result.pass,
    note: result.pass ? "Gate sin cotización ciega" : result.fails.join("; "),
  };
}

async function caseInfoPrecios() {
  console.log(
    "\n── Jessi-C: VIP mid-agenda + «Información y precios» → resumen carrito ──",
  );
  await seedVipAwaiting();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Información y precios", {
      wamid: newWamid("wamid.qa.jessi.precios"),
      contactName: "QA Jessi Precios",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [CART_SUMMARY_RE],
    mustNotMatch: [LOCATION_DUMP_RE, BLIND_QUOTE_RE],
  });

  logCaseResult("Jessi-C info precios", result, outbound);
  return {
    name: "Jessi-C (información y precios)",
    pass: result.pass,
    note: result.pass
      ? "Resumen carrito sin dump ubicación"
      : result.fails.join("; "),
  };
}

async function main() {
  console.log("Validación Jessi mid-agenda conflict — tel:", TEST_PHONE);
  if (!process.env.WABA_VALIDATE_SUITE) await sleep(2000);
  const results = [];
  results.push(await caseConflictManicure());
  await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 8000);
  results.push(await caseInfoPrecios());
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
