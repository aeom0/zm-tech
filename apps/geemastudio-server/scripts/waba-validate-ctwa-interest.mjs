#!/usr/bin/env node
/**
 * CTWA pregunta de interés — QA A–H + extras.
 *
 * Actualizado 09-sep-2026: la lista interactiva del 1.er turno CTWA se
 * eliminó por completo (análisis docs/waba/analysis/2026-09-09-ctwa-lista-inicial.md
 * — 40% de silencio total tras verla). Ahora solo se manda saludo + typing
 * indicator; el texto libre de respuesta sigue el mismo ruteo. Los taps a
 * IDs de la lista vieja (ctwa_interest_*) siguen soportados por
 * compatibilidad (B/C/C2/D) aunque el bot ya no los ofrezca de entrada.
 *
 * A) Boilerplate CTWA → saludo texto SIN lista (sin imágenes previas)
 * B) Tap Extensiones → ≥1 imagen + pregunta look (sin lista subcats)
 * C) Tap Lifting → collage + pregunta lifting (sin lista servicios)
 * C2) Tap Uñas → imagen(es) CMS (si hay) + pregunta uñas (sin lista subcats)
 * D) Tap Otro → pregunta rubro (sin lista categorías; sin 4 imgs)
 * E) CTWA con intención específica → Haiku, SIN pregunta de interés
 * F) Orgánica sin from_ad → SIN pregunta de interés
 * G) Texto libre con intención en awaiting_ctwa_interest → Haiku
 * H) Anti-dup: 2 webhooks CTWA casi a la vez → ≤1 saludo bienvenida, 0 listas
 * I) Saludo incluye nombre del contact (cuando no es número)
 * J) Caption CMS extensiones aparece en OUT image tras tap B
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  buildInteractivePayload,
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
} from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000998";
const CONTACT = "QA CtwaInterest";
const BOILERPLATE = "¡Hola! Quiero más información";
/** Campaña Set 2026 — ejercita emoji strip + nuevo regex en caso A */
const BOILERPLATE_SET2026 =
  "¡Hola! Quiero despertar con una Mirada Espectacular 💜";
const INTENT_PRICE = "cuánto cuesta el mega volumen de pestañas";
const REFERRAL = {
  source_type: "ad",
  headline: "ZM Lash QA CTWA Interest",
  ctwa_clid: "qa.ctwa.interest.clid",
};

const GREETING_RE = /Bienvenida a ZM Lash & Nails Beauty/i;
const LOOK_ASK_RE =
  /cu[aá]l de estos looks|llama m[aá]s la atenci[oó]n|Cu[eé]ntanos para agendar|Cu[eé]ntenos para agendar/i;
const LIFTING_ASK_RE =
  /qu[eé] lifting|Solo pestañas|dise[nñ]o de cejas|precio y horario/i;
const UNAS_ASK_RE =
  /te interesa en u[nñ]as|le interesa en u[nñ]as|Soft Gel|PolyGel|Builder|manicure o pedicure/i;
const OTRO_ASK_RE =
  /rubro o servicio te interesa|rubro o servicio le interesa|Cu[eé]ntanos y te orientamos|Cu[eé]ntenos y la orientamos/i;
const ADDRESS_DUMP_RE = /Las Plazuelas|Artesanos 150|Tda\.?\s*205/i;
const EXT_CAPTION_RE =
  /Mirada de Impacto|Mirada Espectacular|Cl[aá]sicas|Volumen|Mega Volumen|Wispy|Fox|Rimel|Ojo de Gato/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function loadExtensionesImageCount() {
  const { data } = await supabase
    .from("waba_config")
    .select("config_key, config_value")
    .in("config_key", [
      "meta_ads_extensiones_image_1_url",
      "meta_ads_extensiones_image_2_url",
    ]);
  return (data ?? []).filter((r) => {
    const u = r.config_value?.url ?? r.config_value?.text ?? "";
    return typeof u === "string" && u.trim().length > 0;
  }).length;
}

async function getSessionStep() {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("step, from_ad_at")
    .eq("phone", PHONE)
    .maybeSingle();
  return data;
}

