#!/usr/bin/env node
/**
 * Party booking in-bot — multi-cita / terceros (tope 2).
 * Tel QA: 51999000986
 *
 * A) "somos 2" → pide nombre acompañante
 * B) "para mi hija" → guest_only (pide nombre)
 * C) party ready + tap time_ → ≥2 appointments con nombres distintos
 * D) 2 scheduled + "somos 2" → tope
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  buildInteractivePayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import {
  seedScheduledAppointment,
  countScheduledAppointments,
  ensureQaClient,
} from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000986";
const LIFTING_ID = "33fbadcc-30e8-4e82-9913-3a888aea73dc";
const LAMINADO_ID = "svc-laminado-cejas";

const PARTY_NAME_RE = /c[oó]mo se llama|nombre|acompa[nñ]|para quien|juntas/i;
const AT_LIMIT_RE = /2 citas|m[aá]ximo|932\s*535\s*512/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function limaDateParts(d = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(d);
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return {
    y: get("year"),
    m: get("month"),
    day: get("day"),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

/** Próximo martes 11:00 Lima como Date UTC (offset +5). */
function nextTuesday11Lima() {
  const now = new Date();
  const { y, m, day } = limaDateParts(now);
  const base = new Date(Date.UTC(Number(y), Number(m) - 1, Number(day), 16, 0, 0));
  // 11:00 Lima = 16:00 UTC
  let candidate = base;
  for (let i = 1; i <= 14; i++) {
    const t = new Date(base.getTime() + i * 86400000);
    const wd = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Lima",
      weekday: "short",
    }).format(t);
    if (wd === "Tue") {
      candidate = t;
      break;
    }
  }
  return candidate;
}

async function caseA_somos2() {
  console.log("\n── Party-A: somos 2 → pide nombre ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await ensureQaClient(supabase, TEST_PHONE, "QA Party");

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "somos 2", {
      wamid: newWamid("wamid.qa.party.a"),
      contactName: "QA Party",
    }),
  );
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });
  const result = assertOutbound(outbound, [], {
    mustMatch: [PARTY_NAME_RE],
    mustNotMatch: [/una cita a la vez/i],
  });
  logCaseResult("Party-A", result, outbound);
  return {
    name: "Party-A somos 2",
    pass: result.pass,
    note: result.fails?.join("; "),
  };
}

async function caseB_hija() {
  console.log("\n── Party-B: para mi hija → guest_only ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await ensureQaClient(supabase, TEST_PHONE, "QA Party");

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "para mi hija", {
      wamid: newWamid("wamid.qa.party.b"),
      contactName: "QA Party",
    }),
  );
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });
  const result = assertOutbound(outbound, [], {
    mustMatch: [PARTY_NAME_RE],
    mustNotMatch: [/una cita a la vez/i],
  });
  logCaseResult("Party-B", result, outbound);
  return {
    name: "Party-B hija",
    pass: result.pass,
    note: result.fails?.join("; "),
  };
}

async function caseC_twoInsertsSameSlot() {
  console.log("\n── Party-C: party ready + time_ → 2 appointments ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  const clientId = await ensureQaClient(supabase, TEST_PHONE, "QA Party Primaria");

  // Historial completed → sin abono S/25 (path confirmado / party inserts)
  await supabase.from("appointments").insert({
    client_id: clientId,
    client_name: "QA Party Primaria",
    client_phone: TEST_PHONE,
    whatsapp_phone: TEST_PHONE,
    service_id: LIFTING_ID,
    employee_id: "emp-sthefani",
    date: "2026-08-01 11:00:00",
    duration: 60,
    price: "50.00",
    status: "completed",
    source: "whatsapp",
  });

  const chosen = nextTuesday11Lima();
  const iso = chosen.toISOString();
  const { y, m, day } = limaDateParts(chosen);
  const dateKey = `${y}-${m}-${day}`;
  const timeId = `time_${dateKey}T1100`;

  const party = {
    mode: "together",
    slot_strategy: "same",
    collecting: "ready",
    members: [
      {
        role: "primary",
        name: "QA Party Primaria",
        dni: null,
        service_ids: [LIFTING_ID],
        datetime_iso: iso,
      },
      {
        role: "guest",
        name: "QA Acompanante",
        dni: null,
        service_ids: [LAMINADO_ID],
        datetime_iso: iso,
      },
    ],
  };

  await supabase.from("whatsapp_sessions").upsert(
    {
      phone: TEST_PHONE,
      tenant_id: "zm-lash-nails",
      step: "awaiting_datetime",
      cart_items: JSON.stringify([
        { item_type: "service", item_id: LIFTING_ID, quantity: 1, price: 50 },
        { item_type: "service", item_id: LAMINADO_ID, quantity: 1, price: 50 },
      ]),
      cart_service_ids: JSON.stringify([LIFTING_ID, LAMINADO_ID]),
      parsed_datetime: iso,
      selected_day: dateKey,
      party_booking: JSON.stringify(party),
      deposit_mode: null,
      awaiting_screenshot: false,
      employee_assignments: "{}",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,phone" },
  );

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildInteractivePayload(TEST_PHONE, timeId, "11:00 AM", {
      wamid: newWamid("wamid.qa.party.c"),
      contactName: "QA Party",
    }),
  );
  await sleep(12000);
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 0,
    timeoutMs: 4000,
  });

  const { data: appts } = await supabase
    .from("appointments")
    .select("id, client_name, date, status")
    .eq("whatsapp_phone", TEST_PHONE)
    .eq("status", "scheduled");

  const names = new Set((appts ?? []).map((a) => a.client_name));
  const twoRows = (appts?.length ?? 0) >= 2;
  const distinctNames =
    [...names].some((n) => /Primaria/i.test(n)) &&
    [...names].some((n) => /Acompanante|Acompañante/i.test(n));

  const pass = twoRows && distinctNames;
  const result = {
    pass,
    fails: [
      ...(twoRows ? [] : [`citas=${appts?.length ?? 0}`]),
      ...(distinctNames ? [] : [`nombres=${[...names].join("|")}`]),
    ],
  };
  logCaseResult("Party-C 2 inserts", result, outbound);
  return {
    name: "Party-C 2 inserts",
    pass,
    note: pass ? `OK: ${[...names].join(" + ")}` : result.fails.join("; "),
  };
}

async function caseD_tope() {
  console.log("\n── Party-D: 2 scheduled → tope ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await ensureQaClient(supabase, TEST_PHONE, "QA Party");
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    date: "2026-10-20 14:00:00",
    sessionStep: "completed",
  });
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    date: "2026-10-21 15:00:00",
    sessionStep: "completed",
  });

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "somos 2", {
      wamid: newWamid("wamid.qa.party.d"),
      contactName: "QA Party",
    }),
  );
  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 20000,
  });
  const result = assertOutbound(outbound, [], {
    mustMatch: [AT_LIMIT_RE],
    mustNotMatch: [/una cita a la vez/i],
  });
  logCaseResult("Party-D tope", result, outbound);
  return {
    name: "Party-D tope",
    pass: result.pass,
    note: result.fails?.join("; "),
  };
}

async function main() {
  console.log("Validación party booking —", TEST_PHONE);
  if (process.env.WABA_VALIDATE_SUITE) await sleep(2000);
  const results = [];
  try {
    results.push(await caseA_somos2());
    await sleep(3000);
    results.push(await caseB_hija());
    await sleep(3000);
    results.push(await caseC_twoInsertsSameSlot());
    await sleep(3000);
    results.push(await caseD_tope());
  } finally {
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
