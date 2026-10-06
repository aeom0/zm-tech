#!/usr/bin/env node
/**
 * P3 — Filtro de eco Meta vs mensaje genuino de servicio.
 * Origen: docs/waba/analysis/2026-06-03-analysis.md (hilo …5267)
 *
 * Caso A: lista interactiva hace 4s + "Laminado de cejas" → debe responder (Haiku/precio)
 * Caso B: lista hace 1.5s + mismo texto → eco Meta, debe silenciarse (sin OUT nuevo)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { seedWelcomeMenuSentAgo } from "./lib/waba-sim-seed.mjs";
import {
  pollResponseSince,
  fetchOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000999";
const MSG_LAMINADO = "Laminado de cejas";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function validateServicioTrasMenu4s() {
  console.log("\n── P3-A: servicio 4s después del menú → debe responder ──");
  await seedWelcomeMenuSentAgo(supabase, TEST_PHONE, 4000);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, MSG_LAMINADO, {
      wamid: newWamid("wamid.qa.p3a"),
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(
    supabase,
    TEST_PHONE,
    since,
  );

  const result = assertOutbound(outbound, haiku, {
    mustMatch: [/laminado|cejas|50|precio|promo/i],
    expectHaiku: false,
    allowPartialWithoutOut: false,
  });

  // Haiku o texto con precio; si solo hay OUT sin regex, revisar contenido
  const pass =
    result.pass ||
    (outbound.length > 0 && !/¿En qué podemos ayudarte\?/.test(result.text));

  logCaseResult("P3-A intención real", { ...result, pass }, outbound);

  return {
    name: "P3-A (4s → responde)",
    pass,
    note: pass
      ? "Bot respondió al servicio (no silenciado)"
      : result.fails.join("; ") || "Sin respuesta",
  };
}

async function validateEcoMeta1s() {
  console.log("\n── P3-B: eco Meta 1.5s después del menú → silencio ──");
  await seedWelcomeMenuSentAgo(supabase, TEST_PHONE, 1500);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, MSG_LAMINADO, {
      wamid: newWamid("wamid.qa.p3b"),
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  await sleep(16000);
  const outbound = await fetchOutboundSince(supabase, TEST_PHONE, since);
  const pass = outbound.length === 0;

  console.log(`\n── P3-B eco Meta ──`);
  console.log(`  Pass: ${pass ? "sí" : "no"}`);
  console.log(`  OUT nuevos: ${outbound.length} (esperado 0)`);

  return {
    name: "P3-B (1.5s → silencio)",
    pass,
    note: pass
      ? "Eco silenciado correctamente"
      : "Respondió cuando debía callar",
  };
}

async function main() {
  console.log("Validación P3 — teléfono QA:", TEST_PHONE);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await validateServicioTrasMenu4s());
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
    await sleep(4000);
    results.push(await validateEcoMeta1s());
  } finally {
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
    finishAndExit(results);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
