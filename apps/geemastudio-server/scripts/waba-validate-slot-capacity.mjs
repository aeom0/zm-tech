#!/usr/bin/env node
/**
 * Capacidad global — freno de asignación (servicios no-especiales = tope 1).
 * Origen: incidente Nanny Vera (+51 994 882 795) — el bot ofreció/aceptó un
 * horario ya ocupado por otra clienta. Causa raíz: checkAvailability() filtraba
 * por employee_id, que siempre es null en el modelo "cita por horario" (se
 * asigna chica después manualmente) — el chequeo nunca detectaba el
 * solapamiento real. Fix: countOverlappingAppointments() cuenta CUALQUIER cita
 * scheduled (cualquier employee_id) que se solape con el horario propuesto.
 *
 * Ago-2026: carritos 100% especiales (lifting/depilación/microblading + extras)
 * permiten tope 2 — ver waba-validate-special-overlap.mjs. Este script usa
 * Builder Gel (cat-unas) para seguir validando el tope 1.
 *
 * Casos:
 *  A: Cliente B intenta agendar por TEXTO LIBRE un horario que se solapa
 *     (medio horario, 14:30) con una cita ya scheduled de Cliente A (14:00-15:30)
 *     → debe bloquear con SLOT_TAKEN_MESSAGE, sin crear cita nueva.
 *  B: Cliente B intenta agendar por LISTA INTERACTIVA (tap time_) el mismo
 *     horario exacto (14:00) que la cita de Cliente A → mismo bloqueo.
 *  C (control): Cliente B agenda un horario libre ese día (16:30, después de
 *     que termina la cita de Cliente A) → debe completarse con éxito
 *     ("cita está confirmada/anotada"), NO debe aparecer SLOT_TAKEN_MESSAGE.
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
  seedScheduledAppointment,
  seedSessionWithCart,
  countScheduledAppointments,
} from "./lib/waba-sim-seed.mjs";
import {
  pollResponseSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE_A = "51999000989"; // cliente con cita ya agendada (ocupa el horario)
const PHONE_B = "51999000990"; // cliente que intenta chocar con ese horario

function nextWeekdayKey(weekday /* 0=dom */, minDaysAhead = 14) {
  // Fecha futura móvil: el fixture fijo se pudo en el pasado y hacía fallar los casos "horario libre".
  const d = new Date(Date.now() + minDaysAhead * 86400000);
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const FUTURE_DATE_KEY = nextWeekdayKey(1); // lunes futuro (tope 1 con servicio no-especial)
const APPT_START = `${FUTURE_DATE_KEY} 14:00:00`; // 14:00-15:30 (90 min), employee_id null
/** Builder Gel (cat-unas) — no-especial; Lifting ahora permite tope 2 y rompería este QA. */
const BUILDER_GEL_ID = "39154b05-1b0d-4ee8-b366-161a7f0aa09d";

const SLOT_TAKEN_RE = /no tiene cupo|Horarios con cupo|ya fue reservado por otra clienta/i;
const CONFIRMED_RE = /¡Tu cita está (confirmada|anotada)!/i;
const ALLOWED_RE =
  /¡Tu cita está (confirmada|anotada)!|adelanto de S\/\s*25|Sigue estos pasos para agendar|Una precisión sobre tu cita/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedClienteBAwaitingDatetime() {
  await seedSessionWithCart(supabase, PHONE_B, BUILDER_GEL_ID, 70);
  await supabase
    .from("whatsapp_sessions")
    .update({
      step: "awaiting_datetime",
      selected_day: FUTURE_DATE_KEY,
      updated_at: new Date().toISOString(),
    })
    .eq("phone", PHONE_B);
}

async function validateBloqueoTextoLibreMedioHorario() {
  console.log(
    "\n── Caso A: texto libre 2:30 pm (solapa cita 14:00-15:30) → bloqueo ──",
  );
  await seedScheduledAppointment(supabase, PHONE_A, {
    serviceId: BUILDER_GEL_ID,
    employeeId: null,
    date: APPT_START,
    clientName: "QA Slot Cliente A",
    sessionStep: "completed",
  });
  await seedClienteBAwaitingDatetime();
  const apptsBefore = await countScheduledAppointments(supabase, PHONE_B);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_B, "2:30 pm", {
      wamid: newWamid("wamid.qa.slot.a"),
      contactName: "QA Slot Cliente B",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_B, since);

  const result = assertOutbound(outbound, haiku, {
    mustMatch: [SLOT_TAKEN_RE],
    mustNotMatch: [CONFIRMED_RE],
    expectHaiku: false,
  });

  const apptsAfter = await countScheduledAppointments(supabase, PHONE_B);
  const noNewAppt = apptsAfter === apptsBefore;
  const pass = result.pass && noNewAppt;
  if (!noNewAppt) {
    result.fails = [...(result.fails ?? []), "se creó cita para Cliente B"];
  }

  logCaseResult("Slot-A texto libre 2:30pm", { ...result, pass }, outbound);

  return {
    name: "Caso A (texto libre, medio horario solapado)",
    pass,
    note: pass
      ? "Bloquea horario ya ocupado por otra clienta, sin crear cita"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateBloqueoListaInteractivaMismoHorario() {
  console.log(
    "\n── Caso B: lista interactiva 14:00 (mismo horario exacto) → bloqueo ──",
  );
  await cleanupQaPhone(supabase, PHONE_B, { deleteClient: false });
  await seedClienteBAwaitingDatetime();
  const apptsBefore = await countScheduledAppointments(supabase, PHONE_B);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildInteractivePayload(
      PHONE_B,
      `time_${FUTURE_DATE_KEY}T1400`,
      "2:00 PM",
      { wamid: newWamid("wamid.qa.slot.b"), contactName: "QA Slot Cliente B" },
    ),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_B, since);

  const result = assertOutbound(outbound, haiku, {
    mustMatch: [SLOT_TAKEN_RE],
    mustNotMatch: [CONFIRMED_RE],
    expectHaiku: false,
  });

  const apptsAfter = await countScheduledAppointments(supabase, PHONE_B);
  const noNewAppt = apptsAfter === apptsBefore;
  const pass = result.pass && noNewAppt;
  if (!noNewAppt) {
    result.fails = [...(result.fails ?? []), "se creó cita para Cliente B"];
  }

  logCaseResult(
    "Slot-B lista interactiva 14:00",
    { ...result, pass },
    outbound,
  );

  return {
    name: "Caso B (lista interactiva, mismo horario exacto)",
    pass,
    note: pass
      ? "Bloquea tap de horario ya ocupado, sin crear cita"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateHorarioLibreControl() {
  console.log(
    "\n── Caso C (control): 4:30 pm libre (después de la cita de A) → éxito ──",
  );
  await cleanupQaPhone(supabase, PHONE_B, { deleteClient: false });
  await seedClienteBAwaitingDatetime();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_B, "4:30 pm", {
      wamid: newWamid("wamid.qa.slot.c"),
      contactName: "QA Slot Cliente B",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_B, since);

  const result = assertOutbound(outbound, haiku, {
    mustMatch: [ALLOWED_RE],
    mustNotMatch: [SLOT_TAKEN_RE],
    expectHaiku: false,
  });

  logCaseResult("Slot-C horario libre (control)", result, outbound);

  return {
    name: "Caso C (control, horario libre)",
    pass: result.pass,
    note: result.pass
      ? "Horario libre se agenda con normalidad (sin falso positivo)"
      : result.fails.join("; ") || "Falló",
  };
}

async function main() {
  console.log(
    "Validación capacidad de horario — teléfonos QA:",
    PHONE_A,
    PHONE_B,
  );
  await cleanupQaPhone(supabase, PHONE_A, { deleteClient: true });
  await cleanupQaPhone(supabase, PHONE_B, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await validateBloqueoTextoLibreMedioHorario());
    await sleep(4000);
    results.push(await validateBloqueoListaInteractivaMismoHorario());
    await sleep(4000);
    results.push(await validateHorarioLibreControl());
  } finally {
    await cleanupQaPhone(supabase, PHONE_A, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_B, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
