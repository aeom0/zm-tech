#!/usr/bin/env node
/**
 * Pati Cavana (2026-07-20) — fecha lejana + identity sin spam.
 * Tel: 51999000978
 *
 * A: "14 agostoooooo" (sin "de", mes alargado) → selected_day 14 ago + pide hora
 *    (NO confirmar hoy a las 2 PM)
 * B: "21 agosto medio dia" → cita 21 ago 12:00 (NO julio; evita cupo real 14 ago)
 * C: awaiting_client_identity + queja "Malaso este robot" → no spamea DNI;
 *    sale a browsing
 * D: sticky 15 ago → "prefiero 14" con carrito → selected_day 14 + pide hora
 * E: cita scheduled + "mejor el 22 agosto a las 4pm" → UPDATE sin menú Mi cita
 * I: cita scheduled + carrito NUEVO (awaiting_datetime, selected_day distinto)
 *    + "10" sin am/pm → NO reprograma la cita existente (PR #20 revisión)
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
  ensureQaClient,
  seedScheduledAppointment,
} from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000978";
const LIFTING_ID = "33fbadcc-30e8-4e82-9913-3a888aea73dc";
const IDENTITY_RE =
  /nombre y apellido|DNI o CE|ficha completa|En tu ficha tengo/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function resolveLiftingId() {
  const { data } = await supabase
    .from("services")
    .select("id")
    .ilike("name", "Lifting de Pestañas")
    .limit(1)
    .maybeSingle();
  return data?.id ?? LIFTING_ID;
}

async function seedCartBrowsing(serviceId) {
  await ensureQaClient(supabase, TEST_PHONE, "QA PATI FAR");
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "browsing",
    selected_day: null,
    parsed_datetime: null,
    cart_items: JSON.stringify([
      {
        item_type: "service",
        item_id: serviceId,
        quantity: 1,
        price: 50,
      },
    ]),
    cart_service_ids: JSON.stringify([serviceId]),
    employee_assignments: "{}",
    reschedule_appointment_id: null,
    updated_at: new Date().toISOString(),
  });
  // Forzar clear de sticky (algunos upserts no pisan null)
  await supabase
    .from("whatsapp_sessions")
    .update({ selected_day: null, parsed_datetime: null })
    .eq("phone", TEST_PHONE);
}

async function cancelQaAppointments() {
  await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("whatsapp_phone", TEST_PHONE)
    .eq("status", "scheduled");
}

/** A: mes alargado sin "de" → solo día + selector hora */
async function caseAElongatedMonth(serviceId) {
  console.log('\n── Pati-A: "14 agostoooooo" → selected_day + hora ──');
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await seedCartBrowsing(serviceId);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "14 agostoooooo", {
      wamid: newWamid("wamid.qa.pati.a"),
      contactName: "QA Pati Far",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [/hora|Prefer|disponib/i],
    mustNotMatch: [/cita (está )?confirmada/i, /20\s+de\s+julio/i, /2:00\s*p/i],
    expectHaiku: false,
  });

  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step, selected_day")
    .eq("phone", TEST_PHONE)
    .maybeSingle();

  if (sess?.selected_day !== "2026-08-14") {
    result.fails.push(
      `selected_day=${sess?.selected_day ?? "null"} (esperado 2026-08-14)`,
    );
  }
  if (sess?.step !== "awaiting_datetime") {
    result.fails.push(`step=${sess?.step} (esperado awaiting_datetime)`);
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("date")
    .eq("whatsapp_phone", TEST_PHONE)
    .eq("status", "scheduled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (appt?.date) {
    result.fails.push(
      `no debió crear cita aún (date=${appt.date}); bug Pati = inventar hoy 14:00`,
    );
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Pati-A agostoooooo → día+hora", result, outbound);
  return result.pass;
}

/** B: día + medio día → confirma 21 ago 12:00 (evita cupo real Pati 14 ago 12:00) */
async function caseBMedioDia(serviceId) {
  console.log('\n── Pati-B: "21 agosto medio dia" → 21 ago 12:00 ──');
  await cancelQaAppointments();
  await seedCartBrowsing(serviceId);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "21 agosto medio dia", {
      wamid: newWamid("wamid.qa.pati.b"),
      contactName: "QA Pati Far",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 28000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [
      /cita (está )?confirmada|cita está anotada/i,
      /21\s+de\s+agosto/i,
    ],
    mustNotMatch: [/20\s+de\s+julio/i, /\bjulio\b/i],
    expectHaiku: false,
  });

  const { data: appt } = await supabase
    .from("appointments")
    .select("date, status")
    .eq("whatsapp_phone", TEST_PHONE)
    .eq("status", "scheduled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const dateOk =
    typeof appt?.date === "string" &&
    appt.date.startsWith("2026-08-21") &&
    /12:00/.test(appt.date);

  if (!dateOk) {
    result.fails.push(
      `BD date=${appt?.date ?? "null"} (esperado 2026-08-21 12:00)`,
    );
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Pati-B medio dia → ago 12:00", result, outbound);
  return result.pass;
}

/** C: queja en identity → no re-pedir DNI en loop */
async function caseCIdentityNoSpam() {
  console.log('\n── Pati-C: "Malaso este robot" → sin spam DNI ──');
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  const id = await ensureQaClient(supabase, TEST_PHONE, "PATI CAVANA QA");
  await supabase
    .from("clients")
    .update({ name: "PATI CAVANA QA", dni: null })
    .eq("id", id);

  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "awaiting_client_identity",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Malaso este robot", {
      wamid: newWamid("wamid.qa.pati.c"),
      contactName: "QA Pati Far",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });

  const result = assertOutbound(outbound, [], {
    mustNotMatch: [
      /En tu ficha tengo/i,
      /Me falta tu \*DNI/i,
      /No pude leer bien los datos/i,
    ],
    expectHaiku: false,
  });

  // Debe haber salido del paso (escape) o ack corto sin re-pedir ficha
  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const identityHits = (joined.match(IDENTITY_RE) || []).length;
  if (identityHits >= 1) {
    result.fails.push(
      `re-pidió ficha/DNI ${identityHits}× tras queja (spam Pati)`,
    );
  }

  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", TEST_PHONE)
    .maybeSingle();

  if (sess?.step === "awaiting_client_identity") {
    result.fails.push("sigue en awaiting_client_identity tras queja");
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Pati-C identity sin spam", result, outbound);
  return result.pass;
}

/** D: sticky 15 → corrección a 14 con carrito → hora */
async function caseDStickyThenCorrect(serviceId) {
  console.log('\n── Pati-D: sticky 15 → "prefiero 14" + carrito → hora ──');
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await ensureQaClient(supabase, TEST_PHONE, "QA PATI FAR");

  let since = new Date().toISOString();
  let status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "agendame para 15 agosto porfa", {
      wamid: newWamid("wamid.qa.pati.d1"),
      contactName: "QA Pati Far",
    }),
  );
  console.log(`  Webhook HTTP ${status} (sticky 15)`);
  // > COALESCE_MAX (9s) + lookback — si no, fusiona con "prefiero 14" y gana el 15
  await sleep(12000);

  let { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("selected_day, step")
    .eq("phone", TEST_PHONE)
    .maybeSingle();

  if (sess?.selected_day !== "2026-08-15") {
    await supabase.from("whatsapp_sessions").upsert({
      phone: TEST_PHONE,
      step: "browsing",
      selected_day: "2026-08-15",
      cart_items: "[]",
      cart_service_ids: "[]",
      employee_assignments: "{}",
      updated_at: new Date().toISOString(),
    });
  }

  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "browsing",
    selected_day: "2026-08-15",
    cart_items: JSON.stringify([
      {
        item_type: "service",
        item_id: serviceId,
        quantity: 1,
        price: 50,
      },
    ]),
    cart_service_ids: JSON.stringify([serviceId]),
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });

  since = new Date().toISOString();
  status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "prefiero viernes 14 agosto", {
      wamid: newWamid("wamid.qa.pati.d2"),
      contactName: "QA Pati Far",
    }),
  );
  console.log(`  Webhook HTTP ${status} (corrige a 14)`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [/hora/i],
    mustNotMatch: [/cita (está )?confirmada/i, /20\s+de\s+julio/i],
    expectHaiku: false,
  });

  ({ data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("selected_day, step")
    .eq("phone", TEST_PHONE)
    .maybeSingle());

  if (sess?.selected_day !== "2026-08-14") {
    result.fails.push(
      `selected_day=${sess?.selected_day ?? "null"} (esperado 2026-08-14)`,
    );
  }
  if (sess?.step !== "awaiting_datetime") {
    result.fails.push(`step=${sess?.step} (esperado awaiting_datetime)`);
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Pati-D 15→14 sticky+carrito", result, outbound);
  return result.pass;
}

/** E: soft reschedule sin menú Mi cita */
async function caseESoftReschedule(serviceId) {
  console.log('\n── Pati-E: soft "mejor el 22 agosto a las 4pm" ──');
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await sleep(2000);
  const { appointmentId } = await seedScheduledAppointment(
    supabase,
    TEST_PHONE,
    {
      serviceId,
      date: "2026-08-21 12:00:00",
      clientName: "QA PATI FAR",
      sessionStep: "browsing",
      employeeId: "emp-sthefani",
    },
  );

  await supabase
    .from("appointments")
    .update({ whatsapp_phone: TEST_PHONE, client_phone: TEST_PHONE })
    .eq("id", appointmentId);

  await supabase
    .from("whatsapp_sessions")
    .update({
      selected_day: null,
      parsed_datetime: null,
      reschedule_appointment_id: null,
      cart_items: "[]",
      cart_service_ids: "[]",
      step: "browsing",
    })
    .eq("phone", TEST_PHONE);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "mejor el 22 agosto a las 4pm", {
      wamid: newWamid("wamid.qa.pati.e"),
      contactName: "QA Pati Far",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 28000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [/reprogramamos|Listo|Nueva fecha|22\s+de\s+agosto/i],
    mustNotMatch: [/Mi cita|Elige el nuevo día \(reprogramación\)|Dale, te cambio la fecha/i],
    expectHaiku: false,
  });

  const { data: appt } = await supabase
    .from("appointments")
    .select("date, status")
    .eq("id", appointmentId)
    .maybeSingle();

  const dateOk =
    typeof appt?.date === "string" &&
    appt.date.startsWith("2026-08-22") &&
    /16:00/.test(appt.date);

  if (!dateOk) {
    result.fails.push(
      `BD date=${appt?.date ?? "null"} (esperado 2026-08-22 16:00)`,
    );
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Pati-E soft reschedule", result, outbound);
  return result.pass;
}

/** F: hora suelta "10 am" con cita → UPDATE real (Pati 13-ago fantasma) */
async function caseFTimeOnlySoft(serviceId) {
  console.log('\n── Pati-F: soft "10 am" con cita scheduled ──');
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  // Fecha distinta a E para no contaminar
  const { appointmentId } = await seedScheduledAppointment(
    supabase,
    TEST_PHONE,
    {
      serviceId,
      date: "2026-08-28 12:00:00",
      clientName: "QA PATI FAR",
      sessionStep: "browsing",
      employeeId: "emp-sthefani",
    },
  );
  await supabase
    .from("appointments")
    .update({ whatsapp_phone: TEST_PHONE, client_phone: TEST_PHONE })
    .eq("id", appointmentId);

  // Forzar sesión limpia (sin sticky de casos previos)
  await supabase
    .from("whatsapp_sessions")
    .update({
      selected_day: null,
      parsed_datetime: null,
      reschedule_appointment_id: null,
      cart_items: "[]",
      cart_service_ids: "[]",
      step: "browsing",
    })
    .eq("phone", TEST_PHONE);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "10 am", {
      wamid: newWamid("wamid.qa.pati.f"),
      contactName: "Gatohockey",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 28000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [/reprogramamos|Listo|Nueva fecha|10:00/i],
    mustNotMatch: [/cambio tu Lifting|Gatohockey/i],
    expectHaiku: false,
  });

  const { data: appt } = await supabase
    .from("appointments")
    .select("date")
    .eq("id", appointmentId)
    .maybeSingle();
  const dateOk =
    typeof appt?.date === "string" &&
    appt.date.startsWith("2026-08-28") &&
    /10:00/.test(appt.date);
  if (!dateOk) {
    result.fails.push(`BD date=${appt?.date ?? "null"} (esperado 28 ago 10:00)`);
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Pati-F time-only soft 10am", result, outbound);
  return result.pass;
}

/** G: 9:30 fuera de horario + lista = cupos libres (no agenda completa) */
async function caseGAvailableHours(serviceId) {
  console.log("\n── Pati-G: 9:30 → cupos libres (oculta 11:00 ocupada) ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  const blockerPhone = "51999000995";
  await cleanupQaPhone(supabase, blockerPhone, { deleteClient: true });

  const { appointmentId } = await seedScheduledAppointment(
    supabase,
    TEST_PHONE,
    {
      serviceId,
      date: "2026-08-28 12:00:00",
      clientName: "QA PATI FAR",
      sessionStep: "browsing",
      employeeId: "emp-sthefani",
    },
  );
  await supabase
    .from("appointments")
    .update({ whatsapp_phone: TEST_PHONE, client_phone: TEST_PHONE })
    .eq("id", appointmentId);

  await supabase
    .from("whatsapp_sessions")
    .update({
      selected_day: null,
      reschedule_appointment_id: null,
      cart_items: "[]",
      cart_service_ids: "[]",
      step: "browsing",
    })
    .eq("phone", TEST_PHONE);

  // Ocupar 11:00 ese día (otra clienta)
  const { appointmentId: blockerId } = await seedScheduledAppointment(
    supabase,
    blockerPhone,
    {
      serviceId,
      date: "2026-08-28 11:00:00",
      clientName: "QA BLOCKER",
      sessionStep: "browsing",
      employeeId: "emp-sthefani",
    },
  );
  await supabase
    .from("appointments")
    .update({
      whatsapp_phone: blockerPhone,
      client_phone: blockerPhone,
    })
    .eq("id", blockerId);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "A las 9:30?", {
      wamid: newWamid("wamid.qa.pati.g"),
      contactName: "QA Pati Far",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 28000,
  });

  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const result = assertOutbound(outbound, [], {
    mustMatch: [/fuera de nuestro horario|Horarios con cupo/i],
    mustNotMatch: [/Confirmas con nosotras/i],
    expectHaiku: false,
  });
  if (/11:00\s*AM/i.test(joined) && /cupo/i.test(joined)) {
    result.fails.push("listó 11:00 AM pese a cita bloqueadora");
  }
  if (/Horarios disponibles ese día:/i.test(joined)) {
    result.fails.push("sigue copy viejo sin filtro de cupo");
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Pati-G available hours", result, outbound);

  await cleanupQaPhone(supabase, blockerPhone, { deleteClient: true });
  return result.pass;
}

/** H: con cita + "Hola" → no welcome/menú genérico */
async function caseHNoWelcomeWithPending(serviceId) {
  console.log('\n── Pati-H: cita + "Hola" → no welcome ──');
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  const { appointmentId } = await seedScheduledAppointment(
    supabase,
    TEST_PHONE,
    {
      serviceId,
      date: "2026-08-21 12:00:00",
      clientName: "QA PATI FAR",
      sessionStep: "browsing",
      employeeId: "emp-sthefani",
    },
  );
  await supabase
    .from("appointments")
    .update({ whatsapp_phone: TEST_PHONE, client_phone: TEST_PHONE })
    .eq("id", appointmentId);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Hola", {
      wamid: newWamid("wamid.qa.pati.h"),
      contactName: "Gatohockey",
    }),
  );

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 0,
    timeoutMs: 22000,
  });

  const result = assertOutbound(outbound, [], {
    mustNotMatch: [
      /Especialistas en extensiones/i,
      /Gatohockey/i,
      /Tarde perfecta para elevar/i,
    ],
  });
  result.pass = result.fails.length === 0;
  logCaseResult("Pati-H no welcome con cita", result, outbound);
  return result.pass;
}

