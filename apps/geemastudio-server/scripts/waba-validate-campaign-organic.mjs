#!/usr/bin/env node
/**
 * QA — Imágenes de campaña en primer contacto orgánico + wording duración cita.
 *
 * Origen: Ideni 06-ago (BSUID sin from_ad; creativo "Mirada de Impacto") +
 * cotización "duran 90 minutos" confusa.
 *
 * Tel: 51999000993 (compartido con effects — no paralelizar)
 *
 * A) isNew + "Hola" (sin referral) → ≥ N imágenes de /panel/waba/campanas
 * B) isNew + copy tipo Ideni (intención, sin referral) → mismas imágenes + no dead-end estático
 * C) Clienta existente + "voy a llegar tarde…" → NO envía creativos de campaña
 * D) Prompt: catálogo/FORMAT prohíben "duran N min" al cotizar (unit sobre fuentes)
 * E) Soft: "cuánto está el rímel" → outbound no contiene "duran 90 minutos" (post-deploy)
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const PHONE = "51999000993";
const LIFTING_ID = "33fbadcc-30e8-4e82-9913-3a888aea73dc";

const MSG_HOLA = "Hola";
const MSG_IDENI =
  "Hola, vi la promo de Mirada de Impacto y quiero agendar mi cita 💜";
const MSG_LATE = "voy a llegar tarde a mi cita";
const MSG_RIMEL = "Cuánto cuesta el rímel de pestañas?";

const SKIP_SALUDO_STATIC_RE =
  /Para agendar, primero elige el servicio o pack/i;
const DURAN_MIN_BAD_RE = /duran\s+\d+\s*min/i;
const CAMPAIGN_CAPTION_RE =
  /mirada de impacto|manos y pies|lifting de pestañas|despierta maquillada/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function countActiveCampaignImages() {
  const keys = [
    "meta_ads_hero_image_url",
    "meta_ads_image_2_url",
    "meta_ads_image_3_url",
    "meta_ads_image_4_url",
  ];
  const { data } = await supabase
    .from("waba_config")
    .select("config_key, config_value, is_active")
    .in("config_key", keys)
    .eq("is_active", true);
  let n = 0;
  for (const row of data ?? []) {
    const u = row.config_value?.url;
    if (typeof u === "string" && u.trim()) n += 1;
  }
  return n;
}

function countOutboundImages(outbound) {
  return outbound.filter((m) => m.msg_type === "image").length;
}

function hasCampaignCaption(outbound) {
  return outbound.some(
    (m) =>
      m.msg_type === "image" &&
      CAMPAIGN_CAPTION_RE.test(String(m.content ?? "")),
  );
}

/** Esperar a que dejen de llegar OUT (waitUntil / Haiku tardío entre casos). */
async function waitOutboundSettle(sinceIso, quietMs = 4500, maxMs = 22000) {
  const deadline = Date.now() + maxMs;
  let lastCount = -1;
  let quietSince = Date.now();
  while (Date.now() < deadline) {
    const { data } = await supabase
      .from("wa_messages")
      .select("id")
      .eq("phone", PHONE)
      .eq("direction", "out")
      .gte("created_at", sinceIso);
    const n = data?.length ?? 0;
    if (n !== lastCount) {
      lastCount = n;
      quietSince = Date.now();
    } else if (Date.now() - quietSince >= quietMs) {
      return;
    }
    await sleep(800);
  }
}

/** isNew: borrar clienta QA + sesión para forzar getOrCreateClient isNew=true. */
async function resetAsNewClient() {
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await sleep(400);
}

