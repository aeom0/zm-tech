#!/usr/bin/env node
/**
 * QA browse-reengage (Haiku post-respuesta):
 * A) Último OUT hace ~40 min, browsing sin carrito → envía reenganche + guard
 * B) Tras A, segunda invocación no reenvía (browse_reengage_sent_at)
 * C) Carrito activo → no es candidata (cart-nudge territory)
 * D) Sin bypass: si Lima fuera 9–22 → skipped con motivo reenganche
 * E) watchdog_sent_at posterior → no envía
 * F) Cierre por salud + OUT con «agendar» suelto → NO reenganche (Patricia …9451)
 * G) Cita scheduled + confirmación OUT → NO reenganche (Mónica …0370)
 * H) Último OUT source=panel reciente → NO reenganche (Merillyn …7296)
 *
 * Teléfono: 51999000979
 * Requiere CRON_SECRET + browse-reengage desplegado.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient, seedScheduledAppointment } from "./lib/waba-sim-seed.mjs";
import { logCaseResult, finishAndExit, sleep } from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000979";
const LIMA_UTC_OFFSET = 5;
const REENGANCHE_SKIP_RE = /fuera de horario reenganche.*9am.*10pm/i;
const NUDGE_RE =
  /sigues|menu|agendar|gustaría|gustaria|pestañas|cejas|uñas|hola|opciones|cuéntanos|cuentanos/i;

const { url, serviceKey, cronSecret } = loadEnvFromRoot();
const fnUrl = `${url}/functions/v1/browse-reengage`;
if (!cronSecret) {
  throw new Error(
    "Falta CRON_SECRET en .env — necesario para invocar browse-reengage",
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

async function invoke({ bypassHours = true } = {}) {
  const headers = {
    Authorization: `Bearer ${cronSecret}`,
    "Content-Type": "application/json",
  };
  if (bypassHours) headers["X-QA-Bypass-Hours"] = "true";
  const res = await fetch(fnUrl, {
    method: "POST",
    headers,
    body: "{}",
  });
  const json = await res.json().catch(() => null);
  console.log(
    `  Invocación browse-reengage (bypass=${bypassHours}) → HTTP ${res.status}`,
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

/** Seed: inbound reciente + OUT hace minutesAgo (último msg = out). */
async function seedIdleBrowse(minutesAgo = 40, { withCart = false } = {}) {
  await ensureQaClient(supabase, PHONE, "QA Browse Reengage");
  const lastOutAt = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  const inboundAt = new Date(
    Date.now() - (minutesAgo + 2) * 60 * 1000,
  ).toISOString();

  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: withCart
      ? JSON.stringify([
          {
            item_type: "service",
            item_id: "3d5d6ee4-b799-4b93-86eb-b974ec125439",
            quantity: 1,
            price: 70,
          },
        ])
      : "[]",
    cart_service_ids: withCart
      ? '["3d5d6ee4-b799-4b93-86eb-b974ec125439"]'
      : "[]",
    employee_assignments: "{}",
    browse_reengage_sent_at: null,
    ads_bounce_nudge_sent_at: null,
    watchdog_sent_at: null,
    from_ad_at: null,
    updated_at: lastOutAt,
  });

  await supabase.from("wa_messages").insert([
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content:
        "¡Hola! 👋 Vi tu promo de Fiestas Patrias en Instagram y quiero más info 💜",
      created_at: inboundAt,
    },
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content: "La atención es con cita?",
      created_at: new Date(
        Date.now() - (minutesAgo + 1) * 60 * 1000,
      ).toISOString(),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content:
        "¡Hola! Sí, toda atención es con cita previa 💜 ¿Cuál servicio de la promo te llamó la atención?",
      created_at: new Date(
        Date.now() - (minutesAgo + 0.5) * 60 * 1000,
      ).toISOString(),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "interactive",
      content:
        "[lista] 🌟 Promos ZM Lash & Nails: Nuestras promos activas 💜 Elige una:",
      created_at: lastOutAt,
    },
  ]);
}

