#!/usr/bin/env node
/**
 * QA foto diseño → staff takeover (v3.4):
 * U) unit horario ack 7–21 Lima + caption uñas dañadas → push copy (Merillyn)
 * A) imagen mid-browsing → bot_paused_at + ack in/off hours (no calendario)
 * B) texto con bot pausado → silencio (0 outbound nuevo)
 * C) resume_bot vía waba-staff-session → bot_paused_at null
 * D) haiku_finish_booking con carrito → unpause + reply y/o calendario
 *
 * Teléfono: 51999000985 (excepción QA que SÍ pausa; no paralelizar con fanny-burst).
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
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  fetchOutboundSince,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";
import {
  DESIGN_PAUSE_QA_PHONE,
  DESIGN_ACK_IN_HOURS,
  DESIGN_ACK_OFF_HOURS,
  isWithinDesignStaffHours,
  getDesignAckMessage,
  shouldSkipDesignPauseForQa,
} from "../supabase/functions/whatsapp-webhook/lib/design-staff-hours.mjs";
import {
  isDamagedNailsImageCaption,
  getDesignImagePushCopy,
} from "../supabase/functions/whatsapp-webhook/lib/design-image-push.mjs";

const PHONE = DESIGN_PAUSE_QA_PHONE;
const POLY_GEL_ID = "e3d429cb-3387-45c2-b965-c94b28c81330";
const DATE_LIST_RE = /\[lista\] Elegir fecha:/i;
const ACK_IN_RE = /asesora personalizada se comunicar/i;
const ACK_OFF_RE = /pr[oó]ximo horario de atenci[oó]n/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const staffSessionUrl = `${url}/functions/v1/waba-staff-session`;
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedBrowsing(opts = {}) {
  const { cart = false, paused = false } = opts;
  await ensureQaClient(supabase, PHONE, "QA Design Pause");
  const cartItems = cart
    ? [
        {
          item_type: "service",
          item_id: POLY_GEL_ID,
          quantity: 1,
          price: 70,
        },
      ]
    : [];
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: cart ? "awaiting_datetime" : "browsing",
    cart_items: JSON.stringify(cartItems),
    cart_service_ids: JSON.stringify(cart ? [POLY_GEL_ID] : []),
    employee_assignments: "{}",
    bot_paused_at: paused ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  });
}

async function getPausedAt() {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("bot_paused_at, step")
    .eq("phone", PHONE)
    .maybeSingle();
  return data;
}

async function callStaffSession(action) {
  const res = await fetch(staffSessionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ phone: PHONE, action }),
  });
  const body = await res.json().catch(() => ({}));
  return { status: res.status, body };
}

function runUnitHours() {
  const cases = [
    // Lima 6:00 = UTC 11
    { utcH: 11, expectIn: false, label: "Lima 06:00 off" },
    // Lima 7:00 = UTC 12
    { utcH: 12, expectIn: true, label: "Lima 07:00 in" },
    // Lima 20:00 = UTC 01 next... 20 Lima = 01 UTC
    { utcH: 1, expectIn: true, label: "Lima 20:00 in" },
    // Lima 21:00 = UTC 02
    { utcH: 2, expectIn: false, label: "Lima 21:00 off" },
  ];
  let ok = true;
  for (const c of cases) {
    const d = new Date(Date.UTC(2026, 7, 2, c.utcH, 30, 0));
    const got = isWithinDesignStaffHours(d);
    if (got !== c.expectIn) {
      console.error(
        `  FAIL unit ${c.label}: got ${got} expected ${c.expectIn}`,
      );
      ok = false;
    }
  }
  if (shouldSkipDesignPauseForQa("51999000981") !== true) {
    console.error("  FAIL: Treysy phone should skip pause");
    ok = false;
  }
  if (shouldSkipDesignPauseForQa(PHONE) !== false) {
    console.error("  FAIL: design-pause phone must NOT skip pause");
    ok = false;
  }
  const ackNow = getDesignAckMessage();
  const expected = isWithinDesignStaffHours()
    ? DESIGN_ACK_IN_HOURS
    : DESIGN_ACK_OFF_HOURS;
  if (ackNow !== expected) {
    console.error("  FAIL: getDesignAckMessage mismatch");
    ok = false;
  }

  // P2 Merillyn — caption uñas caídas prioriza push staff
  const merillynCaption = "Se me acaban de caer mis uñas Rubber";
  if (!isDamagedNailsImageCaption(merillynCaption)) {
    console.error("  FAIL: Merillyn caption debe ser uñas dañadas");
    ok = false;
  }
  if (isDamagedNailsImageCaption("Mira este diseño Softgel Aurora")) {
    console.error("  FAIL: caption de diseño no es uñas dañadas");
    ok = false;
  }
  if (isDamagedNailsImageCaption("") || isDamagedNailsImageCaption(null)) {
    console.error("  FAIL: caption vacío no es uñas dañadas");
    ok = false;
  }
  const damagedPush = getDesignImagePushCopy({
    alreadyPaused: false,
    firstName: "Merillyn",
    hasImageUrl: true,
    caption: merillynCaption,
  });
  if (!/Uñas dañadas/i.test(damagedPush.title)) {
    console.error(`  FAIL: push title esperado Uñas dañadas, got ${damagedPush.title}`);
    ok = false;
  }
  const designPush = getDesignImagePushCopy({
    alreadyPaused: false,
    firstName: "QA",
    hasImageUrl: true,
    caption: "Diseño cat eye",
  });
  if (!/Foto diseño/i.test(designPush.title)) {
    console.error(`  FAIL: push title esperado Foto diseño, got ${designPush.title}`);
    ok = false;
  }

  return ok;
}

async function caseA_imagePauses() {
  await cleanupQaPhone(supabase, PHONE);
  await seedBrowsing({ cart: false });
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildImagePayload(PHONE, {
      wamid: newWamid("wamid.qa.design.a"),
      contactName: "QA Design Pause",
    }),
  );
  if (status < 200 || status >= 300) {
    return { pass: false, note: `webhook ${status}` };
  }
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    timeoutMs: 18000,
    minCount: 1,
  });
  await sleep(800);
  const sess = await getPausedAt();
  const paused = Boolean(sess?.bot_paused_at);
  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const ackOk = ACK_IN_RE.test(joined) || ACK_OFF_RE.test(joined);
  const noCalendar = !DATE_LIST_RE.test(joined);
  const ok = paused && ackOk && noCalendar;
  return {
    pass: ok,
    note: `paused=${paused} ack=${ackOk} noCal=${noCalendar} outs=${outbound.length}`,
  };
}

async function caseB_silenceWhilePaused() {
  // Asume A dejó pausa; reforzar
  await seedBrowsing({ cart: true, paused: true });
  const since = new Date().toISOString();
  await sleep(200);
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "El precio?", {
      wamid: newWamid("wamid.qa.design.b"),
      contactName: "QA Design Pause",
    }),
  );
  if (status < 200 || status >= 300) {
    return { pass: false, note: `webhook ${status}` };
  }
  await sleep(10000);
  const outbound = await fetchOutboundSince(supabase, PHONE, since);
  const ok = outbound.length === 0;
  return {
    pass: ok,
    note: `outs=${outbound.length} (esperado 0)`,
  };
}

async function caseC_resumeBot() {
  await seedBrowsing({ cart: true, paused: true });
  const { status, body } = await callStaffSession("resume_bot");
  await sleep(500);
  const sess = await getPausedAt();
  const ok = status === 200 && body?.ok === true && sess?.bot_paused_at == null;
  return {
    pass: ok,
    note: `http=${status} ok=${body?.ok} paused=${sess?.bot_paused_at}`,
  };
}

async function caseD_haikuAgenda() {
  await cleanupQaPhone(supabase, PHONE);
  await seedBrowsing({ cart: true, paused: true });
  // Historial mínimo para Haiku
  await supabase.from("wa_messages").insert([
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content: "Quiero PolyGel Aurora",
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content: "Polygel S/70. ¿Qué día te queda?",
    },
  ]);
  const since = new Date().toISOString();
  const { status, body } = await callStaffSession("haiku_finish_booking");
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    timeoutMs: 20000,
    minCount: 1,
  });
  await sleep(1500);
  const sess = await getPausedAt();
  const unpaused = sess?.bot_paused_at == null;
  const hasOut = outbound.length >= 1;
  const ok = status === 200 && unpaused && hasOut && body?.ok !== false;
  return {
    pass: ok,
    note: `http=${status} bodyOk=${body?.ok} unpaused=${unpaused} outs=${outbound.length} ${body?.detail ?? ""}`,
  };
}

async function main() {
  console.log("\n=== QA design-pause (foto → staff) ===\n");
  console.log(`Teléfono: ${PHONE}\n`);

  const results = [];

  const uOk = runUnitHours();
  results.push({
    name: "U horario + caption uñas dañadas",
    pass: uOk,
    note: uOk ? "ok" : "falló unit",
  });

  try {
    let r = await caseA_imagePauses();
    results.push({ name: "A imagen → pausa + ack", ...r });

    r = await caseB_silenceWhilePaused();
    results.push({ name: "B texto en pausa → silencio", ...r });

    r = await caseC_resumeBot();
    results.push({ name: "C resume_bot", ...r });

    r = await caseD_haikuAgenda();
    results.push({ name: "D haiku_finish_booking", ...r });
  } finally {
    await cleanupQaPhone(supabase, PHONE);
    console.log("\nCleanup QA OK:", PHONE);
  }

  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
