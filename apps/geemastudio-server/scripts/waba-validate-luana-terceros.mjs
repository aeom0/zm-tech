#!/usr/bin/env node
/**
 * Luana — tope 2 citas/chat + party in-bot (multi-cita / terceros).
 * Origen: docs/waba/analysis/2026-06-25 (Luana/Arantxa) + plan multi-cita 24-sep-2026.
 *
 * Luana-A: 1 cita + "Necesito separar para otra persona más" → abre party (pide nombre), no 932
 * Luana-B: 1 cita + carrito + Agendar → permite 2.ª (calendario / resumen), no bloqueo “máximo 2”
 * Luana-C: sin cita + "somos 2" → party (acompañante), no “una cita a la vez”
 * Luana-D: 2 citas + "para mi amiga" → tope / 932
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
  seedSessionWithCart,
  countScheduledAppointments,
} from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  pollResponseSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000996";
const FUTURE_APPT_DATE = "2026-10-20 14:00:00";
const FUTURE_APPT_DATE_2 = "2026-10-21 15:00:00";
const LIFTING_ID = "33fbadcc-30e8-4e82-9913-3a888aea73dc";

const MSG_OTRA_PERSONA = "Necesito separar para otra persona más";

const PARTY_OPEN_RE =
  /c[oó]mo se llama|nombre|acompa[nñ]|juntas|otra persona|para quien|opciones|Vamos juntas/i;
const AT_LIMIT_RE =
  /m[aá]ximo de \*?\s*2\s*citas|2 citas\*?\s*programadas|932\s*535\s*512/i;
const OLD_ONE_CITA_RE = /una cita a la vez/i;
const BLOCK_MAX_RE = /m[aá]ximo de \*?\s*2\s*citas|Ya tienes el m[aá]ximo/i;
const HALLUCINATION_RE = /Arantxa|agendo.*para Arantxa/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function validatePartyConUnaCita() {
  console.log("\n── Luana-A: 1 cita + otra persona → party (pide nombre) ──");
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    date: FUTURE_APPT_DATE,
    sessionStep: "completed",
  });
  const apptsBefore = await countScheduledAppointments(supabase, TEST_PHONE);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, MSG_OTRA_PERSONA, {
      wamid: newWamid("wamid.qa.luana.a"),
      contactName: "QA Luana",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(
    supabase,
    TEST_PHONE,
    since,
  );

  const result = assertOutbound(outbound, haiku, {
    mustMatch: [PARTY_OPEN_RE],
    mustNotMatch: [OLD_ONE_CITA_RE, HALLUCINATION_RE],
    expectHaiku: false,
  });

  const apptsAfter = await countScheduledAppointments(supabase, TEST_PHONE);
  const noNewAppt = apptsAfter === apptsBefore;
  const pass = result.pass && noNewAppt;

  if (!noNewAppt) {
    result.fails = [...(result.fails ?? []), "se creó cita duplicada en BD"];
  }

  logCaseResult("Luana-A party", { ...result, pass }, outbound);

  return {
    name: "Luana-A (1 cita → party)",
    pass,
    note: pass
      ? "Abre party (nombre); no escala 932 ni crea cita"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateSegundaCitaPermitida() {
  console.log("\n── Luana-B: 1 cita + Agendar → permite 2.ª (no tope) ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: false });
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    date: FUTURE_APPT_DATE,
    sessionStep: "browsing",
  });
  await seedSessionWithCart(supabase, TEST_PHONE, LIFTING_ID, 50);
  const apptsBefore = await countScheduledAppointments(supabase, TEST_PHONE);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildInteractivePayload(TEST_PHONE, "agendar_ya", "Agendar cita", {
      wamid: newWamid("wamid.qa.luana.b"),
      contactName: "QA Luana",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 22000,
  });

  const result = assertOutbound(outbound, [], {
    mustNotMatch: [BLOCK_MAX_RE, OLD_ONE_CITA_RE, HALLUCINATION_RE],
    expectHaiku: false,
  });

  // Debe avanzar (calendario / resumen / abono), no quedarse en silencio de bloqueo
  const advanced = outbound.some((m) =>
    /fecha|hora|d[ií]a|Resumen|adelanto|Elige|calendario|disponib/i.test(
      m.content ?? "",
    ),
  );
  const apptsAfter = await countScheduledAppointments(supabase, TEST_PHONE);
  const pass = result.pass && advanced && apptsAfter === apptsBefore;

  if (!advanced) {
    result.fails = [
      ...(result.fails ?? []),
      "no avanzó a selector/resumen (¿sigue bloqueando 2.ª?)",
    ];
  }

  logCaseResult("Luana-B 2.ª permitida", { ...result, pass }, outbound);

  return {
    name: "Luana-B (2.ª cita permitida)",
    pass,
    note: pass
      ? "Con 1 scheduled permite agendar otra"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateSomos2AbreParty() {
  console.log("\n── Luana-C: sin cita + somos 2 → party ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: false });
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    party_booking: null,
    updated_at: new Date().toISOString(),
  });

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "somos 2", {
      wamid: newWamid("wamid.qa.luana.c"),
      contactName: "QA Luana",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 22000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [PARTY_OPEN_RE],
    mustNotMatch: [OLD_ONE_CITA_RE, HALLUCINATION_RE],
    expectHaiku: false,
  });

  logCaseResult("Luana-C somos 2", result, outbound);

  return {
    name: "Luana-C (somos 2 → party)",
    pass: result.pass,
    note: result.pass
      ? "Abre flujo party in-bot"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateTopeDosCitas() {
  console.log("\n── Luana-D: 2 citas + otra persona → tope / 932 ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: false });
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    date: FUTURE_APPT_DATE,
    sessionStep: "completed",
  });
  await seedScheduledAppointment(supabase, TEST_PHONE, {
    date: FUTURE_APPT_DATE_2,
    sessionStep: "completed",
  });

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, MSG_OTRA_PERSONA, {
      wamid: newWamid("wamid.qa.luana.d"),
      contactName: "QA Luana",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 22000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [AT_LIMIT_RE],
    mustNotMatch: [OLD_ONE_CITA_RE, HALLUCINATION_RE],
    expectHaiku: false,
  });

  logCaseResult("Luana-D tope 2", result, outbound);

  return {
    name: "Luana-D (tope 2 citas)",
    pass: result.pass,
    note: result.pass
      ? "Con 2 scheduled escala / avisa tope"
      : result.fails.join("; ") || "Falló",
  };
}

async function main() {
  console.log("Validación Luana (tope 2 / party) — teléfono QA:", TEST_PHONE);
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await validatePartyConUnaCita());
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
    await sleep(4000);
    results.push(await validateSegundaCitaPermitida());
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
    await sleep(4000);
    results.push(await validateSomos2AbreParty());
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
    await sleep(4000);
    results.push(await validateTopeDosCitas());
  } finally {
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
