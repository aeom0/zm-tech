#!/usr/bin/env node
/**
 * QA — tap servicio/pack de lista vieja mid-`awaiting_datetime` (Jessi …6106, 03-sep).
 *
 * Caso A: carrito Pack VIP + selected_day + tap svc_ Baby Vol 3D
 *   → reemplaza carrito, ack "Cambié tu selección", reenvía selector de hora.
 *   Antes: "usa los botones" / silencio y carrito VIP intacto.
 *
 * Tel: 51999000991 (compartido con booking-flow — no paralelizar).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildInteractivePayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import {
  pollOutboundSince,
  assertOutbound,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000991";
/** Pack ZM LASH VIP (carrito inicial, como Jessi). */
const PACK_VIP_ID = "e440201f-f882-4bda-8bf5-18375b9af465";
/** Baby Vol. Tecnológica 3D — tap de lista vieja. */
const BABY_VOL_3D_ID = "9d36f228-9c3e-4ef1-8804-c125aa92e863";

const CHANGE_ACK_RE = /Cambié tu selección|Baby Vol/i;
const USE_BUTTONS_ONLY_RE =
  /Para elegir la hora, usa los \*botones\* de abajo/i;
const TIME_LIST_RE = /\[lista\].*hora|¿A qué hora/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

function nextOpenWeekdayKey() {
  const lima = new Date(Date.now() - 5 * 60 * 60 * 1000);
  for (let i = 1; i <= 14; i++) {
    const t = new Date(lima);
    t.setUTCDate(lima.getUTCDate() + i);
    const dow = t.getUTCDay();
    if (dow < 1 || dow > 6) continue;
    const y = t.getUTCFullYear();
    const m = String(t.getUTCMonth() + 1).padStart(2, "0");
    const day = String(t.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return "2026-09-10";
}

async function seedVipAwaitingWithDay(dateKey) {
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "awaiting_datetime",
    cart_items: JSON.stringify([
      {
        item_type: "pack",
        item_id: PACK_VIP_ID,
        quantity: 1,
        price: 200,
      },
    ]),
    cart_service_ids: JSON.stringify([]),
    employee_assignments: "{}",
    selected_day: dateKey,
    pending_price_cta_service_id: null,
    pending_price_cta_at: null,
    bot_paused_at: null,
    updated_at: new Date().toISOString(),
  });
}

async function caseSwapToBabyVol() {
  console.log(
    "\n── Jessi-A: awaiting_datetime + Pack VIP + tap Baby Vol 3D → swap ──",
  );
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  const dateKey = nextOpenWeekdayKey();
  await seedVipAwaitingWithDay(dateKey);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildInteractivePayload(
      TEST_PHONE,
      `svc_${BABY_VOL_3D_ID}`,
      "Baby Volumen 3D",
      {
        wamid: newWamid("wamid.qa.jessi.stale"),
        contactName: "QA Jessi Stale",
      },
    ),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 2,
    timeoutMs: 25000,
  });

  const result = assertOutbound(outbound, [], {
    mustMatch: [CHANGE_ACK_RE, TIME_LIST_RE],
    mustNotMatch: [USE_BUTTONS_ONLY_RE],
  });

  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("cart_items, selected_day, step")
    .eq("phone", TEST_PHONE)
    .maybeSingle();

  let cart = [];
  try {
    cart =
      typeof sess?.cart_items === "string"
        ? JSON.parse(sess.cart_items)
        : (sess?.cart_items ?? []);
  } catch {
    cart = [];
  }
  const hasBaby = cart.some(
    (i) => i.item_type === "service" && i.item_id === BABY_VOL_3D_ID,
  );
  const stillVip = cart.some(
    (i) => i.item_type === "pack" && i.item_id === PACK_VIP_ID,
  );
  if (!hasBaby) result.fails.push("carrito no tiene Baby Vol 3D tras el tap");
  if (stillVip) result.fails.push("Pack VIP sigue en el carrito (no hubo swap)");
  if (sess?.selected_day !== dateKey) {
    result.fails.push(
      `selected_day=${sess?.selected_day} (esperado conservar ${dateKey})`,
    );
  }
  if (sess?.step !== "awaiting_datetime") {
    result.fails.push(`step=${sess?.step} (esperado awaiting_datetime)`);
  }
  result.pass = result.fails.length === 0;

  logCaseResult("Jessi-A stale svc tap swap", result, outbound);
  return {
    name: "Jessi-A (stale svc → swap)",
    pass: result.pass,
    note: result.pass
      ? "Carrito Baby Vol + selected_day + hora"
      : result.fails.join("; "),
  };
}

async function main() {
  console.log("Validación Jessi stale service tap — tel:", TEST_PHONE);
  if (!process.env.WABA_VALIDATE_SUITE) await sleep(2000);
  const results = [await caseSwapToBabyVol()];
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
