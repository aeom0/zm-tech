#!/usr/bin/env node
/**
 * QA ads-bounce-nudge:
 * A) from_ad_at hace ~100 min, sin carrito, sin inbound posterior → envía reenganche
 * B) con inbound posterior a from_ad_at → no envía (no es bounce)
 * C) from_ad_at madrugada (~7 h atrás, fuera de la vieja ventana 150 min) →
 *    sigue siendo candidata (colchón 24 h) y recibe reenganche con bypass
 * D) sin X-QA-Bypass-Hours: si Lima está fuera de 9–22, responde skipped con
 *    el motivo de horario de reenganche (no el del salón)
 * E) step awaiting_ctwa_interest (lista CTWA) ~100 min → sí reengancha
 *
 * Teléfono: 51999000982 (compartido con selector-debounce; cleanup al inicio/fin)
 * Invoca con CRON_SECRET + X-QA-Bypass-Hours (salvo caso D).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import { sleep } from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000982";
const INSTAGRAM_RE = /instagram/i;
const PHONE_RE = /932\s*535\s*512/;
const LIMA_UTC_OFFSET = 5;
const REENGANCHE_SKIP_RE = /fuera de horario reenganche.*9am.*10pm/i;

const { url, serviceKey, cronSecret } = loadEnvFromRoot();
const nudgeUrl = `${url}/functions/v1/ads-bounce-nudge`;
if (!cronSecret) {
  throw new Error(
    "Falta CRON_SECRET en .env — necesario para invocar ads-bounce-nudge",
  );
}
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function limaHourNow() {
  const utcNow = new Date();
  return (utcNow.getUTCHours() - LIMA_UTC_OFFSET + 24) % 24;
}

function isWithinReengancheHoursNow() {
  const h = limaHourNow();
  return h >= 9 && h < 22;
}

async function invokeNudge({ bypassHours = true } = {}) {
  const headers = {
    Authorization: `Bearer ${cronSecret}`,
    "Content-Type": "application/json",
  };
  if (bypassHours) headers["X-QA-Bypass-Hours"] = "true";
  const res = await fetch(nudgeUrl, {
    method: "POST",
    headers,
    body: "{}",
  });
  const json = await res.json().catch(() => null);
  console.log(
    `  Invocación ads-bounce-nudge (bypass=${bypassHours}) → HTTP ${res.status}`,
    json,
  );
  return json;
}

async function fetchOutboundSince(since) {
  const { data } = await supabase
    .from("wa_messages")
    .select("content, msg_type, created_at")
    .eq("phone", PHONE)
    .eq("direction", "out")
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  return data ?? [];
}

/**
 * @param {number} minutesAgo
 * @param {{ step?: string }} [opts]
 */
async function seedBounceCandidate(minutesAgo = 100, opts = {}) {
  await ensureQaClient(supabase, PHONE, "QA Ads Bounce");
  const fromAdAt = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: opts.step ?? "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    from_ad_at: fromAdAt,
    ads_bounce_nudge_sent_at: null,
    updated_at: fromAdAt,
  });
  // Inbound CTWA original ANTES de from_ad_at (no debe bloquear)
  await supabase.from("wa_messages").insert({
    phone: PHONE,
    direction: "in",
    msg_type: "text",
    content:
      "¡Hola! 👋 Vi tu promo de Fiestas Patrias en Instagram y quiero más info 💜",
    created_at: new Date(
      Date.now() - (minutesAgo + 1) * 60 * 1000,
    ).toISOString(),
  });
}

async function caseA() {
  console.log(
    "\n── A: bounce CTWA ~100min → reenganche con Instagram + 932 ──",
  );
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedBounceCandidate(100);
  const since = new Date().toISOString();
  const result = await invokeNudge();
  if (result?.skipped) {
    return {
      name: "A bounce nudge",
      pass: false,
      note: `skipped: ${result.reason}`,
    };
  }
  await sleep(2000);
  const outbound = await fetchOutboundSince(since);
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("ads_bounce_nudge_sent_at")
    .eq("phone", PHONE)
    .maybeSingle();

  const pass =
    INSTAGRAM_RE.test(text) &&
    PHONE_RE.test(text) &&
    Boolean(sess?.ads_bounce_nudge_sent_at) &&
    (result?.sent ?? 0) >= 1;

  console.log(
    pass ? "  PASS" : "  FAIL",
    `| outs=${outbound.length} sent=${result?.sent} guard=${sess?.ads_bounce_nudge_sent_at ? "ok" : "null"}`,
  );
  if (!pass) console.log("  text:", text.slice(0, 200));
  return {
    name: "A bounce nudge",
    pass,
    note: pass ? "Instagram+932 + guard" : "sin mensaje o sin guard",
  };
}

