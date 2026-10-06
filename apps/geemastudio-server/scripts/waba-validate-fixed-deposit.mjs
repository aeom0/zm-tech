#!/usr/bin/env node
/**
 * Abono fijo S/25 — clientas sin ningún `completed` en historial
 * (nueva, o cita anterior no concretada). Historial gana sobre domingo %.
 *
 * A: sin completed + día L–S → resumen+datos fusionados → (ficha) adelanto S/25
 * B: sin completed + domingo → mismo flujo S/25 (NO adelanto 20%)
 * C: con completed, L–S → confirma directo (sin awaiting_payment)
 * D: con completed, domingo → flujo % 20% (sin fixed)
 * E: sola cita anterior cancelled/scheduled pasada (sin completed) → S/25
 * F: comprobante → appointment_verifications.amount_deposit = 25
 * G: cancel <24h + payment_submitted → deposit_forfeit_risk=true
 * H: cancel >24h → deposit_forfeit_risk sigue false
 * I: mid-pago "¿son aparte del servicio?" → explica reservar cupo (no pide voucher a ciegas)
 * J: en awaiting_deposit_boleta, texto no-ficha → re-pide datos (no avanza a adelanto)
 * K: en awaiting_deposit_boleta, imagen → pide datos escritos (no avanza a adelanto)
 * L: mid-boleta pregunta ubicación → Maps + retoma "Datos para la boleta" (Cielo PE.…5683)
 * M: en awaiting_deposit_boleta, pregunta suelta (no ficha) → Haiku responde de
 *    verdad (no "No pude leer bien" genérico) + recordatorio de nombre/DNI (Alberto …0417, 18-sep)
 * N: dos preguntas sueltas seguidas en boleta → el recordatorio de nombre/DNI
 *    NO se repite en <5min (evita "se convierte en spam")
 * O: pide agregar otro servicio/pack en awaiting_deposit_boleta → NO se agrega
 *    al carrito (cart_service_ids sin cambios), Haiku no confirma como si ya
 *    lo hubiera agregado
 * P: mismo intento de agregar servicio en awaiting_payment_screenshot → mismo guard
 *
 * Q: texto suelto en awaiting_payment_screenshot → ack neutro + push staff (sin plantilla
 *    del voucher); "Okey" → silencio; luego imagen SOLA (sin texto) → flujo normal
 *    de comprobante (Angelly …7854)
 *
 * Tel: 51999000989
 *
 * Filtro: FIXED_DEPOSIT_CASES=I yarn waba:validate:fixed-deposit
 *    o:   yarn waba:validate:fixed-deposit -- I
 *    o:   yarn waba:validate:fixed-deposit -- A,C,I
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  buildInteractivePayload,
  buildImagePayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient, seedScheduledAppointment } from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  fetchOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000989";
const LIFTING_ID = "33fbadcc-30e8-4e82-9913-3a888aea73dc";

const FIXED_SUMMARY_RE =
  /Resumen \(a[uú]n no confirmado\)|Resumen de tu reserva|Total:\s*S\//i;
const FIXED_DATOS_RE = /Datos para la boleta|Nombre y Apellidos|DNI\s*\/\s*CE/i;
const FIXED_ADELANTO_RE =
  /Adelanto para reservar tu cupo|adelanto de S\/\s*25|para reservar tu cupo/i;
const FIXED_COPY_RE = FIXED_ADELANTO_RE; // alias legacy en asserts
const FIXED_TOLERANCE_RE = /tolerancia de\s*5\s*minutos|Tolerancia el día de tu cita:\s*5/i;
const NO_REFUND_RE = /no habr[aá] devoluci[oó]n del adelanto/i;
/** Solo el aviso de 20% (no el copy neutro de domingo para clientas S/25). */
const SUNDAY_RATE_RE = /adelanto del \*?20%/i;
const CONFIRMED_RE = /cita (está )?confirmada|cita está anotada|Te esperamos/i;
const RECEIVED_RE = /Recibido|reservada provisionalmente/i;
const DEPOSIT_FAQ_RE =
  /no es aparte|reservar tu cupo|se descuenta del total|saldo restante/i;
const VOUCHER_NUDGE_RE = /foto del voucher|captura del comprobante/i;
const IDENTITY_RETRY_RE =
  /No pude leer bien|nombre y apellido.*DNI|DNI o CE/i;
const LOCATION_DUMP_RE = /Calle Artesanos 150|maps\.app\.goo\.gl/i;
/** Fallback genérico viejo — si sale esto, Haiku NO llegó a responder la pregunta. */
const GENERIC_UNPARSED_RE = /No pude leer bien|Casi lo tenemos/i;
const NAME_DNI_REMINDER_RE = /nombre y apellido.*DNI o CE/i;
/** Frases que suenan a "ya lo agregué" — prohibidas mientras el carrito está cerrado. */
const FAKE_CART_CONFIRM_RE =
  /le agrego el (pack|servicio)|te lo agrego|anotado,? (ya )?(lo agregu|se agreg)/i;
const CART_LOCKED_MSG_RE = /coordinamos aparte con el equipo/i;

