#!/usr/bin/env node
/**
 * QA — verifica el root cause del "menú x2" en el chat real de Melisa
 * Quilca Prado …9414 (27-sep-2026): en step "completed" (cita ya agendada),
 * escribió "Ok" y luego "No" y AMBOS abrieron el catálogo completo
 * (sendMenuWithPromos) — el mismo bug de fallback ya corregido en PR #150
 * (dispatcher.ts). Este script repite las DOS frases exactas contra el
 * webhook ya desplegado con el fix, para confirmar que ninguna reabre el
 * menú completo.
 *
 * Teléfono QA: 51999000982 (rango 51999000978-999)
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import { buildTextPayload, postWebhook, newWamid } from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { seedScheduledAppointment } from "./lib/waba-sim-seed.mjs";
import { sleep, pollOutboundSince } from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000982";
const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

const FULL_MENU_RE = /Especialistas en extensiones, lifting, uñas, cejas/i;

async function tryPhrase(phrase, label) {
  console.log(`\n── "${phrase}" en step completed ──`);
  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, phrase, {
      wamid: newWamid(`wamid.qa.menux2.${label}`),
      contactName: "QA Melisa MenuX2",
    }),
  );
  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    // Coalescing de texto (COALESCE_WINDOW_MS~4.5s) + despacho puede tardar
    // ~10s en la práctica (verificado empíricamente) — 15s daba falso
    // negativo (0 outbound) sin que fuera un bug real.
    timeoutMs: 25000,
  });
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const hasList = outbound.some((m) => m.msg_type === "interactive");
  const reopenedFullMenu = FULL_MENU_RE.test(text) || hasList;
  console.log(`  OUT (${outbound.length}):`);
  for (const m of outbound) {
    console.log(`    [${m.msg_type}] ${(m.content ?? "").slice(0, 150)}`);
  }
  console.log(
    reopenedFullMenu
      ? "  ❌ Reabrió el catálogo completo"
      : "  ✅ No reabrió el catálogo completo",
  );
  return !reopenedFullMenu;
}

async function main() {
  console.log("=== QA menú x2 (caso Melisa …9414) ===");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await sleep(1000);
  await seedScheduledAppointment(supabase, PHONE, {
    clientName: "QA Melisa MenuX2",
    date: "2026-09-28 11:00:00",
  });
  await sleep(500);

  const okPass = await tryPhrase("Ok", "ok");
  // Dar más margen entre frases: la primera aún puede tener el turno de
  // despacho/coalescing ocupado (dispatch_inflight TTL 30s) y retrasar la
  // segunda más allá de lo esperado si se manda muy pegada.
  await sleep(8000);
  const noPass = await tryPhrase("No", "no");

  console.log("\n── Resumen ──");
  console.log(`  ${okPass ? "✅" : "❌"} "Ok" no reabre catálogo`);
  console.log(`  ${noPass ? "✅" : "❌"} "No" no reabre catálogo`);

  if (process.env.QA_KEEP_DATA !== "1") {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  } else {
    console.log("\n(QA_KEEP_DATA=1 — se deja el teléfono sin limpiar)");
  }
  process.exit(okPass && noPass ? 0 : 1);
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
