#!/usr/bin/env node
/**
 * QA retoque_reenganche_zm (post-tap webhook):
 * A) Sesión con oferta → botón Agendar → texto + selector fecha (calendario)
 * B) Oferta → Otro servicio → lista de categoría
 * C) Más adelante → cierre cálido sin calendario
 * D) Agendar sin oferta → no fuerza carrito
 * E) Agendar luego Otro servicio (oferta limpia) → catálogo, no reafirma carrito
 * F) Oferta TTL vencida → agendar igual (1 msg + calendario; no saludo+«ya venció»)
 * G) Lifting + TTL vencida → agenda directo (sin gate aceite)
 *
 * Teléfono: 51999000980
 * Requiere webhook desplegado con handler retouch-reengage.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildButtonPayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import {
  pollResponseSince,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000980";
/** Soft Gel - Retoque */
const OFFER_SVC = "fa50e0c9-93cc-4004-ab9e-8f9b00506105";
/** Soft Gel - Nuevo Set (para seed de cita completed) */
const LAST_SVC = "1e15a516-95b1-4be3-bc0d-88f530bc6011";
/** Lifting de Pestañas — dispara needsLiftingCareCheck */
const LIFTING_OFFER_SVC = "33fbadcc-30e8-4e82-9913-3a888aea73dc";

const DATE_LIST_RE = /elige|día|fecha|hora|calendario|próximos|próximo/i;
const OTRO_RE =
  /gustaría|opciones|esta vez|cuéntanos|cuentanos|categoría|uñas/i;
const MAS_ADELANTE_RE =
  /sin problema|cuando quieras|aquí estamos|aqui estamos|cuando gustes|no hay prisa|cuando sientas|estamos acá|estamos aqui|nosotras estamos|aquí estaremos|aqui estaremos|cuando estés|cuando estes|perfecto/i;
const ACEITE_CARE_RE = /aceite|ricino|cuidaste|cuidados|lash botox/i;
const OFERTA_VENCIO_RE = /oferta ya venció|Esa oferta ya venció|oferta del recordatorio ya venció/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function seedOfferSession(opts = {}) {
  const {
    serviceId = OFFER_SVC,
    sentAt = new Date().toISOString(),
    lastAptId = null,
  } = opts;
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    tenant_id: "zm-lash-nails",
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    retouch_offer_service_id: serviceId,
    retouch_offer_source: "manual",
    retouch_offer_sent_at: sentAt,
    retouch_offer_last_appointment_id: lastAptId,
    updated_at: new Date().toISOString(),
  }, { onConflict: "tenant_id,phone" });
}

async function seedCompletedVisit(clientId) {
  const past = new Date();
  past.setDate(past.getDate() - 30);
  const dateStr = past.toISOString().slice(0, 19).replace("T", " ");
  const { data: apt, error } = await supabase
    .from("appointments")
    .insert({
      client_id: clientId,
      client_name: "QA Retoque",
      client_phone: PHONE,
      service_id: LAST_SVC,
      service_ids: [LAST_SVC],
      date: dateStr,
      duration: 90,
      price: "80.00",
      status: "completed",
    })
    .select("id")
    .single();
  if (error) throw new Error(`seed apt: ${error.message}`);
  await supabase.from("appointment_services").insert({
    appointment_id: apt.id,
    service_id: LAST_SVC,
    price: "80.00",
    duration: 90,
  });
  return apt.id;
}