function allText(outbound) {
  return outbound.map((m) => m.content ?? "").join("\n");
}

function countMatches(outbound, re) {
  return outbound.filter((m) => re.test(m.content ?? "")).length;
}

async function postBoilerplateCtwa(label = "ctwa", text = BOILERPLATE) {
  return postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, text, {
      wamid: newWamid(`wamid.qa.${label}`),
      contactName: CONTACT,
      referral: { ...REFERRAL, ctwa_clid: `qa.ctwa.interest.${label}` },
    }),
  );
}

/** A + I: saludo con nombre, SIN lista; sin imágenes; step awaiting_ctwa_interest */
async function caseA_and_I() {
  console.log(
    "\n── A/I: CTWA boilerplate Set 2026 → saludo SIN lista (con nombre) ──",
  );
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const since = new Date().toISOString();
  const status = await postBoilerplateCtwa("a", BOILERPLATE_SET2026);
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
  const text = allText(outbound);
  const imgsBeforeList = outbound.filter((m) => m.msg_type === "image").length;
  const hasGreeting = GREETING_RE.test(text);
  const hasName = new RegExp(`Hola,\\s*${CONTACT.split(" ")[0]}`, "i").test(
    text,
  );
  const hasList = outbound.some((m) => m.msg_type === "interactive");
  const sess = await getSessionStep();
  const stepOk = sess?.step === "awaiting_ctwa_interest";
  const fails = [];
  if (!hasGreeting) fails.push("sin saludo Bienvenida");
  if (!hasName) fails.push("saludo sin nombre de contact");
  if (hasList) fails.push("mandó lista interactiva (eliminada 09-sep)");
  if (imgsBeforeList > 0) fails.push(`${imgsBeforeList} imagen(es) prematuras`);
  if (!stepOk) fails.push(`step=${sess?.step ?? "null"} (esperado awaiting_ctwa_interest)`);

  const pass = fails.length === 0;
  logCaseResult(
    "A/I boilerplate → saludo sin lista",
    { pass, fails },
    outbound,
  );
  return {
    name: "A/I boilerplate saludo sin lista+nombre",
    pass,
    note: pass
      ? `${outbound.length} msg(s); step=${sess.step}; 0 imgs previas`
      : fails.join("; "),
  };
}

