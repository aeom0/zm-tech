#!/usr/bin/env node
/**
 * P3 Yesenia — debounce de selector fecha/hora post-Haiku (15s).
 *
 * A: lista reciente en wa_messages + pregunta en awaiting_datetime → Haiku sí,
 *    segunda lista "Elegir fecha" NO (debounce en resendDatetimeSelectors).
 * B: lista reciente + tap agendar_ya → SÍ reenvía lista (force / sin debounce).
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
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000982";
const RUBBER_SVC_ID = "0c2bbfa6-807a-4a48-b519-ece0c739ddd2";
const DATE_LIST_RE = /\[lista\] Elegir fecha:/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedAwaitingDatetime() {
  await ensureQaClient(supabase, PHONE, "QA Selector Debounce");
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
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

/** Simula lista ya enviada hace <15s (como tras el 1.er Haiku de Yesenia). */
async function seedRecentDateList() {
  const { error } = await supabase.from("wa_messages").insert({
    phone: PHONE,
    direction: "out",
    msg_type: "interactive",
    content: "[lista] Elegir fecha: ¿Qué día prefieres?",
    created_at: new Date().toISOString(),
  });
  if (error) throw new Error(`seed lista: ${error.message}`);
}

function countDateLists(outbound) {
  return outbound.filter(
    (m) => m.msg_type === "interactive" && DATE_LIST_RE.test(m.content ?? ""),
  ).length;
}

async function caseDebounceAfterHaiku() {
  console.log("\n── Debounce-A: lista reciente + pregunta → sin 2.ª lista ──");
  await cleanupQaPhone(supabase, PHONE);
  await seedAwaitingDatetime();
  await seedRecentDateList();
  await sleep(500);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "Srta cuánto cuesta el builder gel?", {
      wamid: newWamid("wamid.qa.debounce.a"),
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 28000,
  });

  const lists = countDateLists(outbound);
  const hasText = outbound.some(
    (m) => m.msg_type === "text" && (m.content ?? "").trim().length > 10,
  );
  const result = assertOutbound(outbound, [], {
    mustNotMatch: [],
  });
  const pass = result.pass && hasText && lists === 0;

  logCaseResult(
    "Debounce-A Haiku sin 2.ª lista",
    {
      pass,
      fails: [
        ...result.fails,
        !hasText ? "sin texto Haiku" : "",
        lists > 0 ? `reenvió ${lists} lista(s) Elegir fecha` : "",
      ].filter(Boolean),
    },
    outbound,
  );

  return {
    name: "Debounce-A (Haiku omite lista)",
    pass,
    note: pass ? "Haiku sí, lista no" : `lists=${lists} hasText=${hasText}`,
  };
}

async function caseAgendarYaStillResends() {
  console.log("\n── Debounce-B: lista reciente + agendar_ya → sí reenvía ──");
  await cleanupQaPhone(supabase, PHONE);
  await seedAwaitingDatetime();
  await seedRecentDateList();
  await sleep(500);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildInteractivePayload(PHONE, "agendar_ya", "Agendar cita", {
      wamid: newWamid("wamid.qa.debounce.b"),
      kind: "list",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 2,
    timeoutMs: 25000,
  });

  // Si solo llegó el resumen, esperar un poco más la lista interactiva
  let lists = countDateLists(outbound);
  if (lists === 0) {
    await sleep(4000);
    const more = await pollOutboundSince(supabase, PHONE, since, {
      minCount: 2,
      timeoutMs: 12000,
    });
    outbound.splice(0, outbound.length, ...more);
    lists = countDateLists(outbound);
  }

  const result = assertOutbound(outbound, [], {
    mustMatch: [DATE_LIST_RE],
  });
  logCaseResult("Debounce-B agendar_ya reenvía", result, outbound);

  return {
    name: "Debounce-B (agendar_ya force)",
    pass: result.pass,
    note: result.pass ? "Lista reenviada" : result.fails.join("; "),
  };
}

async function main() {
  const results = [];
  try {
    results.push(await caseDebounceAfterHaiku());
    await sleep(3000);
    results.push(await caseAgendarYaStillResends());
  } finally {
    await cleanupQaPhone(supabase, PHONE).catch(() => {});
  }
  finishAndExit(results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
