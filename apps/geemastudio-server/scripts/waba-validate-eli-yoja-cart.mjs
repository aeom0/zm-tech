#!/usr/bin/env node
/**
 * Eli/Yoja — UNANSWERED_PRICE + CART_MISMATCH (03-ago).
 *
 * A: awaiting_datetime + "cuánto es" → resumen con Total S/ (no solo "Ya tienes eso")
 * B: carrito con servicio suelto + tap pack que lo cubre → solo pack (sin dup pedicure)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  buildInteractivePayload,
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

const TEST_PHONE = "51999000987";
/** Pies en Gel — incluido en pack Softgel + Pedicure Gel */
const PIES_GEL_ID = "2aea9ef5-ad2d-433e-a5eb-8186b903afae";
const PACK_SOFTGEL_PIES = "b015e3c6-12f4-497c-838c-7d4b9e9c3e0d";
const RUBBER_SVC_ID = "0c2bbfa6-807a-4a48-b519-ece0c739ddd2";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedCartAwaitingDatetime() {
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "awaiting_datetime",
    cart_items: JSON.stringify([
      {
        item_type: "service",
        item_id: RUBBER_SVC_ID,
        quantity: 1,
        price: 50,
      },
    ]),
    cart_service_ids: JSON.stringify([RUBBER_SVC_ID]),
    employee_assignments: "{}",
    selected_day: null,
    updated_at: new Date().toISOString(),
  });
}

async function caseUnansweredPrice() {
  console.log("\n── Eli-A: cuánto es mid-carrito → Total S/ ──");
  await seedCartAwaitingDatetime();
  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "cuánto es?", newWamid()),
  );
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
  const result = assertOutbound(outbound, {
    mustMatch: [/Total:\s*S\//i, /50|S\/\s*50/i],
    mustNotMatch: [/Ya tienes eso en tu selección/i],
  });
  logCaseResult("Eli-A UNANSWERED_PRICE", result, outbound);
  return {
    name: "Eli-A (cuánto es → Total S/)",
    pass: result.pass,
    note: result.pass ? "resumen con precio" : result.fails.join("; "),
  };
}

async function caseCartMismatch() {
  console.log("\n── Yoja-B: pack quita servicio suelto duplicado ──");
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "browsing",
    cart_items: JSON.stringify([
      {
        item_type: "service",
        item_id: PIES_GEL_ID,
        quantity: 1,
        price: 45,
      },
    ]),
    cart_service_ids: JSON.stringify([PIES_GEL_ID]),
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildInteractivePayload(
      TEST_PHONE,
      `pack_${PACK_SOFTGEL_PIES}`,
      "Softgel + Pedicure",
      { wamid: newWamid() },
    ),
  );
  await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });

  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("cart_items")
    .eq("phone", TEST_PHONE)
    .maybeSingle();

  let cart = [];
  try {
    cart = JSON.parse(sess?.cart_items ?? "[]");
  } catch {
    cart = [];
  }

  const hasLoosePies = cart.some(
    (i) => i.item_type === "service" && i.item_id === PIES_GEL_ID,
  );
  const hasPack = cart.some(
    (i) => i.item_type === "pack" && i.item_id === PACK_SOFTGEL_PIES,
  );
  const pass = hasPack && !hasLoosePies;
  const fails = [];
  if (!hasPack) fails.push("pack no quedó en carrito");
  if (hasLoosePies) fails.push("sigue pies suelto (CART_MISMATCH)");

  logCaseResult(
    "Yoja-B CART_MISMATCH",
    { pass, fails },
    [{ content: JSON.stringify(cart), msg_type: "session" }],
  );
  return {
    name: "Yoja-B (pack sin dup pies)",
    pass,
    note: pass ? "solo pack" : fails.join("; "),
  };
}

async function main() {
  console.log("Validación Eli/Yoja cart — tel:", TEST_PHONE);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  if (!process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  results.push(await caseUnansweredPrice());
  await sleep(process.env.WABA_VALIDATE_SUITE ? 12000 : 8000);
  results.push(await caseCartMismatch());

  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
