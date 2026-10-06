#!/usr/bin/env node
/**
 * Cita fantasma — el bot NUNCA debe decir "cita confirmada" si el INSERT falla.
 * Origen: incidente Elizabeth (…1923, 20-jul, análisis 2026-07-21 [P1]). El bot
 * confirmó "¡Tu cita está confirmada!", pidió DNI y respondió dudas de pago y
 * dirección, pero no existía ninguna fila en appointments — el INSERT se hacía
 * sin revisar el campo `error`. Fix: insertAppointmentChecked() (payment.ts).
 *
 * Cómo se fuerza el fallo: se siembra el carrito con un service_id inexistente,
 * que viola la FK appointments_service_id_services_id_fk. Es el escenario real
 * de catálogo desincronizado (servicio borrado con el carrito ya armado).
 *
 * El bot valida `cart_service_ids` contra el catálogo antes de agendar
 * (dispatcher.ts, "Tu selección ya no está disponible"), así que para ejercitar
 * el INSERT hay que dejar los ids legacy válidos y el ítem fantasma en
 * `cart_items` — que es la fuente del INSERT cuando hay precios (useCartItems).
 *
 * Casos:
 *  A: L–S (sendConfirmedBookingSummary) con ítem fantasma → mensaje de
 *     fallback al 932, SIN "cita confirmada/anotada", 0 citas creadas, fila en
 *     wa_error_log (step booking_insert) y sesión que no queda en `completed`.
 *  B: guard previo — carrito entero inválido → el dispatcher limpia el carrito
 *     y pide elegir de nuevo, sin llegar al INSERT (defensa en profundidad).
 *  C (control): flujo normal con servicio real → confirma y crea 1 cita.
 *  D: domingo (processPaymentScreenshot, adelanto 20%) con ítem fantasma →
 *     fallback, sin "Recibido", 0 citas, fila en wa_error_log.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildImagePayload,
  buildInteractivePayload,
  postWebhook,
  newWamid,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import {
  seedSessionWithCart,
  countScheduledAppointments,
} from "./lib/waba-sim-seed.mjs";
import {
  pollResponseSince,
  assertOutbound,
  fetchWaErrorsSince,
  logCaseResult,
  finishAndExit,
  sleep,
} from "./lib/waba-sim-assert.mjs";

const PHONE_LS = "51999000991"; // casos A y B (L–S, confirmación directa)
const PHONE_SUN = "51999000988"; // caso C (domingo, adelanto 20%)

const WEEKDAY_KEY = "2026-08-19"; // miércoles, sin citas reales ni feriado
const SUNDAY_KEY = "2026-08-23"; // domingo → requiere adelanto 20%

// UUID válido que no existe en services → viola la FK de appointments.service_id
const PHANTOM_SERVICE_ID = "00000000-0000-4000-8000-00000000fa11";
const LIFTING_ID = "33fbadcc-30e8-4e82-9913-3a888aea73dc";

const INSERT_FAIL_RE = /problema al guardar tu cita/i;
const CONFIRMED_RE = /¡Tu cita está (confirmada|anotada)!/i;
const RECEIVED_RE = /Recibido|reservada provisionalmente/i;
const CART_INVALID_RE = /selección ya no está disponible/i;

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

/** Lima → UTC ISO (offset fijo -5h) para parsed_datetime de sesión. */
function limaToUtcIso(dateKey, hour, minute = 0) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hour + 5, minute, 0)).toISOString();
}

/** El servicio fantasma debe seguir siendo inexistente, o el caso no prueba nada. */
async function assertPhantomServiceMissing() {
  const { data } = await supabase
    .from("services")
    .select("id")
    .eq("id", PHANTOM_SERVICE_ID)
    .maybeSingle();
  if (data?.id) {
    throw new Error(
      `El service_id fantasma ${PHANTOM_SERVICE_ID} existe en services — elige otro id para la simulación`,
    );
  }
  const { data: real } = await supabase
    .from("services")
    .select("id")
    .eq("id", LIFTING_ID)
    .maybeSingle();
  if (!real?.id) {
    throw new Error(
      `El servicio de control ${LIFTING_ID} no existe — actualiza LIFTING_ID`,
    );
  }
}

/**
 * Sesión lista para elegir hora. `itemServiceId` es el id que usa el INSERT
 * (cart_items) y `legacyServiceId` el que valida el dispatcher — distintos solo
 * cuando se quiere llegar al INSERT con un ítem fantasma.
 */
