#!/usr/bin/env node
/**
 * QW — CTWA + orgánico mismo segundo (Jessi …6106, análisis 03-sep).
 *
 * Antes: coalesce pegaba Mirada Espectacular + "Informacion y precio" →
 * isMetaAdsBoilerplateCta=false (no todas las líneas BP) → creativos + Haiku
 * sobre texto completo + posible dump de categorías = avalancha.
 *
 * Ahora: splitCtwaBoilerplateAndIntent → Haiku solo con intención (o lista
 * interés si Haiku no cierra); sin creativos genéricos en el mix.
 *
 * Tel: 51999000989 (no paralelizar con otros scripts).
 *
 * A) Multilínea ya coalescida + referral (determinista)
 * B) Orgánico + CTWA ~80 ms (ráfaga real)
 */
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
  fetchHaikuSince,
  logCaseResult,
  finishAndExit,
  sleep,
  hashPhone,
} from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000989";
const CONTACT = "QA Jessi CtwaOrganic";
const ORGANIC = "Buenas tardes. Informacion y precio";
const CTWA_MIRADA =
  "¡Hola! Quiero despertar con una Mirada Espectacular 💜";
const MIXED = `${ORGANIC}\n${CTWA_MIRADA}`;
const REFERRAL = {
  source_type: "ad",
  headline: "ZM Lash QA Jessi CTWA mix",
  ctwa_clid: "qa.ctwa.jessi.mix.clid",
};

const META_ADS_MENU_DUMP_RE =
  /Men[uú] principal|Elegir categor[ií]a|¿Qu[eé] deseas hacer\?/i;
const INTEREST_LIST_RE =
  /te interesa hoy|Toca una categor|Toque una categor|Elige una opci[oó]n/i;
const PRECIO_OR_INFO_RE =
  /precio|S\/\s*\d+|informaci[oó]n|pack|promo|extensi|lifting|pesta[nñ]/i;
const GREETING_RE = /Bienvenida a ZM Lash & Nails Beauty/i;
const SOFT_LOCK_RE = /Un segundo.*ya te respondo/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function getSession() {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("step, from_ad_at")
    .eq("phone", PHONE)
    .maybeSingle();
  return data;
}

function realOutbound(outbound) {
  return outbound.filter((m) => !SOFT_LOCK_RE.test(m.content ?? ""));
}

function countImages(outbound) {
  return outbound.filter((m) => m.msg_type === "image").length;
}

async function waitSettle(sinceIso, quietMs = 5000, maxMs = 32000) {
  const deadline = Date.now() + maxMs;
  let lastCount = -1;
  let quietSince = Date.now();
  while (Date.now() < deadline) {
    const outbound = await pollOutboundSince(supabase, PHONE, sinceIso, {
      minCount: 0,
      timeoutMs: 800,
    });
    const n = outbound.length;
    if (n !== lastCount) {
      lastCount = n;
      quietSince = Date.now();
    } else if (n > 0 && Date.now() - quietSince >= quietMs) {
      return outbound;
    }
    await sleep(700);
  }
  return pollOutboundSince(supabase, PHONE, sinceIso, {
    minCount: 1,
    timeoutMs: 2000,
  });
}

/**
 * @param {string} label
 * @param {object[]} outbound
 * @param {object[]} haiku
 */
function assertNoAvalanche(label, outbound, haiku) {
  const fails = [];
  const real = realOutbound(outbound);
  const text = real.map((m) => m.content ?? "").join("\n");
  const imgs = countImages(real);
  const greetings = real.filter((m) => GREETING_RE.test(m.content ?? "")).length;

  if (META_ADS_MENU_DUMP_RE.test(text)) {
    fails.push("dump menú categorías / Menú principal");
  }
  if (imgs > 1) {
    fails.push(`creativos ×${imgs} (mix debe ≤1, ideal 0)`);
  }
  if (greetings > 1) {
    fails.push(`Bienvenida ×${greetings}`);
  }
  if (real.length > 6) {
    fails.push(`avalancha OUT real ×${real.length} (tope 6)`);
  }

  const answered =
    INTEREST_LIST_RE.test(text) ||
    PRECIO_OR_INFO_RE.test(text) ||
    haiku.length > 0;
  if (!answered) {
    fails.push("sin Haiku ni interés ni respuesta precio/info");
  }

  const pass = fails.length === 0;
  logCaseResult(label, { pass, fails }, outbound);
  return {
    name: label,
    pass,
    note: pass
      ? `OK imgs=${imgs} OUT=${real.length} Haiku=${haiku.length}`
      : fails.join("; "),
  };
}

/** A — multilínea coalescida + referral (path determinista). */
async function caseMixedSingleWebhook() {
  console.log("\n── A: multilínea mix + referral → sin avalancha ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await sleep(400);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, MIXED, {
      wamid: newWamid("wamid.qa.jessi.mix.a"),
      contactName: CONTACT,
      referral: REFERRAL,
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await waitSettle(since);
  const haiku = await fetchHaikuSince(supabase, PHONE, since);
  const sess = await getSession();

  const result = assertNoAvalanche("A mix multilínea", outbound, haiku);
  if (!sess?.from_ad_at) {
    result.pass = false;
    result.note = `${result.note}; falta from_ad_at`;
  }
  return result;
}

/** B — orgánico + CTWA ~80 ms (Jessi real). */
async function caseNearSimultaneousBurst() {
  console.log("\n── B: orgánico + CTWA ~80ms → sin avalancha ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await sleep(400);

  const since = new Date().toISOString();
  const st1 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, ORGANIC, {
      wamid: newWamid("wamid.qa.jessi.mix.b1"),
      contactName: CONTACT,
    }),
  );
  console.log(`  Orgánico HTTP ${st1}`);
  await sleep(80);
  const st2 = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, CTWA_MIRADA, {
      wamid: newWamid("wamid.qa.jessi.mix.b2"),
      contactName: CONTACT,
      referral: { ...REFERRAL, ctwa_clid: "qa.ctwa.jessi.mix.b" },
    }),
  );
  console.log(`  CTWA HTTP ${st2} (+80ms)`);

  // Coalesce base + trailing + Haiku
  await sleep(16000);
  const outbound = await waitSettle(since, 4500, 20000);
  const haiku = await fetchHaikuSince(supabase, PHONE, since);
  const sess = await getSession();

  const result = assertNoAvalanche("B ráfaga orgánico+CTWA", outbound, haiku);
  if (!sess?.from_ad_at) {
    result.pass = false;
    result.note = `${result.note}; falta from_ad_at`;
  }

  // Anti-dup Haiku dispatch (no 2 turnos independientes)
  const { data: haikuRows } = await supabase
    .from("ai_usage_log")
    .select("trigger_type")
    .eq("phone_hash", hashPhone(PHONE))
    .gte("created_at", since);
  const dispatch = (haikuRows ?? []).filter((h) =>
    ["fallback", "recommendation", "free_question"].includes(h.trigger_type),
  );
  if (dispatch.length > 2) {
    result.pass = false;
    result.note = `${result.note}; Haiku dispatch ×${dispatch.length}`;
  }

  return result;
}

async function main() {
  console.log("Validación Jessi CTWA+orgánico coalesce — tel:", PHONE);
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await caseMixedSingleWebhook());
    await sleep(2000);
    results.push(await caseNearSimultaneousBurst());
  } finally {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
