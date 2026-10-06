#!/usr/bin/env node
/**
 * QA — replay exacto del caso Melisa Quilca Prado …9414 (27-sep-2026):
 * ráfaga de texto ("Buenos dias" + "Una cita para mañana") seguida ~6s
 * después por el tap de "Agendar" en la plantilla retoque_reenganche_zm,
 * contra el webhook YA con los dos fixes de PR #150:
 *   1) index.ts: msgType "button" también espera turno de despacho
 *      (waitAndClaimDispatchTurn) — ya no corre en paralelo con el burst.
 *   2) dispatcher.ts: step "completed" ya no dispara sendMenuWithPromos
 *      ante cualquier texto no reconocido (solo con la palabra "menu"/"menú").
 *
 * Este script NO hace pass/fail estricto — solo reproduce la secuencia real
 * y vuelca en orden cronológico qué respondió el webhook (bot vs Haiku, por
 * msg_type/contenido) para verificar empíricamente el comportamiento post-fix.
 *
 * Teléfono QA: 51999000981 (rango 51999000978-999, memoria feedback_waba_qa_phone_range.md)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  buildButtonPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import { sleep } from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000981";
const TENANT_ID = "zm-lash-nails";
/** Baby Vol. Tecnológica 3D (servicio real de la cita de Melisa, 27-sep-2026) */
const OFFER_SVC = "1e15a516-95b1-4be3-bc0d-88f530bc6011";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedCompletedVisit(clientId) {
  const past = new Date();
  past.setDate(past.getDate() - 35);
  const dateStr = past.toISOString().slice(0, 19).replace("T", " ");
  const { data: apt, error } = await supabase
    .from("appointments")
    .insert({
      client_id: clientId,
      client_name: "QA Melisa Replay",
      client_phone: PHONE,
      service_id: OFFER_SVC,
      service_ids: [OFFER_SVC],
      date: dateStr,
      duration: 90,
      price: "100.00",
      status: "completed",
    })
    .select("id")
    .single();
  if (error) throw new Error(`seed apt: ${error.message}`);
  await supabase.from("appointment_services").insert({
    appointment_id: apt.id,
    service_id: OFFER_SVC,
    price: "100.00",
    duration: 90,
  });
  return apt.id;
}

async function seedOfferSession(lastAptId) {
  await supabase.from("whatsapp_sessions").upsert(
    {
      phone: PHONE,
      tenant_id: TENANT_ID,
      step: "browsing",
      cart_items: "[]",
      cart_service_ids: "[]",
      employee_assignments: "{}",
      retouch_offer_service_id: OFFER_SVC,
      retouch_offer_source: "manual",
      retouch_offer_sent_at: new Date().toISOString(),
      retouch_offer_last_appointment_id: lastAptId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,phone" },
  );
}

async function fetchAllSince(sinceIso) {
  const { data, error } = await supabase
    .from("wa_messages")
    .select("direction, msg_type, content, step_before, created_at")
    .eq("phone", PHONE)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`wa_messages: ${error.message}`);
  return data ?? [];
}

async function fetchHaikuSince(sinceIso) {
  const crypto = await import("node:crypto");
  const phoneHash = crypto
    .createHash("sha256")
    .update(PHONE)
    .digest("hex")
    .slice(0, 8);
  const { data, error } = await supabase
    .from("ai_usage_log")
    .select("trigger_type, input_tokens, output_tokens, created_at")
    .eq("phone_hash", phoneHash)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`ai_usage_log: ${error.message}`);
  return data ?? [];
}

async function fetchErrorsSince(sinceIso) {
  const { data, error } = await supabase
    .from("wa_error_log")
    .select("step, msg_type, error_message, created_at")
    .eq("phone", PHONE)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`wa_error_log: ${error.message}`);
  return data ?? [];
}

