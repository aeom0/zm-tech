#!/usr/bin/env node
/**
 * Recrea el caso Melisa Quilca Prado:
 * - Baby Vol. Tecnológica 3D
 * - horario QA equivalente (el viernes 21 de agosto está ocupado por la cita real)
 * - clienta nueva → resumen con abono fijo
 * - aprobación del comprobante → confirmación + políticas actualizadas
 *
 * Usa un teléfono QA, nunca el número real de la clienta.
 * Ejecutar aislado: modifica y limpia datos del teléfono QA.
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnvFromRoot } from "./lib/waba-sim-env.mjs";
import {
  buildButtonPayload,
  buildInteractivePayload,
  newWamid,
  postWebhook,
} from "./lib/waba-sim-payload.mjs";
import { cleanupQaPhone } from "./lib/waba-sim-cleanup.mjs";
import { ensureQaClient } from "./lib/waba-sim-seed.mjs";
import { finishAndExit, pollOutboundSince } from "./lib/waba-sim-assert.mjs";

const PHONE = "51999000997";
const ADMIN_PHONE = "51999000996";
const TENANT_ID = "zm-lash-nails";
const QA_DATE = "2026-08-25";
const QA_TIME = "1530";
const APPOINTMENT_DATE = `${QA_DATE} 15:30:00`;
const VERIFICATION_DATE = "2026-08-25T20:30:00.000Z";
const SERVICE_NAME = "Baby Vol. Tecnológica 3D";
const SERVICE_PRICE = "99.90";
const DEPOSIT = "25.00";

const { url, serviceKey, webhookUrl } = loadEnvFromRoot();
const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});

async function findServiceId() {
  const { data, error } = await supabase
    .from("services")
    .select("id, name")
    .limit(1000);
  if (error) throw new Error(`services: ${error.message}`);

  const normalize = (value) =>
    value
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase();
  const service = (data ?? []).find((row) => {
    const name = normalize(row.name);
    return (
      name.includes("baby") &&
      name.includes("3d") &&
      name.includes("tecnologic")
    );
  });
  if (!service) {
    throw new Error(`No se encontró el servicio "${SERVICE_NAME}"`);
  }
  return service.id;
}

async function seedBrowsing(serviceId) {
  await ensureQaClient(supabase, PHONE, "Melisa Quilca Prado QA");
  const { error } = await supabase.from("whatsapp_sessions").upsert(
    {
      phone: PHONE,
      tenant_id: TENANT_ID,
      step: "awaiting_datetime",
      selected_day: QA_DATE,
      cart_items: JSON.stringify([
        {
          item_type: "service",
          item_id: serviceId,
          quantity: 1,
          price: Number(SERVICE_PRICE),
        },
      ]),
      cart_service_ids: JSON.stringify([serviceId]),
      employee_assignments: "{}",
      deposit_mode: null,
      parsed_datetime: null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tenant_id,phone" },
  );
  if (error) throw new Error(`whatsapp_sessions: ${error.message}`);
}

async function tapTime() {
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildInteractivePayload(PHONE, `time_${QA_DATE}T${QA_TIME}`, "3:30 p. m.", {
      wamid: newWamid("wamid.qa.melisa.time"),
      contactName: "Melisa Quilca Prado",
      kind: "list",
    }),
  );
  if (status !== 200) throw new Error(`tap hora HTTP ${status}`);
  return pollOutboundSince(supabase, PHONE, since, {
    minCount: 1,
    timeoutMs: 25000,
  });
}

async function seedVerification(serviceId) {
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id")
    .eq("phone_normalized", "999000997")
    .maybeSingle();
  if (clientError) throw new Error(`clients: ${clientError.message}`);
  if (!client?.id) throw new Error("No se encontró la clienta QA");

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      tenant_id: TENANT_ID,
      client_id: client.id,
      client_name: "Melisa Quilca Prado",
      client_phone: PHONE,
      whatsapp_phone: PHONE,
      service_id: serviceId,
      date: APPOINTMENT_DATE,
      duration: 90,
      price: SERVICE_PRICE,
      status: "scheduled",
      source: "whatsapp",
    })
    .select("id")
    .single();
  if (appointmentError) {
    throw new Error(`appointments: ${appointmentError.message}`);
  }

  const { error: lineError } = await supabase
    .from("appointment_services")
    .insert({
      tenant_id: TENANT_ID,
      appointment_id: appointment.id,
      service_id: serviceId,
      price: SERVICE_PRICE,
      duration: 90,
    });
  if (lineError) throw new Error(`appointment_services: ${lineError.message}`);

  const { data: verification, error: verificationError } = await supabase
    .from("appointment_verifications")
    .insert({
      tenant_id: TENANT_ID,
      appointment_id: appointment.id,
      client_phone: PHONE,
      client_name: "Melisa Quilca Prado",
      service_name: SERVICE_NAME,
      appointment_date: VERIFICATION_DATE,
      amount_deposit: DEPOSIT,
      amount_total: SERVICE_PRICE,
      payment_screenshot_url:
        "https://udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/waba-images/qa/melisa-payment.jpg",
      status: "payment_submitted",
      kind: "deposit",
    })
    .select("id")
    .single();
  if (verificationError) {
    throw new Error(`appointment_verifications: ${verificationError.message}`);
  }
  return verification.id;
}

async function approveVerification(verificationId) {
  const since = new Date().toISOString();
  const status = await postWebhook(
    webhookUrl,
    buildButtonPayload(ADMIN_PHONE, "Aprobar", {
      wamid: newWamid("wamid.qa.melisa.approve"),
      payload: `pay_verify_approve:${verificationId}`,
      contactName: "Vanessa QA",
    }),
  );
  if (status !== 200) throw new Error(`aprobación HTTP ${status}`);
  return pollOutboundSince(supabase, PHONE, since, {
    minCount: 5,
    timeoutMs: 25000,
  });
}

async function main() {
  const results = [];
  console.log("=== waba:validate:melisa-chat ===\n");
  console.log(`Teléfono QA: ${PHONE}`);

  try {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
    await cleanupQaPhone(supabase, ADMIN_PHONE, { deleteClient: true });
    const serviceId = await findServiceId();
    await seedBrowsing(serviceId);

    const paymentSummary = await tapTime();
    const summaryText = paymentSummary
      .map((row) => row.content ?? "")
      .join("\n");
    const summaryPass =
      /Baby.*3D/i.test(summaryText) &&
      /S\/\s*25/i.test(summaryText) &&
      /25/i.test(summaryText);
    results.push({
      name: "Resumen de reserva Melisa",
      pass: summaryPass,
      note: summaryPass
        ? "servicio, fecha y abono fijo presentes"
        : `no contiene el resumen esperado: ${summaryText.slice(0, 180)}`,
    });

    const verificationId = await seedVerification(serviceId);
    const confirmation = await approveVerification(verificationId);
    const confirmationText = confirmation
      .map((row) => row.content ?? "")
      .join("\n");
    const policyPass =
      /Inasistencia/i.test(confirmationText) &&
      /una sola vez/i.test(confirmationText) &&
      /\*Adelanto:\*/i.test(confirmationText) &&
      !/No-show|Adelanto \(20%\)|Hasta 2 veces/i.test(confirmationText);
    results.push({
      name: "Políticas posteriores a aprobación",
      pass: policyPass,
      note: policyPass
        ? "copy actualizado: inasistencia, 1 reprogramación, adelanto genérico"
        : `copy no coincide (mensajes=${confirmation.length}, inasistencia=${/Inasistencia/i.test(confirmationText)}, una=${/una sola vez/i.test(confirmationText)}, adelanto=${/\*Adelanto:\*/i.test(confirmationText)}, antiguos=${/No-show|Adelanto \(20%\)|Hasta 2 veces/i.test(confirmationText)})`,
    });
  } catch (error) {
    results.push({
      name: "Ejecución del chat Melisa",
      pass: false,
      note: error instanceof Error ? error.message : String(error),
    });
  } finally {
    await cleanupQaPhone(supabase, PHONE, { deleteClient: true });
    await cleanupQaPhone(supabase, ADMIN_PHONE, { deleteClient: true });
  }

  finishAndExit(results);
}

await main();