const CLOSED = new Set(["2026-07-23", "2026-07-28", "2026-07-29"]);

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function limaParts(offsetDays = 0) {
  const lima = new Date(Date.now() - 5 * 60 * 60 * 1000);
  lima.setUTCDate(lima.getUTCDate() + offsetDays);
  const y = lima.getUTCFullYear();
  const m = String(lima.getUTCMonth() + 1).padStart(2, "0");
  const d = String(lima.getUTCDate()).padStart(2, "0");
  return {
    key: `${y}-${m}-${d}`,
    dow: lima.getUTCDay(),
    hour: lima.getUTCHours(),
  };
}

function nextWeekdayKey() {
  for (let i = 1; i <= 14; i++) {
    const { key, dow } = limaParts(i);
    if (dow >= 1 && dow <= 6 && !CLOSED.has(key)) return key;
  }
  return "2026-08-18";
}

function nextSundayKey() {
  for (let i = 1; i <= 21; i++) {
    const { key, dow } = limaParts(i);
    if (dow === 0 && !CLOSED.has(key)) return key;
  }
  return "2026-08-16";
}

function limaToUtcIso(dateKey, hour, minute = 0) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour + 5, minute, 0)).toISOString();
}

async function countOverlaps(dateKey, hour, minute = 0, duration = 60) {
  const startIso = limaToUtcIso(dateKey, hour, minute);
  const start = new Date(startIso);
  const end = new Date(start.getTime() + duration * 60_000);
  // appointments.date es Lima literal — comparar por rango de strings
  const dayStart = `${dateKey} 00:00:00`;
  const dayEnd = `${dateKey} 23:59:59`;
  const { data } = await supabase
    .from("appointments")
    .select("id, date, duration")
    .neq("status", "cancelled")
    .gte("date", dayStart)
    .lte("date", dayEnd);
  let n = 0;
  for (const row of data ?? []) {
    const raw = String(row.date);
    const m = raw.match(
      /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/,
    );
    if (!m) continue;
    const otherStart = new Date(
      Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] + 5, +m[5], 0),
    );
    const otherEnd = new Date(
      otherStart.getTime() + (row.duration ?? 60) * 60_000,
    );
    if (start < otherEnd && end > otherStart) n += 1;
  }
  return n;
}

async function findFreeSlot(dateKey, preferredHours = [10, 11, 12, 13, 14, 15, 16, 17]) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 17, 0, 0)).getUTCDay(); // 17 UTC = 12 Lima
  const hours =
    dow === 0
      ? [10, 11, 12]
      : preferredHours;
  for (const hour of hours) {
    for (const minute of dow === 0 && hour === 10 ? [30, 0] : [0, 30]) {
      if (dow === 0 && hour === 10 && minute === 0) continue; // domingo desde 10:30
      const overlaps = await countOverlaps(dateKey, hour, minute, 60);
      if (overlaps === 0) return { hour, minute };
    }
  }
  return dow === 0 ? { hour: 12, minute: 30 } : { hour: 17, minute: 30 };
}

async function seedCartAwaitingDay(dayKey) {
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    tenant_id: "zm-lash-nails",
    step: "awaiting_datetime",
    selected_day: dayKey,
    cart_items: JSON.stringify([
      { item_type: "service", item_id: LIFTING_ID, quantity: 1, price: 50 },
    ]),
    cart_service_ids: JSON.stringify([LIFTING_ID]),
    employee_assignments: "{}",
    deposit_mode: null,
    reschedule_appointment_id: null,
    parsed_datetime: null,
    updated_at: new Date().toISOString(),
  });
}

async function tapTime(dayKey, hour, minute = 0) {
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  const timeId = `time_${dayKey}T${hh}${mm}`;
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildInteractivePayload(PHONE, timeId, `${hour}:${mm}`, {
      wamid: newWamid(`wamid.qa.deposit.${dayKey}.${hh}${mm}.${Date.now()}`),
      contactName: "QA Deposit",
      kind: "list",
    }),
  );
  console.log(`  Webhook HTTP ${status} (${timeId})`);
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
  return outbound;
}

/** Prueba varios horarios libres hasta que no responda SLOT_TAKEN. */
async function tapFreeTime(dayKey) {
  const tried = [];
  for (let attempt = 0; attempt < 8; attempt++) {
    const slot = await findFreeSlot(
      dayKey,
      [10, 11, 12, 13, 14, 15, 16, 17].filter((h) => !tried.includes(h)),
    );
    tried.push(slot.hour);
    await seedCartAwaitingDay(dayKey);
    const outbound = await tapTime(dayKey, slot.hour, slot.minute);
    const joined = outbound.map((m) => m.content ?? "").join("\n");
    if (/ya fue reservado/i.test(joined)) {
      console.log(`  slot ${slot.hour}:${slot.minute} ocupado, reintento…`);
      await sleep(800);
      continue;
    }
    return { outbound, slot };
  }
  return { outbound: [], slot: null };
}

async function seedCompletedHistory() {
  const clientId = await ensureQaClient(supabase, PHONE, "QA Deposit Completa");
  const past = limaParts(-30).key;
  const { data: appt, error } = await supabase
    .from("appointments")
    .insert({
      client_id: clientId,
      client_name: "QA Deposit Completa",
      client_phone: PHONE,
      whatsapp_phone: PHONE,
      service_id: LIFTING_ID,
      employee_id: "emp-sthefani",
      date: `${past} 11:00:00`,
      duration: 60,
      price: "50.00",
      status: "completed",
    })
    .select("id")
    .single();
  if (error) throw new Error(`completed seed: ${error.message}`);
  await supabase.from("appointment_services").insert({
    appointment_id: appt.id,
    service_id: LIFTING_ID,
    employee_id: "emp-sthefani",
    price: "50.00",
    duration: 60,
  });
  return appt.id;
}