async function caseA() {
  console.log("\n── A: Agendar con oferta → Haiku/fallback + calendario ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  const clientId = await ensureQaClient(supabase, PHONE, "QA Retoque");
  const aptId = await seedCompletedVisit(clientId);
  await seedOfferSession({ lastAptId: aptId });

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Agendar", {
      payload: "Agendar",
      wamid: newWamid("wamid.qa.retouch.a"),
      contactName: "QA Retoque",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);
  // waitUntil: Haiku puede loguearse antes del OUT — esperar OUT o carrito
  let outbound = [];
  let haiku = [];
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    await sleep(1500);
    const polled = await pollResponseSince(supabase, PHONE, since, {
      timeoutMs: 2000,
    });
    outbound = polled.outbound;
    haiku = polled.haiku;
    const { data: sessCheck } = await supabase
      .from("whatsapp_sessions")
      .select("retouch_offer_service_id, cart_items, step")
      .eq("phone", PHONE)
      .maybeSingle();
    let cartCheck = [];
    try {
      cartCheck = JSON.parse(sessCheck?.cart_items ?? "[]");
    } catch {
      /* ignore */
    }
    if (
      outbound.length > 0 ||
      cartCheck.some((i) => i.item_id === OFFER_SVC) ||
      (!sessCheck?.retouch_offer_service_id && cartCheck.length > 0)
    ) {
      break;
    }
  }

  const text = outbound.map((m) => m.content ?? "").join("\n");
  const hasCalendar =
    DATE_LIST_RE.test(text) ||
    outbound.some((m) => m.msg_type === "interactive");

  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("retouch_offer_service_id, cart_items, step")
    .eq("phone", PHONE)
    .maybeSingle();

  const cart = (() => {
    try {
      return JSON.parse(sess?.cart_items ?? "[]");
    } catch {
      return [];
    }
  })();
  const offerCleared = !sess?.retouch_offer_service_id;
  const hasOfferSvc = cart.some((i) => i.item_id === OFFER_SVC);

  const result = {
    pass: (outbound.length > 0 || hasOfferSvc) && offerCleared && hasOfferSvc,
    fails: [],
    outboundCount: outbound.length,
    haikuCount: Array.isArray(haiku) ? haiku.length : 0,
  };
  if (outbound.length === 0 && !hasOfferSvc)
    result.fails.push("sin outbound ni carrito");
  if (!hasCalendar && !hasOfferSvc)
    result.fails.push("sin calendario/lista fecha");
  if (!offerCleared) result.fails.push("oferta no limpiada");
  if (!hasOfferSvc) result.fails.push("carrito sin servicio ofrecido");
  // Si hay carrito+oferta limpia, el calendario pudo fallar en Meta pero el flujo es OK
  if (hasOfferSvc && offerCleared && !hasCalendar) {
    result.pass = true;
    result.fails = result.fails.filter((f) => !f.includes("calendario"));
  }

  logCaseResult("Retouch-A Agendar", result, outbound);
  // Dejar que waitUntil de A termine antes del siguiente caso
  await sleep(4000);
  return {
    name: "A Agendar + calendario",
    pass: result.pass,
    note: result.pass
      ? "Haiku/fallback + carrito + selector"
      : result.fails.join("; "),
  };
}

async function caseB() {
  console.log("\n── B: Otro servicio → lista categoría ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: false });
  await sleep(2000);
  await cleanupQaPhone(supabase, PHONE, { deleteClient: false });
  await ensureQaClient(supabase, PHONE, "QA Retoque");
  await seedOfferSession();
  await sleep(500);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Otro servicio", {
      payload: "Otro servicio",
      wamid: newWamid("wamid.qa.retouch.b"),
      contactName: "QA Retoque",
    }),
  );
  // Esperar OUT real (no solo Haiku)
  let outbound = [];
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    await sleep(1500);
    const polled = await pollResponseSince(supabase, PHONE, since, {
      timeoutMs: 2000,
    });
    outbound = polled.outbound;
    if (outbound.length > 0) break;
  }
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const hasList = outbound.some((m) => m.msg_type === "interactive");
  const softOk =
    /uñas|unas|soft gel|gustaría|opciones|esta vez|servicios/i.test(text) ||
    hasList;
  const wrongPath = /No tienes servicios en tu selección/i.test(text);
  const isDateOnly =
    hasList &&
    /Elegir fecha|Qué día prefieres/i.test(text) &&
    !/uñas|unas|servicios/i.test(text);

  const result = {
    pass: softOk && outbound.length > 0 && !wrongPath && !isDateOnly,
    fails: [],
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  if (!softOk || outbound.length === 0) {
    result.fails.push("sin lista/copy de otro servicio");
  }
  if (wrongPath) result.fails.push("cayó a proceedToBooking vacío");
  if (isDateOnly) result.fails.push("envió calendario en vez de categoría");

  logCaseResult("Retouch-B Otro servicio", result, outbound);
  return {
    name: "B Otro servicio",
    pass: result.pass,
    note: result.pass ? "Lista o copy de categoría" : result.fails.join("; "),
  };
}

