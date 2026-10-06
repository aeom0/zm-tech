#!/usr/bin/env node
/**
 * selected_day + hora escrita — no debe usar "hoy" (caso ALE …1662).
 * Elige Lun 29 jun + "1pm" un domingo 28-jun → cita lunes 29, no domingo 28.
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
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000994";
const EXT_RIMEL_FALLBACK = "3d5d6ee4-b799-4b93-86eb-b974ec125439";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function resolveRimelId() {
  const { data } = await supabase
    .from("services")
    .select("id")
    .ilike("name", "%Rímel%")
    .limit(1)
    .maybeSingle();
  return data?.id ?? EXT_RIMEL_FALLBACK;
}

async function setupAwaitingDatetime(serviceId) {
  await ensureQaClient(supabase, TEST_PHONE, "QA ALE Sim");
  const cartItems = JSON.stringify([
    { item_type: "service", item_id: serviceId, quantity: 1, price: 70 },
  ]);
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "awaiting_datetime",
    selected_day: "2026-06-29",
    cart_items: cartItems,
    cart_service_ids: JSON.stringify([serviceId]),
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function runCase() {
  const serviceId = await resolveRimelId();
  await setupAwaitingDatetime(serviceId);

  const since = new Date().toISOString();
  console.log("\n── selected_day 29-jun + texto 1pm → lunes 29 ──");

  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "1pm", {
      wamid: newWamid("wamid.qa.daytime"),
      contactName: "QA ALE Sim",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 22000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [/lunes\s+29\s+de\s+junio/i],
    mustNotMatch: [/domingo\s+28\s+de\s+junio/i],
    expectHaiku: false,
  });

  const { data: appt } = await supabase
    .from("appointments")
    .select("date")
    .ilike("client_phone", `%${TEST_PHONE.slice(-9)}%`)
    .eq("status", "scheduled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dateOk = appt?.date?.startsWith("2026-06-29");
  const pass = result.pass && dateOk;

  if (!dateOk) {
    result.fails = [
      ...(result.fails ?? []),
      `BD date=${appt?.date ?? "null"} (esperado 2026-06-29)`,
    ];
  }

  logCaseResult("selected_day + 1pm", { ...result, pass }, outbound);

  return {
    name: "selected_day + hora (ALE)",
    pass,
    note: pass
      ? "Confirmación y BD en lunes 29"
      : result.fails.join("; ") || "Falló",
  };
}

async function main() {
  console.log("Validación selected_day+hora — tel QA:", TEST_PHONE);
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