async function seedAbandonedHistory() {
  // Cita pasada cancelled — nunca llegó a completed (mismo efecto que "no asistió")
  const clientId = await ensureQaClient(supabase, PHONE, "QA Deposit Abandoned");
  const past = limaParts(-20).key;
  const { data: appt, error } = await supabase
    .from("appointments")
    .insert({
      client_id: clientId,
      client_name: "QA Deposit Abandoned",
      client_phone: PHONE,
      whatsapp_phone: PHONE,
      service_id: LIFTING_ID,
      employee_id: "emp-sthefani",
      date: `${past} 11:00:00`,
      duration: 60,
      price: "50.00",
      status: "cancelled",
    })
    .select("id")
    .single();
  if (error) throw new Error(`abandoned seed: ${error.message}`);
  return appt.id;
}

/**
 * Avanza desde awaiting_deposit_boleta (resumen+datos ya fusionados) → adelanto.
 * Ya no hay paso intermedio "ok" → datos (PR #118).
 */
async function advanceFixedDepositSteps() {
  const sinceAde = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "María López QA 87654321", {
      wamid: newWamid("wamid.qa.deposit.boleta"),
      contactName: "QA Deposit",
    }),
  );
  const outAde = await pollOutboundSince(supabase, PHONE, sinceAde, {
    minCount: 1,
    timeoutMs: 20000,
  });
  await sleep(1200);
  return { outDatos: [], outAde };
}

