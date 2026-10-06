#!/usr/bin/env node
/**
 * held-slot-watch: al crearse una cita, avisa a los carritos que esperaban el
 * abono en una hora que esa cita acaba de cerrar (caso Mirta Aguayo, sep-2026).
 *
 * Requiere desplegadas `held-slot-watch` y `whatsapp-webhook`, y la migración
 * `notify_held_slot_on_appointment` (trigger AFTER INSERT en appointments).
 *
 * Casos:
 *  A: B espera el abono para domingo 10:00; se agenda la cita de A en ese mismo
 *     horario → B recibe el aviso («no tiene cupo»), la sesión vuelve a
 *     awaiting_datetime y no se le crea cita.
 *  B (control): B espera el abono para 12:30 y la cita de A ocupa 10:00-12:00 →
 *     B no recibe nada y su sesión sigue esperando el comprobante.
 *  D (caso Mirta): clienta nueva en awaiting_deposit_boleta con uñas mañana a las 16:00 (las 10:00 pueden tener citas reales);
 *     se agenda otra cita a esa hora → aviso de Haiku + selector de horas del día.
 *  C: B ya recibió el aviso, vuelve a quedar en espera del abono y envía el
 *     comprobante dos veces seguidas → ambas veces recibe respuesta
 *     («no hagas otro pago»); el camino del pago no usa debounce.
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
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE_A = "51999000990"; // agenda la cita que cierra el cupo
const PHONE_B = "51999000991"; // carrito esperando el abono

/** Próximo domingo con ≥14 días de margen (adelanto obligatorio). */
function nextSundayKey(minDaysAhead = 14) {
  const d = new Date(Date.now() - 5 * 3600 * 1000); // Lima
  d.setUTCDate(d.getUTCDate() + minDaysAhead);
  while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const SUNDAY_KEY = nextSundayKey();

/** Mañana (Lima), día de semana típico del caso Mirta: clienta nueva, adelanto fijo. */
function tomorrowKey() {
  const d = new Date(Date.now() - 5 * 3600 * 1000);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const TOMORROW_KEY = tomorrowKey();
// Las 10:00 de mañana pueden estar ocupadas por citas reales en prod (y entonces no hay cupo que cerrar).
const D_HOUR = 16;
// Builder Gel — no-especial (tope 1); 10:00-11:30 + 30 min de turnover → ocupa hasta 12:00.
const BUILDER_GEL_ID = "39154b05-1b0d-4ee8-b366-161a7f0aa09d";

const LOST_RE = /no tiene cupo/i;
const NO_SECOND_PAYMENT_RE = /no hagas otro pago/i;
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

async function seedBAwaitingPayment(
  hour,
  minute = 0,
  { dateKey = SUNDAY_KEY, step = "awaiting_payment_screenshot" } = {},
) {
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE_B,
    step,
    awaiting_screenshot: step === "awaiting_payment_screenshot",
    cart_items: JSON.stringify([
      { item_type: "service", item_id: BUILDER_GEL_ID, quantity: 1, price: 70 },
    ]),
    cart_service_ids: JSON.stringify([BUILDER_GEL_ID]),
    parsed_datetime: limaToUtcIso(dateKey, hour, minute),
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function sessionStepOfB() {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", PHONE_B)
    .maybeSingle();
  return data?.step ?? null;
}

async function seedAppointmentA(dateKey = SUNDAY_KEY, hour = 10) {
  return seedScheduledAppointment(supabase, PHONE_A, {
    serviceId: BUILDER_GEL_ID,
    employeeId: null,
    date: `${dateKey} ${String(hour).padStart(2, "0")}:00:00`,
    clientName: "QA Held Slot Cliente A",
    sessionStep: "completed",
  });
}

async function caseA() {
  console.log(
    "\n── Caso A: cita nueva cierra la hora que B esperaba abonar ──",
  );
  await seedBAwaitingPayment(10, 0);
  const since = new Date().toISOString();
  await seedAppointmentA();

  const outbound = await pollOutboundSince(supabase, PHONE_B, since, {
    timeoutMs: 40000,
    minCount: 2, // aviso + selector de horas
  });
  const result = assertOutbound(outbound, [], {
    mustMatch: [LOST_RE],
    mustNotMatch: [RECEIVED_RE],
  });
  const step = await sessionStepOfB();
  if (step !== "awaiting_datetime") {
    result.fails.push(`sesión quedó en ${step}, esperaba awaiting_datetime`);
  }
  const appts = await countScheduledAppointments(supabase, PHONE_B);
  if (appts !== 0) result.fails.push(`se creó cita para B (${appts})`);
  const pass = result.fails.length === 0;
  logCaseResult("Held-slot A", { ...result, pass }, outbound);
  return {
    name: "Caso A (cita cierra la hora del carrito)",
    pass,
    note: pass
      ? "B recibe el aviso y la lista de horas; no se le asigna otra hora"
      : result.fails.join("; "),
  };
}

async function caseB() {
  console.log("\n── Caso B (control): la cita no toca la hora de B ──");
  await cleanupQaPhone(supabase, PHONE_A, { deleteClient: true });
  await cleanupQaPhone(supabase, PHONE_B, { deleteClient: true });
  await seedBAwaitingPayment(12, 30);
  const since = new Date().toISOString();
  await seedAppointmentA();

  await sleep(15000);
  const outbound = await pollOutboundSince(supabase, PHONE_B, since, {
    timeoutMs: 1000,
  });
  const step = await sessionStepOfB();
  const pass = outbound.length === 0 && step === "awaiting_payment_screenshot";
  const fails = [];
  if (outbound.length > 0) fails.push(`B recibió ${outbound.length} mensajes`);
  if (step !== "awaiting_payment_screenshot") {
    fails.push(`sesión cambió a ${step}`);
  }
  logCaseResult(
    "Held-slot B (control)",
    { pass, fails, outboundCount: outbound.length, haikuCount: 0 },
    outbound,
  );
  return {
    name: "Caso B (control, otra hora)",
    pass,
    note: pass ? "Sin falso positivo" : fails.join("; "),
  };
}

async function caseC() {
  console.log(
    "\n── Caso C: dos comprobantes seguidos sobre un cupo cerrado → ambos con respuesta ──",
  );
  await cleanupQaPhone(supabase, PHONE_B, { deleteClient: true });
  const fails = [];
  let lastOutbound = [];
  for (const round of [1, 2]) {
    await seedBAwaitingPayment(10, 0);
    const since = new Date().toISOString();
    const status = await postWebhook(
      webhookUrl,
      buildImagePayload(PHONE_B, {
        wamid: newWamid(`wamid.qa.held.c${round}`),
      }),
    );
    console.log(`  Comprobante ${round}: HTTP ${status}`);
    // Haiku loguea su uso antes de enviar: se espera aviso + selector, no el log.
    const outbound = await pollOutboundSince(supabase, PHONE_B, since, {
      timeoutMs: 40000,
      minCount: 2,
    });
    lastOutbound = outbound;
    const r = assertOutbound(outbound, [], {
      mustMatch: [LOST_RE, NO_SECOND_PAYMENT_RE],
      mustNotMatch: [RECEIVED_RE],
    });
    for (const f of r.fails) fails.push(`comprobante ${round}: ${f}`);
    await sleep(4000);
  }
  const pass = fails.length === 0;
  logCaseResult(
    "Held-slot C",
    { pass, fails, outboundCount: lastOutbound.length, haikuCount: 0 },
    lastOutbound,
  );
  return {
    name: "Caso C (dos comprobantes, sin silencio)",
    pass,
    note: pass
      ? "El camino del pago responde siempre, sin debounce"
      : fails.join("; "),
  };
}

async function caseD() {
  console.log(
    `\n── Caso D (Mirta): uñas mañana ${TOMORROW_KEY} ${D_HOUR}:00, clienta nueva en awaiting_deposit_boleta ──`,
  );
  await cleanupQaPhone(supabase, PHONE_A, { deleteClient: true });
  await cleanupQaPhone(supabase, PHONE_B, { deleteClient: true });
  await seedBAwaitingPayment(D_HOUR, 0, {
    dateKey: TOMORROW_KEY,
    step: "awaiting_deposit_boleta",
  });
  const since = new Date().toISOString();
  await seedAppointmentA(TOMORROW_KEY, D_HOUR);

  const outbound = await pollOutboundSince(supabase, PHONE_B, since, {
    timeoutMs: 40000,
    minCount: 2,
  });
  const result = assertOutbound(outbound, [], {
    mustMatch: [LOST_RE, /\?/],
    mustNotMatch: [RECEIVED_RE],
  });
  const step = await sessionStepOfB();
  if (step !== "awaiting_datetime") {
    result.fails.push(`sesión quedó en ${step}, esperaba awaiting_datetime`);
  }
  const selector = outbound
    .slice(1)
    .map((m) => m.content ?? "")
    .join("\n");
  if (!selector) result.fails.push("no llegó el selector de horas");
  const pass = result.fails.length === 0;
  logCaseResult("Held-slot D (Mirta)", { ...result, pass }, outbound);
  return {
    name: "Caso D (Mirta: uñas, mañana, clienta nueva)",
    pass,
    note: pass
      ? "Aviso con Haiku + selector de horas reales del día"
      : result.fails.join("; "),
  };
}

async function main() {
  console.log("Validación held-slot-watch — teléfonos QA:", PHONE_A, PHONE_B);
  await cleanupQaPhone(supabase, PHONE_A, { deleteClient: true });
  await cleanupQaPhone(supabase, PHONE_B, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await caseA());
    results.push(await caseB());
    // C necesita la cita de A viva (B vuelve a esperar el cupo de las 10:00).
    await cleanupQaPhone(supabase, PHONE_A, { deleteClient: true });
    await seedAppointmentA();
    results.push(await caseC());
    results.push(await caseD());
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
