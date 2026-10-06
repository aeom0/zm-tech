#!/usr/bin/env node
/**
 * QA flujo Treysy García (jul-2026) — fixes apply:
 * A: fecha solo ("15 de agosto") → selected_day + selector hora (NO cita a las 3 PM)
 * B: "Está quiero" en awaiting_datetime → no duplicar carrito
 * C: "Ya" / "ya gracias" con cita → cierre PE, sin menú
 * C3: "Ya gracias" luego "Ya" (segundo cierre) → ack, sin menú
 * D: "Ya" con carrito sin cita → guía hora, sin menú
 * E: imagen mid-awaiting → calendario, sin menú
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  buildImagePayload,
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
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000981";
const MANOS_PIES_ID = "bf6a5541-eaf6-47d9-a6b8-06f216f124e0";
const MANOS_PRICE = 90;

const MENU_RE = /\[lista\] ZM Lash & Nails Beauty:/i;
const TIME_LIST_RE = /\[lista\].*(hora|Mañana|Tarde|Elegir)/i;
const DATE_LIST_RE = /\[lista\] Elegir fecha:/i;
const ACTION_LEAK_RE = /<\/?action>/i;
const CLOSING_RE = /quedamos así|listo!?\s*quedamos|cualquier cosa/i;
const HORA_GUIDE_RE = /hora|botones|anotada|confirmada/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedAwaitingCart(opts = {}) {
  const { selectedDay = null, step = "awaiting_datetime" } = opts;
  await ensureQaClient(supabase, TEST_PHONE, "QA Treysy Sim");
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step,
    selected_day: selectedDay,
    cart_items: JSON.stringify([
      {
        item_type: "service",
        item_id: MANOS_PIES_ID,
        quantity: 1,
        price: MANOS_PRICE,
      },
    ]),
    cart_service_ids: JSON.stringify([MANOS_PIES_ID]),
    employee_assignments: "{}",
    parsed_datetime: null,
    updated_at: new Date().toISOString(),
  });
}

async function getSessionCartIds() {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("cart_service_ids, selected_day, step")
    .eq("phone", TEST_PHONE)
    .maybeSingle();
  let ids = [];
  try {
    ids = JSON.parse(String(data?.cart_service_ids ?? "[]"));
  } catch {
    ids = [];
  }
  return {
    ids: Array.isArray(ids) ? ids : [],
    selectedDay: data?.selected_day ?? null,
    step: data?.step ?? null,
  };
}

async function countScheduledForPhone() {
  const last9 = TEST_PHONE.slice(-9);
  const { data } = await supabase
    .from("appointments")
    .select("id, date, price")
    .ilike("client_phone", `%${last9}%`)
    .eq("status", "scheduled");
  return data ?? [];
}

async function caseFechaSoloAgosto() {
  console.log("\n── Treysy-A: El 15 de agosto → selected_day + horas ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await seedAwaitingCart();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "El 15 de agosto", {
      wamid: newWamid("wamid.qa.treysy.a"),
      contactName: "QA Treysy Sim",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  await sleep(2500);
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 30000,
  });
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const sess = await getSessionCartIds();
  const appts = await countScheduledForPhone();

  const dayOk = sess.selectedDay === "2026-08-15";
  const hasTimeUi =
    TIME_LIST_RE.test(text) || /qu[eé] hora|hora te viene/i.test(text);
  const noLeak = !ACTION_LEAK_RE.test(text);
  const noAppt = appts.length === 0;
  // No debe haber cerrado cita inventando 15:00 por el día "15"
  const noFakeBook =
    !/cita\s+(confirmada|agendada|anotada).*15:00/i.test(text) &&
    !/agendada.*3(:00)?\s*p\.?\s*m/i.test(text);

  const pass = dayOk && hasTimeUi && noLeak && noAppt && noFakeBook;
  const fails = [];
  if (!dayOk) fails.push(`selected_day=${sess.selectedDay} (esp. 2026-08-15)`);
  if (!hasTimeUi) fails.push("sin selector/pregunta de hora");
  if (!noLeak) fails.push("leak <action>");
  if (!noAppt) fails.push(`cita creada temprano: ${appts[0]?.date}`);
  if (!noFakeBook) fails.push("copy de cita inventada 3 PM");

  logCaseResult(
    "Treysy-A fecha solo",
    { pass, fails, outboundCount: outbound.length, haikuCount: 0 },
    outbound,
  );
  return {
    name: "Treysy-A (15 ago → día+hora)",
    pass,
    note: pass ? `selected_day=${sess.selectedDay}` : fails.join("; "),
  };
}

async function caseEstaQuieroNoDup() {
  console.log("\n── Treysy-B: Está quiero → no duplicar carrito ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await seedAwaitingCart({ selectedDay: "2026-08-15" });
  const before = await getSessionCartIds();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Está quiero", {
      wamid: newWamid("wamid.qa.treysy.b"),
      contactName: "QA Treysy Sim",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  await sleep(4000);
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 35000,
  });
  const after = await getSessionCartIds();
  const text = outbound.map((m) => m.content ?? "").join("\n");

  const dupIds =
    after.ids.filter((id) => id === MANOS_PIES_ID).length >
    before.ids.filter((id) => id === MANOS_PIES_ID).length;
  const grewUnexpected =
    after.ids.length > before.ids.length &&
    !/\b(agregar|añadir|también quiero)\b/i.test("Está quiero");
  const leak = ACTION_LEAK_RE.test(text);
  const listedAdd =
    /Listo — agregué:.*,/i.test(text) ||
    (/Listo — agregué:/i.test(text) && /Pedicure/i.test(text));

  const pass = !dupIds && !grewUnexpected && !leak && !listedAdd;
  const fails = [];
  if (dupIds) fails.push("servicio duplicado en cart_service_ids");
  if (grewUnexpected)
    fails.push(`carrito creció ${before.ids.length}→${after.ids.length}`);
  if (leak) fails.push("leak <action>");
  if (listedAdd) fails.push("add_to_cart con Pedicure/extra");

  logCaseResult(
    "Treysy-B Esta quiero",
    { pass, fails, outboundCount: outbound.length, haikuCount: 0 },
    outbound,
  );
  return {
    name: "Treysy-B (no dup carrito)",
    pass,
    note: pass ? `cart size ${after.ids.length}` : fails.join("; ") || "falló",
  };
}

async function caseYaConCita() {
  console.log("\n── Treysy-C: Ya + cita scheduled → cierre sin menú ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    serviceId: MANOS_PIES_ID,
    date: "2026-08-15 10:00:00",
    clientName: "QA Treysy Sim",
    sessionStep: "completed",
  });

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Ya", {
      wamid: newWamid("wamid.qa.treysy.c"),
      contactName: "QA Treysy Sim",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const hasMenu = MENU_RE.test(text);
  const hasClose = CLOSING_RE.test(text) || /listo/i.test(text);
  const pass = hasClose && !hasMenu;

  logCaseResult(
    "Treysy-C Ya con cita",
    {
      pass,
      fails: pass
        ? []
        : [
            !hasClose ? "sin acuse de cierre" : "",
            hasMenu ? "abrió menú principal" : "",
          ].filter(Boolean),
      outboundCount: outbound.length,
      haikuCount: 0,
    },
    outbound,
  );
  return {
    name: "Treysy-C (Ya + cita → cierre)",
    pass,
    note: pass ? "cierre sin menú" : "falló",
  };
}

async function caseYaGraciasConCita() {
  console.log("\n── Treysy-C2: ya gracias + cita → cierre ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    serviceId: MANOS_PIES_ID,
    date: "2026-08-15 10:00:00",
    clientName: "QA Treysy Sim",
    sessionStep: "completed",
  });

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Ya gracias", {
      wamid: newWamid("wamid.qa.treysy.c2"),
      contactName: "QA Treysy Sim",
    }),
  );

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const pass = !MENU_RE.test(text) && outbound.length >= 1;

  logCaseResult(
    "Treysy-C2 ya gracias",
    {
      pass,
      fails: pass ? [] : ["menú o silencio"],
      outboundCount: outbound.length,
      haikuCount: 0,
    },
    outbound,
  );
  return {
    name: "Treysy-C2 (ya gracias)",
    pass,
    note: pass ? "sin menú" : "falló",
  };
}

async function caseYaDobleTrasCierre() {
  console.log("\n── Treysy-C3: Ya gracias → Ya (2.º cierre) → sin menú ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    serviceId: MANOS_PIES_ID,
    date: "2026-08-15 10:00:00",
    clientName: "QA Treysy Sim",
    sessionStep: "completed",
  });

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Ya gracias", {
      wamid: newWamid("wamid.qa.treysy.c3a"),
      contactName: "QA Treysy Sim",
    }),
  );
  await sleep(2500);
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Ya", {
      wamid: newWamid("wamid.qa.treysy.c3b"),
      contactName: "QA Treysy Sim",
    }),
  );

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 2,
    timeoutMs: 25000,
  });
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const hasMenu = MENU_RE.test(text);
  const hasClose = CLOSING_RE.test(text) || /listo/i.test(text);
  const pass = !hasMenu && hasClose && outbound.length >= 2;

  logCaseResult(
    "Treysy-C3 Ya×2 tras cierre",
    {
      pass,
      fails: pass
        ? []
        : [
            hasMenu ? "abrió menú principal" : "",
            !hasClose ? "sin acuse de cierre" : "",
            outbound.length < 2 ? `outs=${outbound.length}` : "",
          ].filter(Boolean),
      outboundCount: outbound.length,
      haikuCount: 0,
    },
    outbound,
  );
  return {
    name: "Treysy-C3 (Ya×2 post-cierre)",
    pass,
    note: pass ? "2 cierres sin menú" : "falló",
  };
}

async function caseYaConCarritoSinCita() {
  console.log("\n── Treysy-D: Ya + carrito sin cita → guía hora ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await seedAwaitingCart({ selectedDay: "2026-08-15" });

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Ya", {
      wamid: newWamid("wamid.qa.treysy.d"),
      contactName: "QA Treysy Sim",
    }),
  );

  await sleep(2000);
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const pass =
    !MENU_RE.test(text) &&
    HORA_GUIDE_RE.test(text) &&
    (DATE_LIST_RE.test(text) ||
      TIME_LIST_RE.test(text) ||
      outbound.length >= 1);

  logCaseResult(
    "Treysy-D Ya + carrito",
    {
      pass,
      fails: pass
        ? []
        : [
            MENU_RE.test(text) ? "menú" : "",
            !HORA_GUIDE_RE.test(text) ? "sin guía hora" : "",
          ].filter(Boolean),
      outboundCount: outbound.length,
      haikuCount: 0,
    },
    outbound,
  );
  return {
    name: "Treysy-D (Ya + carrito → guía)",
    pass,
    note: pass ? "guía sin menú" : "falló",
  };
}

async function caseImagenMidAgenda() {
  console.log("\n── Treysy-E: imagen mid-awaiting → calendario ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await seedAwaitingCart({ selectedDay: "2026-08-15" });

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildImagePayload(TEST_PHONE, {
      wamid: newWamid("wamid.qa.treysy.e"),
      contactName: "QA Treysy Sim",
    }),
  );

  await sleep(2000);
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const pass =
    !MENU_RE.test(text) &&
    (/d[ií]a|hora|botones/i.test(text) ||
      DATE_LIST_RE.test(text) ||
      TIME_LIST_RE.test(text));

  logCaseResult(
    "Treysy-E imagen mid",
    {
      pass,
      fails: pass
        ? []
        : [
            MENU_RE.test(text) ? "menú principal" : "",
            "sin guía calendario",
          ].filter(Boolean),
      outboundCount: outbound.length,
      haikuCount: 0,
    },
    outbound,
  );
  return {
    name: "Treysy-E (imagen → calendario)",
    pass,
    note: pass ? "sin menú" : "falló",
  };
}

async function main() {
  console.log("QA flujo Treysy — tel:", TEST_PHONE);
  const results = [];
  const gap = process.env.WABA_VALIDATE_SUITE ? 15000 : 8000;
  try {
    results.push(await caseFechaSoloAgosto());
    await sleep(gap);
    results.push(await caseEstaQuieroNoDup());
    await sleep(gap);
    results.push(await caseYaConCita());
    await sleep(gap);
    results.push(await caseYaGraciasConCita());
    await sleep(gap);
    results.push(await caseYaDobleTrasCierre());
    await sleep(gap);
    results.push(await caseYaConCarritoSinCita());
    await sleep(gap);
    results.push(await caseImagenMidAgenda());
  } finally {
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