async function caseANewWeekday() {
  console.log("\n── A: nueva + L–S → S/25 (resumen+datos fusionados → adelanto) ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const day = nextWeekdayKey();
  const { outbound } = await tapFreeTime(day);
  const r1 = assertOutbound(outbound, [], {
    mustMatch: [FIXED_SUMMARY_RE, FIXED_DATOS_RE],
    mustNotMatch: [SUNDAY_RATE_RE, FIXED_ADELANTO_RE],
    expectHaiku: false,
  });
  const { data: sess1 } = await supabase
    .from("whatsapp_sessions")
    .select("step, deposit_mode")
    .eq("phone", PHONE)
    .maybeSingle();
  if (sess1?.step !== "awaiting_deposit_boleta") {
    r1.fails.push(`step1=${sess1?.step}`);
  }
  if (sess1?.deposit_mode !== "fixed") {
    r1.fails.push(`deposit_mode=${sess1?.deposit_mode}`);
  }

  const { outAde } = await advanceFixedDepositSteps();
  const r3 = assertOutbound(outAde, [], {
    mustMatch: [FIXED_ADELANTO_RE, FIXED_TOLERANCE_RE, NO_REFUND_RE],
    mustNotMatch: [SUNDAY_RATE_RE],
    expectHaiku: false,
  });
  const { data: sess3 } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", PHONE)
    .maybeSingle();
  if (sess3?.step !== "awaiting_payment_screenshot") {
    r3.fails.push(`step3=${sess3?.step}`);
  }

  const fails = [...r1.fails, ...r3.fails];
  const result = { pass: fails.length === 0, fails };
  logCaseResult("A nueva weekday S/25 fusionado", result, [
    ...outbound,
    ...outAde,
  ]);
  return result.pass;
}

async function caseBNewSunday() {
  console.log("\n── B: nueva + domingo → S/25 fusionado (NO 20%) ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const day = nextSundayKey();
  const { outbound } = await tapFreeTime(day);
  const r1 = assertOutbound(outbound, [], {
    mustMatch: [FIXED_SUMMARY_RE, FIXED_DATOS_RE],
    mustNotMatch: [SUNDAY_RATE_RE],
    expectHaiku: false,
  });
  const { outAde } = await advanceFixedDepositSteps();
  const r3 = assertOutbound(outAde, [], {
    mustMatch: [FIXED_ADELANTO_RE],
    mustNotMatch: [SUNDAY_RATE_RE],
    expectHaiku: false,
  });
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("deposit_mode, step")
    .eq("phone", PHONE)
    .maybeSingle();
  if (sess?.deposit_mode !== "fixed") {
    r3.fails.push(`deposit_mode=${sess?.deposit_mode} (esperado fixed)`);
  }
  const fails = [...r1.fails, ...r3.fails];
  const result = { pass: fails.length === 0, fails };
  logCaseResult("B nueva domingo S/25 gana", result, [
    ...outbound,
    ...outAde,
  ]);
  return result.pass;
}

async function caseCReturningWeekday() {
  console.log("\n── C: completed + L–S → confirma directo ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedCompletedHistory();
  const day = nextWeekdayKey();
  const { outbound } = await tapFreeTime(day);
  const result = assertOutbound(outbound, [], {
    mustMatch: [CONFIRMED_RE],
    mustNotMatch: [FIXED_COPY_RE, SUNDAY_RATE_RE],
    expectHaiku: false,
  });
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step, deposit_mode")
    .eq("phone", PHONE)
    .maybeSingle();
  if (sess?.step === "awaiting_payment_screenshot") {
    result.fails.push("no debió pedir abono");
  }
  result.pass = result.fails.length === 0;
  logCaseResult("C recurrente weekday sin abono", result, outbound);
  return result.pass;
}

async function caseDReturningSunday() {
  console.log("\n── D: completed + domingo → 20% (no fixed) ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedCompletedHistory();
  const day = nextSundayKey();
  const { outbound } = await tapFreeTime(day);
  const result = assertOutbound(outbound, [], {
    mustMatch: [SUNDAY_RATE_RE],
    mustNotMatch: [FIXED_COPY_RE, FIXED_TOLERANCE_RE],
    expectHaiku: false,
  });
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("deposit_mode")
    .eq("phone", PHONE)
    .maybeSingle();
  if (sess?.deposit_mode !== "rate") {
    result.fails.push(`deposit_mode=${sess?.deposit_mode} (esperado rate)`);
  }
  result.pass = result.fails.length === 0;
  logCaseResult("D recurrente domingo 20%", result, outbound);
  return result.pass;
}

async function caseEAbandonedNoCompleted() {
  console.log("\n── E: sola cita cancelled (sin completed) → stepped S/25 ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedAbandonedHistory();
  const day = nextWeekdayKey();
  const { outbound } = await tapFreeTime(day);
  const r1 = assertOutbound(outbound, [], {
    mustMatch: [FIXED_SUMMARY_RE],
    mustNotMatch: [SUNDAY_RATE_RE],
    expectHaiku: false,
  });
  const { outAde } = await advanceFixedDepositSteps();
  const r3 = assertOutbound(outAde, [], {
    mustMatch: [FIXED_ADELANTO_RE],
    mustNotMatch: [SUNDAY_RATE_RE],
    expectHaiku: false,
  });
  const fails = [...r1.fails, ...r3.fails];
  const result = { pass: fails.length === 0, fails };
  logCaseResult("E sin completed (cancelled) S/25", result, [
    ...outbound,
    ...outAde,
  ]);
  return result.pass;
}

async function caseFScreenshot() {
  console.log("\n── F: comprobante → amount_deposit=25 ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const day = nextWeekdayKey();
  const slot = await findFreeSlot(day);
  await seedCartAwaitingDay(day);
  await supabase
    .from("whatsapp_sessions")
    .update({
      step: "awaiting_payment_screenshot",
      awaiting_screenshot: true,
      deposit_mode: "fixed",
      parsed_datetime: limaToUtcIso(day, slot.hour, slot.minute),
    })
    .eq("phone", PHONE);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildImagePayload(PHONE, {
      wamid: newWamid("wamid.qa.deposit.f"),
      contactName: "QA Deposit",
      caption: "Comprobante Yape S/25\nMaria QA\nDNI 12345678\n999888777",
    }),
  );
  console.log(`  Webhook HTTP ${status} slot=${day} ${slot.hour}:${slot.minute}`);
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 30000,
  });
  const result = assertOutbound(outbound, [], {
    mustMatch: [RECEIVED_RE],
    expectHaiku: false,
  });

  const { data: ver } = await supabase
    .from("appointment_verifications")
    .select("amount_deposit, amount_total, status, appointment_id")
    .eq("client_phone", PHONE)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ver) {
    result.fails.push("sin appointment_verifications");
  } else {
    if (Number(ver.amount_deposit) !== 25) {
      result.fails.push(`amount_deposit=${ver.amount_deposit}`);
    }
    if (Number(ver.amount_total) !== 50) {
      result.fails.push(`amount_total=${ver.amount_total}`);
    }
    if (ver.status !== "payment_submitted") {
      result.fails.push(`status=${ver.status}`);
    }
  }
  result.pass = result.fails.length === 0;
  logCaseResult("F screenshot amount=25", result, outbound);
  return { pass: result.pass, verification: ver };
}

async function caseGForfeitWithin24h() {
  console.log("\n── G: cancel <24h → deposit_forfeit_risk ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const { hour } = limaParts(0);
  // Cita en ~3 h (dentro de 24h)
  const startHour = Math.min(18, Math.max(10, hour + 3));
  const today = limaParts(0).key;
  const { appointmentId } = await seedScheduledAppointment(supabase, PHONE, {
    serviceId: LIFTING_ID,
    date: `${today} ${String(startHour).padStart(2, "0")}:00:00`,
    clientName: "QA Deposit Forfeit",
    sessionStep: "browsing",
  });
  await supabase.from("appointment_verifications").insert({
    appointment_id: appointmentId,
    client_phone: PHONE,
    client_name: "QA Deposit Forfeit",
    service_name: "Lifting de Pestañas",
    appointment_date: limaToUtcIso(today, startHour, 0),
    amount_deposit: 25,
    amount_total: 50,
    status: "payment_submitted",
    deposit_forfeit_risk: false,
  });

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "quiero cancelar mi cita", {
      wamid: newWamid("wamid.qa.deposit.g"),
      contactName: "QA Deposit",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);
  await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });
  await sleep(1500);

  const { data: ver } = await supabase
    .from("appointment_verifications")
    .select("deposit_forfeit_risk")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  const fails = [];
  if (!ver?.deposit_forfeit_risk) {
    fails.push(`deposit_forfeit_risk=${ver?.deposit_forfeit_risk}`);
  }
  const result = { pass: fails.length === 0, fails };
  logCaseResult("G forfeit <24h", result, []);
  return result.pass;
}

async function caseHForfeitBeyond24h() {
  console.log("\n── H: cancel >24h → no marca forfeit ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const day = limaParts(5).key;
  const { appointmentId } = await seedScheduledAppointment(supabase, PHONE, {
    serviceId: LIFTING_ID,
    date: `${day} 11:00:00`,
    clientName: "QA Deposit Safe",
    sessionStep: "browsing",
  });
  await supabase.from("appointment_verifications").insert({
    appointment_id: appointmentId,
    client_phone: PHONE,
    client_name: "QA Deposit Safe",
    service_name: "Lifting de Pestañas",
    appointment_date: limaToUtcIso(day, 11, 0),
    amount_deposit: 25,
    amount_total: 50,
    status: "approved",
    deposit_forfeit_risk: false,
  });

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "necesito cancelar mi cita", {
      wamid: newWamid("wamid.qa.deposit.h"),
      contactName: "QA Deposit",
    }),
  );
  await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });
  await sleep(1500);

  const { data: ver } = await supabase
    .from("appointment_verifications")
    .select("deposit_forfeit_risk")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  const fails = [];
  if (ver?.deposit_forfeit_risk) {
    fails.push("no debió marcar forfeit con >24h");
  }
  const result = { pass: fails.length === 0, fails };
  logCaseResult("H sin forfeit >24h", result, []);
  return result.pass;
}

