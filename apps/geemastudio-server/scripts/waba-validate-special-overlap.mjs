#!/usr/bin/env node
/**
 * Solapamiento condicionado — carrito ENTRANTE 100% especial → tope 2;
 * cualquier servicio no-especial en el carrito → tope 1 (sin cambios).
 *
 * Casos A–G, J–K: agendado nuevo por texto libre (`tryCompleteBookingFromText`).
 * Casos H–I, L: reprogramación por tap `time_` → `finalizeRescheduleAppointment`
 *   (H: especial → slot con 1 especial → permite;
 *    I: normal → slot con 1 → bloquea;
 *    L: especial → slot con 2 especiales → bloquea).
 *
 * Filtro: SPECIAL_OVERLAP_CASES=H,I,L yarn waba:validate:special-overlap
 *
 * Teléfonos QA: 51999000991–993.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  buildInteractivePayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import {
  ensureQaClient,
  seedScheduledAppointment,
  countScheduledAppointments,
} from "./lib/waba-sim-seed.mjs";
import {
  pollResponseSince,
  fetchOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE_A = "51999000991"; // ocupante(s)
const PHONE_B = "51999000992"; // quien agenda / reprograma
const PHONE_C = "51999000993"; // 2.º ocupante (caso C)

function nextWeekdayKey(weekday /* 0=dom */, minDaysAhead = 14) {
  // Fecha futura móvil: el fixture fijo se pudo en el pasado y hacía fallar los casos "horario libre".
  const d = new Date(Date.now() + minDaysAhead * 86400000);
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const DATE_KEY = nextWeekdayKey(2); // martes futuro
const SLOT_1400 = `${DATE_KEY} 14:00:00`;
const SLOT_1100 = `${DATE_KEY} 11:00:00`;

const MICROSHADING_ID = "0285f517-da6c-41c6-b7df-0b42517e3dc9";
const LIFTING_ID = "33fbadcc-30e8-4e82-9913-3a888aea73dc";
const DELINEADO_ID = "8c23713f-89dd-4e43-b51c-ff20716fd75a";
const BUILDER_GEL_ID = "39154b05-1b0d-4ee8-b366-161a7f0aa09d";
const POLYGEL_ID = "063965fd-55ee-4cd4-897b-2b1f6ca69ca5";
const LAMINADO_CEJAS_ID = "svc-laminado-cejas";
// Bozo (52a4f6bb…) está inactivo en prod; Depilación de Cejas es la otra excepción especial activa.
const BOZO_ID = "96f071d5-b156-4c11-9b6e-20650e5f8cd8";
const DISENO_TINTURADO_ID = "8a37afe6-59e9-45cd-8fc7-292ec2979bfb";

const SLOT_TAKEN_RE = /no tiene cupo|Horarios con cupo|ya fue reservado por otra clienta/i;
/** Capacidad pasó el gate — puede ser confirmación, abono S/25 o ajuste de precio promo. */
const ALLOWED_RE =
  /Resumen de tu (reserva|cita)|Una precisión sobre tu cita|cita está (confirmada|anotada)|adelanto de S\/\s*25|Sigue estos pasos para agendar|Te esperamos/i;
const RESCHEDULED_RE =
  /cambié|actualiz|nueva fecha|Te esperamos|anotada|confirmada|Resumen|horario/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function cleanupAll() {
  const phones = [PHONE_A, PHONE_B, PHONE_C];
  for (const phone of phones) {
    await supabase
      .from("wa_action_debounce")
      .delete()
      .eq("phone", phone);
    const last9 = phone.slice(-9);
    const { data: appts } = await supabase
      .from("appointments")
      .select("id")
      .ilike("client_phone", `%${last9}%`);
    const ids = (appts ?? []).map((a) => a.id);
    if (ids.length) {
      await supabase
        .from("appointment_services")
        .delete()
        .in("appointment_id", ids);
      await supabase
        .from("appointment_verifications")
        .delete()
        .in("appointment_id", ids);
      await supabase.from("payments").delete().in("appointment_id", ids);
      await supabase.from("appointments").delete().in("id", ids);
    }
    await supabase.from("wa_messages").delete().eq("phone", phone);
    await supabase.from("whatsapp_sessions").delete().eq("phone", phone);
  }
}

async function seedOccupant(phone, serviceId, date, name) {
  // Asegurar clienta fresca (evita FK huérfana si otro cleanup borró clients).
  await supabase
    .from("clients")
    .delete()
    .eq("phone_country", "PE")
    .eq("phone_normalized", phone.slice(2));
  const clientId = await ensureQaClient(supabase, phone, name);
  const { data: check } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (!check?.id) {
    throw new Error(`seedOccupant: client ${phone} no persistió`);
  }
  await seedScheduledAppointment(supabase, phone, {
    serviceId,
    employeeId: null,
    date,
    clientName: name,
    sessionStep: "completed",
  });
}

async function seedMixedOccupant(phone, date) {
  const clientId = await ensureQaClient(supabase, phone, "QA Mix Occupant");
  const { data: appt, error } = await supabase
    .from("appointments")
    .insert({
      client_id: clientId,
      client_name: "QA Mix Occupant",
      client_phone: phone,
      whatsapp_phone: phone,
      service_id: BUILDER_GEL_ID,
      employee_id: null,
      date,
      duration: 120,
      price: "140.00",
      status: "scheduled",
    })
    .select("id")
    .single();
  if (error) throw new Error(`mixed appt: ${error.message}`);
  await supabase.from("appointment_services").insert([
    {
      appointment_id: appt.id,
      service_id: BUILDER_GEL_ID,
      employee_id: null,
      price: "70",
      duration: 60,
    },
    {
      appointment_id: appt.id,
      service_id: LAMINADO_CEJAS_ID,
      employee_id: null,
      price: "70",
      duration: 60,
    },
  ]);
  await supabase.from("whatsapp_sessions").upsert(
    {
      tenant_id: "zm-lash-nails",
      phone,
      step: "completed",
      cart_items: "[]",
      cart_service_ids: "[]",
      employee_assignments: "{}",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,phone" },
  );
  return appt.id;
}

async function seedBookerCart(serviceIds, prices) {
  const items = serviceIds.map((id, i) => ({
    item_type: "service",
    item_id: id,
    quantity: 1,
    price: prices[i] ?? 50,
  }));
  await supabase.from("whatsapp_sessions").upsert(
    {
      tenant_id: "zm-lash-nails",
      phone: PHONE_B,
      step: "awaiting_datetime",
      selected_day: DATE_KEY,
      cart_items: JSON.stringify(items),
      cart_service_ids: JSON.stringify(serviceIds),
      employee_assignments: "{}",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,phone" },
  );
}

async function tryBookAt(label, timeText, opts = {}) {
  const { expectBlock = false, wamidSuffix = label } = opts;
  const apptsBefore = await countScheduledAppointments(supabase, PHONE_B);
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_B, timeText, {
      wamid: newWamid(`wamid.qa.spov.${wamidSuffix}`),
      contactName: "QA Special Overlap B",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);
  let { outbound, haiku } = await pollResponseSince(supabase, PHONE_B, since, {
    timeoutMs: 28000,
  });
  // Precio promo puede llegar 1.º; esperar el resumen/abono si aún no hay señal clara.
  if (
    !expectBlock &&
    outbound.length > 0 &&
    !ALLOWED_RE.test(outbound.map((m) => m.content ?? "").join("\n")) &&
    !SLOT_TAKEN_RE.test(outbound.map((m) => m.content ?? "").join("\n"))
  ) {
    await sleep(3500);
    outbound = await fetchOutboundSince(supabase, PHONE_B, since);
  }
  const apptsAfter = await countScheduledAppointments(supabase, PHONE_B);

  if (expectBlock) {
    const result = assertOutbound(outbound, haiku, {
      mustMatch: [SLOT_TAKEN_RE],
      expectHaiku: false,
    });
    const noNew = apptsAfter === apptsBefore;
    const pass = result.pass && noNew;
    if (!noNew) {
      result.fails = [...(result.fails ?? []), "se creó cita pese a bloqueo"];
    }
    return { result: { ...result, pass }, outbound };
  }

  const result = assertOutbound(outbound, haiku, {
    mustMatch: [ALLOWED_RE],
    mustNotMatch: [SLOT_TAKEN_RE],
    expectHaiku: false,
  });
  // Sin completed el flujo puede pedir abono sin crear cita aún — OK si no bloqueó.
  return { result, outbound };
}

async function caseA() {
  console.log("\n── A: slot vacío → Microshading (especial) → permite ──");
  await seedBookerCart([MICROSHADING_ID], [150]);
  const { result, outbound } = await tryBookAt("a", "2:00 pm");
  logCaseResult("Special-A vacío→Microshading", result, outbound);
  return {
    name: "A vacío → Microshading",
    pass: result.pass,
    note: result.pass ? "0 < 2" : result.fails?.join("; ") || "Falló",
  };
}

async function caseB() {
  console.log(
    "\n── B: 1 Microshading ocupando → Lifting (especial) → permite ──",
  );
  await cleanupAll();
  await seedOccupant(PHONE_A, MICROSHADING_ID, SLOT_1400, "QA Occ A");
  await seedBookerCart([LIFTING_ID], [50]);
  const { result, outbound } = await tryBookAt("b", "2:00 pm");
  logCaseResult("Special-B 1 especial→2.º especial", result, outbound);
  return {
    name: "B 1 especial → Lifting",
    pass: result.pass,
    note: result.pass ? "1 < 2" : result.fails?.join("; ") || "Falló",
  };
}

async function caseC() {
  console.log(
    "\n── C: 2 especiales ocupando → Delineado (especial) → bloquea ──",
  );
  await cleanupAll();
  await seedOccupant(PHONE_A, MICROSHADING_ID, SLOT_1400, "QA Occ A");
  await seedOccupant(PHONE_C, LIFTING_ID, SLOT_1400, "QA Occ C");
  await seedBookerCart([DELINEADO_ID], [80]);
  const { result, outbound } = await tryBookAt("c", "2:00 pm", {
    expectBlock: true,
  });
  logCaseResult("Special-C 2 especiales→bloqueo", result, outbound);
  return {
    name: "C 2 especiales → bloqueo",
    pass: result.pass,
    note: result.pass ? "2 >= 2" : result.fails?.join("; ") || "Falló",
  };
}

async function caseD() {
  console.log("\n── D: vacío → Builder Gel (normal) → permite ──");
  await cleanupAll();
  await seedBookerCart([BUILDER_GEL_ID], [70]);
  const { result, outbound } = await tryBookAt("d", "2:00 pm");
  logCaseResult("Special-D vacío→Builder", result, outbound);
  return {
    name: "D vacío → Builder",
    pass: result.pass,
    note: result.pass ? "0 < 1" : result.fails?.join("; ") || "Falló",
  };
}

async function caseE() {
  console.log(
    "\n── E: 1 Builder ocupando → PolyGel (normal) → bloquea ──",
  );
  await cleanupAll();
  await seedOccupant(PHONE_A, BUILDER_GEL_ID, SLOT_1400, "QA Occ A");
  await seedBookerCart([POLYGEL_ID], [90]);
  const { result, outbound } = await tryBookAt("e", "2:00 pm", {
    expectBlock: true,
  });
  logCaseResult("Special-E Builder→PolyGel bloqueo", result, outbound);
  return {
    name: "E Builder → PolyGel bloqueo",
    pass: result.pass,
    note: result.pass ? "1 >= 1" : result.fails?.join("; ") || "Falló",
  };
}

async function caseF() {
  console.log(
    "\n── F: ocupante mixto Builder+Laminado → Microshading → permite ──",
  );
  await cleanupAll();
  await seedMixedOccupant(PHONE_A, SLOT_1400);
  await seedBookerCart([MICROSHADING_ID], [150]);
  const { result, outbound } = await tryBookAt("f", "2:00 pm");
  logCaseResult("Special-F mixto→Microshading", result, outbound);
  return {
    name: "F mixto ocupante → Microshading",
    pass: result.pass,
    note: result.pass
      ? "mira carrito entrante (1 < 2)"
      : result.fails?.join("; ") || "Falló",
  };
}

async function caseG() {
  console.log(
    "\n── G: vacío → carrito mixto Builder+Laminado → permite ──",
  );
  await cleanupAll();
  await seedBookerCart([BUILDER_GEL_ID, LAMINADO_CEJAS_ID], [70, 70]);
  const { result, outbound } = await tryBookAt("g", "2:00 pm");
  logCaseResult("Special-G mixto entrante", result, outbound);
  return {
    name: "G vacío → mixto entrante",
    pass: result.pass,
    note: result.pass ? "cap 1, 0 < 1" : result.fails?.join("; ") || "Falló",
  };
}

async function caseH() {
  console.log(
    "\n── H: reprog. especial (tap time_) → slot con 1 especial → permite ──",
  );
  await cleanupAll();
  await seedOccupant(PHONE_A, MICROSHADING_ID, SLOT_1400, "QA Occ A");
  const { appointmentId } = await seedScheduledAppointment(supabase, PHONE_B, {
    serviceId: LIFTING_ID,
    employeeId: null,
    date: SLOT_1100,
    clientName: "QA Soft H",
    sessionStep: "completed",
  });
  // Flujo interactivo: reschedule_appointment_id + tap time_ → finalizeRescheduleAppointment
  await supabase.from("whatsapp_sessions").upsert(
    {
      tenant_id: "zm-lash-nails",
      phone: PHONE_B,
      step: "awaiting_datetime",
      selected_day: DATE_KEY,
      cart_items: JSON.stringify([
        { item_type: "service", item_id: LIFTING_ID, quantity: 1, price: 50 },
      ]),
      cart_service_ids: JSON.stringify([LIFTING_ID]),
      reschedule_appointment_id: appointmentId,
      employee_assignments: "{}",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,phone" },
  );

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildInteractivePayload(
      PHONE_B,
      `time_${DATE_KEY}T1400`,
      "2:00 PM",
      { wamid: newWamid("wamid.qa.spov.h"), contactName: "QA Soft H" },
    ),
  );
  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_B, since, {
    timeoutMs: 28000,
  });
  const { data: updated } = await supabase
    .from("appointments")
    .select("date")
    .eq("id", appointmentId)
    .maybeSingle();
  const updatedDate = String(updated?.date ?? "").replace("T", " ");
  const moved = updatedDate.startsWith(`${DATE_KEY} 14:`);
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [RESCHEDULED_RE],
    mustNotMatch: [SLOT_TAKEN_RE],
    expectHaiku: false,
  });
  const pass = result.pass && moved;
  if (!moved) {
    result.fails = [
      ...(result.fails ?? []),
      `cita no movió a 14:00 (date=${updated?.date})`,
    ];
  }
  logCaseResult("Special-H reprog especial tap", { ...result, pass }, outbound);
  return {
    name: "H reprog especial tap (1 ocupante)",
    pass,
    note: pass ? "1 < 2 excluyendo self" : result.fails?.join("; ") || "Falló",
  };
}

