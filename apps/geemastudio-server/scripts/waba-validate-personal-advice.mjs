#!/usr/bin/env node
/**
 * QA derivación a asesora personalizada (Romy @romymorinaga, 26-sep):
 * A) "ojo grande … no quiero una mirada triste" → pausa + copy asesora + foto rostro/ojos
 * B) texto con bot pausado → silencio (staff toma el chat)
 * C) texto prellenado CTWA "qué estilo me queda mejor" → NO pausa (Haiku responde)
 * D) "No quiero" corto con carrito → despedida normal, sin pausa (decline intacto)
 *
 * Teléfono: 51999000985 (excepción QA que SÍ pausa; no paralelizar con design-pause/fanny-burst).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import { buildTextPayload, postWebhook, newWamid } from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  fetchOutboundSince,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";
import { DESIGN_PAUSE_QA_PHONE } from "../supabase/functions/whatsapp-webhook/lib/design-staff-hours.mjs";

const PHONE = DESIGN_PAUSE_QA_PHONE;
const POLY_GEL_ID = "e3d429cb-3387-45c2-b965-c94b28c81330";
const ADVISOR_RE = /asesora personalizada/i;
const PHOTO_RE = /foto de tu rostro o de tus ojos/i;
const DECLINE_RE = /cuando quieras agendar/i;
const DATE_LIST_RE = /\[lista\] Elegir fecha:/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seed({ cart = false, paused = false } = {}) {
  await ensureQaClient(supabase, PHONE, "QA Personal Advice");
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: cart ? "awaiting_datetime" : "browsing",
    cart_items: JSON.stringify(
      cart
        ? [{ item_type: "service", item_id: POLY_GEL_ID, quantity: 1, price: 70 }]
        : [],
    ),
    cart_service_ids: JSON.stringify(cart ? [POLY_GEL_ID] : []),
    employee_assignments: "{}",
    bot_paused_at: paused ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  });
}

async function getSession() {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("bot_paused_at, cart_items")
    .eq("phone", PHONE)
    .maybeSingle();
  return data;
}

async function send(text, tag) {
  return postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, text, {
      wamid: newWamid(`wamid.qa.advice.${tag}`),
      contactName: "QA Personal Advice",
    }),
  );
}

async function caseA_romyPauses() {
  await cleanupQaPhone(supabase, PHONE);
  await seed();
  const since = new Date().toISOString();
  const status = await send(
    "Mi ojo es grande pero no quiero una mirada q se vea triste",
    "a",
  );
  if (status < 200 || status >= 300) return { pass: false, note: `webhook ${status}` };
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    timeoutMs: 18000,
    minCount: 1,
  });
  await sleep(800);
  const sess = await getSession();
  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const paused = Boolean(sess?.bot_paused_at);
  const copyOk = ADVISOR_RE.test(joined) && PHOTO_RE.test(joined);
  const noDecline = !DECLINE_RE.test(joined);
  const noCalendar = !DATE_LIST_RE.test(joined);
  return {
    pass: paused && copyOk && noDecline && noCalendar,
    note: `paused=${paused} copy=${copyOk} noDecline=${noDecline} noCal=${noCalendar} outs=${outbound.length}`,
  };
}

async function caseB_silenceWhilePaused() {
  await seed({ paused: true });
  const since = new Date().toISOString();
  await sleep(200);
  const status = await send("Les envío mi foto en un momento", "b");
  if (status < 200 || status >= 300) return { pass: false, note: `webhook ${status}` };
  await sleep(10000);
  const outbound = await fetchOutboundSince(supabase, PHONE, since);
  return { pass: outbound.length === 0, note: `outs=${outbound.length} (esperado 0)` };
}

async function caseC_ctwaPrefillNoPause() {
  await cleanupQaPhone(supabase, PHONE);
  await seed();
  const since = new Date().toISOString();
  const status = await send(
    "¡Hola! Quiero saber qué estilo de pestañas me queda mejor 💜",
    "c",
  );
  if (status < 200 || status >= 300) return { pass: false, note: `webhook ${status}` };
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    timeoutMs: 25000,
    minCount: 1,
  });
  await sleep(800);
  const sess = await getSession();
  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const notPaused = !sess?.bot_paused_at;
  const noHandoff = !ADVISOR_RE.test(joined);
  return {
    pass: notPaused && noHandoff && outbound.length >= 1,
    note: `notPaused=${notPaused} noHandoff=${noHandoff} outs=${outbound.length}`,
  };
}

async function caseD_shortDeclineIntact() {
  await cleanupQaPhone(supabase, PHONE);
  await seed({ cart: true });
  const since = new Date().toISOString();
  const status = await send("No quiero", "d");
  if (status < 200 || status >= 300) return { pass: false, note: `webhook ${status}` };
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    timeoutMs: 15000,
    minCount: 1,
  });
  await sleep(800);
  const sess = await getSession();
  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const declined = DECLINE_RE.test(joined);
  const notPaused = !sess?.bot_paused_at;
  return {
    pass: declined && notPaused,
    note: `declined=${declined} notPaused=${notPaused} outs=${outbound.length}`,
  };
}

async function main() {
  console.log("\n=== QA personal-advice (derivación a asesora) ===\n");
  console.log(`Teléfono: ${PHONE}\n`);
  const results = [];
  try {
    let r = await caseA_romyPauses();
    results.push({ name: "A Romy → pausa + copy asesora", ...r });
    r = await caseB_silenceWhilePaused();
    results.push({ name: "B texto en pausa → silencio", ...r });
    r = await caseC_ctwaPrefillNoPause();
    results.push({ name: "C CTWA prellenado → no pausa", ...r });
    r = await caseD_shortDeclineIntact();
    results.push({ name: "D 'No quiero' corto → despedida", ...r });
  } finally {
    await cleanupQaPhone(supabase, PHONE);
    console.log("\nCleanup QA OK:", PHONE);
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
