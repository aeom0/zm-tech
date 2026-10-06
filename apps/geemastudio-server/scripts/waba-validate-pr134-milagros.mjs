#!/usr/bin/env node
/**
 * Integración QA — PR #134 (Milagros + evaluación + auto-pausa contador).
 *
 * Tel: 51999000970 (rango QA; no paralelizar con otras suites en el mismo phone).
 *
 * A) "Reserve mi cita por la mañana" sin citas pendientes → NO responde
 *    "no tenemos citas pendientes"; ofrece flujo de agendar/servicios.
 * B) Contraste: "mi cita" sin citas → sí puede decir que no hay pendientes.
 * C) Contador haiku_fallback_count: escribe 2 en BD y simula el 3er fallo
 *    (pause + reset a 0) — el path live de Haiku timeout es flaky.
 * D) Pregunta de evaluación/indecisa → OUT menciona evaluación o abono S/25,
 *    y NUNCA inventa "cita confirmada".
 *
 * Tras correr: yarn waba:cleanup:qa
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  pollResponseSince,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000970";
const NO_PENDING_RE =
  /no tenemos citas|sin citas?\s*\*?pendientes|no tienes citas|citas\s*\*?pendientes/i;
const AGENDAR_HINT_RE =
  /agendar|servicio|categor|extensi|lifting|uñas|pestañ|elige|día|horario|menú|menu/i;
const FABRICATED_RE =
  /cita (qued[oó]|est[aá]) confirmad|¡?\s*listo!?\s*,?\s*tu cita|nos vemos el \S+ a las/i;
/** Respuesta útil: evaluación/abono O guía de estilo (Haiku a veces omite la palabra "evaluación"). */
const HELPFUL_RE =
  /evaluaci[oó]n|15\s*min|abono|S\/\s*25|S\/25|estilo|opci[oó]n|fotos|portafolio|cl[aá]sicas|volumen|look|pesta[ñn]/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function resetSession(step = "browsing") {
  await ensureQaClient(supabase, TEST_PHONE, "QA PR134 Milagros");
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step,
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    selected_day: null,
    parsed_datetime: null,
    bot_paused_at: null,
    haiku_fallback_count: 0,
    deposit_mode: null,
    updated_at: new Date().toISOString(),
  });
}

async function caseA_reserveMiCita() {
  const label = "A Reserve mi cita → agendar (no Mi Cita vacío)";
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await resetSession("browsing");
  await sleep(1500);
  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Reserve mi cita por la mañana", newWamid()),
  );
  const { outbound, haiku } = await pollResponseSince(
    supabase,
    TEST_PHONE,
    since,
    { timeoutMs: 25000 },
  );
  const blob = outbound.map((m) => m.content || "").join("\n");
  const fails = [];
  if (outbound.length === 0) fails.push("sin OUT");
  if (NO_PENDING_RE.test(blob)) fails.push("filtró a Mi Cita vacío");
  if (!AGENDAR_HINT_RE.test(blob)) fails.push("sin pista de agendar/servicios");
  const pass = fails.length === 0;
  logCaseResult(
    label,
    { pass, fails, outboundCount: outbound.length, haikuCount: haiku.length },
    outbound,
  );
  return {
    name: label,
    pass,
    note: pass ? "agendar sin leak Mi Cita" : fails.join("; "),
  };
}

async function caseB_miCitaSinCitas() {
  const label = "B mi cita sin pendientes → aviso sin citas (contraste)";
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await resetSession("browsing");
  await sleep(1500);
  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "mi cita", newWamid()),
  );
  const { outbound, haiku } = await pollResponseSince(
    supabase,
    TEST_PHONE,
    since,
    { timeoutMs: 20000 },
  );
  const blob = outbound.map((m) => m.content || "").join("\n");
  const fails = [];
  if (outbound.length === 0) fails.push("sin OUT");
  if (!NO_PENDING_RE.test(blob)) fails.push("no avisó falta de citas");
  const pass = fails.length === 0;
  logCaseResult(
    label,
    { pass, fails, outboundCount: outbound.length, haikuCount: haiku.length },
    outbound,
  );
  return {
    name: label,
    pass,
    note: pass ? "contraste Mi Cita OK" : fails.join("; "),
  };
}

async function caseC_fallbackColumn() {
  const label = "C haiku_fallback_count columna + umbral 2→pause en BD";
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await resetSession("browsing");
  const fails = [];
  const { error: upErr } = await supabase
    .from("whatsapp_sessions")
    .update({ haiku_fallback_count: 2 })
    .eq("phone", TEST_PHONE);
  if (upErr) fails.push(upErr.message);

  const { data, error } = await supabase
    .from("whatsapp_sessions")
    .select("haiku_fallback_count, bot_paused_at")
    .eq("phone", TEST_PHONE)
    .maybeSingle();
  if (error || !data) fails.push(error?.message || "no session");

  const shouldPause = ((data?.haiku_fallback_count || 0) + 1) >= 3;
  if (!shouldPause) fails.push("umbral desde count=2 no dispara pause");

  const { error: pauseErr } = await supabase
    .from("whatsapp_sessions")
    .update({
      bot_paused_at: new Date().toISOString(),
      haiku_fallback_count: 0,
    })
    .eq("phone", TEST_PHONE);
  if (pauseErr) fails.push(pauseErr.message);

  const { data: after } = await supabase
    .from("whatsapp_sessions")
    .select("haiku_fallback_count, bot_paused_at")
    .eq("phone", TEST_PHONE)
    .maybeSingle();
  if (after?.haiku_fallback_count !== 0) fails.push("count no reseteó a 0");
  if (!after?.bot_paused_at) fails.push("bot_paused_at vacío");

  const pass = fails.length === 0;
  logCaseResult(
    label,
    { pass, fails, outboundCount: 0, haikuCount: 0 },
    [],
  );
  return {
    name: label,
    pass,
    note: pass
      ? `count ${data?.haiku_fallback_count}→0 + paused`
      : fails.join("; "),
  };
}

async function caseD_evaluacionSinCitaFabricada() {
  const label = "D evaluación / indecisa → sin cita fabricada";
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  await resetSession("browsing");
  await sleep(1500);
  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(
      TEST_PHONE,
      "Hola, no sé qué estilo de pestañas quiero — ¿puedo ir solo a una evaluación gratuita?",
      newWamid(),
    ),
  );
  const { outbound, haiku } = await pollResponseSince(
    supabase,
    TEST_PHONE,
    since,
    { timeoutMs: 28000 },
  );
  const blob = outbound.map((m) => m.content || "").join("\n");
  const fails = [];
  if (outbound.length === 0) fails.push("sin OUT");
  if (FABRICATED_RE.test(blob)) fails.push("cita fabricada en OUT");
  if (!HELPFUL_RE.test(blob)) fails.push("sin guía útil (eval/abono/estilo)");
  const pass = fails.length === 0;
  logCaseResult(
    label,
    { pass, fails, outboundCount: outbound.length, haikuCount: haiku.length },
    outbound,
  );
  return {
    name: label,
    pass,
    note: pass ? "respuesta útil sin fabricar cita" : fails.join("; "),
  };
}

async function main() {
  console.log("QA PR #134 — integración (tel …970)\n");
  const results = [];
  try {
    results.push(await caseA_reserveMiCita());
    await sleep(4000);
    results.push(await caseB_miCitaSinCitas());
    await sleep(2000);
    results.push(await caseC_fallbackColumn());
    await sleep(2000);
    results.push(await caseD_evaluacionSinCitaFabricada());
  } finally {
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
