#!/usr/bin/env node
/**
 * Plantilla para nuevo caso de validación WABA.
 * Copiar a scripts/waba-validate-<nombre>.mjs y completar setup + aserciones.
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
  fetchHaikuSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
} from "./lib/waba-sim-assert.mjs";

// Reservar un teléfono QA único por script (51999000998, 51999000999, …)
const TEST_PHONE = "51999000998";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function setup(_supabase) {
  // TODO: whatsapp_sessions, wa_messages historial, appointments, etc.
}

async function runCase() {
  await setup(supabase);
  const since = new Date().toISOString();

  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "mensaje de la clienta aquí", {
      wamid: newWamid("wamid.qa.mi-caso"),
    }),
  );

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since);
  const haiku = await fetchHaikuSince(supabase, TEST_PHONE, since);
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [/texto esperado/i],
    mustNotMatch: [/anti-patrón/i],
    expectHaiku: false,
  });

  logCaseResult("Mi caso — descripción", result, outbound);
  return {
    name: "Mi caso",
    pass: result.pass,
    note: result.pass ? "OK" : result.fails.join("; "),
  };
}

async function main() {
  console.log("WABA validate —", TEST_PHONE);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  try {
    const result = await runCase();
    finishAndExit([result]);
  } finally {
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
