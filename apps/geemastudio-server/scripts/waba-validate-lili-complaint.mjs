#!/usr/bin/env node
/**
 * Gate de reclamo/garantía antes de cerrar cita (matchesComplaintIntent).
 *
 * Origen: caso Lili (+51940162810, 04-ago-2026) — un reclamo de garantía en
 * texto libre ("Tendrán que volverlo a hacer xq no se puede bajar solo en 3
 * o 4 días") fue mal-interpretado como confirmación de cita (parseDatetimeES
 * leyó "3" como hora + fecha=hoy) y creó una cita real de S/50 sin que la
 * clienta la pidiera. La cita fantasma (id 6a5ca94e-695a-42ea-a58a-a503e82d95ac)
 * ya fue cancelada manualmente. Ver también waba-validate-parse-fallback.ts
 * (fix 1, unit test del fallback de parseDatetimeES).
 *
 * Casos:
 *  A: mensaje de reclamo tipo Lili con carrito activo (browsing) → deriva al
 *     equipo (STAFF_COORDINATION_PHONE), NO confirma cita, 0 citas creadas.
 *  B (regresión): "a las 3" con carrito activo, sin fecha aún → el gate de
 *     reclamo NO debe dispararse (no es un falso positivo).
 *  C (regresión PR #8): "3,30 me viene bien" con selected_day ya fijado en
 *     sesión (awaiting_datetime) → sigue cerrando la cita normalmente.
 *  D: reclamo que también trae una fecha explícita ("se me cayó, ¿puedo ir
 *     el 10 de agosto?") → por decisión de producto, igual prioriza el gate
 *     de reclamo (deriva al equipo) en vez de agendar automático.
 *  E (05-ago [P1]): "se bajaron por completo" SIN carrito → gate igual
 *     (antes iba a Haiku → add_to_cart). 0 carrito, 0 cita.
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
  seedSessionWithCart,
  countScheduledAppointments,
} from "./lib/waba-sim-seed.mjs";
import {
  pollResponseSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE_A = "51999000984"; // Caso A: reclamo tipo Lili
const PHONE_B = "51999000985"; // Caso B: "a las 3" (regresión, no debe gatear)
const PHONE_C = "51999000986"; // Caso C: "3,30" con selected_day (regresión PR #8)
const PHONE_D = "51999000987"; // Caso D: reclamo + fecha explícita
const PHONE_E = "51999000988"; // Caso E: reclamo plural SIN carrito (P1 05-ago)

const WEEKDAY_KEY = "2026-08-20"; // jueves, sin citas reales ni feriado
const LIFTING_ID = "33fbadcc-30e8-4e82-9913-3a888aea73dc"; // servicio de control (ver waba-validate-phantom-booking.mjs)

const COMPLAINT_RE = /garant[ií]a/i;
const STAFF_PHONE_RE = /932 535 512/;
const CONFIRMED_RE = /¡Tu cita está (confirmada|anotada)!/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedBrowsingWithCart(phone) {
  await cleanupQaPhone(supabase, phone, { deleteClient: true });
  await seedSessionWithCart(supabase, phone, LIFTING_ID, 70);
}

async function validateComplaintGate() {
  console.log(
    "\n── Caso A: reclamo tipo Lili con carrito activo → deriva al equipo, no confirma ──",
  );
  await seedBrowsingWithCart(PHONE_A);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(
      PHONE_A,
      "Tendrán que volverlo a hacer xq no se puede bajar solo en 3 o 4 días",
      { wamid: newWamid("wamid.qa.lili.a"), contactName: "QA Lili A" },
    ),
  );

  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_A, since);
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [COMPLAINT_RE, STAFF_PHONE_RE],
    mustNotMatch: [CONFIRMED_RE],
    expectHaiku: false,
  });

  const appts = await countScheduledAppointments(supabase, PHONE_A);
  if (appts !== 0) result.fails.push(`esperaba 0 citas creadas, hay ${appts}`);

  const pass = result.fails.length === 0;
  logCaseResult("Lili-A reclamo → gate", { ...result, pass }, outbound);

  return {
    name: "Caso A (reclamo tipo Lili)",
    pass,
    note: pass
      ? "Deriva al equipo, no interpreta el '3' como hora ni confirma cita"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateNoFalsePositive() {
  console.log(
    "\n── Caso B: 'a las 3' con carrito activo, sin fecha → el gate NO debe dispararse ──",
  );
  await seedBrowsingWithCart(PHONE_B);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_B, "a las 3", {
      wamid: newWamid("wamid.qa.lili.b"),
      contactName: "QA Lili B",
    }),
  );

  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_B, since);
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [/.+/],
    mustNotMatch: [COMPLAINT_RE],
    expectHaiku: false,
  });

  const pass = result.fails.length === 0;
  logCaseResult("Lili-B sin falso positivo", { ...result, pass }, outbound);

  return {
    name: "Caso B ('a las 3', regresión)",
    pass,
    note: pass
      ? "El gate de reclamo no interfiere con hora explícita legítima"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateRegressionPR8() {
  console.log(
    "\n── Caso C: '3,30 me viene bien' con selected_day ya fijado → cierra cita (regresión PR #8) ──",
  );
  await cleanupQaPhone(supabase, PHONE_C, { deleteClient: true });
  await seedSessionWithCart(supabase, PHONE_C, LIFTING_ID, 70);
  await supabase
    .from("whatsapp_sessions")
    .update({
      step: "awaiting_datetime",
      selected_day: WEEKDAY_KEY,
      updated_at: new Date().toISOString(),
    })
    .eq("phone", PHONE_C);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE_C, "3,30 me viene bien", {
      wamid: newWamid("wamid.qa.lili.c"),
      contactName: "QA Lili C",
    }),
  );

  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_C, since);
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [CONFIRMED_RE],
    mustNotMatch: [COMPLAINT_RE],
    expectHaiku: false,
  });

  const appts = await countScheduledAppointments(supabase, PHONE_C);
  if (appts !== 1) result.fails.push(`esperaba 1 cita creada, hay ${appts}`);

  const pass = result.fails.length === 0;
  logCaseResult("Lili-C regresión PR#8", { ...result, pass }, outbound);

  return {
    name: "Caso C ('3,30' con selected_day, regresión PR#8)",
    pass,
    note: pass
      ? "Sigue cerrando la cita normalmente cuando el día ya está fijado"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateComplaintWithExplicitDate() {
  console.log(
    "\n── Caso D: reclamo + fecha explícita → prioriza el gate, no agenda automático ──",
  );
  await seedBrowsingWithCart(PHONE_D);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(
      PHONE_D,
      "se me cayó, ¿puedo ir el 10 de agosto?",
      { wamid: newWamid("wamid.qa.lili.d"), contactName: "QA Lili D" },
    ),
  );

  const { outbound, haiku } = await pollResponseSince(supabase, PHONE_D, since);
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [COMPLAINT_RE, STAFF_PHONE_RE],
    mustNotMatch: [CONFIRMED_RE],
    expectHaiku: false,
  });

  const appts = await countScheduledAppointments(supabase, PHONE_D);
  if (appts !== 0) result.fails.push(`esperaba 0 citas creadas, hay ${appts}`);

  const pass = result.fails.length === 0;
  logCaseResult("Lili-D reclamo + fecha", { ...result, pass }, outbound);

  return {
    name: "Caso D (reclamo + fecha explícita)",
    pass,
    note: pass
      ? "Comportamiento esperado por producto: gate de reclamo gana sobre la fecha"
      : result.fails.join("; ") || "Falló",
  };
}

/** Primer mensaje Lili: plural sin carrito → gate (no Haiku add_to_cart). */
async function validateComplaintWithoutCart() {
  console.log(
    "\n── Caso E: «se bajaron» SIN carrito → gate (no add_to_cart / Haiku) ──",
  );
  await cleanupQaPhone(supabase, PHONE_E, { deleteClient: true });
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE_E,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(
      PHONE_E,
      "Como les mencioné, las pestañas se bajaron por completo.",
      { wamid: newWamid("wamid.qa.lili.e"), contactName: "QA Lili E" },
    ),
  );

  const { outbound } = await pollResponseSince(supabase, PHONE_E, since, {
    timeoutMs: 12000,
  });
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("cart_items")
    .eq("phone", PHONE_E)
    .maybeSingle();
  let cart = [];
  try {
    cart = JSON.parse(sess?.cart_items ?? "[]");
  } catch {
    /* ignore */
  }
  const appts = await countScheduledAppointments(supabase, PHONE_E);
  const gated = COMPLAINT_RE.test(text) && STAFF_PHONE_RE.test(text);
  const addedCart = Array.isArray(cart) && cart.length > 0;

  const fails = [];
  if (!gated) fails.push("no envió mensaje de garantía/932");
  if (addedCart) fails.push("Haiku/flujo agregó al carrito");
  if (appts > 0) fails.push(`creó ${appts} cita(s)`);
  if (CONFIRMED_RE.test(text)) fails.push("confirmó cita");

  const pass = fails.length === 0;
  const result = { pass, fails, outboundCount: outbound.length, haikuCount: 0 };
  logCaseResult("Lili-E reclamo sin carrito", result, outbound);
  return {
    name: "Caso E (se bajaron sin carrito)",
    pass,
    note: pass
      ? "Gate antes de Haiku; 0 carrito / 0 cita"
      : fails.join("; "),
  };
}

async function main() {
  console.log(
    "Validación gate reclamo/garantía (Lili 04-ago-2026) — teléfonos QA:",
    PHONE_A,
    PHONE_B,
    PHONE_C,
    PHONE_D,
    PHONE_E,
  );
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await validateComplaintGate());
    await sleep(4000);
    results.push(await validateNoFalsePositive());
    await sleep(4000);
    results.push(await validateRegressionPR8());
    await sleep(4000);
    results.push(await validateComplaintWithExplicitDate());
    await sleep(4000);
    results.push(await validateComplaintWithoutCart());
  } finally {
    await cleanupQaPhone(supabase, PHONE_A, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_B, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_C, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_D, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_E, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