/** Lizbeth …3315: pregunta mid-pago → FAQ adelanto, no solo "envía voucher". */
async function caseIDepositFaqMidPago() {
  console.log("\n── I: mid-pago ¿aparte/adicional? → FAQ reservar cupo ──");
  const phrases = [
    "Esos 25 de adelanto son aparte del servicio??",
    "los S/25 son un pago adicional?",
    "son adicionales??",
  ];
  const fails = [];
  const allOut = [];

  for (let i = 0; i < phrases.length; i++) {
    const phrase = phrases[i];
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
    await ensureQaClient(supabase, PHONE, "QA Deposit FAQ");
    const day = nextWeekdayKey();
    const slot = await findFreeSlot(day);
    await seedCartAwaitingDay(day);
    await supabase
      .from("whatsapp_sessions")
      .update({
        step: "awaiting_payment_screenshot",
        awaiting_screenshot: true,
        deposit_mode: "fixed",
        parsed_datetime: limaToUtcIso(day, slot.hour, slot.minute),
      })
      .eq("phone", PHONE);

    const since = new Date().toISOString();
    await postWebhook(
      webhookUrl,
      buildTextPayload(PHONE, phrase, {
        wamid: newWamid(`wamid.qa.deposit.i${i + 1}`),
        contactName: "QA Deposit FAQ",
      }),
    );
    const outbound = await pollOutboundSince(supabase, PHONE, since, {
      minCount: 1,
      timeoutMs: 20000,
    });
    allOut.push(...outbound);
    const r = assertOutbound(outbound, [], {
      mustMatch: [DEPOSIT_FAQ_RE, VOUCHER_NUDGE_RE],
      mustNotMatch: [/^Por favor envía la foto del voucher/i],
      expectHaiku: false,
    });
    if (!r.pass) {
      fails.push(...r.fails.map((f) => `[${phrase.slice(0, 32)}] ${f}`));
    }
    await sleep(800);
  }

  const result = { pass: fails.length === 0, fails };
  logCaseResult("I deposit FAQ mid-pago", result, allOut);
  return result.pass;
}

/** Texto no-ficha en boleta → re-pide datos; step sigue en awaiting_deposit_boleta. */
async function caseJBoletaUnparseableIdentity() {
  console.log("\n── J: boleta texto ilegible → re-pide ficha (no adelanto) ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await ensureQaClient(supabase, PHONE, "QA Deposit Boleta");
  const day = nextWeekdayKey();
  const slot = await findFreeSlot(day);
  await seedCartAwaitingDay(day);
  await supabase
    .from("whatsapp_sessions")
    .update({
      step: "awaiting_deposit_boleta",
      awaiting_screenshot: false,
      deposit_mode: "fixed",
      parsed_datetime: limaToUtcIso(day, slot.hour, slot.minute),
    })
    .eq("phone", PHONE);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "no se qué poner", {
      wamid: newWamid("wamid.qa.deposit.j1"),
      contactName: "QA Deposit Boleta",
    }),
  );
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [IDENTITY_RETRY_RE],
    mustNotMatch: [FIXED_ADELANTO_RE],
    expectHaiku: false,
  });
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", PHONE)
    .maybeSingle();
  if (sess?.step !== "awaiting_deposit_boleta") {
    result.fails.push(`step=${sess?.step} (esperado awaiting_deposit_boleta)`);
    result.pass = false;
  }
  logCaseResult("J boleta unparseable identity", result, outbound);
  return result.pass;
}

