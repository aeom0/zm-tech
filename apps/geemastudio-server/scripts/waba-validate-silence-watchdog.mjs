#!/usr/bin/env node
/**
 * QA de silence-watchdog:
 * A) browsing sin carrito → mensaje de recuperación + watchdog_sent_at
 * B) awaiting_datetime + carrito → texto + lista "Elegir fecha" (Yesenia 2026-07-11)
 * C) charla cerrada sola (ej. "gracias") → NO debe enviar nada (anti-spam Haiku)
 *
 * Invoca la función con CRON_SECRET (sin restricción de horario — el watchdog
 * corre 24/7 desde el fix del 2026-08-02, caso Lucía Landa: inbound de
 * madrugada que antes quedaba huérfano por la gate de horario).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import { sleep } from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000984";
/** Rubber + Efecto Cat Eye — mismo ID que booking QA */
const RUBBER_SVC_ID = "0c2bbfa6-807a-4a48-b519-ece0c739ddd2";
const DATE_LIST_RE = /\[lista\] Elegir fecha:/i;

const { url, serviceKey, cronSecret } = loadEnvFromRoot();
const watchdogUrl = `${url}/functions/v1/silence-watchdog`;
if (!cronSecret) {
  throw new Error(
    "Falta CRON_SECRET en .env — necesario para invocar silence-watchdog directamente",
  );
}
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedStaleInboundBrowsing() {
  await ensureQaClient(supabase, PHONE, "QA Silence Watchdog");
  const sevenMinAgo = new Date(Date.now() - 7 * 60 * 1000).toISOString();

  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    watchdog_sent_at: null,
    updated_at: sevenMinAgo,
  });

  await supabase.from("wa_messages").insert({
    phone: PHONE,
    direction: "in",
    msg_type: "text",
    content: "¿Tienen disponible mañana?",
    created_at: sevenMinAgo,
  });
}

async function seedStaleInboundAwaitingDatetime() {
  await ensureQaClient(supabase, PHONE, "QA Silence Watchdog");
  const sevenMinAgo = new Date(Date.now() - 7 * 60 * 1000).toISOString();

  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "awaiting_datetime",
    cart_items: JSON.stringify([
      {
        item_type: "service",
        item_id: RUBBER_SVC_ID,
        quantity: 1,
        price: 49.9,
      },
    ]),
    cart_service_ids: JSON.stringify([RUBBER_SVC_ID]),
    employee_assignments: "{}",
    selected_day: null,
    watchdog_sent_at: null,
    updated_at: sevenMinAgo,
  });

  await supabase.from("wa_messages").insert({
    phone: PHONE,
    direction: "in",
    msg_type: "text",
    content: "Instagram verdad",
    created_at: sevenMinAgo,
  });
}

async function seedStaleInboundClosedChat() {
  await ensureQaClient(supabase, PHONE, "QA Silence Watchdog");
  const sevenMinAgo = new Date(Date.now() - 7 * 60 * 1000).toISOString();
  const eightMinAgo = new Date(Date.now() - 8 * 60 * 1000).toISOString();
  const nineMinAgo = new Date(Date.now() - 9 * 60 * 1000).toISOString();

  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    watchdog_sent_at: null,
    updated_at: sevenMinAgo,
  });

  // Historial completo: pregunta → respuesta del bot → cierre natural de la
  // clienta. Haiku debe leer esto y decidir needs_response=false.
  await supabase.from("wa_messages").insert([
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content: "¿A qué hora abren mañana?",
      created_at: nineMinAgo,
    },
    {
      phone: PHONE,
      direction: "out",
      msg_type: "text",
      content: "¡Hola! 💜 Abrimos de 10am a 6pm de lunes a sábado.",
      created_at: eightMinAgo,
    },
    {
      phone: PHONE,
      direction: "in",
      msg_type: "text",
      content: "Ah perfecto, muchas gracias 🙏",
      created_at: sevenMinAgo,
    },
  ]);
}

