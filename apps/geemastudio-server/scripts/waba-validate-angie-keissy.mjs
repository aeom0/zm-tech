#!/usr/bin/env node
/**
 * Simula casos Angie / Keissy contra whatsapp-webhook en prod.
 * Usa teléfono QA 51999000997 (no clienta real). Limpia datos al final.
 *
 * Uso: yarn waba:validate
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
  sleep,
  fetchOutboundSince,
  fetchHaikuSince,
  pollOutboundSince,
  pollResponseSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000997";
const LIFTING_ID = "33fbadcc-30e8-4e82-9913-3a888aea73dc";
const PLANCHADO_ID = "svc-planchado-cejas";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function setupAngieSession() {
  const cartItems = JSON.stringify([
    { item_type: "service", item_id: PLANCHADO_ID, quantity: 1, price: 50 },
    { item_type: "service", item_id: LIFTING_ID, quantity: 1, price: 50 },
  ]);
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "awaiting_datetime",
    cart_items: cartItems,
    cart_service_ids: "[]",
    selected_day: null,
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
  await supabase.from("wa_messages").insert([
    {
      phone: TEST_PHONE,
      direction: "in",
      msg_type: "text",
      content: "Cuánto está planchado de cejas y lifting de pestañas?",
    },
    {
      phone: TEST_PHONE,
      direction: "out",
      msg_type: "text",
      content:
        "✅ Listo — agregué: Planchado de Cejas, Lifting de Pestañas · 📅 ¿Qué día prefieres?",
    },
  ]);
}

async function setupKeissyAppointment() {
  const apptDate = "2026-07-02 16:45:00";
  const { data: existing } = await supabase
    .from("clients")
    .select("id")
    .eq("phone_country", "PE")
    .eq("phone_normalized", TEST_PHONE.slice(2))
    .maybeSingle();

  let clientId = existing?.id ?? null;
  if (!clientId) {
    const { data: created, error: cErr } = await supabase
      .from("clients")
      .insert({
        name: "QA Keissy Sim",
        phone: TEST_PHONE,
        phone_country: "PE",
        phone_normalized: TEST_PHONE.slice(2),
      })
      .select("id")
      .single();
    if (!cErr) clientId = created?.id ?? null;
  }

  const { data: appt, error: aErr } = await supabase
    .from("appointments")
    .insert({
      client_id: clientId,
      client_name: "QA Keissy Sim",
      client_phone: TEST_PHONE,
      service_id: LIFTING_ID,
      employee_id: "emp-vanessa",
      date: apptDate,
      duration: 60,
      price: "50.00",
      status: "scheduled",
    })
    .select("id, date")
    .single();
  if (aErr) throw new Error(`appointment: ${aErr.message}`);

  await supabase.from("appointment_services").insert({
    appointment_id: appt.id,
    service_id: LIFTING_ID,
    employee_id: "emp-vanessa",
  });

  return appt;
}

async function validateAngie() {
  await setupAngieSession();
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Hay alguna promo por ambas? Quisiera ir hoy"),
  );
  console.log(`  Angie webhook HTTP ${status}`);
  const { outbound, haiku } = await pollResponseSince(
    supabase,
    TEST_PHONE,
    since,
  );
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [/promo|pack|90|laminado|planchado|rebaja|oferta/i],
    mustNotMatch: [/usa los \*?botones/i],
    expectHaiku: true,
  });

  logCaseResult("Angie — promo en awaiting_datetime", result, outbound);

  return {
    name: "Angie",
    pass: result.pass,
    note: result.outboundCount
      ? "OUT con contenido promo"
      : "Haiku OK sin OUT (número QA)",
  };
}

async function validateKeissy() {
  await supabase.from("whatsapp_sessions").delete().eq("phone", TEST_PHONE);
  const appt = await setupKeissyAppointment();
  const dateOk = String(appt.date).includes("16:45");
  const since = new Date().toISOString();

  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "No es a las 11", {
      wamid: newWamid("wamid.qa.keissy"),
    }),
  );
  await sleep(100);
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Es a las 4:45 PM", {
      wamid: newWamid("wamid.qa.keissy"),
    }),
  );
  console.log(`  Keissy ráfaga enviada · date BD 16:45: ${dateOk}`);
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 22000,
  });
  const result = assertOutbound(outbound, [], {
    mustMatch: [/tu cita con nosotras/i, /4:45|16:45/i],
    mustNotMatch: [/bienvenid|menú principal|elige una opción del menú/i],
    expectHaiku: false,
    allowPartialWithoutOut: false,
  });

  const pass = dateOk && result.pass;
  logCaseResult("Keissy — Mi cita + coalesce", { ...result, pass }, outbound);

  return {
    name: "Keissy",
    pass,
    note: result.pass ? "Mi cita con 4:45 PM" : "Revisar respuesta",
  };
}

async function main() {
  console.log("Validación WABA — QA:", TEST_PHONE);
  console.log("Webhook:", webhookUrl);

  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  const results = [];
  try {
    results.push(await validateAngie());
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
    await sleep(4000);
    results.push(await validateKeissy());
  } finally {
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
    finishAndExit(results);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
