#!/usr/bin/env node
/**
 * Valida mapeo efectos vs chat Cindy/Stephani (04-sep-2026).
 * Staff ofreció con Clásicas ya elegida:
 *   ojo abierto | ojo de gato | muñeca | ardilla  → todos bajo Extensiones Clásicas S/70
 *
 * A) Offline Haiku (prompt prod-ish + catálogo)
 * B) E2E webhook QA phone (skip pausa): funnel Clásicas → Si → cart
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildTextPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  pollOutboundSince,
  fetchOutboundSince,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const ROOT = "/home/alber/ZM-Lash-and-Nails-Beauty";
const MODEL = "claude-haiku-4-5-20251001";
const CLASICAS_ID = "3d5d6ee4-b799-4b93-86eb-b974ec125439";
const BABY3D_ID = "9d36f228-9c3e-4ef1-8804-c125aa92e863";
const RIMEL_ID = "e7e0e977-5acf-48cf-8bdd-29430c7e1205";
const ANIME_ID = "98772a98-f454-4722-a73f-8b2bab72bfa7";

/** QA genérico: skip design pause (≠ 985). */
const QA_PHONE = "51999000994";

const GUIDE = readFileSync(
  `${ROOT}/supabase/functions/whatsapp-webhook/lib/extension-effects-guide.ts`,
  "utf8",
).match(/export const EXTENSION_EFFECTS_FORMAT_BLOCK = `([\s\S]*?)`;/)?.[1];