/** B + J: tap Extensiones → imágenes CMS + pregunta look (sin lista) */
async function caseB_and_J(expectedExtImgs) {
  console.log("\n── B/J: tap Extensiones → creativos + pregunta look ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const since = new Date().toISOString();
  await postBoilerplateCtwa("b1");
  await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
  await sleep(1500);

  const sinceTap = new Date().toISOString();
  const st = await postWebhook(
    webhookUrl,
    buildInteractivePayload(
      PHONE,
      "ctwa_interest_extensiones",
      "Extensiones de pestañas",
      { wamid: newWamid("wamid.qa.b.tap"), contactName: CONTACT },
    ),
  );
  console.log(`  Tap Extensiones HTTP ${st}`);

  let outbound = [];
  const deadline = Date.now() + 35000;
  while (Date.now() < deadline) {
    outbound = await pollOutboundSince(supabase, PHONE, sinceTap, {
      minCount: 1,
      timeoutMs: 3000,
    });
    const text = allText(outbound);
    if (LOOK_ASK_RE.test(text)) break;
    await sleep(1500);
  }
  const imgs = outbound.filter((m) => m.msg_type === "image");
  const text = allText(outbound);
  const hasAsk = LOOK_ASK_RE.test(text);
  const hasInteractive = outbound.some((m) => m.msg_type === "interactive");
  const hasCaption = EXT_CAPTION_RE.test(text);
  const sess = await getSessionStep();
  const fails = [];
  if (imgs.length < expectedExtImgs) {
    fails.push(`imgs=${imgs.length} (esperado ≥${expectedExtImgs})`);
  }
  if (!hasAsk) fails.push("sin pregunta de look/efecto");
  if (hasInteractive) fails.push("lista interactiva (no debería post-tap)");
  if (expectedExtImgs > 0 && !hasCaption) {
    fails.push("sin caption CMS extensiones en OUT");
  }
  if (sess?.step !== "browsing") {
    fails.push(`step=${sess?.step ?? "null"} (esperado browsing)`);
  }

  const pass = fails.length === 0;
  logCaseResult("B/J Extensiones", { pass, fails }, outbound);
  return {
    name: "B/J tap Extensiones + pregunta",
    pass,
    note: pass
      ? `${imgs.length} imgs + ask; browsing`
      : fails.join("; "),
  };
}

/** C: tap Lifting → collage + pregunta (sin lista) */
async function caseC() {
  console.log("\n── C: tap Lifting → collage + pregunta ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const since = new Date().toISOString();
  await postBoilerplateCtwa("c1");
  await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
  await sleep(1500);

  const sinceTap = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildInteractivePayload(
      PHONE,
      "ctwa_interest_lifting",
      "Lifting de pestañas",
      { wamid: newWamid("wamid.qa.c.tap"), contactName: CONTACT },
    ),
  );

  let outbound = [];
  const deadline = Date.now() + 35000;
  while (Date.now() < deadline) {
    outbound = await pollOutboundSince(supabase, PHONE, sinceTap, {
      minCount: 1,
      timeoutMs: 3000,
    });
    if (LIFTING_ASK_RE.test(allText(outbound))) break;
    await sleep(1500);
  }
  await sleep(500);
  const text = allText(outbound);
  const hasAsk = LIFTING_ASK_RE.test(text);
  const hasLiftingImage = outbound.some((m) => m.msg_type === "image");
  const hasInteractive = outbound.some((m) => m.msg_type === "interactive");
  const sess = await getSessionStep();
  const fails = [];
  if (!hasAsk) fails.push("sin pregunta lifting");
  if (!hasLiftingImage) fails.push("sin collage/imagen Lifting");
  if (hasInteractive) fails.push("lista interactiva (no debería)");
  if (sess?.step !== "browsing") {
    fails.push(`step=${sess?.step ?? "null"}`);
  }

  const pass = fails.length === 0;
  logCaseResult("C Lifting", { pass, fails }, outbound);
  return {
    name: "C tap Lifting → pregunta",
    pass,
    note: pass ? "collage + ask + browsing" : fails.join("; "),
  };
}

/** C2: tap Uñas → pregunta (sin lista) */
async function caseC2_unas() {
  console.log("\n── C2: tap Uñas → pregunta uñas ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const since = new Date().toISOString();
  await postBoilerplateCtwa("c2");
  await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
  await sleep(1500);

  const sinceTap = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildInteractivePayload(PHONE, "ctwa_interest_unas", "Uñas", {
      wamid: newWamid("wamid.qa.c2.tap"),
      contactName: CONTACT,
    }),
  );

  // Imagen(es) CMS de Uñas (Halloween) + pregunta: esperar ≥2 salientes.
  const outbound = await pollOutboundSince(supabase, PHONE, sinceTap, {
    minCount: 2,
    timeoutMs: 35000,
  });
  await sleep(800);
  const text = allText(outbound);
  const hasAsk = UNAS_ASK_RE.test(text);
  const hasInteractive = outbound.some((m) => m.msg_type === "interactive");
  const sess = await getSessionStep();
  const fails = [];
  if (!hasAsk) fails.push("sin pregunta Uñas");
  if (hasInteractive) fails.push("lista interactiva (no debería)");
  if (sess?.step !== "browsing") {
    fails.push(`step=${sess?.step ?? "null"} (esperado browsing)`);
  }

  const pass = fails.length === 0;
  logCaseResult("C2 Uñas", { pass, fails }, outbound);
  return {
    name: "C2 tap Uñas → pregunta",
    pass,
    note: pass ? "ask Uñas; browsing" : fails.join("; "),
  };
}

/** D: tap Otro → pregunta rubro (sin lista categorías) */
async function caseD() {
  console.log("\n── D: tap Otro → pregunta rubro ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const since = new Date().toISOString();
  await postBoilerplateCtwa("d1");
  await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
  await sleep(1500);

  const sinceTap = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildInteractivePayload(PHONE, "ctwa_interest_otro", "Otro / ver todo", {
      wamid: newWamid("wamid.qa.d.tap"),
      contactName: CONTACT,
    }),
  );

  const outbound = await pollOutboundSince(supabase, PHONE, sinceTap, {
    minCount: 1,
    timeoutMs: 30000,
  });
  const text = allText(outbound);
  const hasAsk = OTRO_ASK_RE.test(text);
  const hasInteractive = outbound.some((m) => m.msg_type === "interactive");
  const imageCount = outbound.filter((m) => m.msg_type === "image").length;
  const hasAddressDump = ADDRESS_DUMP_RE.test(text);
  const fails = [];
  if (!hasAsk) fails.push("sin pregunta de rubro");
  if (hasInteractive) fails.push("lista interactiva (no debería)");
  if (hasAddressDump) fails.push("muro con sede (no debería)");
  if (imageCount > 0) fails.push(`imgs genéricas (${imageCount})`);

  const pass = fails.length === 0;
  logCaseResult("D Otro", { pass, fails }, outbound);
  return {
    name: "D tap Otro → pregunta",
    pass,
    note: pass ? "pregunta rubro sin lista" : fails.join("; "),
  };
}

/** E: intención específica → Haiku, sin lista interés */
async function caseE() {
  console.log("\n── E: CTWA intención → Haiku sin pregunta interés ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, INTENT_PRICE, {
      wamid: newWamid("wamid.qa.e"),
      contactName: CONTACT,
      referral: { ...REFERRAL, ctwa_clid: "qa.ctwa.interest.e" },
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  let outbound = [];
  let haiku = [];
  const deadline = Date.now() + 35000;
  while (Date.now() < deadline) {
    outbound = await pollOutboundSince(supabase, PHONE, since, {
      minCount: 1,
      timeoutMs: 3000,
    });
    haiku = await fetchHaikuSince(supabase, PHONE, since);
    if (haiku.length > 0 || outbound.length >= 2) break;
    await sleep(1500);
  }
  const text = allText(outbound);
  const hasInterestGreeting = GREETING_RE.test(text);
  const hasHaiku = haiku.length > 0;
  const hasPriceOrVol =
    /mega|volumen|S\/\s*\d+|extensi/i.test(text) || hasHaiku;
  const fails = [];
  if (hasInterestGreeting) fails.push("envió pregunta de interés (no debía)");
  if (!hasPriceOrVol) fails.push("sin Haiku/respuesta de precio-volumen");

  const pass = fails.length === 0;
  logCaseResult("E intención específica", { pass, fails }, outbound);
  return {
    name: "E CTWA intención → Haiku",
    pass,
    note: pass
      ? `Haiku=${haiku.length}; sin interest Q`
      : fails.join("; "),
  };
}

/** F: orgánica sin referral → sin pregunta CTWA */
async function caseF() {
  console.log("\n── F: orgánica (sin from_ad) → sin pregunta interés ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, "Hola", {
      wamid: newWamid("wamid.qa.f"),
      contactName: CONTACT,
      // sin referral
    }),
  );

  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
  const text = allText(outbound);
  const hasInterest = GREETING_RE.test(text);
  const sess = await getSessionStep();
  const fails = [];
  if (hasInterest) fails.push("preguntó interés CTWA en orgánica");
  if (sess?.from_ad_at) fails.push(`from_ad_at marcado (${sess.from_ad_at})`);

  const pass = fails.length === 0;
  logCaseResult("F orgánica", { pass, fails }, outbound);
  return {
    name: "F orgánica sin interés CTWA",
    pass,
    note: pass ? "sin interest Q; from_ad_at=null" : fails.join("; "),
  };
}