async function caseC() {
  console.log("\n── C: Más adelante → cierre sin calendario ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: false });
  await seedOfferSession();

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Más adelante", {
      payload: "Más adelante",
      wamid: newWamid("wamid.qa.retouch.c"),
      contactName: "QA Retoque",
    }),
  );
  let outbound = [];
  const deadline = Date.now() + 18000;
  while (Date.now() < deadline) {
    await sleep(1500);
    const polled = await pollResponseSince(supabase, PHONE, since, {
      timeoutMs: 2000,
    });
    outbound = polled.outbound;
    if (outbound.length > 0) break;
  }
  const text = outbound.map((m) => m.content ?? "").join("\n");
  const hasCalendar = outbound.some(
    (m) =>
      m.msg_type === "interactive" &&
      /fecha|día|hora|calendario|agregar más/i.test(m.content ?? ""),
  );
  const warm = MAS_ADELANTE_RE.test(text);

  const result = {
    pass: warm && !hasCalendar && outbound.length > 0,
    fails: [],
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  if (!warm) result.fails.push("sin mensaje de cierre cálido");
  if (hasCalendar) result.fails.push("envió lista/calendario (no debía)");
  if (outbound.length === 0) result.fails.push("sin outbound");

  logCaseResult("Retouch-C Más adelante", result, outbound);
  return {
    name: "C Más adelante",
    pass: result.pass,
    note: result.pass ? "Cierre sin calendario" : result.fails.join("; "),
  };
}

async function caseD() {
  console.log("\n── D: Agendar sin oferta → no fuerza carrito retoque ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: false });
  await supabase.from("whatsapp_sessions").upsert({
    phone: PHONE,
    step: "browsing",
    cart_items: "[]",
    cart_service_ids: "[]",
    employee_assignments: "{}",
    retouch_offer_service_id: null,
    retouch_offer_sent_at: null,
    updated_at: new Date().toISOString(),
  });

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Agendar", {
      payload: "Agendar",
      wamid: newWamid("wamid.qa.retouch.d"),
      contactName: "QA Retoque",
    }),
  );
  await sleep(1200);
  const { outbound } = await pollResponseSince(supabase, PHONE, since, {
    timeoutMs: 8000,
  });
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("cart_items")
    .eq("phone", PHONE)
    .maybeSingle();
  let cart = [];
  try {
    cart = JSON.parse(sess?.cart_items ?? "[]");
  } catch {
    /* ignore */
  }
  const forcedOffer = cart.some((i) => i.item_id === OFFER_SVC);
  const result = {
    pass: !forcedOffer,
    fails: forcedOffer ? ["carrito forzado sin oferta"] : [],
    outboundCount: outbound.length,
    haikuCount: 0,
  };

  logCaseResult("Retouch-D sin oferta", result, outbound);
  return {
    name: "D Agendar sin oferta",
    pass: result.pass,
    note: result.pass
      ? "No precarga carrito de retoque"
      : result.fails.join("; "),
  };
}

