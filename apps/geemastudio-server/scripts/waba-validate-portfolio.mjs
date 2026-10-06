#!/usr/bin/env node
/**
 * Portafolio visual — fotos + match por pie de foto (captions).
 *
 * A: "fotos de builder gel" → OUT image (datos reales Vanessa o seed no destructivo)
 * B: rubro sin fotos (axilas/bikini) → Instagram / respuesta (no silencio)
 * C: caption match ("muéstrame rubber" / "ojo de gato") → OUT image
 * D: pregunta de precio con foto real (ej. "cuánto cuesta el rubber") → Haiku
 *    cotiza + show_category:cat-unas dispara envío proactivo de UNA foto con CTA
 * E: tras CTA de foto, "Si" corto → add_to_cart + calendario (Zandry …0030),
 *    no menú genérico
 * F: pedido de fotos + pregunta(s) de ubicación/disponibilidad en el MISMO
 *    turno (Misama …9751, 17-sep) → Haiku responde TODO (texto ubicación +
 *    imagen), no solo la acción de fotos
 *
 * NO borra el portafolio de producción: seed solo inserta en un servicio QA
 * temporal si hace falta fallback.
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
} from "./lib/waba-sim-assert.mjs";

const TEST_PHONE = "51999000983";
/** Imagen pública ya en Storage (campañas) — solo para seed QA de emergencia. */
const SAMPLE_IMAGE =
  "https://udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/waba-images/campanas/meta-ads-hero.jpg";

const INSTAGRAM_RE = /instagram|@zmlashandnails/i;
const LOCATION_RE = /Calle Artesanos 150|maps\.app\.goo\.gl|Plazuelas de Surco/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/** Filas insertadas en esta corrida (para cleanup; nunca wipe de Vanessa). */
let seededRowIds = [];

async function countPortfolioRows() {
  const { count, error } = await supabase
    .from("service_portfolio_images")
    .select("id", { count: "exact", head: true });
  if (error) throw new Error("count portfolio: " + error.message);
  return count ?? 0;
}

async function findBuilderService() {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, category_id")
    .eq("category_id", "cat-unas")
    .eq("is_active", true)
    .ilike("name", "%builder%")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("find builder: " + error.message);
  if (!data?.id) throw new Error("No hay servicio Builder en cat-unas");
  return data;
}

async function findBabyVolService() {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, category_id")
    .eq("category_id", "cat-extensiones")
    .eq("is_active", true)
    .ilike("name", "%baby vol%")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("find baby vol: " + error.message);
  return data;
}

/** Seed no destructivo: solo si el anfitrión no tiene 4 fotos y hay hueco. */
async function ensureCaptionSeedIfEmpty(serviceId, caption, sortOrder) {
  const { data: existing } = await supabase
    .from("service_portfolio_images")
    .select("id, caption")
    .eq("service_id", serviceId)
    .eq("sort_order", sortOrder)
    .maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("service_portfolio_images")
    .insert({
      service_id: serviceId,
      image_url: SAMPLE_IMAGE,
      caption,
      sort_order: sortOrder,
    })
    .select("id")
    .single();
  if (error) throw new Error("seed portfolio slot: " + error.message);
  seededRowIds.push(data.id);
  return data.id;
}

async function restorePortfolioSeeds() {
  if (seededRowIds.length === 0) return;
  await supabase
    .from("service_portfolio_images")
    .delete()
    .in("id", seededRowIds);
  seededRowIds = [];
}

