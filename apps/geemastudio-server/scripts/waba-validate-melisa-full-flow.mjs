#!/usr/bin/env node
/**
 * QA — replay COMPLETO del chat real de Melisa Quilca Prado …9414 (27-sep-2026),
 * burbuja por burbuja (solo los mensajes IN, en el mismo orden y con gaps
 * similares), contra el webhook YA con los fixes de PR #150:
 *   1) index.ts: msgType "button" espera turno de despacho (no corre en
 *      paralelo con el burst de texto).
 *   2) dispatcher.ts: step "completed" ya no dispara sendMenuWithPromos ante
 *      cualquier texto no reconocido (solo con la palabra "menu"/"menú").
 *
 * Objetivo: confirmar que TODO el flujo (oferta de retoque → cambio a
 * Extensiones → selección de fibra/fecha/hora → confirmación → tap duplicado
 * de hora → "Ok"/"No" post-cierre) corre limpio de principio a fin, sin el
 * cruce de servicios (Depilación/Cejas ajenos) ni el menú duplicado que
 * salieron en el chat real.
 *
 * Teléfono QA: 51999000984 (rango 51999000978-999)
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
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import { sleep } from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000984";
const TENANT_ID = "zm-lash-nails";
const CONTACT = "QA Melisa FullFlow";

/** Servicios reales (verificados en BD, 27-sep-2026) */
const RETOUCH_SVC = "af7491a3-8e7e-4683-ba97-459551b9f99a"; // Retiro de Pestañas (S/20)
const BABYVOL_3D_SVC = "9d36f228-9c3e-4ef1-8804-c125aa92e863"; // Baby Vol. Tecnológica 3D (S/100)

// Lunes lejano al de la cita REAL de Melisa (2026-09-28, ya ocupada en prod
// con su Baby Vol 3D real) — evita falso negativo de "no hay cupo" por
// choque con esa cita legítima, no relacionada al bug bajo prueba.
const DATE_KEY = "2026-10-05";
const DATE_TITLE = "Lun 5 oct";
const TIME_ID = `time_${DATE_KEY}T1100`;
const TIME_TITLE = "11:00 AM";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

const FULL_MENU_RE = /Especialistas en extensiones, lifting, uñas, cejas/i;
const DEPILACION_RE = /depilaci[oó]n/i;
const NO_CUPO_VIERNES_RE = /Viernes 21 de agosto/i;

const timeline = [];
function log(label, extra = "") {
  const t = ((Date.now() - t0) / 1000).toFixed(1).padStart(6, " ");
  console.log(`  +${t}s  ${label}${extra ? "  " + extra : ""}`);
}

async function fetchOutSince(sinceIso) {
  const { data, error } = await supabase
    .from("wa_messages")
    .select("direction, msg_type, content, created_at")
    .eq("phone", PHONE)
    .eq("direction", "out")
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`wa_messages: ${error.message}`);
  return data ?? [];
}

/** Espera hasta que no llegue nada nuevo por `idleMs`, con tope `maxMs`. */
async function waitIdle(sinceIso, opts = {}) {
  const { idleMs = 6000, maxMs = 35000, pollMs = 1500 } = opts;
  const deadline = Date.now() + maxMs;
  let lastCount = -1;
  let lastChangeAt = Date.now();
  let outbound = [];
  while (Date.now() < deadline) {
    outbound = await fetchOutSince(sinceIso);
    if (outbound.length !== lastCount) {
      lastCount = outbound.length;
      lastChangeAt = Date.now();
    }
    if (outbound.length > 0 && Date.now() - lastChangeAt >= idleMs) break;
    await sleep(pollMs);
  }
  return outbound;
}

async function step(label, payload, opts = {}) {
  const since = new Date().toISOString();
  log(`→ IN`, label);
  const status = await postWebhook(webhookUrl, payload);
  if (status !== 200) log(`  ⚠️ HTTP ${status} en "${label}"`);
  const outbound = await waitIdle(since, opts);
  for (const m of outbound) {
    log(`  OUT(${m.msg_type})`, (m.content ?? "").replace(/\n/g, " | ").slice(0, 150));
    timeline.push(m);
  }
  if (outbound.length === 0) log("  (sin respuesta en la ventana de espera)");
  return outbound;
}