/** Imagen en boleta → pedir datos escritos; step sigue en awaiting_deposit_boleta. */
async function caseKBoletaImageAsksWrittenData() {
  console.log("\n── K: boleta imagen → pide datos escritos (no adelanto) ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await ensureQaClient(supabase, PHONE, "QA Deposit Boleta Img");
  const day = nextWeekdayKey();
  const slot = await findFreeSlot(day);
  await seedCartAwaitingDay(day);
  await supabase
    .from("whatsapp_sessions")
    .update({
      step: "awaiting_deposit_boleta",
      awaiting_screenshot: false,
      deposit_mode: "fixed",
      parsed_datetime: limaToUtcIso(day, slot.hour, slot.minute),
    })
    .eq("phone", PHONE);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildImagePayload(PHONE, {
      wamid: newWamid("wamid.qa.deposit.k1"),
      contactName: "QA Deposit Boleta Img",
      caption: "",
    }),
  );
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [/datos.*escritos|nombre y apellido.*DNI/i],
    mustNotMatch: [FIXED_ADELANTO_RE],
    expectHaiku: false,
  });
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", PHONE)
    .maybeSingle();
  if (sess?.step !== "awaiting_deposit_boleta") {
    result.fails.push(`step=${sess?.step} (esperado awaiting_deposit_boleta)`);
    result.pass = false;
  }
  logCaseResult("K boleta image asks written data", result, outbound);
  return result.pass;
}

/**
 * Cielo PE.…5683: pregunta ubicación mid-abono → Maps + retoma datos de boleta.
 * Post-#118 el step activo es awaiting_deposit_boleta (resumen+datos fusionados).
 */
async function caseLLocationMidBoletaResumesDatos() {
  console.log("\n── L: mid-boleta ubicación → Maps + retoma datos ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await ensureQaClient(supabase, PHONE, "QA Deposit Loc");
  const day = nextWeekdayKey();
  const slot = await findFreeSlot(day);
  await seedCartAwaitingDay(day);
  await supabase
    .from("whatsapp_sessions")
    .update({
      step: "awaiting_deposit_boleta",
      awaiting_screenshot: false,
      deposit_mode: "fixed",
      parsed_datetime: limaToUtcIso(day, slot.hour, slot.minute),
    })
    .eq("phone", PHONE);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "En qué parte queda su sede", {
      wamid: newWamid("wamid.qa.deposit.l1"),
      contactName: "QA Deposit Loc",
    }),
  );
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 2,
    timeoutMs: 25000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [LOCATION_DUMP_RE, FIXED_DATOS_RE],
    mustNotMatch: [FIXED_ADELANTO_RE],
    expectHaiku: false,
  });
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", PHONE)
    .maybeSingle();
  if (sess?.step !== "awaiting_deposit_boleta") {
    result.fails.push(`step=${sess?.step} (esperado awaiting_deposit_boleta)`);
    result.pass = false;
  }
  logCaseResult("L ubicación mid-boleta retoma datos", result, outbound);
  return result.pass;
}

const MANICURE_GEL_ID = "f6b62575-6515-4fd8-997e-1ab4bf9271ca";

async function seedAwaitingDepositStep(step) {
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await ensureQaClient(supabase, PHONE, "QA Deposit MNOP");
  const day = nextWeekdayKey();
  const slot = await findFreeSlot(day);
  await seedCartAwaitingDay(day);
  await supabase
    .from("whatsapp_sessions")
    .update({
      step,
      awaiting_screenshot: step === "awaiting_payment_screenshot",
      deposit_mode: "fixed",
      parsed_datetime: limaToUtcIso(day, slot.hour, slot.minute),
    })
    .eq("phone", PHONE);
}

/** Alberto …0417, 18-sep: pregunta suelta (no ficha) → Haiku responde de verdad. */
async function caseMHaikuAnswersLooseQuestion() {
  console.log("\n── M: boleta pregunta suelta → Haiku responde + recordatorio ──");
  await seedAwaitingDepositStep("awaiting_deposit_boleta");

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "cuánto cuesta manicure en gel?", {
      wamid: newWamid("wamid.qa.deposit.m1"),
      contactName: "QA Deposit MNOP",
    }),
  );
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 2,
    timeoutMs: 25000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [NAME_DNI_REMINDER_RE, /S\/\s*\d/],
    mustNotMatch: [GENERIC_UNPARSED_RE],
    expectHaiku: false,
  });
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", PHONE)
    .maybeSingle();
  if (sess?.step !== "awaiting_deposit_boleta") {
    result.fails.push(`step=${sess?.step} (esperado awaiting_deposit_boleta)`);
    result.pass = false;
  }
  logCaseResult("M Haiku responde pregunta suelta en boleta", result, outbound);
  return result.pass;
}

/** No repetir el recordatorio de nombre/DNI si ya salió hace <5min (evita "spam"). */
async function caseNReminderNoSpam() {
  console.log("\n── N: 2 preguntas seguidas en boleta → recordatorio no se duplica ──");
  await seedAwaitingDepositStep("awaiting_deposit_boleta");

  const since1 = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "cuánto cuesta manicure en gel?", {
      wamid: newWamid("wamid.qa.deposit.n1"),
      contactName: "QA Deposit MNOP",
    }),
  );
  await pollOutboundSince(supabase, PHONE, since1, {
    minCount: 2,
    timeoutMs: 20000,
  });
  await sleep(4000); // margen para que llegue el recordatorio (3ra burbuja)
  const out1 = await fetchOutboundSince(supabase, PHONE, since1);
  const remindersIn1 = out1.filter((m) =>
    NAME_DNI_REMINDER_RE.test(m.content ?? ""),
  ).length;
  await sleep(1500);

  const since2 = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "y el pedicure en gel cuánto es?", {
      wamid: newWamid("wamid.qa.deposit.n2"),
      contactName: "QA Deposit MNOP",
    }),
  );
  await pollOutboundSince(supabase, PHONE, since2, {
    minCount: 1,
    timeoutMs: 20000,
  });
  await sleep(4000);
  const out2 = await fetchOutboundSince(supabase, PHONE, since2);
  const remindersIn2 = out2.filter((m) =>
    NAME_DNI_REMINDER_RE.test(m.content ?? ""),
  ).length;

  const fails = [];
  if (remindersIn1 !== 1) {
    fails.push(`turno 1: recordatorio x${remindersIn1} (esperado 1)`);
  }
  if (remindersIn2 !== 0) {
    fails.push(`turno 2 (<5min del 1ro): recordatorio x${remindersIn2} (esperado 0, evita spam)`);
  }
  const result = { pass: fails.length === 0, fails };
  logCaseResult("N recordatorio no se duplica", result, [...out1, ...out2]);
  return result.pass;
}

