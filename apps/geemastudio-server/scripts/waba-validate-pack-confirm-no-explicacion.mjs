#!/usr/bin/env node
/**
 * E2E — confirmar un pack por texto libre ("Me gusta el pack") ya no debe
 * mudar en silencio al menú genérico de Categorías sin ninguna respuesta.
 * Regresión Alberto …0417 (17-sep-2026): Haiku respondió show_category sin
 * catId/sin texto tras contexto de pack real ofrecido → clienta veía la
 * lista de Categorías sola, sin explicación (fix ai-assistant.ts 081cb36e).
 *
 * Caso único: seed de contexto previo (Haiku ofreció "Rubber + Pies en Gel —
 * S/105", pack real activo del catálogo cat-unas) → texto libre "Me gusta el
 * pack" → la respuesta NO puede ser únicamente "[lista] Categorías:" sin
 * texto previo.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import { buildTextPayload, postWebhook } from "./lib/waba-sim-payload.mjs";
import { seedOutboundAt } from "./lib/waba-sim-seed.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import {
  pollOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000976";
// "[lista] Categorías:" como ÚNICO mensaje (sin texto antes) → bug original.
// Con el fix, si cae a Categorías, siempre va precedido de un texto propio
// ("Cuéntame un poco más…") — por eso el mustNotMatch exige la lista SIN
// ningún texto que la preceda en el mismo bloque de outbound.
const BARE_CATEGORIES_RE = /^\[lista\] Categorías:/;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedPackOfferContext(phone) {
  await supabase.from("whatsapp_sessions").upsert({
    phone,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
  await seedOutboundAt(
    supabase,
    phone,
    [
      {
        msg_type: "text",
        content:
          "Tenemos el pack Rubber + Pies en Gel a S/105 💜 ¿te gustaría que te lo agende?",
      },
    ],
    15_000,
  );
}

async function caseConfirmPack() {
  console.log('\n── A: "Me gusta el pack" tras oferta real → no Categorías en blanco ──');
  await cleanupQaPhone(supabase, TEST_PHONE);
  await seedPackOfferContext(TEST_PHONE);

  const since = new Date(Date.now() - 5_000).toISOString();
  const payload = buildTextPayload(TEST_PHONE, "Me gusta el pack", {
    contactName: "QA Pack Confirm",
  });
  const status = await postWebhook(webhookUrl, payload);
  console.log(`  Webhook HTTP ${status} → ${TEST_PHONE}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    timeoutMs: 20000,
  });

  const firstMsg = outbound[0]?.content ?? "";
  const firstIsBareCategories = BARE_CATEGORIES_RE.test(firstMsg.trim());

  const result = assertOutbound(outbound, [], {
    mustMatch: [],
  });
  if (outbound.length === 0) {
    result.pass = false;
    result.fails.push("sin respuesta outbound (timeout)");
  }
  if (firstIsBareCategories) {
    result.pass = false;
    result.fails.push(
      "primer mensaje es Categorías sin texto explicativo previo",
    );
  }

  logCaseResult("A pack confirm sin explicación", result, outbound);
  return {
    name: "A pack confirm sin explicación",
    pass: result.pass,
    note: result.pass ? "respuesta con texto, no cae muda a Categorías" : result.fails.join("; "),
  };
}

async function main() {
  console.log("QA pack-confirm — confirmar pack por texto no muda a Categorías sin explicación\n");
  const results = [];
  results.push(await caseConfirmPack());

  if (process.env.QA_SKIP_CLEANUP !== "1") {
    await cleanupQaPhone(supabase, TEST_PHONE);
  }
  finishAndExit(results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
