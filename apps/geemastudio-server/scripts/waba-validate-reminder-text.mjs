#!/usr/bin/env node
/**
 * REMINDER_TEXT_CONFIRM — «sí» texto libre con cita scheduled → confirma (03-ago).
 * Fix 03-ago (PR #30 bug): el bloque confirmaba con cualquier cita pendiente,
 * sin exigir step="browsing" ni un recordatorio saliente reciente — pisaba
 * flujos en curso (awaiting_datetime, Haiku, identidad) que también reciben
 * "sí" como respuesta. Ahora exige AMBAS guardas.
 * Tel: 51999000988
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
  seedScheduledAppointment,
  seedOutboundAt,
} from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000988";
const CONFIRM_RE = /cita est[aá] confirmada|Te esperamos/i;
const CART_SVC_ID = "3d5d6ee4-b799-4b93-86eb-b974ec125439"; // Extensiones Clásicas (QA)

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function nextWeekdayLima() {
  const d = new Date();
  const lima = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  for (let i = 1; i <= 7; i++) {
    const t = new Date(lima);
    t.setUTCDate(lima.getUTCDate() + i);
    if (t.getUTCDay() >= 1 && t.getUTCDay() <= 6) {
      const y = t.getUTCFullYear();
      const m = String(t.getUTCMonth() + 1).padStart(2, "0");
      const day = String(t.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day} 15:00:00`;
    }
  }
  return "2026-08-10 15:00:00";
}

async function seedReminderSentAgo(phone, ageMsAgo = 60 * 60 * 1000) {
  await seedOutboundAt(
    supabase,
    phone,
    [
      {
        msg_type: "template",
        content:
          "[plantilla:recordatorio_cita_zm] QA Reminder Sí · Lunes 3:00 PM · Extensiones Clásicas",
      },
    ],
    ageMsAgo,
  );
}

async function seedActiveCart(phone, step) {
  await supabase.from("whatsapp_sessions").upsert({
    phone,
    step,
    cart_items: JSON.stringify([
      { item_type: "service", item_id: CART_SVC_ID, quantity: 1, price: 90 },
    ]),
    cart_service_ids: JSON.stringify([CART_SVC_ID]),
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function caseSiConfirm() {
  console.log(
    "\n── Reminder-A: texto «sí» con recordatorio reciente → confirmación ──",
  );
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    date: nextWeekdayLima(),
    clientName: "QA Reminder Sí",
    sessionStep: "browsing",
  });
  await seedReminderSentAgo(TEST_PHONE);
  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "sí", { wamid: newWamid() }),
  );
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });
  const result = assertOutbound(outbound, [], {
    mustMatch: [CONFIRM_RE],
    mustNotMatch: [/Categorías|¿Qué deseas/i],
  });
  logCaseResult("Reminder-A sí → confirm", result, outbound);
  return {
    name: "Reminder-A (sí con recordatorio → confirmada)",
    pass: result.pass,
    note: result.pass ? "confirm OK" : result.fails.join("; "),
  };
}

async function caseActiveFlowNotHijacked() {
  console.log(
    "\n── Reminder-B: step=awaiting_datetime + carrito + cita pendiente + SIN recordatorio → no debe confirmar ──",
  );
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    date: nextWeekdayLima(),
    clientName: "QA Reminder Sí",
    sessionStep: "awaiting_datetime",
  });
  // Carrito activo distinto de la cita ya agendada; sin recordatorio en wa_messages.
  await seedActiveCart(TEST_PHONE, "awaiting_datetime");
  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "sí", { wamid: newWamid() }),
  );
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });
  const result = assertOutbound(outbound, [], {
    mustNotMatch: [CONFIRM_RE],
  });
  logCaseResult("Reminder-B awaiting_datetime no hijack", result, outbound);
  return {
    name: "Reminder-B (flujo activo no debe confirmarse por atajo)",
    pass: result.pass,
    note: result.pass ? "no confirmó (correcto)" : result.fails.join("; "),
  };
}

async function caseReminderSentConfirms() {
  console.log(
    "\n── Reminder-C: step=browsing + carrito + cita pendiente + CON recordatorio reciente → sí debe confirmar ──",
  );
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    date: nextWeekdayLima(),
    clientName: "QA Reminder Sí",
    sessionStep: "browsing",
  });
  await seedActiveCart(TEST_PHONE, "browsing");
  await seedReminderSentAgo(TEST_PHONE);
  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "sí", { wamid: newWamid() }),
  );
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });
  const result = assertOutbound(outbound, [], {
    mustMatch: [CONFIRM_RE],
  });
  logCaseResult("Reminder-C con recordatorio → confirm", result, outbound);
  return {
    name: "Reminder-C (browsing + recordatorio reciente → confirmada)",
    pass: result.pass,
    note: result.pass ? "confirm OK" : result.fails.join("; "),
  };
}

async function caseStepGuardAloneBlocks() {
  console.log(
    "\n── Reminder-D: step=awaiting_datetime + carrito + cita pendiente + CON recordatorio reciente → guard de step solo ya debe bloquear ──",
  );
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    date: nextWeekdayLima(),
    clientName: "QA Reminder Sí",
    sessionStep: "awaiting_datetime",
  });
  await seedActiveCart(TEST_PHONE, "awaiting_datetime");
  // A diferencia de Reminder-B, aquí SÍ hay recordatorio reciente — el guard 2
  // (wasAppointmentReminderRecentlySent) pasaría solo. Este caso aísla que el
  // guard 1 (session.step) por sí solo ya bloquea la confirmación, sin depender
  // de que el guard 2 también falle (que es lo que hace Reminder-B).
  await seedReminderSentAgo(TEST_PHONE);
  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "sí", { wamid: newWamid() }),
  );
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });
  const result = assertOutbound(outbound, [], {
    mustNotMatch: [CONFIRM_RE],
  });
  logCaseResult("Reminder-D step guard aislado", result, outbound);
  return {
    name: "Reminder-D (guard de step solo debe bloquear, aunque haya recordatorio)",
    pass: result.pass,
    note: result.pass ? "no confirmó (correcto)" : result.fails.join("; "),
  };
}

async function main() {
  console.log("Validación reminder text confirm — tel:", TEST_PHONE);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  if (!process.env.WABA_VALIDATE_SUITE) await sleep(2000);

  const results = [];
  results.push(await caseSiConfirm());
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  await sleep(1500);
  results.push(await caseActiveFlowNotHijacked());
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  await sleep(1500);
  results.push(await caseReminderSentConfirms());
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  await sleep(1500);
  results.push(await caseStepGuardAloneBlocks());
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