async function caseI() {
  console.log(
    "\n── I: reprog. normal (tap time_) → slot con 1 cita → bloquea ──",
  );
  await cleanupAll();
  await seedOccupant(PHONE_A, BUILDER_GEL_ID, SLOT_1400, "QA Occ A");
  const { appointmentId } = await seedScheduledAppointment(supabase, PHONE_B, {
    serviceId: POLYGEL_ID,
    employeeId: null,
    date: SLOT_1100,
    clientName: "QA Soft I",
    sessionStep: "completed",
  });
  await supabase.from("whatsapp_sessions").upsert(
    {
      tenant_id: "zm-lash-nails",
      phone: PHONE_B,
      step: "awaiting_datetime",
      selected_day: DATE_KEY,
      cart_items: JSON.stringify([
        { item_type: "service", item_id: POLYGEL_ID, quantity: 1, price: 90 },
      ]),
      cart_service_ids: JSON.stringify([POLYGEL_ID]),
      reschedule_appointment_id: appointmentId,
      employee_assignments: "{}",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,phone" },
  );

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildInteractivePayload(
      PHONE_B,
      `time_${DATE_KEY}T1400`,
      "2:00 PM",
      { wamid: newWamid("wamid.qa.spov.i"), contactName: "QA Soft I" },
    ),
  );
  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_B, since, {
    timeoutMs: 28000,
  });
  const { data: updated } = await supabase
    .from("appointments")
    .select("date")
    .eq("id", appointmentId)
    .maybeSingle();
  const updatedDate = String(updated?.date ?? "").replace("T", " ");
  const stayed = updatedDate.startsWith(`${DATE_KEY} 11:`);
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [SLOT_TAKEN_RE],
    expectHaiku: false,
  });
  const pass = result.pass && stayed;
  if (!stayed) {
    result.fails = [
      ...(result.fails ?? []),
      `cita se movió (date=${updated?.date})`,
    ];
  }
  logCaseResult("Special-I reprog normal bloqueo", { ...result, pass }, outbound);
  return {
    name: "I reprog normal tap (bloqueo)",
    pass,
    note: pass ? "tope 1" : result.fails?.join("; ") || "Falló",
  };
}