async function caseA() {
  console.log("\n── A: idle browse 40 min → Haiku/fallback ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedIdleBrowse(40);
  const since = new Date().toISOString();
  const result = await invoke({ bypassHours: true });
  await sleep(2000);
  const outbound = await fetchOutboundSince(since);
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("browse_reengage_sent_at")
    .eq("phone", PHONE)
    .maybeSingle();

  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const fails = [];
  if ((result?.sent ?? 0) < 1 && !NUDGE_RE.test(joined)) {
    fails.push(`sent=${result?.sent} out=${joined.slice(0, 120)}`);
  }
  if (!sess?.browse_reengage_sent_at) fails.push("sin browse_reengage_sent_at");
  if (outbound.length === 0) fails.push("sin outbound");
  else if (!NUDGE_RE.test(joined))
    fails.push(`copy raro: ${joined.slice(0, 100)}`);

  const pass = fails.length === 0;
  const caseResult = {
    pass,
    fails,
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  logCaseResult("A idle → reengage", caseResult, outbound);
  return {
    name: "A idle browse → reengage",
    pass,
    note: pass ? "envió + guard" : fails.join("; "),
  };
}

async function caseB() {
  console.log("\n── B: segunda invocación no reenvía ──");
  const since = new Date().toISOString();
  const before = await supabase
    .from("whatsapp_sessions")
    .select("browse_reengage_sent_at")
    .eq("phone", PHONE)
    .single();
  const result = await invoke({ bypassHours: true });
  await sleep(1500);
  const outbound = await fetchOutboundSince(since);
  const fails = [];
  if ((result?.sent ?? 0) > 0) fails.push(`sent=${result.sent} (esperado 0)`);
  if (outbound.length > 0) fails.push(`${outbound.length} outs nuevos`);
  if (!before.data?.browse_reengage_sent_at) {
    fails.push("faltaba guard del caso A");
  }

  const pass = fails.length === 0;
  const caseResult = {
    pass,
    fails,
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  logCaseResult("B no dup", caseResult, outbound);
  return {
    name: "B no reenvía",
    pass,
    note: pass ? "idempotente" : fails.join("; "),
  };
}

async function caseC() {
  console.log("\n── C: con carrito → no candidata ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedIdleBrowse(40, { withCart: true });
  const since = new Date().toISOString();
  const result = await invoke({ bypassHours: true });
  await sleep(1500);
  const outbound = await fetchOutboundSince(since);
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("browse_reengage_sent_at")
    .eq("phone", PHONE)
    .maybeSingle();

  const fails = [];
  if ((result?.sent ?? 0) > 0) fails.push(`sent=${result.sent}`);
  if (outbound.length > 0) fails.push("envió con carrito");
  // Puede o no marcar guard si no estaba en candidates
  if (sess?.browse_reengage_sent_at) {
    // ok if somehow marked — but shouldn't send
  }

  const pass = fails.length === 0;
  const caseResult = {
    pass,
    fails,
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  logCaseResult("C con carrito", caseResult, outbound);
  return {
    name: "C con carrito excluido",
    pass,
    note: pass ? "no envía" : fails.join("; "),
  };
}

async function caseD() {
  console.log("\n── D: gate horario 9–22 (sin bypass) ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedIdleBrowse(40);
  const within = isWithinReengancheHoursNow();
  const result = await invoke({ bypassHours: false });

  let pass;
  let note;
  if (!within) {
    pass =
      result?.skipped === true && REENGANCHE_SKIP_RE.test(result?.reason ?? "");
    note = pass
      ? `skipped OK (Lima ${limaHourNow()}h)`
      : `esperado skipped: ${JSON.stringify(result)}`;
  } else {
    // Dentro de horario: puede enviar; no fallar el gate
    pass = result?.skipped !== true || !result?.reason;
    note = pass
      ? `dentro 9–22 (Lima ${limaHourNow()}h) — gate no aplica`
      : `skipped inesperado dentro de horario: ${JSON.stringify(result)}`;
  }

  const caseResult = {
    pass,
    fails: pass ? [] : [note],
    outboundCount: 0,
    haikuCount: 0,
  };
  logCaseResult("D gate horario", caseResult, []);
  return { name: "D gate horario 9–22", pass, note };
}

async function caseE() {
  console.log("\n── E: watchdog_sent_at posterior → no browse-reengage ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedIdleBrowse(40);
  // Simula que silence-watchdog ya reenganchó (guard tras el último OUT)
  await supabase
    .from("whatsapp_sessions")
    .update({ watchdog_sent_at: new Date().toISOString() })
    .eq("phone", PHONE);

  const since = new Date().toISOString();
  const result = await invoke({ bypassHours: true });
  await sleep(1500);
  const outbound = await fetchOutboundSince(since);
  const fails = [];
  if ((result?.sent ?? 0) > 0) fails.push(`sent=${result.sent}`);
  if (outbound.length > 0) fails.push("envió tras watchdog");

  const pass = fails.length === 0;
  const caseResult = {
    pass,
    fails,
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  logCaseResult("E post-watchdog", caseResult, outbound);
  return {
    name: "E excluye si ya hubo watchdog",
    pass,
    note: pass ? "no spam" : fails.join("; "),
  };
}

async function caseF() {
  console.log(
    "\n── F: cierre por salud + OUT con «agendar» suelto → NO reenganche (Patricia …9451) ──",
  );
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await ensureQaClient(supabase, PHONE, "QA Browse Close Health");

  const minutesAgo = 40;
  const lastOutAt = new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
  const inboundAt = new Date(
    Date.now() - (minutesAgo + 2) * 60 * 1000,
  ).toISOString();

  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    browse_reengage_sent_at: null,
    ads_bounce_nudge_sent_at: null,
    watchdog_sent_at: null,
    from_ad_at: null,
    updated_at: lastOutAt,
  });

  // Transcript real: clienta declina por salud; Haiku cierra con "agendar" pasivo.
  await supabase.from("wa_messages").insert([
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content: "[plantilla] retoque_reenganche_zm — Rubber · 3 semanas",
      created_at: new Date(
        Date.now() - (minutesAgo + 10) * 60 * 1000,
      ).toISOString(),
    },
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content:
        "Hola como están, por el momento no voy a poder asistir, estoy en cama por tema de salud. Yo les escribo. Bendiciones",
      created_at: inboundAt,
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content:
        "¡Que te mejores pronto! 💜 Sin problema, estamos aquí cuando te sientas mejor. Cualquier duda o cuando quieras agendar, nos escribes. ¡Bendiciones también! ✨",
      created_at: lastOutAt,
    },
  ]);

  const since = new Date().toISOString();
  const result = await invoke({ bypassHours: true });
  await sleep(2000);
  const outbound = await fetchOutboundSince(since);
  const fails = [];
  if ((result?.sent ?? 0) > 0) {
    fails.push(`sent=${result.sent} (esperado 0 — cierre explícito)`);
  }
  if (outbound.length > 0) {
    fails.push(
      `reabrió chat: ${outbound.map((m) => (m.content ?? "").slice(0, 80)).join(" | ")}`,
    );
  }

  const pass = fails.length === 0;
  const caseResult = {
    pass,
    fails,
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  logCaseResult("F cierre salud sin midFunnel falso", caseResult, outbound);
  return {
    name: "F cierre por salud (no midFunnel por «agendar»)",
    pass,
    note: pass ? "respetó cierre Haiku" : fails.join("; "),
  };
}

/** Mónica …0370: confirmó asistencia; browse no debe reenganchar. */
async function caseG() {
  console.log("\n── G: cita scheduled → no reengage (Mónica) ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });

  const future = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  const y = future.getUTCFullYear();
  const m = String(future.getUTCMonth() + 1).padStart(2, "0");
  const d = String(future.getUTCDate()).padStart(2, "0");
  const dateLima = `${y}-${m}-${d} 10:00:00`;

  await seedScheduledAppointment(supabase, PHONE, {
    date: dateLima,
    clientName: "QA Monica Browse",
    sessionStep: "browsing",
  });
  // Override sesión/msgs al patrón post-confirmación (idle browse + OUT confirmación)
  await seedIdleBrowse(40);
  // Reponer el OUT de confirmación (último mensaje = confirmación, no lista)
  const lastOutAt = new Date(Date.now() - 40 * 60 * 1000).toISOString();
  await supabase.from("wa_messages").insert({
    phone: PHONE,
    direction: "out",
    msg_type: "text",
    content: "¡Perfecto! ✨ Tu cita está confirmada. ¡Te esperamos! 💜",
    created_at: lastOutAt,
    source: "bot",
  });
  // Asegurar step browsing vacío (seedIdleBrowse ya lo hace) + cita intacta
  await supabase
    .from("whatsapp_sessions")
    .update({
      step: "browsing",
      cart_items: "[]",
      cart_service_ids: "[]",
      browse_reengage_sent_at: null,
    })
    .eq("phone", PHONE);

  const since = new Date().toISOString();
  const result = await invoke({ bypassHours: true });
  await sleep(2000);
  const outbound = await fetchOutboundSince(since);
  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const fails = [];
  if ((result?.sent ?? 0) > 0) fails.push(`sent=${result.sent} (esperado 0)`);
  if (outbound.length > 0) fails.push(`out: ${joined.slice(0, 100)}`);
  if (/sigues por aqu[ií]/i.test(joined)) fails.push("copy Sigues por aquí");

  const pass = fails.length === 0;
  logCaseResult("G cita scheduled → no reengage", {
    pass,
    fails,
    outboundCount: outbound.length,
    haikuCount: 0,
  }, outbound);
  return {
    name: "G cita scheduled (no reengage)",
    pass,
    note: pass ? "skip duro scheduled" : fails.join("; "),
  };
}

/** Merillyn …7296: Vanessa habló por panel → browse no debe pisar. */
async function caseH() {
  console.log("\n── H: OUT panel reciente → no reengage (Merillyn) ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedIdleBrowse(40);
  // Último mensaje = panel (staff) hace ~45 min — bot_paused_at null a propósito
  const panelAt = new Date(Date.now() - 45 * 60 * 1000).toISOString();
  await supabase.from("wa_messages").insert({
    phone: PHONE,
    direction: "out",
    msg_type: "text",
    content: "Para que día deseas agendar? Softgel + Pedicure",
    created_at: panelAt,
    source: "panel",
  });
  await supabase
    .from("whatsapp_sessions")
    .update({
      bot_paused_at: null,
      browse_reengage_sent_at: null,
      step: "browsing",
      cart_items: "[]",
      updated_at: panelAt,
    })
    .eq("phone", PHONE);

  const since = new Date().toISOString();
  const result = await invoke({ bypassHours: true });
  await sleep(2000);
  const outbound = await fetchOutboundSince(since);
  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const fails = [];
  if ((result?.sent ?? 0) > 0) fails.push(`sent=${result.sent} (esperado 0)`);
  if (outbound.length > 0) fails.push(`out: ${joined.slice(0, 120)}`);

  const pass = fails.length === 0;
  logCaseResult("H panel OUT → no reengage", {
    pass,
    fails,
    outboundCount: outbound.length,
    haikuCount: 0,
  }, outbound);
  return {
    name: "H panel OUT reciente (Merillyn)",
    pass,
    note: pass ? "skip staff panel" : fails.join("; "),
  };
}

async function main() {
  console.log("=== QA browse-reengage —", PHONE, "===");
  const results = [];
  results.push(await caseA());
  results.push(await caseB());
  results.push(await caseC());
  results.push(await caseD());
  results.push(await caseE());
  results.push(await caseF());
  results.push(await caseG());
  results.push(await caseH());
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  console.log("\nCleanup QA OK");
  finishAndExit(results);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  } catch {
    /* ignore */
  }
  process.exit(1);
});