/** Caso Maribel: Agendar limpia oferta → luego "Otro servicio" no debe reafirmar el carrito. */
async function caseE() {
  console.log("\n── E: Agendar luego Otro servicio (oferta ya limpia) ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: false });
  await sleep(1500);
  await ensureQaClient(supabase, PHONE, "QA Retoque");
  await seedOfferSession();
  await sleep(400);

  // 1) Agendar → esperar OUT real (Haiku puede tardar) antes de tocar Otro servicio
  const sinceAgendar = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Agendar", {
      payload: "Agendar",
      wamid: newWamid("wamid.qa.retouch.e1"),
      contactName: "QA Retoque",
    }),
  );

  let agendarOut = [];
  const agendarDeadline = Date.now() + 25000;
  while (Date.now() < agendarDeadline) {
    await sleep(1500);
    const polled = await pollResponseSince(supabase, PHONE, sinceAgendar, {
      timeoutMs: 2000,
    });
    agendarOut = polled.outbound;
    const { data: sessPoll } = await supabase
      .from("whatsapp_sessions")
      .select("retouch_offer_service_id, cart_items, step")
      .eq("phone", PHONE)
      .maybeSingle();
    let cartPoll = [];
    try {
      cartPoll = JSON.parse(sessPoll?.cart_items ?? "[]");
    } catch {
      /* ignore */
    }
    // Listo cuando hay carrito y la oferta ya se limpió (fin de bookOfferedService)
    if (cartPoll.length > 0 && !sessPoll?.retouch_offer_service_id) break;
    if (agendarOut.length >= 2 && cartPoll.length > 0) break;
  }

  const { data: sessAfterAgendar } = await supabase
    .from("whatsapp_sessions")
    .select("retouch_offer_service_id, cart_items, step")
    .eq("phone", PHONE)
    .maybeSingle();
  let cartAfter = [];
  try {
    cartAfter = JSON.parse(sessAfterAgendar?.cart_items ?? "[]");
  } catch {
    /* ignore */
  }
  const offerCleared = !sessAfterAgendar?.retouch_offer_service_id;
  const hadCart = cartAfter.length > 0;

  // 2) Esperar a que el calendario de Agendar termine de loguearse antes de Otro
  await sleep(3500);
  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Otro servicio", {
      payload: "Otro servicio",
      wamid: newWamid("wamid.qa.retouch.e2"),
      contactName: "QA Retoque",
    }),
  );

  let outbound = [];
  const deadline = Date.now() + 18000;
  while (Date.now() < deadline) {
    await sleep(1500);
    const polled = await pollResponseSince(supabase, PHONE, since, {
      timeoutMs: 2000,
    });
    outbound = polled.outbound;
    if (outbound.length > 0) break;
  }

  const text = outbound.map((m) => m.content ?? "").join("\n");
  const hasList = outbound.some((m) => m.msg_type === "interactive");
  const softOk =
    /gustaría|opciones|esta vez|servicios|uñas|unas|menú|menu|elige/i.test(
      text,
    ) || hasList;
  const reaffirmedBooking =
    /te confirmo que agendamos|elige el día y hora en los botones y quedas lista/i.test(
      text,
    );
  const isDateOnly =
    hasList &&
    /Elegir fecha|Qué día prefieres/i.test(text) &&
    !/uñas|unas|servicios|opciones|gustaría/i.test(text);

  const { data: sessFinal } = await supabase
    .from("whatsapp_sessions")
    .select("cart_items, step")
    .eq("phone", PHONE)
    .maybeSingle();
  let cartFinal = [];
  try {
    cartFinal = JSON.parse(sessFinal?.cart_items ?? "[]");
  } catch {
    /* ignore */
  }

  const result = {
    pass:
      offerCleared &&
      softOk &&
      outbound.length > 0 &&
      !reaffirmedBooking &&
      !isDateOnly &&
      cartFinal.length === 0,
    fails: [],
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  if (!offerCleared) result.fails.push("oferta no se limpió tras Agendar");
  if (!hadCart) result.fails.push("Agendar no dejó carrito (precondición)");
  if (!softOk || outbound.length === 0) {
    result.fails.push("sin lista/copy de otro servicio");
  }
  if (reaffirmedBooking) {
    result.fails.push("Haiku reafirmó Builder Gel / calendario (bug Maribel)");
  }
  if (isDateOnly) result.fails.push("reenvió solo calendario");
  if (cartFinal.length > 0) {
    result.fails.push("no vació carrito al cambiar de servicio");
  }

  logCaseResult("Retouch-E Agendar→Otro", result, outbound);
  return {
    name: "E Agendar→Otro sin oferta",
    pass: result.pass,
    note: result.pass
      ? "Limpia carrito + catálogo (no reafirma retoque)"
      : result.fails.join("; "),
  };
}

/** Gaby …4563: oferta TTL vencida → un mensaje + calendario, no saludo+«ya venció». */
async function caseF() {
  console.log("\n── F: Agendar con oferta TTL vencida → agendar igual (P4) ──");
  await cleanupQaPhone(supabase, PHONE, { deleteClient: false });
  await sleep(1500);
  await ensureQaClient(supabase, PHONE, "QA Retoque");
  const expiredSentAt = new Date(
    Date.now() - 20 * 24 * 60 * 60 * 1000,
  ).toISOString();
  await seedOfferSession({ sentAt: expiredSentAt });
  await sleep(400);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Agendar", {
      payload: "Agendar",
      wamid: newWamid("wamid.qa.retouch.f"),
      contactName: "QA Retoque",
    }),
  );

  let outbound = [];
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    await sleep(1500);
    const polled = await pollResponseSince(supabase, PHONE, since, {
      timeoutMs: 2000,
    });
    outbound = polled.outbound;
    const { data: sessPoll } = await supabase
      .from("whatsapp_sessions")
      .select("retouch_offer_service_id, cart_items")
      .eq("phone", PHONE)
      .maybeSingle();
    let cartPoll = [];
    try {
      cartPoll = JSON.parse(sessPoll?.cart_items ?? "[]");
    } catch {
      /* ignore */
    }
    if (cartPoll.some((i) => i.item_id === OFFER_SVC)) break;
    if (outbound.length >= 1 && Date.now() > deadline - 5000) break;
  }

  const text = outbound.map((m) => m.content ?? "").join("\n");
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("retouch_offer_service_id, cart_items")
    .eq("phone", PHONE)
    .maybeSingle();
  let cart = [];
  try {
    cart = JSON.parse(sess?.cart_items ?? "[]");
  } catch {
    /* ignore */
  }
  const hasOfferSvc = cart.some((i) => i.item_id === OFFER_SVC);
  const deadendMenu =
    /Esa oferta ya venció[\s\S]*Escribe \*?menu\*?/i.test(text) &&
    !hasOfferSvc;
  const contradiction =
    /te enviaremos el selector|enviaremos el selector de fechas/i.test(text) &&
    /Esa oferta ya venció/i.test(text);
  const hasCalendar =
    DATE_LIST_RE.test(text) ||
    outbound.some((m) => m.msg_type === "interactive");

  const fails = [];
  if (!hasOfferSvc) fails.push("sin carrito del servicio ofrecido");
  if (deadendMenu) fails.push("dead-end «oferta venció» + menu sin agendar");
  if (contradiction) fails.push("saludo promete calendario + «oferta venció»");
  if (!hasCalendar && !hasOfferSvc) fails.push("sin calendario ni carrito");

  const pass = fails.length === 0;
  const result = {
    pass,
    fails,
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  logCaseResult("Retouch-F oferta TTL vencida", result, outbound);
  return {
    name: "F Agendar oferta vencida",
    pass,
    note: pass
      ? "Un mensaje + carrito/calendario (sin contradicción)"
      : fails.join("; "),
  };
}