const SOFT_GEL_ID = "1e15a516-95b1-4be3-bc0d-88f530bc6011";

/**
 * I: cita scheduled (vie 21 ago 12:00) + carrito nuevo awaiting_datetime
 * (selected_day ≠ cita) → "10" sin am/pm no debe UPDATE la cita existente.
 */
async function caseIBareTenDoesNotRescheduleExisting(serviceId) {
  console.log('\n── Pati-I: carrito nuevo + "10" → no pisa cita existente ──');
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  const existingDate = "2026-08-21 12:00:00";
  const { appointmentId } = await seedScheduledAppointment(
    supabase,
    TEST_PHONE,
    {
      serviceId,
      date: existingDate,
      clientName: "QA PATI FAR",
      sessionStep: "awaiting_datetime",
      employeeId: "emp-sthefani",
    },
  );
  await supabase
    .from("appointments")
    .update({ whatsapp_phone: TEST_PHONE, client_phone: TEST_PHONE })
    .eq("id", appointmentId);

  // Carrito de OTRO servicio + día distinto al de la cita (jue 27 ago)
  await supabase
    .from("whatsapp_sessions")
    .update({
      step: "awaiting_datetime",
      selected_day: "2026-08-27",
      parsed_datetime: null,
      reschedule_appointment_id: null,
      cart_items: JSON.stringify([
        {
          item_type: "service",
          item_id: SOFT_GEL_ID,
          quantity: 1,
          price: 70,
        },
      ]),
      cart_service_ids: JSON.stringify([SOFT_GEL_ID]),
      employee_assignments: "{}",
    })
    .eq("phone", TEST_PHONE);

  const { data: before } = await supabase
    .from("appointments")
    .select("date")
    .eq("id", appointmentId)
    .maybeSingle();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "10", {
      wamid: newWamid("wamid.qa.pati.i"),
      contactName: "QA Pati Far",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 0,
    timeoutMs: 28000,
  });

  const result = assertOutbound(outbound, [], {
    mustNotMatch: [
      /reprogramamos|Nueva fecha|cambio tu Lifting|Listo, te reprogram/i,
    ],
    expectHaiku: false,
  });

  const { data: after } = await supabase
    .from("appointments")
    .select("date")
    .eq("id", appointmentId)
    .maybeSingle();

  const beforeDate = String(before?.date ?? "");
  const afterDate = String(after?.date ?? "");
  if (!afterDate.startsWith("2026-08-21") || !/12:00/.test(afterDate)) {
    result.fails.push(
      `cita existente cambió: ${beforeDate} → ${afterDate} (esperado 21 ago 12:00)`,
    );
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Pati-I bare 10 no pisa cita", result, outbound);
  return result.pass;
}