/** G: texto libre con intención en awaiting → Haiku (no caer a «Otro») */
async function caseG() {
  console.log("\n── G: free-text en awaiting_ctwa_interest → Haiku ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  // Colchón anti rate-limit Haiku tras casos E/F
  await sleep(8000);
  const since = new Date().toISOString();
  await postBoilerplateCtwa("g1");
  await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
  await sleep(2000);

  const sinceText = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(PHONE, INTENT_PRICE, {
      wamid: newWamid("wamid.qa.g2"),
      contactName: CONTACT,
    }),
  );

  let outbound = [];
  let haiku = [];
  const deadline = Date.now() + 40000;
  while (Date.now() < deadline) {
    outbound = await pollOutboundSince(supabase, PHONE, sinceText, {
      minCount: 1,
      timeoutMs: 3000,
    });
    haiku = await fetchHaikuSince(supabase, PHONE, sinceText);
    const text = allText(outbound);
    if (
      haiku.length > 0 ||
      /mega\s*volumen|S\/\s*1\d{2}/i.test(text)
    ) {
      break;
    }
    await sleep(1500);
  }
  const text = allText(outbound);
  const fellToOtro =
    OTRO_ASK_RE.test(text) && !/mega\s*volumen|S\/\s*1\d{2}/i.test(text);
  const hasPriceAnswer = /mega\s*volumen|S\/\s*1\d{2}/i.test(text);
  const sess = await getSessionStep();
  const fails = [];
  if (fellToOtro) fails.push("cayó a pregunta Otro en vez de Haiku");
  if (!hasPriceAnswer && haiku.length === 0) {
    fails.push("sin Haiku ni respuesta de precio mega volumen");
  }
  if (sess?.step === "awaiting_ctwa_interest") {
    fails.push("sigue en awaiting_ctwa_interest");
  }

  const pass = fails.length === 0;
  logCaseResult("G free-text → Haiku", { pass, fails }, outbound);
  return {
    name: "G awaiting + intención → Haiku",
    pass,
    note: pass
      ? `Haiku=${haiku.length}; step=${sess?.step}`
      : fails.join("; "),
  };
}

