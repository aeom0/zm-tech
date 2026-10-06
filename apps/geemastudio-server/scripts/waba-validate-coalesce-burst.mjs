#!/usr/bin/env node
/**
 * QW coalescing profundo — análisis 13-ago Loren …4648 (avalancha multi-flujo).
 *
 * 3 textos en ~6s deben coalescerse en UN solo dispatch (≤1 Haiku
 * fallback/recommendation/free_question), no 3 turnos independientes.
 *
 * Tel: 51999000994 (daytime/fixes — cleanup al inicio/fin; no paralelizar).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import { buildTextPayload, postWebhook, newWamid } from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  hashPhone,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000994";
  const NOS_VEMOS_RE = /¡?\s*Nos vemos/i;
const SOFT_LOCK_RE = /Un segundo.*ya te respondo/i;
const HAIKU_DISPATCH_TRIGGERS = new Set([
  "fallback",
  "recommendation",
  "free_question",
]);

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedBrowsing() {
  const { error } = await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(`session: ${error.message}`);
}

async function caseLorenBurstOneDispatch() {
  console.log(
    "\n── Caso A (Loren): 3 msgs en ~6s → ≤1 Haiku dispatch, sin Nos vemos ──",
  );
  await ensureQaClient(supabase, PHONE, "QA Coalesce Burst");
  await seedBrowsing();

  const since = new Date().toISOString();
  const msgs = [
    "Hola, sii el día viernes estoy por ahí",
    "Gracias",
    "😅😅",
  ];
  const delays = [0, 2000, 4000];

  for (let i = 0; i < msgs.length; i++) {
    if (delays[i] > 0) await sleep(delays[i] - (delays[i - 1] ?? 0));
    const status = await postWebhook(
      webhookUrl,
      buildTextPayload(PHONE, msgs[i], {
        wamid: newWamid(`wamid.qa.coalesce.${i}`),
        contactName: "QA Coalesce Burst",
      }),
    );
    console.log(`  msg${i + 1} HTTP ${status} (+${delays[i]}ms)`);
  }

  // Ventana base 4.5s + trailing quietud + Haiku
  await sleep(28000);

  const { data: outbound } = await supabase
    .from("wa_messages")
    .select("content, msg_type, created_at")
    .eq("phone", PHONE)
    .eq("direction", "out")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const { data: haiku } = await supabase
    .from("ai_usage_log")
    .select("trigger_type, created_at")
    .eq("phone_hash", hashPhone(PHONE))
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const dispatchHaiku = (haiku ?? []).filter((h) =>
    HAIKU_DISPATCH_TRIGGERS.has(h.trigger_type),
  );
  const outText = (outbound ?? []).map((m) => m.content ?? "").join("\n");
  const realOut = (outbound ?? []).filter(
    (m) => !SOFT_LOCK_RE.test(m.content ?? ""),
  );
  const fails = [];

  if (dispatchHaiku.length > 1) {
    fails.push(
      `Haiku dispatch ×${dispatchHaiku.length} (esperado ≤1): ${dispatchHaiku.map((h) => h.trigger_type).join(",")}`,
    );
  }
  if (NOS_VEMOS_RE.test(outText)) {
    fails.push("envió «¡Nos vemos!» (cierre contradictorio de avalancha)");
  }
  if (dispatchHaiku.length === 0 && realOut.length === 0) {
    fails.push("sin Haiku ni OUT real (solo soft-lock o silencio)");
  }

  const result = {
    pass: fails.length === 0,
    fails,
    outboundCount: outbound?.length ?? 0,
    haikuCount: dispatchHaiku.length,
  };
  logCaseResult("Coalesce-A Loren burst", result, outbound ?? []);
  console.log(
    `  Haiku dispatch: ${dispatchHaiku.length} · intent_shadow/otros: ${(haiku?.length ?? 0) - dispatchHaiku.length}`,
  );

  return {
    name: "Caso A (ráfaga 3 msgs → 1 dispatch)",
    pass: result.pass,
    note: result.pass
      ? `1 burst OK (Haiku dispatch=${dispatchHaiku.length}, OUT=${result.outboundCount})`
      : fails.join("; "),
  };
}

async function caseCtwaPrecioFollowUp() {
  console.log(
    "\n── Caso B (Shantal 23-sep): copy CTWA + «Precio» a +2s → 1 solo dispatch Haiku ──",
  );
  await ensureQaClient(supabase, PHONE, "QA Coalesce CTWA");
  await seedBrowsing();

  const since = new Date().toISOString();
  const msgs = [
    "¡Hola! Quiero saber qué estilo de pestañas me queda mejor 💜",
    "Precio",
  ];
  for (let i = 0; i < msgs.length; i++) {
    if (i > 0) await sleep(2000);
    const status = await postWebhook(
      webhookUrl,
      buildTextPayload(PHONE, msgs[i], {
        wamid: newWamid(`wamid.qa.coalesce.ctwa.${i}`),
        contactName: "QA Coalesce CTWA",
      }),
    );
    console.log(`  msg${i + 1} HTTP ${status}`);
  }

  // Ventana + trailing + turno + Haiku; margen para que un 2.º dispatch (+8–20s) se vea.
  await sleep(50000);

  const { data: haiku } = await supabase
    .from("ai_usage_log")
    .select("trigger_type, created_at")
    .eq("phone_hash", hashPhone(PHONE))
    .gte("created_at", since)
    .order("created_at", { ascending: true });
  const { data: outbound } = await supabase
    .from("wa_messages")
    .select("content, msg_type, created_at")
    .eq("phone", PHONE)
    .eq("direction", "out")
    .gte("created_at", since)
    .order("created_at", { ascending: true });

  const dispatchHaiku = (haiku ?? []).filter((h) =>
    HAIKU_DISPATCH_TRIGGERS.has(h.trigger_type),
  );
  const fails = [];
  if (dispatchHaiku.length > 1) {
    fails.push(
      `Haiku dispatch ×${dispatchHaiku.length} (esperado ≤1): ${dispatchHaiku.map((h) => h.trigger_type).join(",")}`,
    );
  }
  const agendoQuestions = (outbound ?? []).filter((m) =>
    /¿le agendo/i.test(m.content ?? ""),
  ).length;
  if (agendoQuestions > 1) {
    fails.push(`${agendoQuestions} preguntas «¿le agendo…?» contradictorias`);
  }
  const result = {
    pass: fails.length === 0,
    fails,
    outboundCount: outbound?.length ?? 0,
    haikuCount: dispatchHaiku.length,
  };
  logCaseResult("Coalesce-B CTWA + Precio", result, outbound ?? []);
  return {
    name: "Caso B (CTWA + «Precio» → 1 dispatch)",
    pass: result.pass,
    note: result.pass
      ? `OK (Haiku dispatch=${dispatchHaiku.length}, OUT=${result.outboundCount})`
      : fails.join("; "),
  };
}

async function main() {
  console.log("Validación coalesce burst (Loren) — tel:", PHONE);
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await caseLorenBurstOneDispatch());
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
    results.push(await caseCtwaPrecioFollowUp());
  } finally {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