async function setupExistingWithAppointment() {
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const { data: client, error: cErr } = await supabase
    .from("clients")
    .insert({
      name: "QA CAMPAIGN EXISTING",
      phone: PHONE,
      phone_country: "PE",
      phone_normalized: PHONE.slice(2),
    })
    .select("id")
    .single();
  if (cErr) throw new Error(`client: ${cErr.message}`);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const y = tomorrow.getFullYear();
  const mo = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const d = String(tomorrow.getDate()).padStart(2, "0");
  const dateLima = `${y}-${mo}-${d} 15:00:00`;

  const { data: appt, error: aErr } = await supabase
    .from("appointments")
    .insert({
      client_id: client.id,
      client_name: "QA CAMPAIGN EXISTING",
      client_phone: PHONE,
      service_id: LIFTING_ID,
      employee_id: "emp-vanessa",
      date: dateLima,
      duration: 60,
      price: "50.00",
      status: "scheduled",
    })
    .select("id")
    .single();
  if (aErr) throw new Error(`appointment: ${aErr.message}`);

  await supabase.from("appointment_services").insert({
    appointment_id: appt.id,
    service_id: LIFTING_ID,
    employee_id: "emp-vanessa",
  });

  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function validateA_OrganicHola(expectedImages) {
  console.log("\n── A: isNew orgánico «Hola» → imágenes campaña ──");
  await resetAsNewClient();
  const since = new Date(Date.now() - 2000).toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, MSG_HOLA, {
      wamid: newWamid("wamid.qa.camp.a"),
      contactName: "QA Campaña Org",
    }),
  );
  console.log("  Webhook HTTP", status);

  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: Math.max(1, expectedImages),
    timeoutMs: 28000,
  });
  const imgs = countOutboundImages(outbound);
  const campaign = hasCampaignCaption(outbound);
  const fails = [];
  if (status !== 200) fails.push(`HTTP ${status}`);
  if (imgs < expectedImages) {
    fails.push(`imgs=${imgs} esperado≥${expectedImages}`);
  }
  if (expectedImages > 0 && !campaign) fails.push("sin caption de campaña");
  const pass = fails.length === 0;
  logCaseResult(
    "Camp-A hola orgánico",
    { pass, fails, outboundCount: outbound.length, haikuCount: 0 },
    outbound,
  );
  await waitOutboundSettle(since);
  return {
    name: "A hola",
    pass,
    note: pass
      ? `${imgs} imagen(es) (esperadas ≥${expectedImages}); caption campaña=${campaign}`
      : fails.join("; "),
  };
}

async function validateB_OrganicIdeni(expectedImages) {
  console.log(
    "\n── B: isNew + copy Ideni (sin referral) → imágenes + no dead-end ──",
  );
  await resetAsNewClient();
  const since = new Date(Date.now() - 2000).toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, MSG_IDENI, {
      wamid: newWamid("wamid.qa.camp.b"),
      contactName: "QA Ideni Org",
      // sin referral → fromAd false
    }),
  );
  console.log("  Webhook HTTP", status);

  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: Math.max(2, expectedImages + 1),
    timeoutMs: 45000,
  });
  const imgs = countOutboundImages(outbound);
  const campaign = hasCampaignCaption(outbound);
  const deadend = outbound.some((m) =>
    SKIP_SALUDO_STATIC_RE.test(String(m.content ?? "")),
  );
  const textOrList = outbound.filter(
    (m) => m.msg_type === "text" || m.msg_type === "interactive",
  ).length;
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("from_ad_at")
    .eq("phone", PHONE)
    .maybeSingle();
  const fails = [];
  if (status !== 200) fails.push(`HTTP ${status}`);
  if (imgs < expectedImages) {
    fails.push(`imgs=${imgs} esperado≥${expectedImages}`);
  }
  if (expectedImages > 0 && !campaign) fails.push("sin caption de campaña");
  if (deadend) fails.push("dead-end estático skipSaludo");
  if (sess?.from_ad_at) fails.push(`from_ad_at=${sess.from_ad_at}`);
  if (textOrList < 1) fails.push("sin texto/lista Haiku tras creativos");
  const pass = fails.length === 0;

  logCaseResult(
    "Camp-B Ideni orgánico",
    { pass, fails, outboundCount: outbound.length, haikuCount: 0 },
    outbound,
  );
  await waitOutboundSettle(since);
  return {
    name: "B ideni",
    pass,
    note: pass
      ? `${imgs} imgs + ${textOrList} texto/lista; from_ad_at=null; sin dead-end`
      : fails.join("; "),
  };
}

async function validateC_ExistingLate() {
  console.log(
    "\n── C: recurrente + «voy a llegar tarde» → sin creativos campaña ──",
  );
  await setupExistingWithAppointment();
  const since = new Date(Date.now() - 2000).toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, MSG_LATE, {
      wamid: newWamid("wamid.qa.camp.c"),
      contactName: "QA Campaña Existing",
    }),
  );
  console.log("  Webhook HTTP", status);

  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 22000,
  });
  const campaign = hasCampaignCaption(outbound);
  const fails = [];
  if (status !== 200) fails.push(`HTTP ${status}`);
  if (outbound.length < 1) fails.push("sin outbound");
  if (campaign) fails.push("envió creativos de campaña a recurrente");
  const pass = fails.length === 0;

  logCaseResult(
    "Camp-C tarde sin campaña",
    { pass, fails, outboundCount: outbound.length, haikuCount: 0 },
    outbound,
  );
  return {
    name: "C tarde",
    pass,
    note: pass ? "respondió sin captions de campaña" : fails.join("; "),
  };
}

