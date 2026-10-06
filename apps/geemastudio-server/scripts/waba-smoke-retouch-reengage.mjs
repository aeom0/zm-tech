#!/usr/bin/env node
/**
 * Smoke retoque_reenganche_zm (APPROVED Meta) — SOLO teléfono QA.
 *
 * A) POST send-retouch-reengage → Meta acepta plantilla
 *    (número QA suele ser undeliverable 131026 — OK si no es rechazo de plantilla)
 * B) Botón "Agendar" (webhook sim) → texto + calendario / carrito
 * C) Botón "Más adelante" → cierre cálido
 *
 * Teléfono: 51999000980  (nunca clientas reales)
 * Cleanup obligatorio al final.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildButtonPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  pollResponseSince,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000980";
/** Soft Gel - Nuevo Set (última visita) → oferta 1B Soft Gel Retoque */
const LAST_SVC = "1e15a516-95b1-4be3-bc0d-88f530bc6011";
const OFFER_SVC = "fa50e0c9-93cc-4004-ab9e-8f9b00506105";

const DATE_LIST_RE = /elige|día|fecha|hora|calendario|próximos|próximo/i;
const MAS_ADELANTE_RE =
  /sin problema|cuando quieras|aquí estamos|aqui estamos|cuando gustes|no hay prisa|cuando sientas|estamos acá|estamos aqui|nosotras estamos|aquí estaremos|aqui estaremos|cuando estés|cuando estes|perfecto/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const SEND_URL = `${url}/functions/v1/send-retouch-reengage`;

async function seedCompletedVisit(clientId) {
  const past = new Date();
  past.setDate(past.getDate() - 40);
  const dateStr = past.toISOString().slice(0, 19).replace("T", " ");
  const { data: apt, error } = await supabase
    .from("appointments")
    .insert({
      client_id: clientId,
      client_name: "QA Retoque Smoke",
      client_phone: PHONE,
      service_id: LAST_SVC,
      service_ids: [LAST_SVC],
      date: dateStr,
      duration: 90,
      price: "80.00",
      status: "completed",
    })
    .select("id")
    .single();
  if (error) throw new Error(`seed apt: ${error.message}`);
  await supabase.from("appointment_services").insert({
    appointment_id: apt.id,
    service_id: LAST_SVC,
    price: "80.00",
    duration: 90,
  });
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    retouch_offer_service_id: null,
    retouch_offer_sent_at: null,
    updated_at: new Date().toISOString(),
  });
  return apt.id;
}

async function caseA_templateMeta(clientId) {
  console.log("\n── A: Meta plantilla via send-retouch-reengage (QA only) ──");
  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      clientId,
      bypassCooldown: true,
      bypassInterval: true,
    }),
  });
  const body = await res.json().catch(() => ({}));
  const errStr = JSON.stringify(body.error ?? body);
  console.log(`  HTTP ${res.status}: ${errStr.slice(0, 500)}`);

  const templateRejected =
    /132001|132015|template.*not.*exist|not approved|pending|rejected/i.test(
      errStr,
    );
  const deliverabilityIssue =
    /131026|133010|undeliverable|not.*whatsapp|invalid.*phone|recipient/i.test(
      errStr,
    );
  const metaAccepted =
    res.ok && body.ok === true && Boolean(body.messageId || body.phone);
  const pass =
    metaAccepted ||
    (!templateRejected && (deliverabilityIssue || body.ok === true));

  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select(
      "retouch_offer_service_id, retouch_offer_sent_at, retouch_offer_source",
    )
    .eq("phone", PHONE)
    .maybeSingle();

  const fails = [];
  if (!pass) fails.push(`Plantilla/API: ${errStr.slice(0, 200)}`);
  if (metaAccepted || deliverabilityIssue || body.ok) {
    if (!sess?.retouch_offer_sent_at && metaAccepted) {
      fails.push("sesión sin retouch_offer_sent_at");
    }
  }

  const note = metaAccepted
    ? `Meta aceptó (messageId=${body.messageId ?? "?"}, svc=${body.serviceName ?? sess?.retouch_offer_service_id ?? "?"})`
    : pass
      ? "Plantilla OK (Meta rechazó solo entrega a número QA)"
      : fails.join("; ") || errStr.slice(0, 200);

  const result = {
    pass: fails.length === 0 && pass,
    fails: fails.length ? fails : pass ? [] : [note],
    outboundCount: 0,
    haikuCount: 0,
  };
  logCaseResult("A Meta plantilla", result, []);
  return { name: "A Meta plantilla", pass: result.pass, note };
}