async function caseJ() {
  console.log(
    "\n── J: Depilación de Cejas (excepción) → cuenta especial (permite con 1) ──",
  );
  await cleanupAll();
  await seedOccupant(PHONE_A, LIFTING_ID, SLOT_1400, "QA Occ A");
  await seedBookerCart([BOZO_ID], [15]);
  const { result, outbound } = await tryBookAt("j", "2:00 pm");
  logCaseResult("Special-J Bozo excepción", result, outbound);
  return {
    name: "J Bozo = especial",
    pass: result.pass,
    note: result.pass ? "extra ID → cap 2" : result.fails?.join("; ") || "Falló",
  };
}

async function caseK() {
  console.log(
    "\n── K: Diseño Cejas+Tinturado (cejas, NO extra) con Builder Gel ocupando Stephani → permite (otra chica) ──",
  );
  await cleanupAll();
  await seedOccupant(PHONE_A, BUILDER_GEL_ID, SLOT_1400, "QA Occ A");
  await seedBookerCart([DISENO_TINTURADO_ID], [40]);
  // Con el modelo de disponibilidad por chica (3-oct) el motor decide por personal, no por tope 1:
  // Builder Gel ocupa a Stephani y las cejas las toma otra chica → se agenda.
  const { result, outbound } = await tryBookAt("k", "2:00 pm");
  logCaseResult("Special-K Diseño=normal", result, outbound);
  return {
    name: "K Diseño Cejas+Tinturado con otra chica libre",
    pass: result.pass,
    note: result.pass
      ? "no es especial; otra chica libre → permite"
      : result.fails?.join("; ") || "Falló",
  };
}

