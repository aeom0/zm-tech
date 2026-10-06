#!/usr/bin/env node
/**
 * Carriles cat-extensiones: Stephani (todo el día) vs Karelis (desde 13:00 Lima).
 * Independiente de SPECIAL_OVERLAP (Vanessa).
 *
 * A: Rímel a las 11 → permite (Stephani)
 * B: Fox a las 11 → bloquea (Karelis solo tarde)
 * C: Rímel ocupando 14:00 + Fox → ambos OK (carriles distintos)
 * D: Fox ocupando 14:00 + Wispy → bloquea (mismo carril Karelis)
 * E: Rímel ocupando 14:00 + Clásicas → bloquea (mismo carril Stephani)
 * F: reprog. Fox tap time_ a su mismo slot (excludeId) → permite
 * G: 1 Microshading + Lifting (especial Vanessa) → permite (regresión)
 * H: Manicure ocupando 14:00 + Clásicas → bloquea (Stephani ocupada fuera de extensiones)
 * I: Manicure ocupando 14:00 + Fox → permite (Karelis libre; control anti-overfix)
 * J: Fox ocupando 14:00 + Manicure → permite (inverso de I; carrito unas exige Stephani)
 *
 * Filtro: EXTENSIONES_LANES_CASES=A,B,C yarn waba:validate:extensiones-lanes
 * Teléfonos: 51999000994–996 (no paralelizar con luana/p4).
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

const PHONE_A = "51999000994";
const PHONE_B = "51999000995";
const PHONE_C = "51999000996";

function nextWeekdayKey(weekday /* 0=dom */, minDaysAhead = 14) {
  // Fecha futura móvil: el fixture fijo (22-sep) quedó en el pasado y todos los casos "permite" fallaban.
  const d = new Date(Date.now() + minDaysAhead * 86400000);
  while (d.getUTCDay() !== weekday) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
const DATE_KEY = nextWeekdayKey(2); // martes futuro
const SLOT_1400 = `${DATE_KEY} 14:00:00`;
const SLOT_1100 = `${DATE_KEY} 11:00:00`;

const RIMEL_ID = "e7e0e977-5acf-48cf-8bdd-29430c7e1205";
const FOX_ID = "b266268d-11a2-43f4-b5f2-b6982860fed6";
const WISPY_ID = "5df66076-5b74-40d6-bb6d-8eacc2191e2a";
const CLASICAS_ID = "3d5d6ee4-b799-4b93-86eb-b974ec125439";
const LIFTING_ID = "33fbadcc-30e8-4e82-9913-3a888aea73dc";
const MICROSHADING_ID = "0285f517-da6c-41c6-b7df-0b42517e3dc9";
const MANICURE_GEL_ID = "f6b62575-6515-4fd8-997e-1ab4bf9271ca";

const SLOT_TAKEN_RE = /no tiene cupo|Horarios con cupo|ya fue reservado por otra clienta/i;
const KARELIS_AFTERNOON_RE =
  /desde la \*?1:00 PM\*?|turno tarde|Horarios con cupo ese día: 1 PM/i;
const ALLOWED_RE =
  /Resumen de tu (reserva|cita)|Una precisión sobre tu cita|cita está (confirmada|anotada)|adelanto de S\/\s*25|Sigue estos pasos para agendar|Te esperamos/i;
const RESCHEDULED_RE =
  /cambié|actualiz|nueva fecha|Te esperamos|anotada|confirmada|Resumen|horario/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function cleanupAll() {
  for (const phone of [PHONE_A, PHONE_B, PHONE_C]) {
    await supabase.from("wa_action_debounce").delete().eq("phone", phone);
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
  await supabase
    .from("clients")
    .delete()
    .eq("phone_country", "PE")
    .eq("phone_normalized", phone.slice(2));
  const clientId = await ensureQaClient(supabase, phone, name);
  if (!clientId) throw new Error(`seedOccupant: client ${phone}`);
  await seedScheduledAppointment(supabase, phone, {
    serviceId,
    employeeId: null,
    date,
    clientName: name,
    sessionStep: "completed",
  });
}

async function seedBookerCart(serviceIds, prices) {
  const items = serviceIds.map((id, i) => ({
    item_type: "service",
    item_id: id,
    quantity: 1,
    price: prices[i] ?? 90,
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
  const {
    expectBlock = false,
    expectKarelisGate = false,
    wamidSuffix = label,
  } = opts;
  const apptsBefore = await countScheduledAppointments(supabase, PHONE_B);
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_B, timeText, {
      wamid: newWamid(`wamid.qa.extlanes.${wamidSuffix}`),
      contactName: "QA Ext Lanes B",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);
  let { outbound, haiku } = await pollResponseSince(supabase, PHONE_B, since, {
    timeoutMs: 28000,
  });
  if (
    !expectBlock &&
    !expectKarelisGate &&
    outbound.length > 0 &&
    !ALLOWED_RE.test(outbound.map((m) => m.content ?? "").join("\n"))
  ) {
    await sleep(3500);
    outbound = await fetchOutboundSince(supabase, PHONE_B, since);
  }
  const apptsAfter = await countScheduledAppointments(supabase, PHONE_B);
  const joined = outbound.map((m) => m.content ?? "").join("\n");

  if (expectKarelisGate) {
    const result = assertOutbound(outbound, haiku, {
      mustMatch: [KARELIS_AFTERNOON_RE],
      mustNotMatch: [ALLOWED_RE],
      expectHaiku: false,
    });
    const noNew = apptsAfter === apptsBefore;
    return {
      result: {
        ...result,
        pass: result.pass && noNew,
        fails: noNew
          ? result.fails
          : [...(result.fails ?? []), "se creó cita en mañana Karelis"],
      },
      outbound,
    };
  }

  if (expectBlock) {
    const result = assertOutbound(outbound, haiku, {
      mustMatch: [SLOT_TAKEN_RE],
      expectHaiku: false,
    });
    const noNew = apptsAfter === apptsBefore;
    return {
      result: {
        ...result,
        pass: result.pass && noNew,
        fails: noNew
          ? result.fails
          : [...(result.fails ?? []), "se creó cita pese a bloqueo"],
      },
      outbound,
    };
  }

  const result = assertOutbound(outbound, haiku, {
    mustMatch: [ALLOWED_RE],
    mustNotMatch: [SLOT_TAKEN_RE, KARELIS_AFTERNOON_RE],
    expectHaiku: false,
  });
  return { result, outbound };
}

async function caseA() {
  console.log("\n── A: Rímel (Stephani) a las 11 → permite ──");
  await cleanupAll();
  await seedBookerCart([RIMEL_ID], [90]);
  const { result, outbound } = await tryBookAt("a", "11:00 am");
  logCaseResult("ExtLanes-A Rímel mañana", result, outbound);
  return {
    name: "A Rímel 11am",
    pass: result.pass,
    note: result.pass ? "Stephani todo el día" : result.fails?.join("; "),
  };
}

async function caseB() {
  console.log("\n── B: Fox (Karelis) a las 11 → solo tarde ──");
  await cleanupAll();
  await seedBookerCart([FOX_ID], [120]);
  const { result, outbound } = await tryBookAt("b", "11:00 am", {
    expectKarelisGate: true,
  });
  logCaseResult("ExtLanes-B Fox mañana", result, outbound);
  return {
    name: "B Fox 11am bloqueo",
    pass: result.pass,
    note: result.pass ? "Karelis ≥13h" : result.fails?.join("; "),
  };
}

async function caseC() {
  console.log("\n── C: Rímel ocupando 14:00 + Fox → permite ──");
  await cleanupAll();
  await seedOccupant(PHONE_A, RIMEL_ID, SLOT_1400, "QA Occ Rimel");
  await seedBookerCart([FOX_ID], [120]);
  const { result, outbound } = await tryBookAt("c", "2:00 pm");
  logCaseResult("ExtLanes-C Rímel+Fox", result, outbound);
  return {
    name: "C Rímel+Fox tarde",
    pass: result.pass,
    note: result.pass ? "carriles distintos" : result.fails?.join("; "),
  };
}

async function caseD() {
  console.log("\n── D: Fox ocupando 14:00 + Wispy → bloquea ──");
  await cleanupAll();
  await seedOccupant(PHONE_A, FOX_ID, SLOT_1400, "QA Occ Fox");
  await seedBookerCart([WISPY_ID], [130]);
  const { result, outbound } = await tryBookAt("d", "2:00 pm", {
    expectBlock: true,
  });
  logCaseResult("ExtLanes-D Fox+Wispy", result, outbound);
  return {
    name: "D Fox+Wispy bloqueo",
    pass: result.pass,
    note: result.pass ? "mismo carril Karelis" : result.fails?.join("; "),
  };
}

async function caseE() {
  console.log("\n── E: Rímel ocupando 11:00 + Clásicas → bloquea (Karelis solo tarde) ──");
  await cleanupAll();
  await seedOccupant(PHONE_A, RIMEL_ID, SLOT_1100, "QA Occ Rimel");
  await seedBookerCart([CLASICAS_ID], [90]);
  const { result, outbound } = await tryBookAt("e", "11:00 am", {
    expectBlock: true,
  });
  logCaseResult("ExtLanes-E Rímel+Clásicas", result, outbound);
  return {
    name: "E Rímel+Clásicas bloqueo",
    pass: result.pass,
    note: result.pass ? "mismo carril Stephani" : result.fails?.join("; "),
  };
}

async function caseF() {
  console.log(
    "\n── F: reprog. Fox tap time_ al mismo slot (excludeId) → permite ──",
  );
  await cleanupAll();
  const { appointmentId } = await seedScheduledAppointment(supabase, PHONE_B, {
    serviceId: FOX_ID,
    employeeId: null,
    date: SLOT_1400,
    clientName: "QA Soft Fox",
    sessionStep: "completed",
  });
  await supabase.from("whatsapp_sessions").upsert(
    {
      tenant_id: "zm-lash-nails",
      phone: PHONE_B,
      step: "awaiting_datetime",
      selected_day: DATE_KEY,
      reschedule_appointment_id: appointmentId,
      cart_items: "[]",
      cart_service_ids: JSON.stringify([FOX_ID]),
      employee_assignments: "{}",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,phone" },
  );
  const since = new Date().toISOString();
  const timeId = `time_${DATE_KEY}T1400`;
  const status = await postWebhook(
    webhookUrl,
    buildInteractivePayload(PHONE_B, timeId, {
      wamid: newWamid("wamid.qa.extlanes.f"),
      contactName: "QA Soft Fox",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);
  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_B, since, {
    timeoutMs: 28000,
  });
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [RESCHEDULED_RE],
    mustNotMatch: [SLOT_TAKEN_RE],
    expectHaiku: false,
  });
  logCaseResult("ExtLanes-F reprog excludeId", result, outbound);
  return {
    name: "F reprog Fox excludeId",
    pass: result.pass,
    note: result.pass ? "no se cuenta a sí misma" : result.fails?.join("; "),
  };
}

async function caseG() {
  console.log(
    "\n── G: 1 Microshading + Lifting (especial Vanessa) → permite ──",
  );
  await cleanupAll();
  await seedOccupant(PHONE_A, MICROSHADING_ID, SLOT_1400, "QA Occ Micro");
  await seedBookerCart([LIFTING_ID], [50]);
  const { result, outbound } = await tryBookAt("g", "2:00 pm");
  logCaseResult("ExtLanes-G regresión especial", result, outbound);
  return {
    name: "G Vanessa cap=2 intacto",
    pass: result.pass,
    note: result.pass ? "SPECIAL_OVERLAP OK" : result.fails?.join("; "),
  };
}

async function caseH() {
  console.log(
    "\n── H: Manicure ocupando 11:00 + Clásicas → bloquea (Stephani; Karelis solo tarde) ──",
  );
  await cleanupAll();
  await seedOccupant(PHONE_A, MANICURE_GEL_ID, SLOT_1100, "QA Occ Mani");
  await seedBookerCart([CLASICAS_ID], [90]);
  const { result, outbound } = await tryBookAt("h", "11:00 am", {
    expectBlock: true,
  });
  logCaseResult("ExtLanes-H Manicure+Clásicas", result, outbound);
  return {
    name: "H Manicure+Clásicas bloqueo",
    pass: result.pass,
    note: result.pass
      ? "unas ocupa carril Stephani"
      : result.fails?.join("; "),
  };
}

async function caseI() {
  console.log(
    "\n── I: Manicure ocupando 14:00 + Fox → permite (Karelis libre) ──",
  );
  await cleanupAll();
  await seedOccupant(PHONE_A, MANICURE_GEL_ID, SLOT_1400, "QA Occ Mani");
  await seedBookerCart([FOX_ID], [120]);
  const { result, outbound } = await tryBookAt("i", "2:00 pm");
  logCaseResult("ExtLanes-I Manicure+Fox", result, outbound);
  return {
    name: "I Manicure+Fox tarde",
    pass: result.pass,
    note: result.pass ? "Karelis en play → 2.ª plaza" : result.fails?.join("; "),
  };
}

async function caseJ() {
  console.log(
    "\n── J: Fox ocupando 14:00 + Manicure → permite (Stephani libre) ──",
  );
  await cleanupAll();
  await seedOccupant(PHONE_A, FOX_ID, SLOT_1400, "QA Occ Fox");
  await seedBookerCart([MANICURE_GEL_ID], [50]);
  const { result, outbound } = await tryBookAt("j", "2:00 pm");
  logCaseResult("ExtLanes-J Fox+Manicure", result, outbound);
  return {
    name: "J Fox+Manicure tarde",
    pass: result.pass,
    note: result.pass
      ? "unas exige Stephani (no cap plano)"
      : result.fails?.join("; "),
  };
}

const ALL = {
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
};

async function main() {
  const filterRaw = (process.env.EXTENSIONES_LANES_CASES || "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const keys = filterRaw.length ? filterRaw : Object.keys(ALL);
  console.log(`Extensiones lanes QA — casos: ${keys.join(",")}`);
  const results = [];
  try {
    for (const k of keys) {
      const fn = ALL[k];
      if (!fn) {
        console.warn(`Caso desconocido: ${k}`);
        continue;
      }
      results.push(await fn());
    }
  } finally {
    await cleanupAll();
  }
  finishAndExit(results, "extensiones-lanes");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
