#!/usr/bin/env node
/**
 * Tope 1 (servicio no-especial / Builder Gel) en el flujo de pago (domingo).
 * Continuación de waba-validate-slot-capacity.mjs — ese script cubre el chequeo
 * en la SELECCIÓN de horario (lista interactiva / texto libre). Este cubre el
 * hueco en processPaymentScreenshot() (payment.ts): la cita real solo se crea
 * al recibir la captura; si el horario se ocupó mientras pagaba, sin este
 * chequeo se creaba una cita duplicada.
 *
 * Capacidad condicional (tope 2 especiales): ver waba-validate-special-overlap.mjs
 * y docs/waba/WABA_CAPACITY.md.
 *
 * Solo aplica a domingo (requiresAdvancePayment) — es el único flujo que llega
 * a processPaymentScreenshot vía step awaiting_payment_screenshot.
 *
 * Casos:
 *  A: Cliente B envía captura de pago para un horario (10:00 AM) que se solapa
 *     con una cita ya scheduled de Cliente A (10:00-11:30 + 30 min turnover) → aviso «no tiene cupo» (notifyHeldSlotLost),
 *     sin crear cita nueva, sesión vuelve a awaiting_datetime.
 *  B (control): Cliente B envía captura para 12:30 PM (libre, después de
 *     que A termina de ocupar el slot, 12:00) → se crea la cita con normalidad.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildImagePayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import {
  seedScheduledAppointment,
  countScheduledAppointments,
} from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  pollResponseSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE_A = "51999000987"; // cliente con cita domingo ya agendada
const PHONE_B = "51999000988"; // cliente que envía captura para el mismo horario

/** Próximo domingo con ≥14 días de margen (adelanto obligatorio); fecha fija se vencía. */
function nextSundayKey(minDaysAhead = 14) {
  const d = new Date(Date.now() - 5 * 3600 * 1000); // Lima
  d.setUTCDate(d.getUTCDate() + minDaysAhead);
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const SUNDAY_KEY = nextSundayKey();
// 10:00-11:30 (90 min) + 30 min de turnover de uñas (slot-occupation.ts) → ocupa hasta 12:00.
// Antes era 11:00: con turnover ocupaba hasta 13:00 y el control de 12:30 (libre) solapaba.
const APPT_START = `${SUNDAY_KEY} 10:00:00`; // employee_id null
/** Builder Gel — no-especial (tope 1). Lifting ahora es especial (tope 2). */
const BUILDER_GEL_ID = "39154b05-1b0d-4ee8-b366-161a7f0aa09d";

const SLOT_TAKEN_RE = /no tiene cupo|Horarios con cupo|ya fue reservado por otra clienta/i;
const RECEIVED_RE = /Recibido|reservada provisionalmente/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/** Lima → UTC ISO (offset fijo -5h) para parsed_datetime de sesión. */
function limaToUtcIso(dateKey, hour, minute = 0) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour + 5, minute, 0)).toISOString();
}

async function seedClienteBAwaitingPayment(hour, minute = 0) {
  const cartItems = JSON.stringify([
    { item_type: "service", item_id: BUILDER_GEL_ID, quantity: 1, price: 70 },
  ]);
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE_B,
    step: "awaiting_payment_screenshot",
    awaiting_screenshot: true,
    cart_items: cartItems,
    cart_service_ids: JSON.stringify([BUILDER_GEL_ID]),
    parsed_datetime: limaToUtcIso(SUNDAY_KEY, hour, minute),
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function validateBloqueoCapturaPagoHorarioOcupado() {
  console.log(
    "\n── Caso A: captura de pago 10:00 AM domingo (solapa cita de A) → bloqueo ──",
  );
  await seedScheduledAppointment(supabase, PHONE_A, {
    serviceId: BUILDER_GEL_ID,
    employeeId: null,
    date: APPT_START,
    clientName: "QA Slot Pago Cliente A",
    sessionStep: "completed",
  });
  await seedClienteBAwaitingPayment(10, 0);
  const apptsBefore = await countScheduledAppointments(supabase, PHONE_B);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildImagePayload(PHONE_B, { wamid: newWamid("wamid.qa.pago.a") }),
  );
  console.log(`  Webhook HTTP ${status}`);

  // notifyHeldSlotLost redacta con Haiku (loguea uso antes de enviar): esperar aviso + selector.
  const outbound = await pollOutboundSince(supabase, PHONE_B, since, {
    timeoutMs: 40000,
    minCount: 2,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [SLOT_TAKEN_RE],
    mustNotMatch: [RECEIVED_RE],
    expectHaiku: false,
  });

  const apptsAfter = await countScheduledAppointments(supabase, PHONE_B);
  const noNewAppt = apptsAfter === apptsBefore;
  const pass = result.pass && noNewAppt;
  if (!noNewAppt) {
    result.fails = [...(result.fails ?? []), "se creó cita para Cliente B"];
  }

  const { data: sessionAfter } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", PHONE_B)
    .maybeSingle();
  const backToDatetime = sessionAfter?.step === "awaiting_datetime";
  if (!backToDatetime) {
    result.fails = [
      ...(result.fails ?? []),
      `sesión no volvió a awaiting_datetime (quedó en ${sessionAfter?.step})`,
    ];
  }
  const finalPass = pass && backToDatetime;

  logCaseResult(
    "Pago-A captura horario ocupado",
    { ...result, pass: finalPass },
    outbound,
  );

  return {
    name: "Caso A (captura de pago, horario ocupado)",
    pass: finalPass,
    note: finalPass
      ? "Bloquea creación de cita duplicada al recibir captura; sesión vuelve a elegir horario"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateCapturaPagoHorarioLibreControl() {
  console.log(
    "\n── Caso B (control): captura de pago 12:30 PM domingo (libre) → éxito ──",
  );
  await cleanupQaPhone(supabase, PHONE_B, { deleteClient: false });
  await seedClienteBAwaitingPayment(12, 30);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildImagePayload(PHONE_B, { wamid: newWamid("wamid.qa.pago.b") }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_B, since);

  const result = assertOutbound(outbound, haiku, {
    mustMatch: [RECEIVED_RE],
    mustNotMatch: [SLOT_TAKEN_RE],
    expectHaiku: false,
  });

  const apptsAfter = await countScheduledAppointments(supabase, PHONE_B);
  const pass = result.pass && apptsAfter === 1;
  if (apptsAfter !== 1) {
    result.fails = [
      ...(result.fails ?? []),
      `esperaba 1 cita creada para Cliente B, hay ${apptsAfter}`,
    ];
  }

  logCaseResult(
    "Pago-B captura horario libre (control)",
    { ...result, pass },
    outbound,
  );

  return {
    name: "Caso B (control, captura horario libre)",
    pass,
    note: pass
      ? "Horario libre crea la cita con normalidad (sin falso positivo)"
      : result.fails.join("; ") || "Falló",
  };
}

async function main() {
  console.log(
    "Validación capacidad en flujo de pago — teléfonos QA:",
    PHONE_A,
    PHONE_B,
  );
  await cleanupQaPhone(supabase, PHONE_A, { deleteClient: true });
  await cleanupQaPhone(supabase, PHONE_B, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await validateBloqueoCapturaPagoHorarioOcupado());
    await sleep(4000);
    results.push(await validateCapturaPagoHorarioLibreControl());
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
