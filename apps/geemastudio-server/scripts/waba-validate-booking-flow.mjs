#!/usr/bin/env node
/**
 * Flujo agendar — carrito → calendario (fixes Alejandra 2026-07-04).
 *
 * A: texto "agendar" con carrito → [lista] Elegir fecha (no Categorías)
 * B: tap svc- → calendario directo (no menú "Opciones / ¿Qué deseas hacer?")
 * C: awaiting_datetime + tap agendar_ya → reenvía calendario (no silencio)
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

const TEST_PHONE = "51999000991";
/** Rubber + Efecto Cat Eye — caso Alejandra */
const RUBBER_SVC_ID = "0c2bbfa6-807a-4a48-b519-ece0c739ddd2";

const DATE_LIST_RE = /\[lista\] Elegir fecha:/i;
const CATEGORIES_RE = /\[lista\] Categorías:/i;
const CART_OPTIONS_RE = /Opciones:.*Qué deseas hacer/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedCartBrowsing() {
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "browsing",
    cart_items: JSON.stringify([
      {
        item_type: "service",
        item_id: RUBBER_SVC_ID,
        quantity: 1,
        price: 49.9,
      },
    ]),
    cart_service_ids: JSON.stringify([RUBBER_SVC_ID]),
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function seedCartAwaitingDatetime() {
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "awaiting_datetime",
    cart_items: JSON.stringify([
      {
        item_type: "service",
        item_id: RUBBER_SVC_ID,
        quantity: 1,
        price: 49.9,
      },
    ]),
    cart_service_ids: JSON.stringify([RUBBER_SVC_ID]),
    employee_assignments: "{}",
    selected_day: null,
    updated_at: new Date().toISOString(),
  });
}

async function caseAgendarTexto() {
  console.log("\n── Booking-A: carrito + texto agendar → calendario ──");
  await seedCartBrowsing();
  const since = new Date().toISOString();

  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "agendar", {
      wamid: newWamid("wamid.qa.bk.a"),
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 2,
    timeoutMs: 25000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [DATE_LIST_RE],
    mustNotMatch: [CATEGORIES_RE],
  });

  logCaseResult("Booking-A agendar texto", result, outbound);
  return {
    name: "Booking-A (agendar → fecha)",
    pass: result.pass,
    note: result.pass ? "Calendario OK" : result.fails.join("; "),
  };
}

async function caseSvcTapCalendario() {
  console.log("\n── Booking-B: tap svc- → calendario directo ──");
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
  const since = new Date().toISOString();

  const status = await postWebhook(
    webhookUrl,
    buildInteractivePayload(
      TEST_PHONE,
      `svc_${RUBBER_SVC_ID}`,
      "Rubber + Efecto Cat Eye",
      { wamid: newWamid("wamid.qa.bk.b"), kind: "list" },
    ),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 2,
    timeoutMs: 25000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [DATE_LIST_RE],
    mustNotMatch: [CART_OPTIONS_RE, CATEGORIES_RE],
  });

  logCaseResult("Booking-B svc tap", result, outbound);
  return {
    name: "Booking-B (svc → fecha)",
    pass: result.pass,
    note: result.pass ? "Sin menú Opciones" : result.fails.join("; "),
  };
}

async function caseAgendarYaAwaitingDatetime() {
  console.log("\n── Booking-C: awaiting_datetime + agendar_ya → reenvío ──");
  await seedCartAwaitingDatetime();
  const since = new Date().toISOString();

  const status = await postWebhook(
    webhookUrl,
    buildInteractivePayload(TEST_PHONE, "agendar_ya", "Agendar cita", {
      wamid: newWamid("wamid.qa.bk.c"),
      kind: "list",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 2,
    timeoutMs: 25000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [DATE_LIST_RE],
  });

  logCaseResult("Booking-C agendar_ya", result, outbound);
  return {
    name: "Booking-C (agendar_ya reenvío)",
    pass: result.pass,
    note: result.pass ? "Calendario reenviado" : result.fails.join("; "),
  };
}

/** Yesenia: "Srta cualquier diseño" en awaiting_datetime → Haiku, no botones rígidos. */
async function caseDisenoAwaitingDatetime() {
  console.log("\n── Booking-D: awaiting_datetime + diseño → Haiku ──");
  await seedCartAwaitingDatetime();
  const since = new Date().toISOString();

  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Srta cualquier diseño", {
      wamid: newWamid("wamid.qa.bk.d"),
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 28000,
  });

  const RIGID_RE = /usa los \*?botones\*? de abajo/i;
  const result = assertOutbound(outbound, [], {
    mustNotMatch: [RIGID_RE],
  });

  const hasText = outbound.some(
    (m) => m.msg_type === "text" && (m.content ?? "").trim().length > 10,
  );
  const pass = result.pass && hasText && outbound.length >= 1;

  logCaseResult(
    "Booking-D diseño en awaiting_datetime",
    {
      ...result,
      pass,
      fails: pass
        ? []
        : [
            ...result.fails,
            !hasText ? "sin respuesta de texto (Haiku)" : "",
          ].filter(Boolean),
    },
    outbound,
  );

  return {
    name: "Booking-D (diseño → Haiku)",
    pass,
    note: pass ? "Haiku sin fallback rígido" : result.fails.join("; "),
  };
}

async function main() {
  console.log("Validación booking flow — tel:", TEST_PHONE);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  if (!process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  results.push(await caseAgendarTexto());
  await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 12000);
  results.push(await caseSvcTapCalendario());
  await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 12000);
  results.push(await caseAgendarYaAwaitingDatetime());
  await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 12000);
  results.push(await caseDisenoAwaitingDatetime());

  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
