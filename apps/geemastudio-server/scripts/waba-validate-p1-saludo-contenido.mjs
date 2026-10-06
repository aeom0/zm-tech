#!/usr/bin/env node
/**
 * P1 — Saludo + contenido específico (>20 chars) no debe caer en menú bienvenida.
 * Origen: docs/waba/analysis/2026-06-03-analysis.md (hilo …7180 Keissy)
 *
 * Caso A: sin cita → Haiku (detectAITrigger no bloquea por isSaludoWord)
 * Caso B: con cita scheduled → Mi cita (textImpliesExistingAppointment)
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
  pollResponseSince,
  pollOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000998";
const LIFTING_ID = "33fbadcc-30e8-4e82-9913-3a888aea73dc";

/** Texto exacto del análisis 03-jun (62 chars — saludo + contenido de cita). */
const MSG_SALUDO_CONTENIDO =
  "Hola buenas tardes , Yo la coordine para el miércoles a las 4:45 PM";

const WELCOME_MENU_RE =
  /¿En qué podemos ayudarte\?|\[lista\] ZM Lash|Selecciona una categoría/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function setupSinCita() {
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function setupConCita() {
  await supabase.from("whatsapp_sessions").delete().eq("phone", TEST_PHONE);

  const { data: client, error: cErr } = await supabase
    .from("clients")
    .insert({
      name: "QA P1 Sim",
      phone: TEST_PHONE,
      phone_country: "PE",
      phone_normalized: TEST_PHONE.slice(2),
    })
    .select("id")
    .single();
  if (cErr && !String(cErr.message).includes("duplicate")) {
    const { data: existing } = await supabase
      .from("clients")
      .select("id")
      .eq("phone_country", "PE")
      .eq("phone_normalized", TEST_PHONE.slice(2))
      .maybeSingle();
    if (!existing?.id) throw new Error(`client: ${cErr.message}`);
  }
  const clientId =
    client?.id ??
    (
      await supabase
        .from("clients")
        .select("id")
        .eq("phone_country", "PE")
        .eq("phone_normalized", TEST_PHONE.slice(2))
        .maybeSingle()
    ).data?.id ??
    null;

  const { data: appt, error } = await supabase
    .from("appointments")
    .insert({
      client_id: clientId,
      client_name: "QA P1 Sim",
      client_phone: TEST_PHONE,
      service_id: LIFTING_ID,
      employee_id: "emp-vanessa",
      date: "2026-07-03 16:45:00",
      duration: 60,
      price: "50.00",
      status: "scheduled",
    })
    .select("id")
    .single();
  if (error) throw new Error(`appointment: ${error.message}`);

  await supabase.from("appointment_services").insert({
    appointment_id: appt.id,
    service_id: LIFTING_ID,
    employee_id: "emp-vanessa",
  });
}

async function validateSinCita() {
  console.log("\n── P1-A: saludo + contenido SIN cita → Haiku ──");
  await setupSinCita();
  const since = new Date().toISOString();

  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, MSG_SALUDO_CONTENIDO, {
      wamid: newWamid("wamid.qa.p1a"),
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(
    supabase,
    TEST_PHONE,
    since,
  );

  const result = assertOutbound(outbound, haiku, {
    mustNotMatch: [WELCOME_MENU_RE],
    expectHaiku: true,
  });

  logCaseResult("P1-A sin cita", result, outbound);

  return {
    name: "P1-A (Haiku)",
    pass: result.pass,
    note: result.pass
      ? "Haiku atendió sin menú bienvenida"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateConCita() {
  console.log("\n── P1-B: saludo + contenido CON cita → Mi cita ──");
  await setupConCita();
  const since = new Date().toISOString();

  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, MSG_SALUDO_CONTENIDO, {
      wamid: newWamid("wamid.qa.p1b"),
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 22000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [/tu cita con nosotras/i],
    mustNotMatch: [WELCOME_MENU_RE],
    expectHaiku: false,
  });

  logCaseResult("P1-B con cita", result, outbound);

  return {
    name: "P1-B (Mi cita)",
    pass: result.pass,
    note: result.pass
      ? "Mi cita sin menú bienvenida"
      : result.fails.join("; ") || "Falló",
  };
}

async function main() {
  console.log("Validación P1 — teléfono QA:", TEST_PHONE);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  // Margen si se ejecuta tras otra suite (`yarn waba:validate:all`)
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await validateSinCita());
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
    await sleep(4000);
    results.push(await validateConCita());
  } finally {
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
    finishAndExit(results);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
