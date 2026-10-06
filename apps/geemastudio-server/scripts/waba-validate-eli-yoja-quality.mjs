#!/usr/bin/env node
/**
 * QA chat-quality-review — recrea fallos Eli / Yoja (02-ago-2026).
 *
 * A) Eli: pidió Rubber + pies en gel / precio; bot dejó Cat Eye en carrito y
 *    empujó calendario → debe alertar (unanswered_price / cart_mismatch).
 * B) Yoja: citó promo 15%; bot metió pack + pedicure (doble cobro) y no dijo
 *    precio → debe alertar (promo_ignored / cart_mismatch / client_confused).
 * C) Control: chat limpio precio+carrito correcto → NO debe alertar.
 *
 * Tel: 51999000986. Invoca Edge con include_qa=true (prod cron no incluye QA).
 * Push a staff se omite por isQaWaPhone; se valida alerted + quality_review_sent_at.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import { finishAndExit, logCaseResult, sleep } from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000986";
/** Rubber + Efecto Cat Eye (lo que el bot le puso a Eli por error) */
const RUBBER_CAT_EYE_ID = "0c2bbfa6-807a-4a48-b519-ece0c739ddd2";
/** Pack Manos en Gel + Pies en Gel */
const PACK_MANOS_PIES_ID = "cbc8e3f1-2da1-4e69-8db6-086c166d5337";
/** Pedicure en Gel (duplicado en caso Yoja) */
const PEDICURE_GEL_ID = "2aea9ef5-ad2d-433e-a5eb-8186b903afae";

const { url, serviceKey, cronSecret } = loadEnvFromRoot();
if (!cronSecret) {
  throw new Error("Falta CRON_SECRET en .env");
}
const reviewUrl = `${url}/functions/v1/chat-quality-review`;
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function ago(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

async function invokeReview() {
  const res = await fetch(reviewUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ include_qa: true }),
  });
  const json = await res.json().catch(() => null);
  console.log(`  Invocación chat-quality-review → HTTP ${res.status}`, json);
  return { status: res.status, json };
}

async function seedMsgs(rows) {
  const { error } = await supabase.from("wa_messages").insert(rows);
  if (error) throw new Error("seed msgs: " + error.message);
}

async function upsertSession(fields) {
  const { error } = await supabase.from("whatsapp_sessions").upsert(
    {
      phone: PHONE,
      employee_assignments: "{}",
      quality_review_sent_at: null,
      updated_at: ago(8),
      ...fields,
    },
    { onConflict: "phone" },
  );
  if (error) throw new Error("session: " + error.message);
}

/** A — Eli: precio de Rubber+pies; carrito Cat Eye; calendario en loop */
async function caseEli() {
  console.log("\n── A: Eli — precio Rubber+pies / carrito Cat Eye ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await ensureQaClient(supabase, PHONE, "QA Eli Quality");

  await upsertSession({
    step: "awaiting_datetime",
    cart_items: JSON.stringify([
      {
        item_type: "service",
        item_id: RUBBER_CAT_EYE_ID,
        quantity: 1,
        price: 55,
      },
    ]),
    cart_service_ids: JSON.stringify([RUBBER_CAT_EYE_ID]),
  });

  await seedMsgs([
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content:
        "Hola, vi el 15% de descuento en manos y pies y quiero agendar mi cita",
      created_at: ago(25),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content: "¡Hola, Eli! Te muestro opciones de uñas 👇",
      created_at: ago(24),
    },
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content: "Quiero rubber en manos y gel en los pies",
      created_at: ago(18),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content:
        "🛒 *Tu elección:*\n• Rubber + Efecto Cat Eye — S/ 55.00\n*Total: S/ 55.00*\n📅 ¿Qué día prefieres?",
      created_at: ago(17),
    },
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content:
        "Quiero saber el precio y que incluye? Color entero, francesa, efecto cat eye .... Eso es lo que quiero saber",
      created_at: ago(12),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content:
        "Ya tienes eso en tu elección 💜 ¿Qué día y hora te quedan bien?",
      created_at: ago(11),
    },
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content: "Cuanto sale la promoción? Rubber en manos y gel en pies",
      created_at: ago(9),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "interactive",
      content: "[lista] Elegir fecha: ¿Qué día prefieres?",
      created_at: ago(8),
    },
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content: "Y hasta ahora no tengo respuesta",
      created_at: ago(7),
    },
  ]);

  const { status, json } = await invokeReview();
  await sleep(500);
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("quality_review_sent_at")
    .eq("phone", PHONE)
    .maybeSingle();

  const alerted = (json?.alerted ?? 0) >= 1;
  const reviewed = (json?.reviewed ?? 0) >= 1;
  const marked = !!sess?.quality_review_sent_at;
  const pass = status === 200 && reviewed && alerted && marked;

  logCaseResult(
    "Eli precio/carrito",
    {
      pass,
      fails: pass
        ? []
        : [
            !reviewed ? "no reviewed" : "",
            !alerted ? "no alerted (esperado ≥1)" : "",
            !marked ? "sin quality_review_sent_at" : "",
          ].filter(Boolean),
      outboundCount: 0,
      haikuCount: 0,
    },
    [],
  );

  return {
    name: "A Eli (precio + carrito Cat Eye)",
    pass,
    note: pass
      ? `alerted=${json?.alerted}`
      : `alerted=${json?.alerted} reviewed=${json?.reviewed}`,
  };
}