/** Pide agregar otro servicio en boleta → NO se agrega, sin confirmación falsa. */
async function caseOAddToCartBlockedInBoleta() {
  console.log("\n── O: pide agregar servicio en boleta → bloqueado, sin carrito falso ──");
  await seedAwaitingDepositStep("awaiting_deposit_boleta");
  const { data: sessBefore } = await supabase
    .from("whatsapp_sessions")
    .select("cart_service_ids")
    .eq("phone", PHONE)
    .maybeSingle();

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "también quisiera agregar manicure en gel", {
      wamid: newWamid("wamid.qa.deposit.o1"),
      contactName: "QA Deposit MNOP",
    }),
  );
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 12000,
  });
  await sleep(3000);
  const outboundFull = await fetchOutboundSince(supabase, PHONE, since);

  const { data: sessAfter } = await supabase
    .from("whatsapp_sessions")
    .select("cart_service_ids, step")
    .eq("phone", PHONE)
    .maybeSingle();

  const fails = [];
  const joined = outboundFull.map((m) => m.content ?? "").join("\n");
  if (FAKE_CART_CONFIRM_RE.test(joined)) {
    fails.push("Haiku sonó como confirmación real de carrito (FAKE_CART_CONFIRM_RE)");
  }
  if (sessAfter?.cart_service_ids !== sessBefore?.cart_service_ids) {
    fails.push(
      `cart_service_ids cambió: ${sessBefore?.cart_service_ids} → ${sessAfter?.cart_service_ids}`,
    );
  }
  if (sessAfter?.step !== "awaiting_deposit_boleta") {
    fails.push(`step=${sessAfter?.step} (esperado awaiting_deposit_boleta)`);
  }
  const result = { pass: fails.length === 0, fails };
  logCaseResult("O add_to_cart bloqueado en boleta", result, outboundFull);
  return result.pass;
}

/** Mismo intento durante awaiting_payment_screenshot → mismo guard. */
async function casePAddToCartBlockedInScreenshotStep() {
  console.log(
    "\n── P: pide agregar servicio esperando comprobante → bloqueado ──",
  );
  await seedAwaitingDepositStep("awaiting_payment_screenshot");
  const { data: sessBefore } = await supabase
    .from("whatsapp_sessions")
    .select("cart_service_ids")
    .eq("phone", PHONE)
    .maybeSingle();

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "además quiero manicure en gel", {
      wamid: newWamid("wamid.qa.deposit.p1"),
      contactName: "QA Deposit MNOP",
    }),
  );
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 12000,
  });
  await sleep(3000);
  const outboundFull = await fetchOutboundSince(supabase, PHONE, since);

  const { data: sessAfter } = await supabase
    .from("whatsapp_sessions")
    .select("cart_service_ids")
    .eq("phone", PHONE)
    .maybeSingle();

  const fails = [];
  const joined = outboundFull.map((m) => m.content ?? "").join("\n");
  if (FAKE_CART_CONFIRM_RE.test(joined)) {
    fails.push("Haiku sonó como confirmación real de carrito (FAKE_CART_CONFIRM_RE)");
  }
  if (sessAfter?.cart_service_ids !== sessBefore?.cart_service_ids) {
    fails.push(
      `cart_service_ids cambió: ${sessBefore?.cart_service_ids} → ${sessAfter?.cart_service_ids}`,
    );
  }
  const result = { pass: fails.length === 0, fails };
  logCaseResult("P add_to_cart bloqueado esperando comprobante", result, outboundFull);
  return result.pass;
}