/** H: anti-dup 2× boilerplate ~paralelo */
async function caseH() {
  console.log("\n── H: anti-dup 2 webhooks CTWA simultáneos ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await sleep(3000);
  const since = new Date().toISOString();
  // Disparo casi paralelo (50ms) — Promise.all puro a veces coalescea raro
  const p1 = postBoilerplateCtwa("h1");
  await sleep(50);
  const p2 = postBoilerplateCtwa("h2");
  const [s1, s2] = await Promise.all([p1, p2]);
  console.log(`  Webhooks HTTP ${s1}/${s2}`);

  const outbound = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 15000,
  });
  await sleep(2000);
  const outbound2 = await pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 5000,
  });
  const all = outbound2.length >= outbound.length ? outbound2 : outbound;
  const greetings = countMatches(all, GREETING_RE);
  const lists = all.filter((m) => m.msg_type === "interactive").length;
  const fails = [];
  if (greetings > 1) fails.push(`${greetings} saludos Bienvenida (máx 1)`);
  if (lists > 0) fails.push(`${lists} lista(s) interactiva(s) (eliminadas 09-sep)`);
  if (greetings < 1) fails.push("sin saludo Bienvenida");

  const pass = fails.length === 0;
  logCaseResult("H anti-dup", { pass, fails }, all);
  return {
    name: "H anti-dup 2× CTWA",
    pass,
    note: pass
      ? `greetings=${greetings} lists=${lists}`
      : fails.join("; "),
  };
}

async function main() {
  console.log("CTWA interest QA — phone", PHONE);
  const extImgs = await loadExtensionesImageCount();
  console.log(`  CMS extensiones con URL: ${extImgs}`);
  if (extImgs < 1) {
    console.warn(
      "  ⚠ Sin imágenes Extensiones en waba_config — B/J exigirá ≥1 y fallará",
    );
  }

  const results = [];
  results.push(await caseA_and_I());
  await sleep(2000);
  results.push(await caseB_and_J(Math.max(1, Math.min(2, extImgs))));
  await sleep(2000);
  results.push(await caseC());
  await sleep(2000);
  results.push(await caseC2_unas());
  await sleep(2000);
  results.push(await caseD());
  await sleep(2000);
  results.push(await caseE());
  await sleep(2000);
  results.push(await caseF());
  await sleep(2000);
  results.push(await caseG());
  await sleep(2000);
  results.push(await caseH());

  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
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