async function seedAwaitingDatetime(
  phone,
  itemServiceId,
  dateKey,
  legacyServiceId = itemServiceId,
) {
  await seedSessionWithCart(supabase, phone, itemServiceId, 50);
  await supabase
    .from("whatsapp_sessions")
    .update({
      step: "awaiting_datetime",
      selected_day: dateKey,
      cart_service_ids: JSON.stringify([legacyServiceId]),
      updated_at: new Date().toISOString(),
    })
    .eq("phone", phone);
}

async function seedAwaitingPaymentScreenshot(phone, serviceId, hour) {
  const cartItems = JSON.stringify([
    { item_type: "service", item_id: serviceId, quantity: 1, price: 50 },
  ]);
  await supabase.from("whatsapp_sessions").upsert({
    phone,
    step: "awaiting_payment_screenshot",
    awaiting_screenshot: true,
    cart_items: cartItems,
    cart_service_ids: JSON.stringify([serviceId]),
    parsed_datetime: limaToUtcIso(SUNDAY_KEY, hour),
    employee_assignments: "{}",
    updated_at: new Date().toISOString(),
  });
}

async function sessionStep(phone) {
  const { data } = await supabase
    .from("whatsapp_sessions")
    .select("step")
    .eq("phone", phone)
    .maybeSingle();
  return data?.step ?? null;
}