async function caseQTextThenImageOnly() {
  console.log("\n── Q: texto en pago → ack neutro; luego imagen sola → flujo normal ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const day = nextWeekdayKey();
  const slot = await findFreeSlot(day);
  await seedCartAwaitingDay(day);
  await supabase
    .from("whatsapp_sessions")
    .update({
      step: "awaiting_payment_screenshot",
      awaiting_screenshot: true,
      deposit_mode: "fixed",
      parsed_datetime: limaToUtcIso(day, slot.hour, slot.minute),
    })
    .eq("phone", PHONE);

  const send = (payload) => postWebhook(webhookUrl, payload);
  const fails = [];

  // 1) Texto suelto → ack, sin plantilla del voucher
  let since = new Date().toISOString();
  await send(
    buildTextPayload(PHONE, "Hola no puedo pagar con yape, puedo hacerlo mañana?", {
      wamid: newWamid("wamid.qa.deposit.q1"),
      contactName: "QA Deposit",
    }),
  );
  const out1 = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
  const a1 = assertOutbound(out1, [], {
    mustMatch: [/aviso al equipo para ayudarte con el pago/i],
    mustNotMatch: [/foto del voucher|Por favor envía/i],
    expectHaiku: false,
  });
  fails.push(...a1.fails);

  // 2) "Okey" → silencio (no repite ack ni plantilla)
  await sleep(2000);
  since = new Date().toISOString();
  await send(
    buildTextPayload(PHONE, "Okey", {
      wamid: newWamid("wamid.qa.deposit.q2"),
      contactName: "QA Deposit",
    }),
  );
  await sleep(9000);
  const out2 = await fetchOutboundSince(supabase, PHONE, since);
  if (out2.length > 0) {
    fails.push(`"Okey" no debía responder: ${out2.map((m) => m.content).join(" | ").slice(0, 120)}`);
  }

  // 3) Sesión intacta tras los textos
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step, awaiting_screenshot")
    .eq("phone", PHONE)
    .maybeSingle();
  if (sess?.step !== "awaiting_payment_screenshot" || !sess?.awaiting_screenshot) {
    fails.push(`sesión alterada: ${JSON.stringify(sess)}`);
  }

  // 4) Imagen SOLA (sin caption ni texto) minutos después → flujo normal
  since = new Date().toISOString();
  await send(
    buildImagePayload(PHONE, {
      wamid: newWamid("wamid.qa.deposit.q3"),
      contactName: "QA Deposit",
      caption: "",
    }),
  );
  const out3 = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 30000,
  });
  const a3 = assertOutbound(out3, [], {
    mustMatch: [/Recibido|reservada provisionalmente|nombre|DNI/i],
    expectHaiku: false,
  });
  fails.push(...a3.fails);
  const { data: sess2 } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", PHONE)
    .maybeSingle();
  console.log(`  tras imagen sola: step=${sess2?.step}`);

  const result = { pass: fails.length === 0, fails };
  logCaseResult("Q texto→ack, imagen sola sigue el flujo", result, [
    ...out1,
    ...out3,
  ]);
  return result.pass;
}

const ALL_CASES = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q",
];

function parseCaseFilter() {
  const envRaw = (process.env.FIXED_DEPOSIT_CASES || "").trim();
  const argvRaw = process.argv
    .slice(2)
    .filter((a) => a !== "--")
    .join(",");
  const raw = envRaw || argvRaw;
  if (!raw) return null;
  const set = new Set(
    raw
      .split(/[\s,]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
  );
  const unknown = [...set].filter((c) => !ALL_CASES.includes(c));
  if (unknown.length) {
    console.error(`Casos desconocidos: ${unknown.join(", ")} (válidos: ${ALL_CASES.join(",")})`);
    process.exit(1);
  }
  return set;
}

async function main() {
  const filter = parseCaseFilter();
  const run = (letter) => !filter || filter.has(letter);
  console.log(
    filter
      ? `Validación abono fijo S/25 (casos: ${[...filter].join(",")})`
      : "Validación abono fijo S/25 (historial)",
  );
  const results = [];
  try {
    if (run("A")) {
      results.push({ name: "A", pass: await caseANewWeekday() });
      await sleep(1500);
    }
    if (run("B")) {
      results.push({ name: "B", pass: await caseBNewSunday() });
      await sleep(1500);
    }
    if (run("C")) {
      results.push({ name: "C", pass: await caseCReturningWeekday() });
      await sleep(1500);
    }
    if (run("D")) {
      results.push({ name: "D", pass: await caseDReturningSunday() });
      await sleep(1500);
    }
    if (run("E")) {
      results.push({ name: "E", pass: await caseEAbandonedNoCompleted() });
      await sleep(1500);
    }
    if (run("F")) {
      const f = await caseFScreenshot();
      results.push({ name: "F", pass: f.pass });
      await sleep(1500);
    }
    if (run("G")) {
      results.push({ name: "G", pass: await caseGForfeitWithin24h() });
      await sleep(1500);
    }
    if (run("H")) {
      results.push({ name: "H", pass: await caseHForfeitBeyond24h() });
      await sleep(1500);
    }
    if (run("I")) {
      results.push({ name: "I", pass: await caseIDepositFaqMidPago() });
      await sleep(1500);
    }
    if (run("J")) {
      results.push({ name: "J", pass: await caseJBoletaUnparseableIdentity() });
      await sleep(1500);
    }
    if (run("K")) {
      results.push({ name: "K", pass: await caseKBoletaImageAsksWrittenData() });
      await sleep(1500);
    }
    if (run("L")) {
      results.push({ name: "L", pass: await caseLLocationMidBoletaResumesDatos() });
      await sleep(1500);
    }
    if (run("M")) {
      results.push({ name: "M", pass: await caseMHaikuAnswersLooseQuestion() });
      await sleep(1500);
    }
    if (run("N")) {
      results.push({ name: "N", pass: await caseNReminderNoSpam() });
      await sleep(1500);
    }
    if (run("O")) {
      results.push({ name: "O", pass: await caseOAddToCartBlockedInBoleta() });
      await sleep(1500);
    }
    if (run("P")) {
      results.push({ name: "P", pass: await casePAddToCartBlockedInScreenshotStep() });
      await sleep(1500);
    }
    if (run("Q")) {
      results.push({ name: "Q", pass: await caseQTextThenImageOnly() });
    }
  } finally {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
