#!/usr/bin/env node
/**
 * E2E — tap "📦 Ver Packs" (id view_…__packs) debe listar packs, no Categorías.
 * Regresión Alberto VE …0417 + JERITA BSUID (15-sep-2026).
 *
 * Casos:
 * A) QA E.164 — tap view_cat-extensiones__extensiones-nuevas__packs → [lista] Packs ·
 * B) (opcional) JERITA BSUID — mismo tap en prod si SEND_JERITA_PACKS=1
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildInteractivePayload,
  buildBsuidInteractivePayload,
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

const TEST_PHONE = "51999000977";
const JERITA_BSUID = "PE.1069943449348523";
const VIEW_PACKS_ID = "view_cat-extensiones__extensiones_nuevas__packs";
const PACKS_LIST_RE = /\[lista\] Packs ·/i;
const CATEGORIES_RE = /\[lista\] Categorías:/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedBrowsing(phone) {
  await supabase.from("whatsapp_sessions").upsert({
    phone,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function tapViewPacks({ phone, bsuid, contactName, username }) {
  const since = new Date(Date.now() - 5_000).toISOString();
  const wamid = newWamid(bsuid ? "wamid.qa.bsuid.viewpacks" : "wamid.qa.viewpacks");
  const payload = bsuid
    ? buildBsuidInteractivePayload(bsuid, VIEW_PACKS_ID, "📦 Ver Packs (3)", {
        wamid,
        contactName,
        username,
      })
    : buildInteractivePayload(phone, VIEW_PACKS_ID, "📦 Ver Packs (3)", {
        wamid,
        contactName,
      });

  const status = await postWebhook(webhookUrl, payload);
  console.log(`  Webhook HTTP ${status} → ${bsuid ?? phone}`);

  await sleep(12_000);

  const outbound = await pollOutboundSince(supabase, bsuid ?? phone, since);
  return { outbound, wamid };
}

async function caseQaE164() {
  console.log("\n── A: tap view_…__packs (E.164 QA) → lista Packs ──");
  await cleanupQaPhone(supabase, TEST_PHONE);
  await seedBrowsing(TEST_PHONE);

  const { outbound } = await tapViewPacks({
    phone: TEST_PHONE,
    contactName: "QA View Packs",
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [PACKS_LIST_RE],
    mustNotMatch: [CATEGORIES_RE],
  });
  logCaseResult("A view_packs E.164", result, outbound);
  return {
    name: "A view_packs E.164",
    pass: result.pass,
    note: result.pass ? "Packs OK" : result.fails.join("; "),
  };
}

async function caseJeritaBsuid() {
  if (process.env.SEND_JERITA_PACKS !== "1") {
    console.log("\n── B: JERITA BSUID — omitido (SEND_JERITA_PACKS≠1) ──");
    return { name: "B JERITA BSUID", pass: true, note: "omitido" };
  }

  console.log("\n── B: tap view_…__packs (JERITA BSUID) → lista Packs ──");
  await seedBrowsing(JERITA_BSUID);

  const { outbound } = await tapViewPacks({
    bsuid: JERITA_BSUID,
    contactName: "JERITA",
    username: "jeremmita",
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [PACKS_LIST_RE],
    mustNotMatch: [CATEGORIES_RE],
  });
  logCaseResult("B view_packs JERITA", result, outbound);
  return {
    name: "B JERITA BSUID",
    pass: result.pass,
    note: result.pass ? "Packs enviados a JERITA" : result.fails.join("; "),
  };
}

async function main() {
  console.log("QA view-packs — tap Ver Packs no debe devolver Categorías\n");
  const results = [];
  results.push(await caseQaE164());
  results.push(await caseJeritaBsuid());

  await cleanupQaPhone(supabase, TEST_PHONE);
  finishAndExit(results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