async function caseB() {
  console.log("\n── B: inbound tras from_ad_at → no reenganche ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedBounceCandidate(100);
  // Clienta respondió después del welcome
  await supabase.from("wa_messages").insert({
    phone: PHONE,
    direction: "in",
    msg_type: "text",
    content: "Quiero lifting",
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
  });
  const since = new Date().toISOString();
  const result = await invokeNudge();
  await sleep(1500);
  const outbound = await fetchOutboundSince(since);
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const pass =
    (result?.sent ?? 0) === 0 &&
    !INSTAGRAM_RE.test(text) &&
    outbound.length === 0;

  console.log(
    pass ? "  PASS" : "  FAIL",
    `| sent=${result?.sent} outs=${outbound.length}`,
  );
  return {
    name: "B engaged no nudge",
    pass,
    note: pass ? "excluida por inbound" : "envió de más",
  };
}

async function caseC() {
  // Simula CTWA a las ~2 AM: a las 9 AM ya pasaron ~7 h (>150 min viejo tope).
  // Con colchón 24 h + bypass (= corrida en horario 9–22) debe enviar.
  console.log(
    "\n── C: madrugada (~7h, fuera de ventana 150min) → candidata + reenganche ──",
  );
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedBounceCandidate(7 * 60);
  const since = new Date().toISOString();
  const result = await invokeNudge({ bypassHours: true });
  if (result?.skipped) {
    return {
      name: "C madrugada deferral",
      pass: false,
      note: `skipped: ${result.reason}`,
    };
  }
  await sleep(2000);
  const outbound = await fetchOutboundSince(since);
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("ads_bounce_nudge_sent_at")
    .eq("phone", PHONE)
    .maybeSingle();

  const pass =
    INSTAGRAM_RE.test(text) &&
    PHONE_RE.test(text) &&
    Boolean(sess?.ads_bounce_nudge_sent_at) &&
    (result?.sent ?? 0) >= 1 &&
    (result?.candidates ?? 0) >= 1;

  console.log(
    pass ? "  PASS" : "  FAIL",
    `| outs=${outbound.length} sent=${result?.sent} candidates=${result?.candidates}`,
  );
  if (!pass) console.log("  text:", text.slice(0, 200));
  return {
    name: "C madrugada deferral",
    pass,
    note: pass
      ? "colchón 24h + envío (simula 2AM→9AM)"
      : "no candidata o sin envío tras >150min",
  };
}

async function caseD() {
  console.log(
    "\n── D: sin bypass → skipped si fuera de 9–22 Lima (motivo reenganche) ──",
  );
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedBounceCandidate(100);
  const result = await invokeNudge({ bypassHours: false });
  const inHours = isWithinReengancheHoursNow();

  if (!inHours) {
    const pass =
      result?.skipped === true &&
      REENGANCHE_SKIP_RE.test(String(result?.reason ?? "")) &&
      typeof result?.candidates === "number";
    console.log(
      pass ? "  PASS" : "  FAIL",
      `| limaHour=${limaHourNow()} reason=${result?.reason} candidates=${result?.candidates}`,
    );
    return {
      name: "D hours gate",
      pass,
      note: pass
        ? "skipped con motivo reenganche 9am-10pm"
        : "motivo/candidates incorrectos fuera de horario",
    };
  }

  // Dentro de 9–22: el gate no debe saltar; puede enviar (OK) o reportar success.
  const pass =
    result?.skipped !== true &&
    (result?.success === true || (result?.sent ?? 0) >= 0);
  console.log(
    pass ? "  PASS" : "  FAIL",
    `| limaHour=${limaHourNow()} dentro de horario — skipped=${result?.skipped}`,
  );
  return {
    name: "D hours gate",
    pass,
    note: pass
      ? `dentro de 9–22 Lima (h=${limaHourNow()}) — no skipped`
      : "skipped inesperado dentro de horario reenganche",
  };
}

async function caseE() {
  console.log(
    "\n── E: step awaiting_ctwa_interest ~100min → reenganche (lista CTWA) ──",
  );
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedBounceCandidate(100, { step: "awaiting_ctwa_interest" });
  const since = new Date().toISOString();
  const result = await invokeNudge();
  if (result?.skipped) {
    return {
      name: "E ctwa interest step",
      pass: false,
      note: `skipped: ${result.reason}`,
    };
  }
  await sleep(2000);
  const outbound = await fetchOutboundSince(since);
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("ads_bounce_nudge_sent_at, step")
    .eq("phone", PHONE)
    .maybeSingle();

  const pass =
    INSTAGRAM_RE.test(text) &&
    PHONE_RE.test(text) &&
    Boolean(sess?.ads_bounce_nudge_sent_at) &&
    (result?.sent ?? 0) >= 1;

  console.log(
    pass ? "  PASS" : "  FAIL",
    `| outs=${outbound.length} sent=${result?.sent} step=${sess?.step} guard=${sess?.ads_bounce_nudge_sent_at ? "ok" : "null"}`,
  );
  if (!pass) console.log("  text:", text.slice(0, 200));
  return {
    name: "E ctwa interest step",
    pass,
    note: pass
      ? "awaiting_ctwa_interest incluida en RPC"
      : "excluida por step o sin envío",
  };
}

async function main() {
  console.log("QA ads-bounce-nudge — tel:", PHONE);
  const results = [];
  try {
    results.push(await caseA());
    await sleep(3000);
    results.push(await caseB());
    await sleep(3000);
    results.push(await caseC());
    await sleep(3000);
    results.push(await caseD());
    await sleep(3000);
    results.push(await caseE());
  } finally {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  }
  const failed = results.filter((r) => !r.pass);
  console.log("\n══ Resumen ══");
  for (const r of results) {
    console.log(`${r.pass ? "✅" : "❌"} ${r.name} — ${r.note}`);
  }
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
