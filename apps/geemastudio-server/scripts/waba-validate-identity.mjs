#!/usr/bin/env node
/**
 * Identidad post-cita — pide nombre+DNI/CE si falta en BD (no bloquea creación).
 * Tel: 51999000980
 *
 * A: clienta sin dni → tras confirmar cita llega pedido de ficha
 * B: responde "María García 87654321" → clients.name+dni + appointment.client_document
 * C: clienta ya con dni → no pide ficha de nuevo
 * D: «ya tienen mis datos» con ficha parcial → explica qué hay / qué falta
 * E: CE de 9 dígitos sin prefijo «CE» (María Acosta …4706, 27-jul)
 * F: BSUID sin teléfono — nombre+DNI sí guarda (LION / Lu_septiembre)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  buildBsuidTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000980";
const TEST_BSUID = "PE.QA04979904";
const SOFT_GEL_ID = "1e15a516-95b1-4be3-bc0d-88f530bc6011";
const IDENTITY_RE = /nombre y apellido|DNI o CE|ficha completa/i;
const THANKS_RE = /Listo, gracias|actualicé tu ficha/i;
const FAIL_SAVE_RE = /No pude guardar tus datos/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function nextWeekdayKey() {
  const d = new Date();
  // Lima approx: use UTC-5 for "today"
  const lima = new Date(d.getTime() - 5 * 60 * 60 * 1000);
  for (let i = 1; i <= 7; i++) {
    const t = new Date(lima);
    t.setUTCDate(lima.getUTCDate() + i);
    const dow = t.getUTCDay();
    if (dow >= 1 && dow <= 6) {
      const y = t.getUTCFullYear();
      const m = String(t.getUTCMonth() + 1).padStart(2, "0");
      const day = String(t.getUTCDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    }
  }
  return "2026-07-20";
}

async function resetClientNoDni() {
  const id = await ensureQaClient(supabase, TEST_PHONE, "Cliente WA 0983");
  await supabase
    .from("clients")
    .update({ name: "Cliente WA 0983", dni: null })
    .eq("id", id);
  return id;
}

async function seedAwaitingDatetime() {
  await resetClientNoDni();
  const day = nextWeekdayKey();
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "awaiting_datetime",
    selected_day: day,
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
    updated_at: new Date().toISOString(),
  });
  return day;
}

async function caseAAskAfterBooking() {
  console.log("\n── Identity-A: cita creada + pide ficha ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  const day = await seedAwaitingDatetime();
  const since = new Date().toISOString();

  // Capacidad global 1 cita: probar varios slots hasta confirmar
  const slots = [
    "10:00 am",
    "10:30 am",
    "11:30 am",
    "12:00 pm",
    "4:30 pm",
    "5:00 pm",
  ];
  let outbound = [];
  let booked = false;
  for (const slot of slots) {
    const slotSince = new Date().toISOString();
    const status = await postWebhook(
      webhookUrl,
      buildTextPayload(TEST_PHONE, slot, {
        wamid: newWamid(`wamid.qa.identity.a.${slot.replace(/\W/g, "")}`),
        contactName: "QA Identity",
      }),
    );
    console.log(`  Webhook HTTP ${status} (day=${day} slot=${slot})`);
    outbound = await pollOutboundSince(supabase, TEST_PHONE, slotSince, {
      minCount: 1,
      timeoutMs: 20000,
    });
    const joined = outbound.map((m) => m.content ?? "").join("\n");
    if (/cita (está )?confirmada|cita está anotada/i.test(joined)) {
      booked = true;
      break;
    }
    if (/ya fue reservado|elige otro horario/i.test(joined)) {
      // Reset a awaiting_datetime para el siguiente intento
      await supabase
        .from("whatsapp_sessions")
        .update({
          step: "awaiting_datetime",
          selected_day: day,
          parsed_datetime: null,
        })
        .eq("phone", TEST_PHONE);
      await sleep(800);
      continue;
    }
    break;
  }

  const result = assertOutbound(outbound, [], {
    mustMatch: booked
      ? [/cita (está )?confirmada|cita está anotada/i, IDENTITY_RE]
      : [/cita (está )?confirmada|cita está anotada/i],
    expectHaiku: false,
  });

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, status")
    .eq("whatsapp_phone", TEST_PHONE)
    .eq("status", "scheduled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", TEST_PHONE)
    .maybeSingle();

  const pass = (result.fails?.length ?? 0) === 0 && result.pass !== false;
  // Merge custom fails into result for logCaseResult
  const merged = {
    ...result,
    pass,
    fails: result.fails ?? [],
  };
  if (!appt?.id) {
    merged.fails.push("cita no creada antes del ask");
    merged.pass = false;
  }
  if (sess?.step !== "awaiting_client_identity") {
    merged.fails.push(`step=${sess?.step} (esperado awaiting_client_identity)`);
    merged.pass = false;
  }

  logCaseResult("Identity-A ask post-cita", merged, outbound);
  return merged.pass;
}

async function caseBUpdateClient() {
  console.log("\n── Identity-B: responde nombre+DNI → update BD ──");
  const since = new Date().toISOString();
  const dni = `9${String(Date.now()).slice(-7)}`; // 8 dígitos único

  // Prefijo "Hola," — no debe escapar a menú (regresión Pam)
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, `Hola, María García QA , DNI ${dni}`, {
      wamid: newWamid("wamid.qa.identity.b"),
      contactName: "QA Identity",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [THANKS_RE],
    mustNotMatch: [IDENTITY_RE, /¿En qué podemos ayudarte/i],
    expectHaiku: false,
  });

  const { data: client } = await supabase
    .from("clients")
    .select("name, dni")
    .eq("phone_normalized", TEST_PHONE.slice(2))
    .eq("phone_country", "PE")
    .maybeSingle();

  const { data: appt } = await supabase
    .from("appointments")
    .select("client_name, client_document")
    .eq("whatsapp_phone", TEST_PHONE)
    .eq("status", "scheduled")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!client?.dni || client.dni !== dni) {
    result.fails.push(`clients.dni=${client?.dni ?? "null"} (esperado ${dni})`);
  }
  if (
    !/MAR/i.test(client?.name ?? "") ||
    /\bHOLA\b/i.test(client?.name ?? "")
  ) {
    result.fails.push(`clients.name=${client?.name ?? "null"}`);
  }
  if (appt?.client_document !== dni) {
    result.fails.push(
      `appt.client_document=${appt?.client_document ?? "null"}`,
    );
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Identity-B update BD (Hola+DNI)", result, outbound);
  return { pass: result.pass, dni };
}

async function caseCSkipWhenComplete({ dni }) {
  console.log("\n── Identity-C: ya tiene dni → no re-pide ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: false });
  const id = await ensureQaClient(supabase, TEST_PHONE, "MARIA GARCIA QA");
  await supabase
    .from("clients")
    .update({ name: "MARIA GARCIA QA", dni })
    .eq("id", id);

  const day = nextWeekdayKey();
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "awaiting_datetime",
    selected_day: day,
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
    updated_at: new Date().toISOString(),
  });

  // Liberar horario previo cancelando citas QA
  await supabase
    .from("appointments")
    .update({ status: "cancelled" })
    .eq("whatsapp_phone", TEST_PHONE)
    .eq("status", "scheduled");

  const slots = ["10:00 am", "12:30 pm", "3:00 pm", "5:30 pm", "11:00 am"];
  let outbound = [];
  let confirmed = false;
  for (const slot of slots) {
    const since = new Date().toISOString();
    const status = await postWebhook(
      webhookUrl,
      buildTextPayload(TEST_PHONE, slot, {
        wamid: newWamid(`wamid.qa.identity.c.${slot.replace(/\W/g, "")}`),
        contactName: "QA Identity",
      }),
    );
    console.log(`  Webhook HTTP ${status} slot=${slot}`);
    outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
      minCount: 1,
      timeoutMs: 18000,
    });
    const joined = outbound.map((m) => m.content ?? "").join("\n");
    if (/cita (está )?confirmada|cita está anotada/i.test(joined)) {
      confirmed = true;
      break;
    }
    if (/ya fue reservado|elige otro horario/i.test(joined)) {
      await supabase
        .from("whatsapp_sessions")
        .update({
          step: "awaiting_datetime",
          selected_day: day,
          parsed_datetime: null,
        })
        .eq("phone", TEST_PHONE);
      await sleep(800);
      continue;
    }
    break;
  }

  const result = assertOutbound(outbound, [], {
    mustMatch: confirmed
      ? [/cita (está )?confirmada|cita está anotada/i]
      : [/cita (está )?confirmada|cita está anotada/i],
    mustNotMatch: [IDENTITY_RE],
    expectHaiku: false,
  });

  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", TEST_PHONE)
    .maybeSingle();

  if (sess?.step === "awaiting_client_identity") {
    result.fails.push("pidió identidad aunque ya tenía dni");
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Identity-C skip si completo", result, outbound);
  return result.pass;
}

async function caseDAlreadyHaveData() {
  console.log("\n── Identity-D: «ya tienen mis datos» → ficha parcial ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  const id = await ensureQaClient(supabase, TEST_PHONE, "MARIBEL QA");
  await supabase
    .from("clients")
    .update({ name: "MARIBEL QA", dni: null })
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
    buildTextPayload(
      TEST_PHONE,
      "Pero ustedes ya tienen mis datos y es retoque",
      {
        wamid: newWamid("wamid.qa.identity.d"),
        contactName: "QA Identity",
      },
    ),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [
      /En tu ficha tengo/i,
      /MARIBEL QA/i,
      /actualizar nuestra agenda/i,
      /DNI o CE/i,
    ],
    mustNotMatch: [/No pude leer bien los datos/i],
    expectHaiku: false,
  });

  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", TEST_PHONE)
    .maybeSingle();

  if (sess?.step !== "awaiting_client_identity") {
    result.fails.push(
      `step=${sess?.step} (debe seguir awaiting_client_identity)`,
    );
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Identity-D ya tienen datos", result, outbound);
  return result.pass;
}

async function caseECeNineDigitsNoPrefix() {
  console.log("\n── Identity-E: CE 9 dígitos sin prefijo → acepta ficha ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  const id = await ensureQaClient(supabase, TEST_PHONE, "Cliente WA 0983");
  await supabase
    .from("clients")
    .update({ name: "Cliente WA 0983", dni: null })
    .eq("id", id);

  const ce = `00${String(Date.now()).slice(-7)}`;

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
    buildTextPayload(TEST_PHONE, `Maria Acosta QA ${ce}`, {
      wamid: newWamid("wamid.qa.identity.e"),
      contactName: "QA Identity",
    }),
  );
  console.log(`  Webhook HTTP ${status} (CE=${ce})`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [THANKS_RE],
    mustNotMatch: [/No pude leer bien los datos/i, IDENTITY_RE],
    expectHaiku: false,
  });

  const { data: client } = await supabase
    .from("clients")
    .select("name, dni")
    .eq("phone_normalized", TEST_PHONE.slice(2))
    .eq("phone_country", "PE")
    .maybeSingle();

  if (client?.dni !== ce) {
    result.fails.push(`clients.dni=${client?.dni ?? "null"} (esperado ${ce})`);
  }
  if (!/ACOSTA/i.test(client?.name ?? "")) {
    result.fails.push(`clients.name=${client?.name ?? "null"}`);
  }

  result.pass = result.fails.length === 0;
  logCaseResult("Identity-E CE 9 dígitos sin prefijo", result, outbound);
  return result.pass;
}

/** LION …9087: BSUID sin phone_normalized → updateClientIdentity fallaba no_client. */
async function caseFBsuidIdentitySave() {
  console.log("\n── Identity-F: BSUID → guarda nombre+DNI ──");
  await cleanupQaPhone(supabase, TEST_BSUID, { deleteClient: true });

  const { data: created, error: createErr } = await supabase
    .from("clients")
    .insert({
      name: "LION",
      phone: null,
      phone_country: null,
      phone_normalized: null,
      wa_user_id: TEST_BSUID,
      wa_username: "lu_qa_identity",
      notes: "QA Identity-F BSUID",
    })
    .select("id")
    .single();
  if (createErr || !created?.id) {
    console.error("  FAIL seed client:", createErr?.message);
    return false;
  }

  const day = nextWeekdayKey();
  const { error: apptErr } = await supabase.from("appointments").insert({
    client_id: created.id,
    client_name: "LION",
    client_phone: null,
    whatsapp_phone: TEST_BSUID,
    service_id: SOFT_GEL_ID,
    date: `${day} 16:00:00`,
    status: "scheduled",
    duration: 90,
    price: "55.00",
  });
  if (apptErr) {
    console.error("  FAIL seed appt:", apptErr.message);
    await cleanupQaPhone(supabase, TEST_BSUID, { deleteClient: true });
    return false;
  }

  await supabase.from("whatsapp_sessions").upsert(
    {
      phone: TEST_BSUID,
      tenant_id: "zm-lash-nails",
      step: "awaiting_client_identity",
      cart_items: "[]",
      cart_service_ids: "[]",
      employee_assignments: "{}",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,phone" },
  );

  const dni = `4${String(Date.now()).slice(-7)}`;
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildBsuidTextPayload(
      TEST_BSUID,
      `Lucero Orihuela Nunez ${dni}`,
      {
        wamid: newWamid("wamid.qa.identity.f"),
        contactName: "LION",
        username: "lu_qa_identity",
      },
    ),
  );
  console.log(`  Webhook HTTP ${status} (DNI=${dni})`);

  // Bajo carga (tras A–E) el edge puede tardar >8s; esperar a que la ficha cambie.
  let client = null;
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    const { data } = await supabase
      .from("clients")
      .select("name, dni, phone")
      .eq("wa_user_id", TEST_BSUID)
      .maybeSingle();
    client = data;
    if (client?.dni === dni) break;
    await sleep(1500);
  }

  const { data: sessAfter } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", TEST_BSUID)
    .maybeSingle();
  const { data: allMsgs } = await supabase
    .from("wa_messages")
    .select("direction, content")
    .eq("phone", TEST_BSUID)
    .order("created_at", { ascending: true });
  console.log(
    `  step=${sessAfter?.step} msgs=${(allMsgs ?? []).length}`,
    (allMsgs ?? [])
      .map((m) => `${m.direction}:${(m.content ?? "").slice(0, 40)}`)
      .join(" | "),
  );

  const outbound = (allMsgs ?? []).filter((m) => m.direction === "out");

  const fails = [];
  if (status < 200 || status >= 300) fails.push(`webhook ${status}`);
  if (outbound.some((m) => FAIL_SAVE_RE.test(m.content ?? ""))) {
    fails.push("dijo No pude guardar");
  }

  if (client?.dni !== dni) {
    fails.push(`clients.dni=${client?.dni ?? "null"} (esperado ${dni})`);
  }
  if (!/LUCERO/i.test(client?.name ?? "")) {
    fails.push(`clients.name=${client?.name ?? "null"}`);
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("client_name, client_document")
    .eq("client_id", created.id)
    .eq("status", "scheduled")
    .maybeSingle();
  if (appt?.client_document !== dni) {
    fails.push(`appt.document=${appt?.client_document ?? "null"}`);
  }
  if (!/LUCERO/i.test(appt?.client_name ?? "")) {
    fails.push(`appt.name=${appt?.client_name ?? "null"}`);
  }

  const pass = fails.length === 0;
  logCaseResult(
    "Identity-F BSUID guarda ficha",
    {
      pass,
      fails,
      outboundCount: outbound.length,
      haikuCount: 0,
    },
    outbound,
  );
  await cleanupQaPhone(supabase, TEST_BSUID, { deleteClient: true });
  return pass;
}

