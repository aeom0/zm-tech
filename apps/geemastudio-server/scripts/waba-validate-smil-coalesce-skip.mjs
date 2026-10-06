#!/usr/bin/env node
/**
 * QW — carrera coalesce/skip ~9 s (Smil …9843, análisis 03-sep).
 *
 * "Buenas tardes" + "Dónde queda el local" con gap ~9.2 s (> COALESCE_MAX_MS):
 * el líder responde solo el saludo; el 2.º webhook no debe dropear por
 * shouldSkipDispatchPeerAlreadyHandled (fingerprint inbound_coalesce_covered).
 *
 * Tel: 51999000988 (no paralelizar).
 *
 * A) Gap 9200 ms → debe salir Calle Artesanos 150
 * B) Regresión suave: gap 2000 ms (dentro de ventana) → ubicación 1× (coalesce)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000988";
const CONTACT = "QA Smil Coalesce Skip";
const GREETING = "Buenas tardes";
const LOCATION_Q = "Dónde queda el local";
const LOCATION_RE = /Calle Artesanos 150/i;
const SOFT_LOCK_RE = /Un segundo.*ya te respondo/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedBrowsing() {
  const { error } = await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`session: ${error.message}`);
}

function countLocation(outbound) {
  return outbound.filter((m) => LOCATION_RE.test(m.content ?? "")).length;
}

function realOut(outbound) {
  return outbound.filter((m) => !SOFT_LOCK_RE.test(m.content ?? ""));
}

async function waitSettle(sinceIso, quietMs = 5000, maxMs = 45000) {
  const deadline = Date.now() + maxMs;
  let lastCount = -1;
  let quietSince = Date.now();
  while (Date.now() < deadline) {
    const outbound = await pollOutboundSince(supabase, PHONE, sinceIso, {
      minCount: 0,
      timeoutMs: 800,
    });
    const n = outbound.length;
    if (n !== lastCount) {
      lastCount = n;
      quietSince = Date.now();
    } else if (n > 0 && Date.now() - quietSince >= quietMs) {
      return outbound;
    }
    await sleep(800);
  }
  return pollOutboundSince(supabase, PHONE, sinceIso, {
    minCount: 1,
    timeoutMs: 2000,
  });
}

async function caseGapOverMax() {
  console.log(
    "\n── A (Smil): saludo + ubicación gap 9200ms → 1× dirección ──",
  );
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await ensureQaClient(supabase, PHONE, CONTACT);
  await seedBrowsing();

  const since = new Date().toISOString();
  const t0 = Date.now();
  const st1 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, GREETING, {
      wamid: newWamid("wamid.qa.smil.skip.a1"),
      contactName: CONTACT,
    }),
  );
  console.log(`  msg1 HTTP ${st1}`);

  // Gap entre llegadas (después de que msg1 ya pegó al webhook), no desde t0 —
  // si se cuenta el RTT del 1.er POST el hueco real cae bajo COALESCE_MAX (~9s).
  await sleep(9200);

  const st2 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, LOCATION_Q, {
      wamid: newWamid("wamid.qa.smil.skip.a2"),
      contactName: CONTACT,
    }),
  );
  console.log(`  msg2 HTTP ${st2} (+${Date.now() - t0}ms desde t0)`);

  const outbound = await waitSettle(since);
  const real = realOut(outbound);
  const locs = countLocation(real);
  const fails = [];
  if (locs < 1) fails.push("sin Calle Artesanos 150 (2.º IN dropeado)");
  if (locs > 2) fails.push(`ubicación ×${locs} (avalancha)`);

  const pass = fails.length === 0;
  logCaseResult("A gap>MAX ubicación", { pass, fails }, outbound);
  return {
    name: "A Smil gap 9.2s → ubicación",
    pass,
    note: pass ? `ubicación ×${locs} OUT=${real.length}` : fails.join("; "),
  };
}

async function caseGapInsideWindow() {
  console.log(
    "\n── B: saludo + ubicación gap 2s (coalesce) → ≥1 dirección ──",
  );
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await ensureQaClient(supabase, PHONE, CONTACT);
  await seedBrowsing();

  const since = new Date().toISOString();
  const st1 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, GREETING, {
      wamid: newWamid("wamid.qa.smil.skip.b1"),
      contactName: CONTACT,
    }),
  );
  console.log(`  msg1 HTTP ${st1}`);
  await sleep(2000);
  const st2 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, LOCATION_Q, {
      wamid: newWamid("wamid.qa.smil.skip.b2"),
      contactName: CONTACT,
    }),
  );
  console.log(`  msg2 HTTP ${st2} (+2s)`);

  const outbound = await waitSettle(since, 4500, 35000);
  const real = realOut(outbound);
  const locs = countLocation(real);
  const fails = [];
  if (locs < 1) fails.push("sin dirección en coalesce corto");
  if (locs > 2) fails.push(`ubicación ×${locs}`);

  const pass = fails.length === 0;
  logCaseResult("B gap 2s coalesce", { pass, fails }, outbound);
  return {
    name: "B gap 2s → ubicación",
    pass,
    note: pass ? `ubicación ×${locs}` : fails.join("; "),
  };
}

async function main() {
  console.log("Validación Smil coalesce uncovered skip — tel:", PHONE);
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await caseGapOverMax());
    await sleep(2500);
    results.push(await caseGapInsideWindow());
  } finally {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