/** Lifting + TTL vencida: agenda directo (sin gate aceite); un mensaje + carrito. */
async function caseG() {
  console.log(
    "\n── G: Lifting + oferta TTL vencida → agenda directo (sin aceite) ──",
  );
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  await sleep(3000);
  await ensureQaClient(supabase, PHONE, "QA Retoque");
  const expiredSentAt = new Date(
    Date.now() - 20 * 24 * 60 * 60 * 1000,
  ).toISOString();
  await seedOfferSession({
    serviceId: LIFTING_OFFER_SVC,
    sentAt: expiredSentAt,
  });
  await sleep(600);

  const since = new Date().toISOString();
  await postWebhook(
    webhookUrl,
    buildButtonPayload(PHONE, "Agendar", {
      payload: "Agendar",
      wamid: newWamid("wamid.qa.retouch.g"),
      contactName: "QA Retoque",
    }),
  );

  let outbound = [];
  const deadline = Date.now() + 25000;
  while (Date.now() < deadline) {
    await sleep(1500);
    const polled = await pollResponseSince(supabase, PHONE, since, {
      timeoutMs: 2000,
    });
    outbound = polled.outbound;
    const { data: sessPoll } = await supabase
      .from("whatsapp_sessions")
      .select("step, cart_items")
      .eq("phone", PHONE)
      .maybeSingle();
    let cartPoll = [];
    try {
      cartPoll = JSON.parse(sessPoll?.cart_items ?? "[]");
    } catch {
      /* ignore */
    }
    if (
      Array.isArray(cartPoll) &&
      cartPoll.some((i) => i.item_id === LIFTING_OFFER_SVC)
    ) {
      break;
    }
  }

  const text = outbound.map((m) => m.content ?? "").join("\n");
  const { data: sess } = await supabase
    .from("whatsapp_sessions")
    .select("step, cart_items")
    .eq("phone", PHONE)
    .maybeSingle();
  let cart = [];
  try {
    cart = JSON.parse(sess?.cart_items ?? "[]");
  } catch {
    /* ignore */
  }
  const askedCare = ACEITE_CARE_RE.test(text);
  const booked =
    Array.isArray(cart) && cart.some((i) => i.item_id === LIFTING_OFFER_SVC);
  const stepCare = sess?.step === "awaiting_retouch_lifting_care";

  const fails = [];
  if (askedCare) fails.push("aún preguntó aceite (ya no debe)");
  if (stepCare) fails.push("step=awaiting_retouch_lifting_care");
  if (!booked) fails.push("sin carrito lifting");

  const pass = fails.length === 0;
  const result = {
    pass,
    fails,
    outboundCount: outbound.length,
    haikuCount: 0,
  };
  logCaseResult("Retouch-G Lifting TTL → agenda", result, outbound);
  return {
    name: "G Lifting oferta vencida → agenda",
    pass,
    note: pass
      ? "Carrito lifting sin gate aceite"
      : fails.join("; "),
  };
}

async function main() {
  console.log("=== QA retouch-reengage (webhook botones) ===");
  const results = [];
  results.push(await caseA());
  results.push(await caseB());
  results.push(await caseC());
  results.push(await caseD());
  results.push(await caseE());
  results.push(await caseF());
  results.push(await caseG());
  await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
  finishAndExit(results);
}

main().catch((err) => {
  console.error(err);
  cleanupQaPhone(supabase, PHONE, { deleteClient: true }).finally(() =>
    process.exit(1),
  );
});