async function invokeWatchdog() {
  const res = await fetch(watchdogUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  const json = await res.json().catch(() => null);
  console.log(`  Invocación silence-watchdog → HTTP ${res.status}`, json);
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

async function caseA() {
  console.log("\n── A: browsing sin carrito → texto recuperación ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedStaleInboundBrowsing();
  const since = new Date().toISOString();
  const result = await invokeWatchdog();
  if (result?.skipped) {
    return {
      name: "A browsing",
      pass: false,
      note: `skipped: ${result.reason}`,
    };
  }
  await sleep(2000);
  const outbound = await fetchOutboundSince(since);
  const { data: session } = await supabase
    .from("whatsapp_sessions")
    .select("watchdog_sent_at")
    .eq("phone", PHONE)
    .maybeSingle();

  for (const m of outbound) {
    console.log(`    · ${(m.content ?? "").slice(0, 120)}`);
  }

  const sentMessage = outbound.length > 0;
  const guardUpdated = !!session?.watchdog_sent_at;
  const pass = sentMessage && guardUpdated;
  console.log(`  Pass: ${pass ? "sí" : "no"}`);
  return {
    name: "A browsing (texto)",
    pass,
    note: pass ? "recuperación OK" : "sin OUT o sin guard",
  };
}

async function caseB() {
  console.log("\n── B: awaiting_datetime + carrito → texto + lista fecha ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedStaleInboundAwaitingDatetime();
  const since = new Date().toISOString();
  const result = await invokeWatchdog();
  if (result?.skipped) {
    return {
      name: "B calendario",
      pass: false,
      note: `skipped: ${result.reason}`,
    };
  }
  await sleep(3000);
  const outbound = await fetchOutboundSince(since);
  const { data: session } = await supabase
    .from("whatsapp_sessions")
    .select("watchdog_sent_at")
    .eq("phone", PHONE)
    .maybeSingle();

  for (const m of outbound) {
    console.log(`    · [${m.msg_type}] ${(m.content ?? "").slice(0, 120)}`);
  }

  const allText = outbound.map((m) => m.content ?? "").join("\n");
  const hasDateList = DATE_LIST_RE.test(allText);
  const calendarsSent = (result?.calendarsSent ?? 0) >= 1;
  const guardUpdated = !!session?.watchdog_sent_at;
  const pass =
    outbound.length >= 2 && hasDateList && guardUpdated && calendarsSent;

  console.log(`  Pass: ${pass ? "sí" : "no"} (lista fecha: ${hasDateList})`);
  return {
    name: "B awaiting_datetime + lista",
    pass,
    note: pass
      ? "texto + calendario"
      : `OUT=${outbound.length} lista=${hasDateList} cal=${calendarsSent} guard=${guardUpdated}`,
  };
}

async function caseC() {
  console.log('\n── C: cierre natural ("gracias") → NO debe responder ──');
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await seedStaleInboundClosedChat();
  const since = new Date().toISOString();
  const result = await invokeWatchdog();
  if (result?.skipped) {
    return {
      name: "C anti-spam",
      pass: false,
      note: `skipped: ${result.reason}`,
    };
  }
  await sleep(2000);
  const outbound = await fetchOutboundSince(since);
  const { data: session } = await supabase
    .from("whatsapp_sessions")
    .select("watchdog_sent_at")
    .eq("phone", PHONE)
    .maybeSingle();

  for (const m of outbound) {
    console.log(`    · ${(m.content ?? "").slice(0, 120)}`);
  }

  // Anti-spam: no debe mandar nada, pero sí debe marcar el episodio como
  // revisado (guard) para no re-evaluarlo en el siguiente tick.
  const noMessageSent = outbound.length === 0;
  const guardUpdated = !!session?.watchdog_sent_at;
  const pass = noMessageSent && guardUpdated;
  console.log(`  Pass: ${pass ? "sí" : "no"}`);
  return {
    name: "C anti-spam (cierre natural)",
    pass,
    note: pass
      ? "correctamente en silencio"
      : `OUT=${outbound.length} guard=${guardUpdated}`,
  };
}

async function main() {
  console.log("QA silence-watchdog — teléfono:", PHONE);
  const results = [];
  try {
    results.push(await caseA());
    await sleep(3000);
    results.push(await caseB());
    await sleep(3000);
    results.push(await caseC());
  } finally {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  }

  console.log("\n── Resumen ──");
  let allPass = true;
  for (const r of results) {
    console.log(`  ${r.pass ? "✅" : "❌"} ${r.name}: ${r.note}`);
    if (!r.pass) allPass = false;
  }
  process.exit(allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