async function main() {
  console.log(`Validación Pati far-date + identity — tel QA: ${TEST_PHONE}`);
  const serviceId = await resolveLiftingId();
  const results = [];
  try {
    const a = await caseAElongatedMonth(serviceId);
    results.push({
      name: "Pati-A",
      pass: a,
      note: a ? "agostoooooo → día+hora" : "falló",
    });
    await sleep(2000);
    const b = await caseBMedioDia(serviceId);
    results.push({
      name: "Pati-B",
      pass: b,
      note: b ? "medio dia → 21 ago 12:00" : "falló",
    });
    await sleep(2000);
    const c = await caseCIdentityNoSpam();
    results.push({
      name: "Pati-C",
      pass: c,
      note: c ? "queja sin spam DNI" : "falló",
    });
    await sleep(2000);
    const d = await caseDStickyThenCorrect(serviceId);
    results.push({
      name: "Pati-D",
      pass: d,
      note: d ? "15→14 sticky+carrito" : "falló",
    });
    await sleep(2000);
    const e = await caseESoftReschedule(serviceId);
    results.push({
      name: "Pati-E",
      pass: e,
      note: e ? "soft reschedule 22 ago 16:00" : "falló",
    });
    await sleep(2000);
    const f = await caseFTimeOnlySoft(serviceId);
    results.push({
      name: "Pati-F",
      pass: f,
      note: f ? "10 am → UPDATE BD" : "falló",
    });
    await sleep(2000);
    const g = await caseGAvailableHours(serviceId);
    results.push({
      name: "Pati-G",
      pass: g,
      note: g ? "cupos libres sin 11:00" : "falló",
    });
    await sleep(2000);
    const h = await caseHNoWelcomeWithPending(serviceId);
    results.push({
      name: "Pati-H",
      pass: h,
      note: h ? "no welcome con cita" : "falló",
    });
    await sleep(2000);
    const i = await caseIBareTenDoesNotRescheduleExisting(serviceId);
    results.push({
      name: "Pati-I",
      pass: i,
      note: i ? '"10" no pisa cita + carrito' : "falló",
    });
  } finally {
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