/** Reprog. especial por tap time_ hacia slot ya lleno (2 especiales) → bloquea. */
async function caseL() {
  console.log(
    "\n── L: reprog. especial (tap time_) → slot con 2 especiales → bloquea ──",
  );
  await cleanupAll();
  await seedOccupant(PHONE_A, MICROSHADING_ID, SLOT_1400, "QA Occ A");
  await seedOccupant(PHONE_C, DELINEADO_ID, SLOT_1400, "QA Occ C");
  const { appointmentId } = await seedScheduledAppointment(supabase, PHONE_B, {
    serviceId: LIFTING_ID,
    employeeId: null,
    date: SLOT_1100,
    clientName: "QA Soft L",
    sessionStep: "completed",
  });
  await supabase.from("whatsapp_sessions").upsert(
    {
      tenant_id: "zm-lash-nails",
      phone: PHONE_B,
      step: "awaiting_datetime",
      selected_day: DATE_KEY,
      cart_items: JSON.stringify([
        { item_type: "service", item_id: LIFTING_ID, quantity: 1, price: 50 },
      ]),
      cart_service_ids: JSON.stringify([LIFTING_ID]),
      reschedule_appointment_id: appointmentId,
      employee_assignments: "{}",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,phone" },
  );

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildInteractivePayload(
      PHONE_B,
      `time_${DATE_KEY}T1400`,
      "2:00 PM",
      { wamid: newWamid("wamid.qa.spov.l"), contactName: "QA Soft L" },
    ),
  );
  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_B, since, {
    timeoutMs: 28000,
  });
  const { data: updated } = await supabase
    .from("appointments")
    .select("date")
    .eq("id", appointmentId)
    .maybeSingle();
  const updatedDate = String(updated?.date ?? "").replace("T", " ");
  const stayed = updatedDate.startsWith(`${DATE_KEY} 11:`);
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [SLOT_TAKEN_RE],
    expectHaiku: false,
  });
  const pass = result.pass && stayed;
  if (!stayed) {
    result.fails = [
      ...(result.fails ?? []),
      `cita se movió (date=${updated?.date})`,
    ];
  }
  logCaseResult("Special-L reprog especial 2 ocupantes", { ...result, pass }, outbound);
  return {
    name: "L reprog especial tap (2 ocupantes → bloqueo)",
    pass,
    note: pass ? "2 >= 2 excluyendo self" : result.fails?.join("; ") || "Falló",
  };
}

