#!/usr/bin/env node
/**
 * Casos reales 27-jul:
 *  Patricia …5300 — mid-reprogramación cambia Builder Gel → Manicure en Gel (Haiku)
 *  Yelitza …1186 — ráfaga "Voy a llegar tarde" + texto → 1× política (debounce 5 min)
 *
 * Tel: 51999000994 (Patricia) · 51999000995 (Yelitza)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  buildButtonPayload,
  buildInteractivePayload,
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
  fetchOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE_PATRICIA = "51999000994";
const PHONE_YELITZA = "51999000995";

const BUILDER_GEL_ID = "39154b05-1b0d-4ee8-b366-161a7f0aa09d";
const MANICURE_GEL_ID = "f6b62575-6515-4fd8-997e-1ab4bf9271ca";

const TARDANZA_TEXT_RE = /hasta 10 minutos|tolerancia/i;
const TARDANZA_IMG_RE = /Políticas por tardanzas/i;
const CHANGE_ACK_RE = /Cambié tu selección|Manicure en Gel|esmalte/i;

const CLOSED = new Set(["2026-07-23", "2026-07-28", "2026-07-29"]);

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function nextOpenWeekdayKey() {
  const lima = new Date(Date.now() - 5 * 60 * 60 * 1000);
  for (let i = 1; i <= 14; i++) {
    const t = new Date(lima);
    t.setUTCDate(lima.getUTCDate() + i);
    const dow = t.getUTCDay();
    if (dow < 1 || dow > 6) continue;
    const y = t.getUTCFullYear();
    const m = String(t.getUTCMonth() + 1).padStart(2, "0");
    const day = String(t.getUTCDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    if (CLOSED.has(key)) continue;
    return key;
  }
  return "2026-08-04";
}

function countTardanzaPairs(outbound) {
  const texts = outbound.filter(
    (r) => r.msg_type === "text" && TARDANZA_TEXT_RE.test(r.content ?? ""),
  );
  const images = outbound.filter(
    (r) => r.msg_type === "image" && TARDANZA_IMG_RE.test(r.content ?? ""),
  );
  return { texts: texts.length, images: images.length };
}

async function casePatriciaServiceChange() {
  console.log(
    "\n── Patricia-A: mid-repro «ya no quiero Builder, solo esmalte» → Manicure ──",
  );
  await cleanupQaPhone(supabase, PHONE_PATRICIA, { deleteClient: true });

  const day = nextOpenWeekdayKey();
  const { appointmentId } = await seedScheduledAppointment(
    supabase,
    PHONE_PATRICIA,
    {
      serviceId: BUILDER_GEL_ID,
      employeeId: "emp-sthefani",
      date: `${day} 15:00:00`,
      clientName: "QA PATRICIA",
      sessionStep: "browsing",
    },
  );

  await supabase
    .from("appointments")
    .update({ price: "60.00", duration: 90 })
    .eq("id", appointmentId);
  await supabase
    .from("appointment_services")
    .update({ price: "60.00", duration: 90 })
    .eq("appointment_id", appointmentId);

  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE_PATRICIA,
    step: "awaiting_datetime",
    cart_items: JSON.stringify([
      {
        item_type: "service",
        item_id: BUILDER_GEL_ID,
        quantity: 1,
        price: 60,
      },
    ]),
    cart_service_ids: JSON.stringify([BUILDER_GEL_ID]),
    employee_assignments: "{}",
    reschedule_appointment_id: appointmentId,
    selected_day: day,
    updated_at: new Date().toISOString(),
  });

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(
      PHONE_PATRICIA,
      "Bluider gel ya no quiero solo esmalte en gel",
      {
        wamid: newWamid("wamid.qa.patricia.a"),
        contactName: "QA Patricia",
      },
    ),
  );
  console.log(
    `  Webhook HTTP ${status} (day=${day}, appt=${appointmentId.slice(0, 8)}…)`,
  );

  const outbound = await pollOutboundSince(supabase, PHONE_PATRICIA, since, {
    minCount: 1,
    timeoutMs: 35000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [CHANGE_ACK_RE],
    expectHaiku: false,
  });

  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("cart_service_ids, cart_items, reschedule_appointment_id, step")
    .eq("phone", PHONE_PATRICIA)
    .maybeSingle();

  let cartIds = [];
  try {
    cartIds = JSON.parse(sess?.cart_service_ids ?? "[]");
  } catch {
    cartIds = [];
  }

  if (!cartIds.includes(MANICURE_GEL_ID)) {
    result.fails.push(
      `cart sin Manicure en Gel (ids=${JSON.stringify(cartIds)})`,
    );
  }
  if (cartIds.includes(BUILDER_GEL_ID) && cartIds.length === 1) {
    result.fails.push("carrito sigue solo con Builder Gel");
  }
  if (sess?.reschedule_appointment_id !== appointmentId) {
    result.fails.push(
      `reschedule_id perdido (${sess?.reschedule_appointment_id})`,
    );
  }
  if (sess?.step !== "awaiting_datetime") {
    result.fails.push(`step=${sess?.step} (esperado awaiting_datetime)`);
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Patricia-A cambio servicio mid-repro", result, outbound);

  // B: confirmar hora → cita queda Manicure en Gel
  console.log("\n── Patricia-B: confirma hora → cita BD = Manicure en Gel ──");
  if (!result.pass) {
    logCaseResult(
      "Patricia-B confirma hora",
      { pass: false, fails: ["skip: A falló"] },
      [],
    );
    return { a: result.pass, b: false };
  }

  const sinceB = new Date().toISOString();
  const timeId = `time_${day}T1600`;
  const statusB = await postWebhook(
    webhookUrl,
    buildInteractivePayload(PHONE_PATRICIA, timeId, "4:00 PM", {
      wamid: newWamid("wamid.qa.patricia.b"),
      contactName: "QA Patricia",
      kind: "list",
    }),
  );
  console.log(`  Webhook HTTP ${statusB} (${timeId})`);

  const outboundB = await pollOutboundSince(supabase, PHONE_PATRICIA, sinceB, {
    minCount: 1,
    timeoutMs: 25000,
  });

  const resultB = assertOutbound(outboundB, [], {
    mustMatch: [/reprogramamos tu cita|Listo/i, /Manicure en Gel/i],
    mustNotMatch: [/Builder Gel/i],
    expectHaiku: false,
  });

  const { data: appt } = await supabase
    .from("appointments")
    .select("service_id, price, duration, status, date")
    .eq("id", appointmentId)
    .maybeSingle();

  if (appt?.service_id !== MANICURE_GEL_ID) {
    resultB.fails.push(
      `appt.service_id=${appt?.service_id ?? "null"} (esperado Manicure)`,
    );
  }
  if (Number(appt?.price) !== 35) {
    resultB.fails.push(`appt.price=${appt?.price} (esperado 35)`);
  }
  if (appt?.status !== "scheduled") {
    resultB.fails.push(`appt.status=${appt?.status}`);
  }

  const { data: lines } = await supabase
    .from("appointment_services")
    .select("service_id, price")
    .eq("appointment_id", appointmentId);
  const lineOk = (lines ?? []).some((l) => l.service_id === MANICURE_GEL_ID);
  if (!lineOk) {
    resultB.fails.push("appointment_services sin Manicure en Gel");
  }

  resultB.pass = resultB.fails.length === 0;
  logCaseResult("Patricia-B confirma hora", resultB, outboundB);
  return { a: result.pass, b: resultB.pass };
}

async function caseYelitzaTardanzaDebounce() {
  console.log(
    "\n── Yelitza-A: ráfaga botón+texto tardanza → máx 1 política ──",
  );
  await cleanupQaPhone(supabase, PHONE_YELITZA, { deleteClient: true });
  await ensureQaClient(supabase, PHONE_YELITZA, "QA YELITZA");
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE_YELITZA,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });

  const since = new Date().toISOString();

  // Ráfaga como el 27-jul (hola + botón + “un poco tarde”)
  const posts = await Promise.all([
    postWebhook(
      webhookUrl,
      buildTextPayload(PHONE_YELITZA, "Hola buenos días", {
        wamid: newWamid("wamid.qa.yelitza.hola"),
        contactName: "QA Yelitza",
      }),
    ),
    postWebhook(
      webhookUrl,
      buildButtonPayload(PHONE_YELITZA, "Voy a llegar tarde", {
        wamid: newWamid("wamid.qa.yelitza.btn"),
        contactName: "QA Yelitza",
      }),
    ),
    postWebhook(
      webhookUrl,
      buildTextPayload(
        PHONE_YELITZA,
        "Estoy en camino se me hizo un poco tarde",
        {
          wamid: newWamid("wamid.qa.yelitza.txt"),
          contactName: "QA Yelitza",
        },
      ),
    ),
  ]);
  console.log(`  Webhook HTTP ${posts.join(", ")}`);

  await sleep(12000);
  const outbound = await fetchOutboundSince(supabase, PHONE_YELITZA, since);
  const { texts, images } = countTardanzaPairs(outbound);

  const fails = [];
  if (texts > 1) fails.push(`textos política=${texts} (máx 1)`);
  if (images > 1) fails.push(`imágenes política=${images} (máx 1)`);
  if (texts < 1) fails.push("no llegó texto de tardanza");
  if (images < 1) fails.push("no llegó imagen de tardanza");

  const result = {
    pass: fails.length === 0,
    fails,
  };
  logCaseResult("Yelitza-A ráfaga 1× política", result, outbound);

  console.log("\n── Yelitza-B: segundo aviso <5 min → debounce (0 nuevas) ──");
  const sinceB = new Date().toISOString();
  const statusB = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_YELITZA, "llego tarde otra vez", {
      wamid: newWamid("wamid.qa.yelitza.b"),
      contactName: "QA Yelitza",
    }),
  );
  console.log(`  Webhook HTTP ${statusB}`);
  await sleep(8000);
  const outboundB = await fetchOutboundSince(supabase, PHONE_YELITZA, sinceB);
  const pairB = countTardanzaPairs(outboundB);

  const failsB = [];
  if (pairB.texts > 0 || pairB.images > 0) {
    failsB.push(
      `debounce falló: textos=${pairB.texts} imgs=${pairB.images} (esperado 0)`,
    );
  }

  const resultB = { pass: failsB.length === 0, fails: failsB };
  logCaseResult("Yelitza-B debounce 5 min", resultB, outboundB);

  return { a: result.pass, b: resultB.pass };
}

async function main() {
  console.log("Validación Patricia + Yelitza (27-jul)");
  const results = [];
  try {
    const p = await casePatriciaServiceChange();
    results.push({
      name: "Patricia-A",
      pass: p.a,
      note: p.a ? "cambio a Manicure" : "falló",
    });
    results.push({
      name: "Patricia-B",
      pass: p.b,
      note: p.b ? "cita BD sincronizada" : "falló",
    });
    await sleep(2000);
    const y = await caseYelitzaTardanzaDebounce();
    results.push({
      name: "Yelitza-A",
      pass: y.a,
      note: y.a ? "1× política en ráfaga" : "falló",
    });
    results.push({
      name: "Yelitza-B",
      pass: y.b,
      note: y.b ? "debounce OK" : "falló",
    });
  } finally {
    await cleanupQaPhone(supabase, PHONE_PATRICIA, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_YELITZA, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