function validateD_PromptSources() {
  console.log("\n── D: unit — fuentes Haiku prohíben «duran N min» al cotizar ──");
  const promptPath = join(
    ROOT,
    "supabase/functions/whatsapp-webhook/lib/haiku-prompt.ts",
  );
  const defaultsPath = join(
    ROOT,
    "supabase/functions/whatsapp-webhook/lib/haiku-cms-defaults.ts",
  );
  const prompt = readFileSync(promptPath, "utf8");
  const defaults = readFileSync(defaultsPath, "utf8");

  const checks = [
    [
      /cita ~\$\{svc\.duration\} min en salón/.test(prompt),
      "catálogo usa «cita ~N min en salón»",
    ],
    [
      /PROHIBIDO decir "duran N minutos"/.test(prompt),
      "FORMAT_INSTRUCTION prohíbe duran N minutos",
    ],
    [
      /la cita toma unos 60 min en el salón/.test(prompt),
      "ejemplo Laminado usa frase de cita",
    ],
    [
      /NUNCA digas .+duran 90 minutos/.test(defaults),
      "haiku-cms-defaults prohíbe duran 90 minutos",
    ],
  ];

  let ok = true;
  const fails = [];
  for (const [pass, note] of checks) {
    if (!pass) {
      ok = false;
      fails.push(note);
    }
    console.log(`  ${pass ? "✅" : "❌"} ${note}`);
  }
  logCaseResult(
    "Camp-D prompt sources",
    { pass: ok, fails, outboundCount: 0, haikuCount: 0 },
    [],
  );
  return {
    name: "D prompt",
    pass: ok,
    note: ok ? "fuentes alineadas" : fails.join("; "),
  };
}

async function validateE_RimelWording() {
  console.log(
    "\n── E: soft — cotizar Rímel no dice «duran 90 minutos» (Haiku) ──",
  );
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const { error: cErr } = await supabase.from("clients").insert({
    name: "QA RIMEL WORDING",
    phone: PHONE,
    phone_country: "PE",
    phone_normalized: PHONE.slice(2),
  });
  if (cErr && !String(cErr.message).includes("duplicate")) {
    console.warn("  client insert:", cErr.message);
  }
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });

  const since = new Date(Date.now() - 2000).toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, MSG_RIMEL, {
      wamid: newWamid("wamid.qa.camp.e"),
      contactName: "QA Rimel",
    }),
  );
  console.log("  Webhook HTTP", status);

  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 35000,
  });
  const texts = outbound
    .filter((m) => m.msg_type === "text")
    .map((m) => String(m.content ?? ""));
  const joined = texts.join("\n");
  const bad = DURAN_MIN_BAD_RE.test(joined);
  const mentionsRimel = /r[ií]mel|S\/\s*70|S\/\s*69/i.test(joined);
  const fails = [];
  if (status !== 200) fails.push(`HTTP ${status}`);
  if (bad) fails.push("dijo «duran N min»");
  if (texts.length === 0) fails.push("sin texto outbound");
  // Soft: si cotizó precio/servicio, mejor; si solo menú/fallback, igual pasa
  // mientras no diga «duran N min» (regresión Ideni).
  const pass = fails.length === 0;

  logCaseResult(
    "Camp-E rimel wording",
    { pass, fails, outboundCount: outbound.length, haikuCount: 0 },
    outbound,
  );
  return {
    name: "E rimel",
    pass,
    note: pass
      ? `sin «duran N min»; rimel/precio=${mentionsRimel}`
      : fails.join("; "),
  };
}

async function main() {
  console.log(
    "QA campaña orgánico + duración — tel",
    PHONE,
    "(no paralelizar con :effects)",
  );

  const expectedImages = await countActiveCampaignImages();
  console.log(
    `  Imágenes activas en waba_config: ${expectedImages} (panel /campanas)`,
  );
  if (expectedImages === 0) {
    console.warn(
      "  ⚠️  Sin URLs de campaña en waba_config — A/B solo verifican HTTP 200",
    );
  }

  const results = [];
  results.push(validateD_PromptSources());
  results.push(await validateA_OrganicHola(expectedImages));
  await sleep(1500);
  results.push(await validateB_OrganicIdeni(expectedImages));
  await sleep(1500);
  results.push(await validateC_ExistingLate());
  await sleep(1500);
  results.push(await validateE_RimelWording());

  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  finishAndExit(results);
}

main().catch((err) => {
  console.error(err);
  cleanupQaPhone(supabase, PHONE, { deleteClient: true }).finally(() =>
    process.exit(1),
  );
});