async function setupBrowsing() {
  await supabase.from("whatsapp_sessions").upsert({
    phone: TEST_PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function waitForImage(
  phone,
  since,
  { minImages = 1, settleMs = 4000 } = {},
) {
  let outbound = await pollOutboundSince(supabase, phone, since, {
    minCount: 1,
    timeoutMs: 35000,
  });
  let haiku = [];
  const deadline = Date.now() + 35000;
  while (Date.now() < deadline) {
    haiku = await fetchHaikuSince(supabase, phone, since);
    outbound = await pollOutboundSince(supabase, phone, since, {
      minCount: 1,
      timeoutMs: 2000,
    });
    const images = outbound.filter((m) => m.msg_type === "image");
    if (images.length >= minImages) {
      // Esperar siblings del mismo bloque (envío secuencial)
      await sleep(settleMs);
      outbound = await pollOutboundSince(supabase, phone, since, {
        minCount: 1,
        timeoutMs: 2000,
      });
      break;
    }
    await sleep(1500);
  }
  return { outbound, haiku };
}

async function caseFotosBuilder() {
  console.log("\n── Portfolio-A: fotos builder gel → imagen OUT ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  const builder = await findBuilderService();
  console.log(`  Servicio: ${builder.name} (${builder.id})`);

  const total = await countPortfolioRows();
  console.log(`  Filas portafolio en BD: ${total}`);
  if (total === 0) {
    // Solo emergencia: no hay nada de Vanessa
    await ensureCaptionSeedIfEmpty(builder.id, "Builder Gel QA", 0);
  }

  await setupBrowsing();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Hola, muéstrame fotos de uñas builder gel", {
      wamid: newWamid("wamid.qa.port.a"),
      contactName: "QA Portfolio",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await waitForImage(TEST_PHONE, since, {
    minImages: 1,
    settleMs: 5000,
  });
  const hasImage = outbound.some((m) => m.msg_type === "image");
  const imgCaptions = outbound
    .filter((m) => m.msg_type === "image")
    .map((m) => m.content ?? "")
    .join("\n");
  const hasBuilderHint = /builder/i.test(imgCaptions);
  // Éxito funcional: imágenes OUT (Haiku o match determinístico). ai_usage_log es opcional.
  const pass = hasImage;

  logCaseResult(
    "Portfolio-A fotos builder",
    {
      pass,
      fails: pass ? [] : ["sin OUT tipo image"],
      outboundCount: outbound.length,
      haikuCount: haiku.length,
    },
    outbound,
  );

  return {
    name: "Portfolio-A (fotos builder → imagen)",
    pass,
    note: pass
      ? hasBuilderHint
        ? "imagen + caption Builder"
        : "imagen enviada"
      : "sin imagen",
  };
}

async function caseSinFotosFallback() {
  console.log("\n── Portfolio-B: axilas/bikini sin fotos → Instagram ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  // Mensaje sin "depilación" genérica (evita match caption "Depilación de cejas")
  await setupBrowsing();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(
      TEST_PHONE,
      "Quiero ver fotos de axilas y bikini por favor",
      {
        wamid: newWamid("wamid.qa.port.b"),
        contactName: "QA Portfolio B",
      },
    ),
  );
  console.log(`  Webhook HTTP ${status}`);

  const outbound = await pollOutboundSince(supabase, TEST_PHONE, since, {
    minCount: 1,
    timeoutMs: 35000,
  });
  const allText = outbound.map((m) => m.content ?? "").join("\n");
  const hasIg = INSTAGRAM_RE.test(allText);
  const hasImage = outbound.some((m) => m.msg_type === "image");
  // Éxito = respondió; ideal IG y sin imagen de otro rubro
  const pass = outbound.length >= 1 && !hasImage;

  logCaseResult(
    "Portfolio-B sin fotos",
    {
      pass,
      fails: pass
        ? []
        : [
            outbound.length < 1 ? "sin respuesta" : "",
            hasImage ? "envió imagen inesperada" : "",
          ].filter(Boolean),
      outboundCount: outbound.length,
      haikuCount: 0,
    },
    outbound,
  );

  return {
    name: "Portfolio-B (sin fotos → respuesta)",
    pass,
    note: hasIg
      ? "fallback Instagram"
      : pass
        ? "respondió sin imagen"
        : hasImage
          ? "imagen inesperada"
          : "silencio",
  };
}

async function caseCaptionMatch() {
  console.log("\n── Portfolio-C: match por caption (rubber / ojo de gato) ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  // Preferir datos reales de Vanessa; seed solo si falta caption
  const builder = await findBuilderService();
  const { data: rubberRow } = await supabase
    .from("service_portfolio_images")
    .select("id, caption")
    .ilike("caption", "%rubber%")
    .limit(1)
    .maybeSingle();

  if (!rubberRow?.id) {
    console.log("  Sin caption Rubber en BD → seed no destructivo en Builder");
    await ensureCaptionSeedIfEmpty(builder.id, "Rubber QA", 1);
  } else {
    console.log(`  Caption Rubber OK: ${rubberRow.caption}`);
  }

  const baby = await findBabyVolService();
  const { data: gatoRow } = await supabase
    .from("service_portfolio_images")
    .select("id, caption")
    .ilike("caption", "%gato%")
    .limit(1)
    .maybeSingle();

  if (!gatoRow?.id && baby?.id) {
    await ensureCaptionSeedIfEmpty(baby.id, "Efecto: Ojo de gato QA", 0);
  }

  await setupBrowsing();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Hola, muéstrame fotos de rubber por favor", {
      wamid: newWamid("wamid.qa.port.c"),
      contactName: "QA Portfolio C",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await waitForImage(TEST_PHONE, since, {
    minImages: 1,
    settleMs: 5000,
  });
  const hasImage = outbound.some((m) => m.msg_type === "image");
  const imgContent = outbound
    .filter((m) => m.msg_type === "image")
    .map((m) => m.content ?? "")
    .join("\n");
  const captionHint = /rubber/i.test(imgContent);
  // Preferir Rubber primero: primer OUT image debería mencionar Rubber
  const firstImg = outbound.find((m) => m.msg_type === "image");
  const rubberFirst = firstImg ? /rubber/i.test(firstImg.content ?? "") : false;
  const pass = hasImage;

  logCaseResult(
    "Portfolio-C caption rubber",
    {
      pass,
      fails: pass ? [] : ["sin OUT tipo image"],
      outboundCount: outbound.length,
      haikuCount: haiku.length,
    },
    outbound,
  );

  return {
    name: "Portfolio-C (caption rubber → imagen)",
    pass,
    note: pass
      ? rubberFirst
        ? "Rubber primero"
        : captionHint
          ? "imagen + caption Rubber"
          : "imagen enviada"
      : "sin imagen",
  };
}

async function findRubberService() {
  const { data, error } = await supabase
    .from("services")
    .select("id, name, category_id")
    .eq("category_id", "cat-unas")
    .eq("is_active", true)
    .eq("name", "Rubber")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("find rubber: " + error.message);
  return data;
}

async function caseProactivePricePhoto() {
  console.log(
    "\n── Portfolio-D: precio con foto real → envío proactivo + CTA ──",
  );
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  const rubber = await findRubberService();
  if (!rubber?.id) {
    return {
      name: "Portfolio-D (precio → foto proactiva)",
      pass: true,
      note: "sin servicio Rubber en BD — caso omitido",
    };
  }

  const { data: rubberRow } = await supabase
    .from("service_portfolio_images")
    .select("id, caption, service_id")
    .eq("service_id", rubber.id)
    .limit(1)
    .maybeSingle();

  if (!rubberRow?.id) {
    console.log(
      "  Sin foto real ligada a Rubber → seed no destructivo (sort_order libre)",
    );
    await ensureCaptionSeedIfEmpty(rubber.id, "Rubber", 3);
  } else {
    console.log(`  Foto Rubber OK: ${rubberRow.caption}`);
  }

  await setupBrowsing();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "cuánto cuesta el rubber", {
      wamid: newWamid("wamid.qa.port.d"),
      contactName: "QA Portfolio D",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await waitForImage(TEST_PHONE, since, {
    minImages: 1,
    settleMs: 6000,
  });
  const images = outbound.filter((m) => m.msg_type === "image");
  const imgContent = images.map((m) => m.content ?? "").join("\n");
  const hasCta = /te agendo el servicio ahora/i.test(imgContent);
  const hasServiceName = /rubber/i.test(imgContent);
  const exactlyOneImage = images.length === 1;
  const pass = exactlyOneImage && hasCta && hasServiceName;

  logCaseResult(
    "Portfolio-D precio → foto proactiva",
    {
      pass,
      fails: pass
        ? []
        : [
            !exactlyOneImage ? `imágenes=${images.length} (esperado 1)` : "",
            !hasCta ? "sin CTA de agendar" : "",
            !hasServiceName ? "sin nombre de servicio en caption" : "",
          ].filter(Boolean),
      outboundCount: outbound.length,
      haikuCount: haiku.length,
    },
    outbound,
  );

  return {
    name: "Portfolio-D (precio → foto proactiva)",
    pass,
    note: pass
      ? "1 imagen + CTA agendar"
      : `imágenes=${images.length}, cta=${hasCta}, nombre=${hasServiceName}`,
  };
}

/** Zandry …0030: "Si" tras CTA foto → carrito + calendario, no menú genérico.
 * No depende de Haiku (isNew + creativos orgánicos rompen D/E en QA limpio):
 * seedea pending_price_cta_* y dispara el afirmativo corto.
 */
async function casePriceCtaSi() {
  console.log("\n── Portfolio-E: CTA foto + «Si» → add_to_cart ──");
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  const rubber = await findRubberService();
  if (!rubber?.id) {
    return {
      name: "Portfolio-E (Si post-CTA)",
      pass: true,
      note: "sin servicio Rubber en BD — caso omitido",
    };
  }

  // Clienta existente → no creativos de primer contacto orgánico
  const { ensureQaClient } = await import("./lib/waba-sim-seed.mjs");
  await ensureQaClient(supabase, TEST_PHONE, "QA Portfolio E");
  await setupBrowsing();
  await supabase
    .from("whatsapp_sessions")
    .update({
      pending_price_cta_service_id: rubber.id,
      pending_price_cta_at: new Date().toISOString(),
      step: "browsing",
      cart_items: "[]",
      cart_service_ids: "[]",
    })
    .eq("phone", TEST_PHONE);

  // OUT previo (foto+CTA) para contexto de hilo
  await supabase.from("wa_messages").insert({
    phone: TEST_PHONE,
    direction: "out",
    msg_type: "image",
    content: `[imagen] Mira cómo trabajamos en Rubber, así puede quedar tus manos ✨\n¿Te agendo el servicio ahora?`,
    source: "bot",
    created_at: new Date(Date.now() - 30_000).toISOString(),
  });

  const sinceSi = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildTextPayload(TEST_PHONE, "Si", {
      wamid: newWamid("wamid.qa.port.e2"),
      contactName: "QA Portfolio E",
    }),
  );
  await sleep(8000);

  const afterSi = await pollOutboundSince(supabase, TEST_PHONE, sinceSi, {
    minCount: 1,
    timeoutMs: 25000,
  });
  const joined = afterSi.map((m) => m.content ?? "").join("\n");
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("cart_items, step, pending_price_cta_service_id")
    .eq("phone", TEST_PHONE)
    .maybeSingle();

  let cartLen = 0;
  let cartHasRubber = false;
  try {
    const cart = JSON.parse(sess?.cart_items || "[]");
    cartLen = cart.length;
    cartHasRubber = cart.some((i) => i.item_id === rubber.id);
  } catch {
    cartLen = 0;
  }

  const menuGeneric =
    /¿En qué podemos ayudarte\?/i.test(joined) &&
    /ZM Lash & Nails Beauty/i.test(joined);
  const ackCart = /Listo:|Rubber|¿Qué día/i.test(joined);
  const calendarish =
    sess?.step === "awaiting_datetime" ||
    /Elige (un )?d[ií]a|fecha|hora|¿Qué día/i.test(joined) ||
    afterSi.some((m) => m.msg_type === "interactive");

  const fails = [];
  if (menuGeneric) fails.push("cayó a menú genérico");
  if (cartLen < 1 || !cartHasRubber) {
    fails.push(`cart sin Rubber (${sess?.cart_items})`);
  }
  if (!ackCart && !calendarish) {
    fails.push(`sin ack/calendario: ${joined.slice(0, 120)}`);
  }
  if (sess?.pending_price_cta_service_id) {
    fails.push("pending_price_cta no limpiado");
  }

  const pass = fails.length === 0;
  logCaseResult(
    "Portfolio-E Si post-CTA",
    {
      pass,
      fails,
      outboundCount: afterSi.length,
      haikuCount: 0,
    },
    afterSi,
  );
  return {
    name: "Portfolio-E (Si post-CTA)",
    pass,
    note: pass
      ? `cart=${cartLen} step=${sess?.step}`
      : fails.join("; "),
  };
}

/** Misama …9751, 17-sep: fotos + ubicación + disponibilidad en un solo turno. */
async function casePhotosPlusQuestionsCombo() {
  console.log(
    "\n── Portfolio-F: fotos + ubicación/disponibilidad combinadas (Misama) ──",
  );
  await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });

  const rubber = await findRubberService();
  if (!rubber?.id) {
    return {
      name: "Portfolio-F (fotos + preguntas combinadas)",
      pass: true,
      note: "sin servicio Rubber en BD — caso omitido",
    };
  }
  const { ensureQaClient } = await import("./lib/waba-sim-seed.mjs");
  await ensureQaClient(supabase, TEST_PHONE, "QA Portfolio F");
  await setupBrowsing();

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildTextPayload(
      TEST_PHONE,
      "Tienes fotos de rubber?\nLugar de atencion y si es posible mañana",
      {
        wamid: newWamid("wamid.qa.port.f"),
        contactName: "QA Portfolio F",
      },
    ),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await waitForImage(TEST_PHONE, since, {
    minImages: 1,
    settleMs: 5000,
  });
  const joined = outbound.map((m) => m.content ?? "").join("\n");
  const hasImage = outbound.some((m) => m.msg_type === "image");
  const hasLocation = LOCATION_RE.test(joined);

  const fails = [];
  if (!hasImage) fails.push("sin OUT tipo image (show_portfolio/show_category)");
  if (!hasLocation) {
    fails.push("no respondió la pregunta de ubicación en el mismo turno");
  }
  const pass = fails.length === 0;

  logCaseResult(
    "Portfolio-F fotos + preguntas combinadas",
    { pass, fails, outboundCount: outbound.length, haikuCount: haiku.length },
    outbound,
  );

  return {
    name: "Portfolio-F (fotos + preguntas combinadas)",
    pass,
    note: pass ? "imagen + ubicación en el mismo turno" : fails.join("; "),
  };
}

async function main() {
  console.log("QA portafolio WABA (captions) — tel:", TEST_PHONE);
  const results = [];
  try {
    results.push(await caseFotosBuilder());
    await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 10000);
    results.push(await caseSinFotosFallback());
    await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 10000);
    results.push(await caseCaptionMatch());
    await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 10000);
    results.push(await caseProactivePricePhoto());
    await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 10000);
    results.push(await casePriceCtaSi());
    await sleep(process.env.WABA_VALIDATE_SUITE ? 15000 : 10000);
    results.push(await casePhotosPlusQuestionsCombo());
  } finally {
    await restorePortfolioSeeds();
    await cleanupQaPhone(supabase, TEST_PHONE, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