function loadApiKey() {
  const raw = readFileSync(`${ROOT}/.env`, "utf8");
  const m = raw.match(/^ANTHROPIC_API_KEY=(.*)$/m);
  if (!m) throw new Error("Falta ANTHROPIC_API_KEY");
  return m[1].replace(/^["']|["']$/g, "").trim();
}

async function askHaiku(apiKey, userMsg, { prior = "" } = {}) {
  const system = `Eres Vanessa, bot WhatsApp de ZM Lash & Nails (Lima). Español PE, breve (máx 2 burbujas).

CATÁLOGO (precios reales):
- Extensiones Clásicas — S/70 — 90 min — UUID ${CLASICAS_ID} — 1 fibra por pestaña
- Extensiones Rímel — S/85 — UUID ${RIMEL_ID}
- Baby Vol. Tecnológica 3D — S/100 — UUID ${BABY3D_ID}
- Anime — S/110 — UUID ${ANIME_ID}

${GUIDE}

FORMATO OBLIGATORIO:
<text>...</text>
<action>none|add_to_cart:UUID|show_category:cat-extensiones</action>`;

  const history = prior
    ? `${prior}\nCLIENTA: ${userMsg}`
    : `CLIENTA: ${userMsg}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 350,
      system,
      messages: [{ role: "user", content: history }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
  return data.content?.find((b) => b.type === "text")?.text?.trim() ?? "";
}

function parseAction(text) {
  return (text.match(/<action>([^<]+)<\/action>/i) || [])[1]?.trim() ?? "";
}

function cartId(action) {
  const m = action.match(/add_to_cart:([0-9a-f-]+)/i);
  return m?.[1] ?? null;
}

async function partA_offline(apiKey) {
  console.log("\n=== A) Haiku offline — diseños Cindy/Stephani ===\n");

  const cindyPrior = `CLIENTA: Deseo efecto clásicas
BOT: Extensiones Clásicas S/70 (~90 min), pelo a pelo. ¿Te agendo?
CLIENTA: es pelo a pelo verdad?
BOT: Sí, una extensión por pestaña. ¿Confirmamos Clásicas S/70?`;

  const cases = [
    {
      id: "A1",
      label: "ya Clásicas + diseño ojo abierto (script Stephani)",
      prior: cindyPrior,
      msg: "Quiero el diseño ojo abierto",
      expectService: "Clásicas",
      expectCart: CLASICAS_ID,
      allowNone: true, // may ask confirm first
      mustNotCart: [BABY3D_ID, RIMEL_ID, ANIME_ID],
      mustText: /cl[aá]sicas|70|ojo abierto/i,
    },
    {
      id: "A2",
      label: "ya Clásicas + diseño muñeca",
      prior: cindyPrior,
      msg: "Diseño muñeca",
      expectService: "Clásicas",
      expectCart: CLASICAS_ID,
      allowNone: true,
      mustNotCart: [BABY3D_ID, ANIME_ID],
      mustText: /cl[aá]sicas|70|mu[nñ]eca/i,
    },
    {
      id: "A3",
      label: "ya Clásicas + ojo de gato",
      prior: cindyPrior,
      msg: "Diseño ojo de gato",
      expectService: "Clásicas",
      expectCart: CLASICAS_ID,
      allowNone: true,
      mustNotCart: [BABY3D_ID],
      mustText: /cl[aá]sicas|70|gato|cat/i,
    },
    {
      id: "A4",
      label: "ya Clásicas + ardilla",
      prior: cindyPrior,
      msg: "Diseño ardilla",
      expectService: "Clásicas",
      expectCart: CLASICAS_ID,
      allowNone: true,
      mustNotCart: [BABY3D_ID],
      mustText: /cl[aá]sicas|70|ardilla/i,
    },
    {
      id: "A5",
      label: "bare 'efecto ardilla' (sin técnica) — guía actual → Baby Vol",
      prior: "",
      msg: "Qué es el efecto ardilla?",
      expectService: "Baby Vol",
      expectCart: null,
      allowNone: true,
      mustText: /ardilla/i,
      // Documentamos comportamiento guía actual; no fuerza Baby Vol en texto si lista
      softExpectBaby: true,
    },
    {
      id: "A6",
      label: "bare 'muñeca' sin técnica",
      prior: "",
      msg: "Quiero diseño muñeca, cuánto sale?",
      expectService: "any",
      allowNone: true,
      mustText: /mu[nñ]eca|doll|anime|r[ií]mel|cl[aá]sicas/i,
    },
  ];

  const results = [];
  for (const c of cases) {
    process.stdout.write(`${c.id} ${c.label} … `);
    try {
      const reply = await askHaiku(apiKey, c.msg, { prior: c.prior });
      const action = parseAction(reply);
      const id = cartId(action);
      const fails = [];

      if (c.mustText && !c.mustText.test(reply)) {
        fails.push(`texto no match ${c.mustText}`);
      }
      for (const bad of c.mustNotCart ?? []) {
        if (id === bad) fails.push(`cart wrong ${bad.slice(0, 8)}`);
        if (reply.includes(bad)) fails.push(`uuid leaked ${bad.slice(0, 8)}`);
      }
      if (c.expectCart && id && id !== c.expectCart) {
        fails.push(`cart=${id.slice(0, 8)} want Clásicas`);
      }
      if (c.expectCart && !id && !c.allowNone) {
        fails.push("sin add_to_cart");
      }
      // Si cambia a Baby Vol en texto cuando ya hay Clásicas
      if (c.expectService === "Clásicas") {
        if (/Baby Vol|volumen 3D|S\/100/i.test(reply) && !/cl[aá]sicas/i.test(reply)) {
          fails.push("desvió a Baby Vol sin anclar Clásicas");
        }
        if (/add_to_cart:9d36f228/i.test(action)) {
          fails.push("add_to_cart Baby Vol");
        }
      }
      if (c.softExpectBaby && !/Baby Vol|3D/i.test(reply)) {
        fails.push("soft: bare ardilla no menciona Baby Vol/3D (guía)");
      }

      const pass = fails.length === 0;
      console.log(pass ? "✅" : `❌ ${fails.join("; ")}`);
      if (!pass) {
        console.log(`   action=${action}`);
        console.log(`   reply: ${reply.slice(0, 280).replace(/\n/g, " | ")}`);
      } else {
        console.log(`   action=${action || "(none)"}`);
      }
      results.push({ name: c.id, pass, note: fails.join("; ") || action });
    } catch (e) {
      console.log(`❌ ${e.message}`);
      results.push({ name: c.id, pass: false, note: e.message });
    }
    await sleep(800);
  }
  return results;
}

async function partB_e2e() {
  console.log("\n=== B) E2E webhook — Clásicas pending → Si → cart ===\n");
  const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });

  const results = [];
  try {
    await cleanupQaPhone(supabase, QA_PHONE, { deleteClient: true });
    await ensureQaClient(supabase, QA_PHONE, "QA Cindy Effects");
    await supabase.from("whatsapp_sessions").upsert({
      phone: QA_PHONE,
      step: "browsing",
      cart_items: "[]",
      cart_service_ids: "[]",
      employee_assignments: "{}",
      bot_paused_at: null,
      pending_price_cta_service_id: CLASICAS_ID,
      pending_price_cta_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    await supabase.from("wa_messages").insert([
      {
        phone: QA_PHONE,
        direction: "in",
        msg_type: "text",
        content: "Deseo efecto clásicas",
      },
      {
        phone: QA_PHONE,
        direction: "out",
        msg_type: "text",
        content:
          "Srta. Cindy, las Extensiones Clásicas — Precio: S/70. ¿Confirmamos tu cita de Extensiones Clásicas en S/70? 💜",
        source: "haiku",
      },
    ]);

    const since = new Date().toISOString();
    const status = await postWebhook(
      webhookUrl,
      buildTextPayload(QA_PHONE, "Si", {
        wamid: newWamid("wamid.qa.cindy.si"),
        contactName: "QA Cindy Effects",
      }),
    );
    console.log(`Webhook Si → HTTP ${status}`);

    const outbound = await pollOutboundSince(supabase, QA_PHONE, since, {
      timeoutMs: 25000,
      minCount: 1,
    });
    await sleep(1500);

    const { data: sess } = await supabase
      .from("whatsapp_sessions")
      .select("step, cart_service_ids, cart_items, bot_paused_at, pending_price_cta_service_id")
      .eq("phone", QA_PHONE)
      .maybeSingle();

    let cartIds = sess?.cart_service_ids;
    if (typeof cartIds === "string") {
      try {
        cartIds = JSON.parse(cartIds);
      } catch {
        cartIds = [];
      }
    }
    const hasClasicas = Array.isArray(cartIds) && cartIds.includes(CLASICAS_ID);
    const joined = outbound.map((m) => m.content ?? "").join("\n");
    const calendarish = /fecha|día|hora|\[lista\]|elegir/i.test(joined);
    const paused = Boolean(sess?.bot_paused_at);

    const pass = hasClasicas && !paused;
    console.log(
      `${pass ? "✅" : "❌"} cart Clásicas=${hasClasicas} paused=${paused} step=${sess?.step} outs=${outbound.length} cal=${calendarish}`,
    );
    if (!pass) {
      console.log("  sess:", JSON.stringify(sess));
      console.log("  out:", joined.slice(0, 400));
    }
    results.push({
      name: "B1 Si→cart Clásicas",
      pass,
      note: `cart=${JSON.stringify(cartIds)} step=${sess?.step}`,
    });

    // B2: con Clásicas en carrito, pedir diseño ojo abierto no debe cambiar a Baby Vol
    if (hasClasicas) {
      const since2 = new Date().toISOString();
      await postWebhook(
        webhookUrl,
        buildTextPayload(QA_PHONE, "Quiero el diseño ojo abierto", {
          wamid: newWamid("wamid.qa.cindy.ojo"),
          contactName: "QA Cindy Effects",
        }),
      );
      const out2 = await pollOutboundSince(supabase, QA_PHONE, since2, {
        timeoutMs: 30000,
        minCount: 1,
      });
      await sleep(1000);
      const { data: sess2 } = await supabase
        .from("whatsapp_sessions")
        .select("cart_service_ids, step")
        .eq("phone", QA_PHONE)
        .maybeSingle();
      let ids2 = sess2?.cart_service_ids;
      if (typeof ids2 === "string") {
        try {
          ids2 = JSON.parse(ids2);
        } catch {
          ids2 = [];
        }
      }
      const stillClasicas =
        Array.isArray(ids2) && ids2.includes(CLASICAS_ID) && !ids2.includes(BABY3D_ID);
      const text2 = out2.map((m) => m.content ?? "").join("\n");
      const swappedToBaby = /Baby Vol|S\/100/i.test(text2) && /agreg/i.test(text2);
      const pass2 = stillClasicas && !swappedToBaby;
      console.log(
        `${pass2 ? "✅" : "❌"} B2 diseño ojo abierto mid-cart: stillClasicas=${stillClasicas} swappedBaby=${swappedToBaby}`,
      );
      if (!pass2) console.log("  out:", text2.slice(0, 400));
      results.push({
        name: "B2 ojo abierto mid-cart",
        pass: pass2,
        note: text2.slice(0, 120),
      });
    }
  } finally {
    await cleanupQaPhone(supabase, QA_PHONE, { deleteClient: true });
    console.log("Cleanup", QA_PHONE);
  }
  return results;
}

async function main() {
  const apiKey = loadApiKey();
  const a = await partA_offline(apiKey);
  const b = await partB_e2e();
  const all = [...a, ...b];
  const pass = all.filter((r) => r.pass).length;
  console.log(`\n=== TOTAL ${pass}/${all.length} ===\n`);
  for (const r of all) {
    console.log(`${r.pass ? "✅" : "❌"} ${r.name} — ${r.note || ""}`);
  }
  process.exit(pass === all.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