async function validateFalloInsertNoConfirma() {
  console.log(
    "\n── Caso A: L–S con servicio fantasma en carrito → fallback, no confirmar ──",
  );
  await cleanupQaPhone(supabase, PHONE_LS, { deleteClient: true });
  await seedAwaitingDatetime(
    PHONE_LS,
    PHANTOM_SERVICE_ID,
    WEEKDAY_KEY,
    LIFTING_ID,
  );

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildInteractivePayload(PHONE_LS, `time_${WEEKDAY_KEY}T1100`, "11:00 AM", {
      wamid: newWamid("wamid.qa.phantom.a"),
      contactName: "QA Fantasma",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(
    supabase,
    PHONE_LS,
    since,
  );
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [INSERT_FAIL_RE],
    mustNotMatch: [CONFIRMED_RE],
    expectHaiku: false,
  });

  const appts = await countScheduledAppointments(supabase, PHONE_LS);
  if (appts !== 0) result.fails.push(`esperaba 0 citas creadas, hay ${appts}`);

  const errors = await fetchWaErrorsSince(supabase, PHONE_LS, since);
  const logged = errors.find(
    (e) =>
      e.step === "booking_insert" &&
      e.context?.flow === "sendConfirmedBookingSummary",
  );
  if (!logged) {
    result.fails.push("sin fila en wa_error_log (step booking_insert)");
  } else if (logged.fallback_sent !== true) {
    result.fails.push("wa_error_log con fallback_sent=false");
  }

  const step = await sessionStep(PHONE_LS);
  if (step === "completed") {
    result.fails.push("sesión quedó en completed pese al fallo del INSERT");
  }

  const pass = result.fails.length === 0;
  logCaseResult("Fantasma-A INSERT falla", { ...result, pass }, outbound);

  return {
    name: "Caso A (L–S, INSERT falla)",
    pass,
    note: pass
      ? "Avisa del problema y deriva al 932; no confirma cita inexistente y deja rastro en wa_error_log"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateGuardCarritoInvalido() {
  console.log(
    "\n── Caso B: carrito entero inválido → guard previo, no llega al INSERT ──",
  );
  await cleanupQaPhone(supabase, PHONE_LS, { deleteClient: true });
  await seedAwaitingDatetime(PHONE_LS, PHANTOM_SERVICE_ID, WEEKDAY_KEY);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildInteractivePayload(PHONE_LS, `time_${WEEKDAY_KEY}T1100`, "11:00 AM", {
      wamid: newWamid("wamid.qa.phantom.b"),
      contactName: "QA Fantasma",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(
    supabase,
    PHONE_LS,
    since,
  );
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [CART_INVALID_RE],
    mustNotMatch: [CONFIRMED_RE],
    expectHaiku: false,
  });

  const appts = await countScheduledAppointments(supabase, PHONE_LS);
  if (appts !== 0) result.fails.push(`esperaba 0 citas creadas, hay ${appts}`);

  const pass = result.fails.length === 0;
  logCaseResult("Fantasma-B guard carrito", { ...result, pass }, outbound);

  return {
    name: "Caso B (guard previo, carrito inválido)",
    pass,
    note: pass
      ? "Detecta el carrito obsoleto antes de intentar la cita y pide elegir de nuevo"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateBookingRealControl() {
  console.log(
    "\n── Caso C (control): L–S con servicio real → confirma y crea cita ──",
  );
  await cleanupQaPhone(supabase, PHONE_LS, { deleteClient: true });
  await seedAwaitingDatetime(PHONE_LS, LIFTING_ID, WEEKDAY_KEY);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildInteractivePayload(PHONE_LS, `time_${WEEKDAY_KEY}T1500`, "3:00 PM", {
      wamid: newWamid("wamid.qa.phantom.c"),
      contactName: "QA Fantasma",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(
    supabase,
    PHONE_LS,
    since,
  );
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [CONFIRMED_RE],
    mustNotMatch: [INSERT_FAIL_RE],
    expectHaiku: false,
  });

  const appts = await countScheduledAppointments(supabase, PHONE_LS);
  if (appts !== 1) result.fails.push(`esperaba 1 cita creada, hay ${appts}`);

  const pass = result.fails.length === 0;
  logCaseResult("Fantasma-C control cita real", { ...result, pass }, outbound);

  return {
    name: "Caso C (control, INSERT correcto)",
    pass,
    note: pass
      ? "Servicio válido confirma y persiste la cita (sin falso positivo del fix)"
      : result.fails.join("; ") || "Falló",
  };
}

async function validateFalloInsertFlujoPago() {
  console.log(
    "\n── Caso D: domingo (captura de pago) con servicio fantasma → fallback ──",
  );
  await cleanupQaPhone(supabase, PHONE_SUN, { deleteClient: true });
  await seedAwaitingPaymentScreenshot(PHONE_SUN, PHANTOM_SERVICE_ID, 11);

  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildImagePayload(PHONE_SUN, {
      wamid: newWamid("wamid.qa.phantom.d"),
      contactName: "QA Fantasma Domingo",
    }),
  );
  console.log(`  Webhook HTTP ${status}`);

  const { outbound, haiku } = await pollResponseSince(
    supabase,
    PHONE_SUN,
    since,
  );
  const result = assertOutbound(outbound, haiku, {
    mustMatch: [INSERT_FAIL_RE],
    mustNotMatch: [RECEIVED_RE],
    expectHaiku: false,
  });

  const appts = await countScheduledAppointments(supabase, PHONE_SUN);
  if (appts !== 0) result.fails.push(`esperaba 0 citas creadas, hay ${appts}`);

  const errors = await fetchWaErrorsSince(supabase, PHONE_SUN, since);
  const logged = errors.find(
    (e) =>
      e.step === "booking_insert" &&
      e.context?.flow === "processPaymentScreenshot",
  );
  if (!logged) {
    result.fails.push("sin fila en wa_error_log (processPaymentScreenshot)");
  }

  const pass = result.fails.length === 0;
  logCaseResult("Fantasma-D flujo pago domingo", { ...result, pass }, outbound);

  return {
    name: "Caso D (domingo, INSERT falla al pagar)",
    pass,
    note: pass
      ? "El flujo con adelanto tampoco confirma sin fila en appointments"
      : result.fails.join("; ") || "Falló",
  };
}

async function main() {
  console.log("Validación cita fantasma — teléfonos QA:", PHONE_LS, PHONE_SUN);
  await assertPhantomServiceMissing();
  await cleanupQaPhone(supabase, PHONE_LS, { deleteClient: true });
  await cleanupQaPhone(supabase, PHONE_SUN, { deleteClient: true });
  if (process.env.WABA_VALIDATE_SUITE) await sleep(3000);

  const results = [];
  try {
    results.push(await validateFalloInsertNoConfirma());
    await sleep(4000);
    results.push(await validateGuardCarritoInvalido());
    await sleep(4000);
    // Deja este al final del teléfono L–S: crea cita y activaría el bloqueo
    // de "otra cita en el mismo chat" en los casos siguientes.
    results.push(await validateBookingRealControl());
    await sleep(4000);
    results.push(await validateFalloInsertFlujoPago());
  } finally {
    await cleanupQaPhone(supabase, PHONE_LS, { deleteClient: true });
    await cleanupQaPhone(supabase, PHONE_SUN, { deleteClient: true });
  }
  finishAndExit(results);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