async function seedOfferSession() {
  const past = new Date();
  past.setDate(past.getDate() - 35);
  const dateStr = past.toISOString().slice(0, 19).replace("T", " ");
  const { data: apt, error } = await supabase
    .from("appointments")
    .insert({
      client_name: CONTACT,
      client_phone: PHONE,
      service_id: RETOUCH_SVC,
      service_ids: [RETOUCH_SVC],
      date: dateStr,
      duration: 30,
      price: "20.00",
      status: "completed",
    })
    .select("id")
    .single();
  if (error) throw new Error(`seed apt: ${error.message}`);
  await supabase.from("appointment_services").insert({
    appointment_id: apt.id,
    service_id: RETOUCH_SVC,
    price: "20.00",
    duration: 30,
  });

  await supabase.from("whatsapp_sessions").upsert(
    {
      phone: PHONE,
      tenant_id: TENANT_ID,
      step: "browsing",
      cart_items: "[]",
      cart_service_ids: "[]",
      employee_assignments: "{}",
      retouch_offer_service_id: RETOUCH_SVC,
      retouch_offer_source: "manual",
      retouch_offer_sent_at: new Date().toISOString(),
      retouch_offer_last_appointment_id: apt.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,phone" },
  );
}

const t0 = Date.now();

async function main() {
  console.log("=== QA replay COMPLETO — chat Melisa …9414 (27-sep-2026) ===");
  const fails = [];

  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await sleep(1000);
  await ensureQaClient(supabase, PHONE, CONTACT);
  await seedOfferSession();
  await sleep(500);

  // ── Burbujas 1-3: burst + tap plantilla (ya validado en race-replay, se repite aquí
  //    como parte del flujo completo) ──
  console.log("\n── Burbujas 1-3: saludo + pedido + tap 'Agendar' plantilla ──");
  const since123 = new Date().toISOString();
  log("→ IN", "'Buenos dias'");
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "Buenos dias", {
      wamid: newWamid("wamid.qa.full.1"),
      contactName: CONTACT,
    }),
  );
  await sleep(1500);
  log("→ IN", "'Una cita para mañana'");
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "Una cita para mañana", {
      wamid: newWamid("wamid.qa.full.2"),
      contactName: CONTACT,
    }),
  );
  await sleep(4500);
  log("→ IN", "tap 'Agendar' (retoque_reenganche_zm)");
  await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Agendar", {
      payload: "Agendar",
      wamid: newWamid("wamid.qa.full.3"),
      contactName: CONTACT,
    }),
  );
  const out123 = await waitIdle(since123, { idleMs: 6000, maxMs: 35000 });
  for (const m of out123) {
    log(`  OUT(${m.msg_type})`, (m.content ?? "").replace(/\n/g, " | ").slice(0, 150));
    timeline.push(m);
  }
  const text123 = out123.map((m) => m.content ?? "").join("\n");
  if (DEPILACION_RE.test(text123)) {
    fails.push("Burbujas 1-3: mencionó Depilación (cruce de servicio ajeno)");
  }
  if (NO_CUPO_VIERNES_RE.test(text123)) {
    fails.push("Burbujas 1-3: coló el bug 'Viernes 21 de agosto sin cupo'");
  }
  if (out123.length === 0) {
    fails.push("Burbujas 1-3: sin respuesta alguna");
  }

  // ── Burbuja 4: cambia de servicio (retoque → Extensiones nuevas) ──
  console.log("\n── Burbuja 4: 'Extensiones de pestañas' (cambio de servicio) ──");
  const out4 = await step(
    "'Extensiones de pestañas'",
    buildTextPayload(PHONE, "Extensiones de pestañas", {
      wamid: newWamid("wamid.qa.full.4"),
      contactName: CONTACT,
    }),
    { idleMs: 5000, maxMs: 25000 },
  );
  const text4 = out4.map((m) => m.content ?? "").join("\n");
  if (!/extensiones|clásicas|baby vol|fibra/i.test(text4)) {
    fails.push("Burbuja 4: no mostró opciones de Extensiones");
  }
  if (DEPILACION_RE.test(text4)) {
    fails.push("Burbuja 4: mencionó Depilación (cruce de servicio ajeno)");
  }

  // ── Burbuja 5: selecciona día Lun 28 sep ──
  console.log("\n── Burbuja 5: tap fecha 'Lun 28 sep' ──");
  await step(
    DATE_TITLE,
    buildInteractivePayload(PHONE, `date_${DATE_KEY}`, DATE_TITLE, {
      wamid: newWamid("wamid.qa.full.5"),
      contactName: CONTACT,
    }),
    { idleMs: 4000, maxMs: 20000 },
  );

  // ── Burbuja 6: elige fibra "3d" (texto libre) ──
  console.log("\n── Burbuja 6: '3d' (elección de fibra) ──");
  const out6 = await step(
    "'3d'",
    buildTextPayload(PHONE, "3d", {
      wamid: newWamid("wamid.qa.full.6"),
      contactName: CONTACT,
    }),
    { idleMs: 4000, maxMs: 20000 },
  );
  const text6 = out6.map((m) => m.content ?? "").join("\n");
  if (!/baby vol.*3d|3d.*baby vol/i.test(text6.toLowerCase())) {
    fails.push("Burbuja 6: no reconoció '3d' como Baby Vol. Tecnológica 3D");
  }

  // ── Burbuja 7: tap hora 11:00 AM ──
  console.log("\n── Burbuja 7: tap hora '11:00 AM' ──");
  const out7 = await step(
    TIME_TITLE,
    buildInteractivePayload(PHONE, TIME_ID, TIME_TITLE, {
      wamid: newWamid("wamid.qa.full.7"),
      contactName: CONTACT,
    }),
    { idleMs: 5000, maxMs: 25000 },
  );
  const text7 = out7.map((m) => m.content ?? "").join("\n");
  if (!/anotada|confirm|agendad/i.test(text7)) {
    fails.push("Burbuja 7: no confirmó la cita tras elegir hora");
  }

  // ── Burbuja 8: tap DUPLICADO de la misma hora (llegó tarde en el chat real) ──
  console.log("\n── Burbuja 8: tap DUPLICADO '11:00 AM' (idempotencia) ──");
  await step(
    `${TIME_TITLE} (duplicado)`,
    buildInteractivePayload(PHONE, TIME_ID, TIME_TITLE, {
      wamid: newWamid("wamid.qa.full.8"),
      contactName: CONTACT,
    }),
    { idleMs: 5000, maxMs: 20000 },
  );
  const { count: scheduledCount } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("client_phone", PHONE)
    .eq("status", "scheduled");
  if ((scheduledCount ?? 0) !== 1) {
    fails.push(
      `Burbuja 8: se esperaba 1 cita scheduled, hay ${scheduledCount} (posible doble reserva)`,
    );
  } else {
    log("  ✓ 1 sola cita scheduled (sin doble reserva)");
  }

  // ── Burbuja 9: "Ok" post-confirmación (bug real: reabría el menú) ──
  console.log("\n── Burbuja 9: 'Ok' (post-cierre) ──");
  const out9 = await step(
    "'Ok'",
    buildTextPayload(PHONE, "Ok", {
      wamid: newWamid("wamid.qa.full.9"),
      contactName: CONTACT,
    }),
    { idleMs: 6000, maxMs: 30000 },
  );
  const text9 = out9.map((m) => m.content ?? "").join("\n");
  if (FULL_MENU_RE.test(text9)) {
    fails.push("Burbuja 9: 'Ok' reabrió el catálogo completo (bug no resuelto)");
  }

  await sleep(4000);

  // ── Burbuja 11: "No" post-confirmación (mismo bug, 2ª vez en el chat real) ──
  console.log("\n── Burbuja 11: 'No' (post-cierre) ──");
  const out11 = await step(
    "'No'",
    buildTextPayload(PHONE, "No", {
      wamid: newWamid("wamid.qa.full.11"),
      contactName: CONTACT,
    }),
    { idleMs: 6000, maxMs: 35000 },
  );
  const text11 = out11.map((m) => m.content ?? "").join("\n");
  if (FULL_MENU_RE.test(text11)) {
    fails.push("Burbuja 11: 'No' reabrió el catálogo completo (bug no resuelto)");
  }

  // ── Estado final ──
  const { data: sessFinal } = await supabase
    .from("whatsapp_sessions")
    .select("step, cart_items")
    .eq("phone", PHONE)
    .maybeSingle();
  const { data: aptFinal } = await supabase
    .from("appointments")
    .select("service_id, date, status, price")
    .eq("client_phone", PHONE)
    .eq("status", "scheduled")
    .maybeSingle();

  console.log("\n── Estado final ──");
  console.log(`  session.step: ${sessFinal?.step}`);
  console.log(
    `  cita scheduled: service_id=${aptFinal?.service_id} date=${aptFinal?.date} price=${aptFinal?.price}`,
  );
  if (aptFinal?.service_id !== BABYVOL_3D_SVC) {
    fails.push(
      `Cita final con servicio incorrecto: esperado Baby Vol 3D (${BABYVOL_3D_SVC}), obtuvo ${aptFinal?.service_id}`,
    );
  }

  console.log("\n── Resumen ──");
  if (fails.length === 0) {
    console.log("  ✅ Flujo completo limpio — sin cruces de servicio ni menú duplicado.");
  } else {
    for (const f of fails) console.log(`  ❌ ${f}`);
  }

  if (process.env.QA_KEEP_DATA !== "1") {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  } else {
    console.log("\n(QA_KEEP_DATA=1 — se deja el teléfono sin limpiar)");
  }
  process.exit(fails.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  if (process.env.QA_KEEP_DATA !== "1") {
    cleanupQaPhone(supabase, PHONE, { deleteClient: true }).finally(() =>
      process.exit(1),
    );
  } else {
    process.exit(1);
  }
});