async function main() {
  console.log("Validación solapamiento especial —", PHONE_A, PHONE_B, PHONE_C);
  const allCases = {
    A: caseA,
    B: caseB,
    C: caseC,
    D: caseD,
    E: caseE,
    F: caseF,
    G: caseG,
    H: caseH,
    I: caseI,
    J: caseJ,
    K: caseK,
    L: caseL,
  };
  const filterRaw = (process.env.SPECIAL_OVERLAP_CASES || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const selected =
    filterRaw.length > 0
      ? filterRaw.map((k) => {
          const fn = allCases[k];
          if (!fn) throw new Error(`Caso desconocido: ${k}`);
          return fn;
        })
      : Object.values(allCases);
  if (filterRaw.length) {
    console.log("Solo casos:", filterRaw.join(", "));
  }

  await cleanupAll();
  await sleep(2500);

  const results = [];
  const run = async (fn) => {
    try {
      results.push(await fn());
    } catch (e) {
      const name = fn.name || "caso";
      console.error(`  ERROR ${name}:`, e.message || e);
      results.push({
        name,
        pass: false,
        note: String(e.message || e),
      });
    }
  };
  try {
    for (let i = 0; i < selected.length; i++) {
      await run(selected[i]);
      if (i < selected.length - 1) await sleep(2500);
    }
  } finally {
    await cleanupAll();
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