/** B — Yoja: promo 15% + carrito pack+pedicure + “por qué no dice” */
async function caseYoja() {
  console.log("\n── B: Yoja — promo 15% + carrito doble + confundida ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await ensureQaClient(supabase, PHONE, "QA Yoja Quality");

  await upsertSession({
    step: "awaiting_datetime",
    cart_items: JSON.stringify([
      {
        item_type: "pack",
        item_id: PACK_MANOS_PIES_ID,
        quantity: 1,
        price: 90,
      },
      {
        item_type: "service",
        item_id: PEDICURE_GEL_ID,
        quantity: 1,
        price: 70,
      },
    ]),
    cart_service_ids: JSON.stringify([PEDICURE_GEL_ID]),
  });

  await seedMsgs([
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content:
        "Hola, vi el 15% de descuento en manos y pies y quiero agendar mi cita 💅",
      created_at: ago(22),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content: "✨ ¡Hola, Yoja! Tenemos servicios perfectos para ti…",
      created_at: ago(21),
    },
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content: "Esto cuanto es el precio?",
      created_at: ago(15),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content:
        "✅ Listo — agregué: Manos en gel + Pies en gel, Pedicure en Gel\n📅 ¿Qué día prefieres?",
      created_at: ago(14),
    },
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content: "Estoy consultando los el precio Porfavor por qué no dice",
      created_at: ago(10),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content:
        "Tienes razón — Manos en Gel + Pies en Gel es S/90 y Pedicure en Gel es S/70 💜 ¿Con cuál de los dos te quedas?",
      created_at: ago(9),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "interactive",
      content: "[lista] Elegir fecha: ¿Qué día prefieres?",
      created_at: ago(8),
    },
  ]);

  const { status, json } = await invokeReview();
  await sleep(500);
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("quality_review_sent_at")
    .eq("phone", PHONE)
    .maybeSingle();

  const alerted = (json?.alerted ?? 0) >= 1;
  const reviewed = (json?.reviewed ?? 0) >= 1;
  const marked = !!sess?.quality_review_sent_at;
  const pass = status === 200 && reviewed && alerted && marked;

  logCaseResult(
    "Yoja promo/carrito/confundida",
    {
      pass,
      fails: pass
        ? []
        : [
            !reviewed ? "no reviewed" : "",
            !alerted ? "no alerted (esperado ≥1)" : "",
            !marked ? "sin quality_review_sent_at" : "",
          ].filter(Boolean),
      outboundCount: 0,
      haikuCount: 0,
    },
    [],
  );

  return {
    name: "B Yoja (promo + carrito dup)",
    pass,
    note: pass
      ? `alerted=${json?.alerted}`
      : `alerted=${json?.alerted} reviewed=${json?.reviewed}`,
  };
}

/** C — control: precio claro + carrito alineado → no alert */
async function caseControl() {
  console.log("\n── C: control — chat limpio sin fallos ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await ensureQaClient(supabase, PHONE, "QA Quality Control");

  await upsertSession({
    step: "awaiting_datetime",
    cart_items: JSON.stringify([
      {
        item_type: "pack",
        item_id: PACK_MANOS_PIES_ID,
        quantity: 1,
        price: 90,
      },
    ]),
    cart_service_ids: JSON.stringify([]),
  });

  await seedMsgs([
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content: "Hola, ¿cuánto sale el pack de manos y pies en gel?",
      created_at: ago(20),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content:
        "El pack Manos en Gel + Pies en Gel es S/90 (120 min). Con el 15% Lun–Mié queda S/75. ¿Te lo agendo?",
      created_at: ago(19),
    },
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content: "Sí, el pack completo porfa",
      created_at: ago(12),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content:
        "✅ Agregué Manos en Gel + Pies en Gel — S/90. ¿Qué día prefieres?",
      created_at: ago(11),
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "interactive",
      content: "[lista] Elegir fecha: ¿Qué día prefieres?",
      created_at: ago(10),
    },
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content: "Martes a las 11 am",
      created_at: ago(8),
    },
  ]);

  const { status, json } = await invokeReview();
  await sleep(500);
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("quality_review_sent_at")
    .eq("phone", PHONE)
    .maybeSingle();

  const alerted = (json?.alerted ?? 0) === 0;
  const reviewed = (json?.reviewed ?? 0) >= 1;
  const marked = !!sess?.quality_review_sent_at;
  const pass = status === 200 && reviewed && alerted && marked;

  logCaseResult(
    "Control chat limpio",
    {
      pass,
      fails: pass
        ? []
        : [
            !reviewed ? "no reviewed" : "",
            !alerted ? `falso positivo alerted=${json?.alerted}` : "",
            !marked ? "sin quality_review_sent_at" : "",
          ].filter(Boolean),
      outboundCount: 0,
      haikuCount: 0,
    },
    [],
  );

  return {
    name: "C control (sin alert)",
    pass,
    note: pass
      ? "sin alerta (correcto)"
      : `alerted=${json?.alerted} reviewed=${json?.reviewed}`,
  };
}

async function main() {
  console.log("QA chat-quality-review Eli/Yoja — tel:", PHONE);
  const results = [];
  try {
    results.push(await caseEli());
    await sleep(2000);
    results.push(await caseYoja());
    await sleep(2000);
    results.push(await caseControl());
  } finally {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
