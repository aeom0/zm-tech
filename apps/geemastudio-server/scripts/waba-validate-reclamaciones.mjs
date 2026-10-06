#!/usr/bin/env node
/**
 * QA Libro de Reclamaciones: enlace + pausa del bot + push al staff.
 * A) "Quiero poner un reclamo" en browsing → pausa + enlace al libro
 * B) "¿Dónde está el libro de reclamaciones?" a mitad del pago (awaiting_payment_screenshot) → pausa + enlace
 * C) Garantía ("se me cayeron… quiero reclamar la garantía") → NO pausa, sigue el gate de garantía
 * D) Texto con el bot ya pausado → silencio (staff toma el chat)
 *
 * Teléfono: 51999000985 (excepción QA que SÍ pausa; no paralelizar con design-pause/personal-advice).
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
  fetchOutboundSince,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";
import { DESIGN_PAUSE_QA_PHONE } from "../supabase/functions/whatsapp-webhook/lib/design-staff-hours.mjs";

const PHONE = DESIGN_PAUSE_QA_PHONE;
const POLY_GEL_ID = "e3d429cb-3387-45c2-b965-c94b28c81330";
const LIBRO_RE = /zmlashnails\.com\/libro-de-reclamaciones/i;
const GARANTIA_RE = /garant[ií]a/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seed({ step = "browsing", paused = false } = {}) {
  await ensureQaClient(supabase, PHONE, "QA Reclamaciones");
  const inPayment = step === "awaiting_payment_screenshot";
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step,
    awaiting_screenshot: inPayment,
    cart_items: JSON.stringify(
      inPayment
        ? [
            {
              item_type: "service",
              item_id: POLY_GEL_ID,
              quantity: 1,
              price: 70,
            },
          ]
        : [],
    ),
    cart_service_ids: JSON.stringify(inPayment ? [POLY_GEL_ID] : []),
    employee_assignments: "{}",
    bot_paused_at: paused ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  });
}

async function getSession() {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("bot_paused_at, step")
    .eq("phone", PHONE)
    .maybeSingle();
  return data;
}

function send(text, tag) {
  return postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, text, {
      wamid: newWamid(`wamid.qa.reclamo.${tag}`),
      contactName: "QA Reclamaciones",
    }),
  );
}

async function replyTo(text, tag, timeoutMs = 20000) {
  const since = new Date().toISOString();
  const status = await send(text, tag);
  if (status < 200 || status >= 300) return { status, outbound: [] };
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    timeoutMs,
    minCount: 1,
  });
  await sleep(800);
  return { status, outbound };
}

const joinText = (outbound) => outbound.map((m) => m.content ?? "").join("\n");

async function caseA() {
  await cleanupQaPhone(supabase, PHONE);
  await seed();
  const { status, outbound } = await replyTo("Quiero poner un reclamo", "a");
  if (status < 200 || status >= 300)
    return { pass: false, note: `webhook ${status}` };
  const sess = await getSession();
  const paused = Boolean(sess?.bot_paused_at);
  const link = LIBRO_RE.test(joinText(outbound));
  return {
    pass: paused && link,
    note: `paused=${paused} link=${link} outs=${outbound.length}`,
  };
}

async function caseB() {
  await cleanupQaPhone(supabase, PHONE);
  await seed({ step: "awaiting_payment_screenshot" });
  const { status, outbound } = await replyTo(
    "¿Dónde está el libro de reclamaciones?",
    "b",
  );
  if (status < 200 || status >= 300)
    return { pass: false, note: `webhook ${status}` };
  const sess = await getSession();
  const paused = Boolean(sess?.bot_paused_at);
  const link = LIBRO_RE.test(joinText(outbound));
  return {
    pass: paused && link,
    note: `paused=${paused} link=${link} step=${sess?.step}`,
  };
}

async function caseC() {
  await cleanupQaPhone(supabase, PHONE);
  await seed();
  const { status, outbound } = await replyTo(
    "Se me cayeron las pestañas, quiero reclamar la garantía",
    "c",
  );
  if (status < 200 || status >= 300)
    return { pass: false, note: `webhook ${status}` };
  const sess = await getSession();
  const text = joinText(outbound);
  const notPaused = !sess?.bot_paused_at;
  const garantia = GARANTIA_RE.test(text);
  const noLink = !LIBRO_RE.test(text);
  return {
    pass: notPaused && garantia && noLink,
    note: `notPaused=${notPaused} garantia=${garantia} noLink=${noLink}`,
  };
}

async function caseD() {
  await seed({ paused: true });
  const since = new Date().toISOString();
  await sleep(200);
  const status = await send("Quiero poner un reclamo", "d");
  if (status < 200 || status >= 300)
    return { pass: false, note: `webhook ${status}` };
  await sleep(10000);
  const outbound = await fetchOutboundSince(supabase, PHONE, since);
  return {
    pass: outbound.length === 0,
    note: `outs=${outbound.length} (esperado 0)`,
  };
}

async function main() {
  console.log("\n=== QA libro de reclamaciones ===\n");
  console.log(`Teléfono: ${PHONE}\n`);
  const results = [];
  try {
    let r = await caseA();
    results.push({ name: "A reclamo en browsing → pausa + enlace", ...r });
    r = await caseB();
    results.push({
      name: "B pide el libro a mitad del pago → pausa + enlace",
      ...r,
    });
    r = await caseC();
    results.push({ name: "C garantía → sin pausa, gate de garantía", ...r });
    r = await caseD();
    results.push({ name: "D texto en pausa → silencio", ...r });
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
