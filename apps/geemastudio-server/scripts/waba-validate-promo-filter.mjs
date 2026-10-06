#!/usr/bin/env node
/**
 * P1-b — Promos filtradas por categoría → Haiku, no lista genérica.
 * Origen: chat Alejandra Ramos …618163 (2026-07-04).
 *
 * Caso A: "promos de uñas y pedicure" → Haiku (no [lista] Promos ZM genérica)
 * Caso B: "ver promos" → lista genérica de promos
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
  pollResponseSince,
  pollOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000997";

const MSG_FILTRADO = "Hola, quiero ver las promos de uñas y pedicure 💅";

const GENERIC_PROMOS_LIST_RE =
  /\[lista\] 🌟 Promos ZM Lash & Nails: Nuestras promos activas/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function setupBrowsing() {
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function validateFiltradoHaiku() {
  console.log(
    "\n── P1-b-A: promos uñas/pedicure → Haiku (no lista genérica) ──",
  );
  await setupBrowsing();
  const since = new Date().toISOString();

  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, MSG_FILTRADO, {
      wamid: newWamid("wamid.qa.p1b.a"),
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(
    supabase,
    TEST_PHONE,
    since,
    { timeoutMs: 25000 },
  );

  const result = assertOutbound(outbound, haiku, {
    mustNotMatch: [GENERIC_PROMOS_LIST_RE, /\[lista\] Categorías:/i],
    expectHaiku: true,
  });

  logCaseResult("P1-b-A filtrado", result, outbound);

  return {
    name: "P1-b-A (Haiku filtrado)",
    pass: result.pass,
    note: result.pass
      ? "Haiku atendió promos filtradas sin lista genérica"
      : result.fails.join("; ") || "Falló",
  };
}

async function validatePureNavLista() {
  console.log("\n── P1-b-B: ver promos → lista genérica ──");
  await setupBrowsing();
  const since = new Date().toISOString();

  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "ver promos", {
      wamid: newWamid("wamid.qa.p1b.b"),
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 15000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [GENERIC_PROMOS_LIST_RE],
    mustNotMatch: [/✨ Ver Servicios/i],
    expectHaiku: false,
  });

  logCaseResult("P1-b-B ver promos", result, outbound);

  return {
    name: "P1-b-B (lista promos)",
    pass: result.pass,
    note: result.pass
      ? "Lista genérica de promos OK"
      : result.fails.join("; ") || "Falló",
  };
}

async function main() {
  console.log("Validación P1-b — promos filtradas — tel:", TEST_PHONE);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  if (!process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  results.push(await validateFiltradoHaiku());
  await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 12000);
  results.push(await validatePureNavLista());

  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