async function main() {
  console.log(`Validación identidad post-cita — tel QA: ${TEST_PHONE}`);
  const results = [];
  try {
    const a = await caseAAskAfterBooking();
    results.push({
      name: "Identity-A",
      pass: a,
      note: a ? "cita + pide ficha" : "falló",
    });
    await sleep(2000);
    const b = await caseBUpdateClient();
    results.push({
      name: "Identity-B",
      pass: b.pass,
      note: b.pass ? "update name+dni" : "falló",
    });
    await sleep(2000);
    const c = await caseCSkipWhenComplete({ dni: b.dni });
    results.push({
      name: "Identity-C",
      pass: c,
      note: c ? "skip si completo" : "falló",
    });
    await sleep(2000);
    const d = await caseDAlreadyHaveData();
    results.push({
      name: "Identity-D",
      pass: d,
      note: d ? "ficha parcial aclaratoria" : "falló",
    });
    await sleep(2000);
    const e = await caseECeNineDigitsNoPrefix();
    results.push({
      name: "Identity-E",
      pass: e,
      note: e ? "CE 9 dígitos sin prefijo" : "falló",
    });
    await sleep(2000);
    const f = await caseFBsuidIdentitySave();
    results.push({
      name: "Identity-F",
      pass: f,
      note: f ? "BSUID name+dni (LION)" : "falló",
    });
  } finally {
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
    await cleanupQaPhone(supabase, TEST_BSUID, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