async function caseB_agendar() {
  console.log("\n── B: Botón Agendar (webhook sim) ──");
  // Asegurar oferta en sesión (si Meta no entregó, seed manual igual que validate)
  const { data: sess0 } = await supabase
    .from("whatsapp_sessions")
    .select("retouch_offer_service_id")
    .eq("phone", PHONE)
    .maybeSingle();
  if (!sess0?.retouch_offer_service_id) {
    await supabase.from("whatsapp_sessions").upsert({
      phone: PHONE,
      step: "browsing",
      cart_items: "[]",
      cart_service_ids: "[]",
      employee_assignments: "{}",
      retouch_offer_service_id: OFFER_SVC,
      retouch_offer_source: "manual",
      retouch_offer_sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Agendar", {
      payload: "Agendar",
      wamid: newWamid("wamid.qa.retouch.smoke.b"),
      contactName: "QA Retoque Smoke",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  let outbound = [];
  let haiku = [];
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    await sleep(1500);
    const polled = await pollResponseSince(supabase, PHONE, since, {
      timeoutMs: 2000,
    });
    outbound = polled.outbound;
    haiku = polled.haiku;
    const { data: sess } = await supabase
      .from("whatsapp_sessions")
      .select("step, cart_items")
      .eq("phone", PHONE)
      .maybeSingle();
    let cart = [];
    try {
      cart = JSON.parse(sess?.cart_items ?? "[]");
    } catch {
      /* ignore */
    }
    const joined = outbound.map((m) => m.content ?? "").join("\n");
    if (
      DATE_LIST_RE.test(joined) ||
      cart.some((i) => i.item_id === OFFER_SVC) ||
      sess?.step === "awaiting_datetime"
    ) {
      break;
    }
  }

  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step, cart_items")
    .eq("phone", PHONE)
    .maybeSingle();
  let cart = [];
  try {
    cart = JSON.parse(sess?.cart_items ?? "[]");
  } catch {
    /* ignore */
  }
  const hasCalendar =
    DATE_LIST_RE.test(joined) || sess?.step === "awaiting_datetime";
  const hasOffer = cart.some((i) => i.item_id === OFFER_SVC);
  const fails = [];
  if (!hasCalendar && !hasOffer) {
    fails.push(`sin calendario/carrito: ${joined.slice(0, 180)}`);
  }

  const result = {
    pass: fails.length === 0,
    fails,
    outboundCount: outbound.length,
    haikuCount: haiku.length,
  };
  logCaseResult("B Agendar", result, outbound);
  return {
    name: "B Agendar",
    pass: result.pass,
    note: result.pass
      ? `calendario/carrito OK (haiku=${haiku.length})`
      : fails.join("; "),
  };
}

async function caseC_masAdelante() {
  console.log("\n── C: Botón Más adelante (webhook sim) ──");
  // Aislar de B: cleanup + pausa (waitUntil de Agendar puede seguir enviando lista)
  await cleanupQaPhone(supabase, PHONE, { deleteClient: false });
  await ensureQaClient(supabase, PHONE, "QA Retoque Smoke");
  await sleep(4000);
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    retouch_offer_service_id: OFFER_SVC,
    retouch_offer_source: "manual",
    retouch_offer_sent_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Más adelante", {
      payload: "Más adelante",
      wamid: newWamid("wamid.qa.retouch.smoke.c"),
      contactName: "QA Retoque Smoke",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  let outbound = [];
  const deadline = Date.now() + 18000;
  while (Date.now() < deadline) {
    await sleep(1500);
    const polled = await pollResponseSince(supabase, PHONE, since, {
      timeoutMs: 2000,
    });
    outbound = polled.outbound;
    if (outbound.length > 0) break;
  }
  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const hasCalendar = outbound.some(
    (m) =>
      m.msg_type === "interactive" &&
      /fecha|día|hora|calendario/i.test(m.content ?? ""),
  );
  const warm = MAS_ADELANTE_RE.test(joined);
  const fails = [];
  if (!warm) fails.push("sin cierre cálido");
  if (hasCalendar) fails.push("envió calendario (no debía)");
  if (outbound.length === 0) fails.push("sin outbound");

  const result = {
    pass: fails.length === 0,
    fails,
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  logCaseResult("C Más adelante", result, outbound);
  return {
    name: "C Más adelante",
    pass: result.pass,
    note: result.pass ? "cierre cálido" : fails.join("; "),
  };
}

async function main() {
  console.log("=== Smoke retoque_reenganche_zm — QA", PHONE, "ONLY ===");
  console.log("(No cron, no clientas reales)\n");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const clientId = await ensureQaClient(supabase, PHONE, "QA Retoque Smoke");
  const aptId = await seedCompletedVisit(clientId);
  console.log(`  Client ${clientId} · completed apt ${aptId}`);

  const results = [];
  results.push(await caseA_templateMeta(clientId));
  results.push(await caseB_agendar());
  results.push(await caseC_masAdelante());

  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  console.log("\nCleanup QA OK");
  finishAndExit(results);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