function printTimeline(rows, haiku, errors, t0) {
  const events = [
    ...rows.map((r) => ({
      t: new Date(r.created_at).getTime(),
      kind: r.direction === "in" ? "IN" : `OUT(${r.msg_type})`,
      text: (r.content ?? "").slice(0, 160),
    })),
    ...haiku.map((h) => ({
      t: new Date(h.created_at).getTime(),
      kind: `HAIKU(${h.trigger_type})`,
      text: `in=${h.input_tokens} out=${h.output_tokens}`,
    })),
    ...errors.map((e) => ({
      t: new Date(e.created_at).getTime(),
      kind: `ERROR(${e.step}/${e.msg_type})`,
      text: e.error_message,
    })),
  ].sort((a, b) => a.t - b.t);

  console.log("\n── Línea de tiempo (orden cronológico real) ──");
  for (const ev of events) {
    const dt = ((ev.t - t0) / 1000).toFixed(1).padStart(6, " ");
    console.log(`  +${dt}s  ${ev.kind.padEnd(16)} ${ev.text}`);
  }
  if (!events.length) console.log("  (sin filas)");
}

async function main() {
  console.log("=== QA replay Melisa: ráfaga texto + tap Agendar plantilla ===");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await sleep(1000);
  const clientId = await ensureQaClient(supabase, PHONE, "QA Melisa Replay");
  const aptId = await seedCompletedVisit(clientId);
  await seedOfferSession(aptId);
  await sleep(500);

  const t0 = Date.now();
  const since = new Date(t0).toISOString();

  // 1) "Buenos dias"
  console.log("\n[t+0.0s] → texto: 'Buenos dias'");
  const s1 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "Buenos dias", {
      wamid: newWamid("wamid.qa.melisa.1"),
      contactName: "QA Melisa Replay",
    }),
  );
  console.log(`  HTTP ${s1}`);

  // 2) "Una cita para mañana" ~1.5s después (mismo burst — dentro de la
  //    ventana de coalescing COALESCE_WINDOW_MS=4500ms)
  await sleep(1500);
  console.log("[t+1.5s] → texto: 'Una cita para mañana'");
  const s2 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "Una cita para mañana", {
      wamid: newWamid("wamid.qa.melisa.2"),
      contactName: "QA Melisa Replay",
    }),
  );
  console.log(`  HTTP ${s2}`);

  // 3) Tap "Agendar" de la plantilla retoque_reenganche_zm ~6s después del
  //    primer texto (igual que el caso real: tocó el botón mientras el burst
  //    de texto seguía coalesciendo/despachando)
  await sleep(4500);
  console.log("[t+6.0s] → botón plantilla: 'Agendar' (retoque_reenganche_zm)");
  const s3 = await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Agendar", {
      payload: "Agendar",
      wamid: newWamid("wamid.qa.melisa.3"),
      contactName: "QA Melisa Replay",
    }),
  );
  console.log(`  HTTP ${s3}`);

  // Esperar a que todo el procesamiento asíncrono (coalescing + dispatch-turn
  // + Haiku) termine. Dar margen generoso: burst puede tardar hasta
  // COALESCE_MAX_MS=9s en cerrar, más el tap que ahora espera turno, más Haiku.
  console.log("\n(esperando ~35s a que termine todo el procesamiento async…)");
  await sleep(35000);

  const rows = await fetchAllSince(since);
  const haiku = await fetchHaikuSince(since);
  const errors = await fetchErrorsSince(since);
  printTimeline(rows, haiku, errors, t0);

  const { data: sessFinal } = await supabase
    .from("whatsapp_sessions")
    .select("step, cart_items, retouch_offer_service_id")
    .eq("phone", PHONE)
    .maybeSingle();
  let cartFinal = [];
  try {
    cartFinal = JSON.parse(sessFinal?.cart_items ?? "[]");
  } catch {
    /* ignore */
  }
  console.log("\n── Estado final de sesión ──");
  console.log(`  step: ${sessFinal?.step}`);
  console.log(`  retouch_offer_service_id: ${sessFinal?.retouch_offer_service_id ?? "(limpia)"}`);
  console.log(`  cart_items: ${JSON.stringify(cartFinal)}`);

  const outOnly = rows.filter((r) => r.direction === "out");
  console.log("\n── Resumen ──");
  console.log(`  Mensajes OUT totales: ${outOnly.length}`);
  console.log(`  Llamadas a Haiku: ${haiku.length}`);
  console.log(`  Errores en wa_error_log: ${errors.length}`);
  if (errors.length) {
    console.log("  ⚠️  Hubo errores durante el replay — revisar arriba.");
  }

  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  cleanupQaPhone(supabase, PHONE, { deleteClient: true }).finally(() =>
    process.exit(1),
  );
});
