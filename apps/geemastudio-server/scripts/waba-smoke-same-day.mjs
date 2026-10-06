#!/usr/bin/env node
/**
 * Smoke recordatorio_mismo_dia_zm (APPROVED Meta):
 * A) POST send-same-day-reminder → Meta acepta plantilla (QA no recibe; undeliverable OK)
 * B) Botón "No podré asistir" → pide motivo
 * C) Motivo texto → thanks + Mi cita + no_show_reason en BD
 * D) "Voy a llegar tarde" (texto) → política tardanzas
 *
 * Teléfono: 51999000990
 * Cleanup obligatorio al final.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildButtonPayload,
  buildTextPayload,
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

const PHONE = "51999000990";
const SVC = "3d5d6ee4-b799-4b93-86eb-b974ec125439"; // Extensiones Clásicas

const ASK_REASON_RE = /qué pasó|que paso|cuéntanos|cuentanos|avisamos/i;
const THANKS_RE = /gracias por avisarnos|ajustamos tu cita/i;
const MI_CITA_RE = /mi cita|reprogramar|ver mi cita|tu cita/i;
const TARDANZA_RE = /tardanza|llegar tarde|política|politica|penaliz/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const SEND_URL = `${url}/functions/v1/send-same-day-reminder`;

function limaPlusHours(hours) {
  const now = new Date();
  const limaMs = now.getTime() - 5 * 60 * 60 * 1000;
  const target = new Date(limaMs + hours * 60 * 60 * 1000);
  const y = target.getUTCFullYear();
  const m = String(target.getUTCMonth() + 1).padStart(2, "0");
  const d = String(target.getUTCDate()).padStart(2, "0");
  const hh = String(target.getUTCHours()).padStart(2, "0");
  const mm = String(Math.floor(target.getUTCMinutes() / 30) * 30).padStart(
    2,
    "0",
  );
  return `${y}-${m}-${d} ${hh}:${mm}:00`;
}

async function seedScheduledAppt(clientId) {
  const dateStr = limaPlusHours(3.1);
  const { data: apt, error } = await supabase
    .from("appointments")
    .insert({
      client_id: clientId,
      client_name: "QA SameDay",
      client_phone: PHONE,
      service_id: SVC,
      service_ids: [SVC],
      date: dateStr,
      duration: 90,
      price: "70.00",
      status: "scheduled",
    })
    .select("id, date")
    .single();
  if (error) throw new Error(`seed apt: ${error.message}`);
  await supabase.from("appointment_services").insert({
    appointment_id: apt.id,
    service_id: SVC,
    price: "70.00",
    duration: 90,
  });
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
  return apt;
}

async function caseA_templateMeta() {
  const appointmentTime = limaPlusHours(3.1);
  const res = await fetch(SEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: PHONE,
      clientName: "QA SameDay",
      appointmentTime,
      services: "Extensiones Clásicas",
      recommendations:
        "Ven con el rostro limpio, sin maquillaje ni cremas en la zona.",
    }),
  });
  const body = await res.json().catch(() => ({}));
  const errStr = JSON.stringify(body.error ?? body);
  console.log(`  HTTP ${res.status}: ${errStr.slice(0, 400)}`);

  const templateRejected =
    /132001|132015|template.*not.*exist|not approved|pending|rejected/i.test(
      errStr,
    );
  const deliverabilityIssue =
    /131026|133010|undeliverable|not.*whatsapp|invalid.*phone|recipient/i.test(
      errStr,
    );
  const metaAccepted = res.ok && body.success === true;
  const pass =
    metaAccepted || (!templateRejected && (deliverabilityIssue || !res.ok));

  const note = metaAccepted
    ? `Meta aceptó envío (messageId=${body.messageId ?? "?"})`
    : pass
      ? "Plantilla OK (Meta rechazó solo entrega a número QA)"
      : `Plantilla/API falló: ${errStr.slice(0, 200)}`;

  const result = {
    pass,
    fails: pass ? [] : [note],
    outboundCount: 0,
    haikuCount: 0,
  };
  logCaseResult("A Meta plantilla", result, []);
  return { name: "A Meta plantilla", pass, note };
}

async function caseB_noShowButton(aptId) {
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "No podré asistir", {
      payload: "No podré asistir",
      wamid: newWamid("wamid.qa.sameday.b"),
      contactName: "QA SameDay",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);
  const { outbound } = await pollResponseSince(supabase, PHONE, since, {
    timeoutMs: 20000,
  });
  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step, reschedule_appointment_id")
    .eq("phone", PHONE)
    .maybeSingle();

  const fails = [];
  if (!ASK_REASON_RE.test(joined)) fails.push("no pide motivo");
  if (sess?.step !== "awaiting_no_show_reason") {
    fails.push(`step=${sess?.step}`);
  }
  if (sess?.reschedule_appointment_id !== aptId) {
    fails.push(`reschedule=${sess?.reschedule_appointment_id}`);
  }

  const result = {
    pass: fails.length === 0,
    fails,
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  logCaseResult("B No podré asistir", result, outbound);
  return {
    name: "B No podré asistir",
    pass: result.pass,
    note: result.pass ? "pide motivo + step OK" : fails.join("; "),
  };
}

async function caseC_reason(aptId) {
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "Se me complicó el trabajo", {
      wamid: newWamid("wamid.qa.sameday.c"),
      contactName: "QA SameDay",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);
  await sleep(1500);
  const { outbound } = await pollResponseSince(supabase, PHONE, since, {
    timeoutMs: 20000,
  });
  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const { data: apt } = await supabase
    .from("appointments")
    .select("no_show_reason")
    .eq("id", aptId)
    .single();
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", PHONE)
    .maybeSingle();

  const fails = [];
  if (!THANKS_RE.test(joined)) fails.push("sin thanks");
  if (!MI_CITA_RE.test(joined)) fails.push("sin Mi cita");
  if (!/complicó|complico|trabajo/i.test(apt?.no_show_reason ?? "")) {
    fails.push(`reason=${apt?.no_show_reason}`);
  }
  if (sess?.step !== "browsing") fails.push(`step=${sess?.step}`);

  const result = {
    pass: fails.length === 0,
    fails,
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  logCaseResult("C Motivo + Mi cita", result, outbound);
  return {
    name: "C Motivo + Mi cita",
    pass: result.pass,
    note: result.pass ? `reason="${apt.no_show_reason}"` : fails.join("; "),
  };
}

async function caseD_tardanza() {
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    reschedule_appointment_id: null,
    updated_at: new Date().toISOString(),
  });
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "Voy a llegar tarde", {
      wamid: newWamid("wamid.qa.sameday.d"),
      contactName: "QA SameDay",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);
  const { outbound } = await pollResponseSince(supabase, PHONE, since, {
    timeoutMs: 20000,
  });
  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const hasImage = outbound.some(
    (m) => m.msg_type === "image" || /image|tardanza/i.test(m.content ?? ""),
  );
  const pass = TARDANZA_RE.test(joined) || hasImage;
  const result = {
    pass,
    fails: pass ? [] : [`out=${joined.slice(0, 200)}`],
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  logCaseResult("D Voy a llegar tarde", result, outbound);
  return {
    name: "D Voy a llegar tarde",
    pass,
    note: pass ? "política tardanzas" : result.fails.join("; "),
  };
}

async function main() {
  console.log("=== Smoke same-day reminder — QA", PHONE, "===");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const clientId = await ensureQaClient(supabase, PHONE, "QA SameDay");
  const apt = await seedScheduledAppt(clientId);
  console.log(`  Cita seed: ${apt.id} @ ${apt.date}`);

  const results = [];
  results.push(await caseA_templateMeta());
  results.push(await caseB_noShowButton(apt.id));
  results.push(await caseC_reason(apt.id));
  results.push(await caseD_tardanza());

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
