// handlers/payment-verification-button.ts — Tap Aprobar/Rechazar plantilla Vanessa

import { sendMessage, sendImage } from "../wa-api.ts";
import { formatStoredAppointmentDate } from "../format.ts";
import { ADMIN_PHONE } from "../lib/constants.ts";
import { isQaSimulationRangePhone } from "../lib/qa-phone.mjs";
import {
  getPoliticasCitaWhatsApp,
  getConsideracionesPreviasWhatsApp,
} from "../lib/policies.ts";
import type { SupabaseClient } from "../lib/supabase.ts";
import { getConfigText, loadWabaConfig } from "../lib/waba-config.ts";

function digitsOnly(phone: string): string {
  return String(phone ?? "").replace(/\D/g, "");
}

/** Prod: solo Vanessa (ADMIN_PHONE / 932 535 512). Suites: rango 978–999, no extras. */
export function isAuthorizedPaymentVerifyTap(phone: string): boolean {
  if (digitsOnly(phone) === digitsOnly(ADMIN_PHONE)) return true;
  return isQaSimulationRangePhone(phone);
}

/** Mismo objeto que `waba_config.tardanza_image_url`. El bucket `whatsapp-assets` ya no existe. */
const TARDANZAS_IMAGE_FALLBACK =
  "https://udelxwwnyivknslueerr.supabase.co/storage/v1/object/public/waba-images/campanas/tardanza-policy.jpg";

const REJECT_CLIENT_MESSAGE = (note?: string | null) =>
  `😔 Hola, no pudimos validar tu comprobante de pago.\n\n` +
  `${note ? `Motivo: ${note}\n\n` : ""}` +
  `Por favor comunícate con nosotras al 📱 932 535 512 para resolver esto.\n\n` +
  `¡Estamos para ayudarte! 💜`;

const POST_SERVICE_APPROVE_MSG =
  "✅ ¡Gracias! Confirmamos que recibimos tu pago 💜";

type VerificationRow = {
  id: string;
  kind: string | null;
  status: string;
  appointment_id: string | null;
  client_phone: string;
  client_name: string;
  service_name: string;
  appointment_date: string;
  amount_deposit: string | number;
  amount_total: string | number;
  payment_method: string | null;
};

function parsePayload(
  payload: string,
): { action: "approve" | "reject"; verificationId: string } | null {
  if (payload.startsWith("pay_verify_approve:")) {
    const id = payload.slice("pay_verify_approve:".length).trim();
    return id ? { action: "approve", verificationId: id } : null;
  }
  if (payload.startsWith("pay_verify_reject:")) {
    const id = payload.slice("pay_verify_reject:".length).trim();
    return id ? { action: "reject", verificationId: id } : null;
  }
  return null;
}

type AppointmentTotalRow = { price: string | number | null };

/**
 * Registra el pago únicamente después de aprobar el comprobante.
 * verification_id permite reintentar el tap sin duplicar el pago.
 */
async function createApprovedPayment(
  supabase: SupabaseClient,
  verification: VerificationRow,
): Promise<{ error: Error | null }> {
  const { data: existing, error: existingError } = await supabase
    .from("payments")
    .select("id")
    .eq("verification_id", verification.id)
    .limit(1)
    .maybeSingle();
  if (existingError) return { error: new Error(existingError.message) };
  if (existing?.id) return { error: null };

  const amount = Number.parseFloat(
    String(
      verification.kind === "post_service_payment"
        ? verification.amount_total
        : verification.amount_deposit,
    ),
  );
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: new Error("El comprobante no tiene un monto válido") };
  }

  let serviceTotal: number | null = null;
  if (verification.appointment_id) {
    const { data: appointment, error: appointmentError } = await supabase
      .from("appointments")
      .select("price")
      .eq("id", verification.appointment_id)
      .maybeSingle();
    if (appointmentError) {
      return { error: new Error(appointmentError.message) };
    }
    const total = Number.parseFloat(
      String((appointment as AppointmentTotalRow | null)?.price ?? ""),
    );
    if (Number.isFinite(total) && total > 0) serviceTotal = total;
  }

  // Adelanto = lo que dice la verificación, no `monto < price`: un pago final
  // parcial (o un `price` editado después) no debe contarse como abono.
  const paymentKind = verification.kind === "deposit" ? "deposit" : "service";
  const isAbono = paymentKind === "deposit";
  const method =
    verification.payment_method === "transfer"
      ? "transfer"
      : verification.payment_method === "cash"
        ? "cash"
        : "yape_plin";
  const paymentPayload = {
    appointment_id: verification.appointment_id,
    amount: amount.toFixed(2),
    method,
    // payments.date es timestamptz: instante UTC real.
    date: new Date().toISOString(),
    tenant_id: "zm-lash-nails",
    notes: `Pago aprobado desde comprobante · ${verification.service_name}`,
    kind: paymentKind,
    is_abono: isAbono,
    service_total: isAbono ? serviceTotal?.toFixed(2) : null,
    employee_id: null,
    verification_id: verification.id,
  };

  // Adoptar pagos creados por versiones anteriores antes de insertar otro.
  if (verification.appointment_id) {
    const { data: legacyPayment } = await supabase
      .from("payments")
      .select("id")
      .eq("appointment_id", verification.appointment_id)
      .ilike("notes", "%Pendiente validación%")
      .limit(1)
      .maybeSingle();
    if (legacyPayment?.id) {
      const { error: updateError } = await supabase
        .from("payments")
        .update(paymentPayload)
        .eq("id", legacyPayment.id);
      return {
        error: updateError ? new Error(updateError.message) : null,
      };
    }
  }

  const { error: insertError } = await supabase
    .from("payments")
    .insert(paymentPayload);
  return { error: insertError ? new Error(insertError.message) : null };
}

async function sendDepositApproveMessages(
  supabase: SupabaseClient,
  verification: VerificationRow,
): Promise<void> {
  const phone = verification.client_phone;
  if (!phone) return;
  // appointment_date es timestamp WITHOUT time zone (hora Lima literal) — leer literal, no restar 5h.
  const dateLabel = formatStoredAppointmentDate(verification.appointment_date);
  await sendMessage(
    phone,
    `✅ ¡Tu cita ha sido confirmada!\n\n` +
      `💅 ${verification.service_name}\n` +
      `📅 ${dateLabel}\n\n` +
      `¡Te esperamos! Recuerda llegar 5 minutos antes 💜\n\n` +
      `_ZM Lash & Nails Beauty_`,
  );
  await sendMessage(phone, getPoliticasCitaWhatsApp());
  const consideraciones = getConsideracionesPreviasWhatsApp([]);
  // Genérico: políticas-text usa header+todas las categorías vía getPoliticas;
  // aquí enviamos el bloque de políticas ya enviado + consideraciones vacías
  // si no hay categorías — espejo mínimo del mobile (CONSIDERACIONES genéricas).
  const genericConsideraciones =
    consideraciones ||
    `📌 *Antes de tu cita:*\n\n` +
      `• Pestañas (extensiones, lifting): ven *desmaquillada* (sin rímel, sin delineador en ojos).\n\n` +
      `• Cejas y rostro: ven *desmaquillada*. Si usas retinol o ácidos, coméntalo antes.\n\n` +
      `• Microblading / cejas / labios: ven *desmaquillada*. No anticoagulantes ni alcohol 24 h antes.\n\n` +
      `• Uñas: ven *sin esmalte* (manos o pies según el servicio). Uñas limpias y cortas.\n\n` +
      `• Depilación: zona *limpia y seca*. Evita cremas el día del servicio.\n\n` +
      `_(Aplican las que correspondan a tu servicio)_`;
  await sendMessage(phone, genericConsideraciones);
  const wabaConfig = await loadWabaConfig(supabase);
  const tardanzaImageUrl = getConfigText(
    wabaConfig,
    "tardanza_image_url",
    TARDANZAS_IMAGE_FALLBACK,
  );
  await sendImage(
    phone,
    tardanzaImageUrl,
    "Políticas por tardanzas - ZM Lash & Nails Beauty",
  );
}

/**
 * Procesa tap de Vanessa en plantilla pago_recibido_validar_zm.
 * Ack corto al número que tocó (normalmente ADMIN_PHONE).
 */
export async function handlePaymentVerificationButtonTap(
  supabase: SupabaseClient,
  payload: string,
  opts?: { replyPhone?: string },
): Promise<void> {
  const replyTo = opts?.replyPhone?.trim() || ADMIN_PHONE;
  if (!isAuthorizedPaymentVerifyTap(replyTo)) {
    console.warn(
      `[pay-verify-btn] tap ignorado (no admin) …${replyTo.slice(-4)}`,
    );
    return;
  }
  const parsed = parsePayload(payload);
  if (!parsed) {
    await sendMessage(replyTo, "No pude procesar esa opción de pago.");
    return;
  }

  const { data: verification, error } = await supabase
    .from("appointment_verifications")
    .select(
      "id, kind, status, appointment_id, client_phone, client_name, service_name, appointment_date, amount_deposit, amount_total, payment_method",
    )
    .eq("id", parsed.verificationId)
    .maybeSingle();

  if (error || !verification) {
    console.error(
      "[pay-verify-btn] verification no encontrada:",
      parsed.verificationId,
      error?.message,
    );
    await sendMessage(replyTo, "No encontré ese comprobante en el sistema.");
    return;
  }

  const row = verification as VerificationRow;
  const kind =
    row.kind === "post_service_payment" ? "post_service_payment" : "deposit";
  const now = new Date().toISOString();

  if (row.status === "approved" || row.status === "rejected") {
    await sendMessage(
      replyTo,
      `Ese comprobante ya estaba marcado como ${row.status === "approved" ? "aprobado" : "rechazado"}.`,
    );
    return;
  }

  if (parsed.action === "approve") {
    const paymentResult = await createApprovedPayment(supabase, row);
    if (paymentResult.error) {
      console.error(
        "[pay-verify-btn] payment INSERT:",
        paymentResult.error.message,
      );
      await sendMessage(
        replyTo,
        "No pude registrar el pago. El comprobante sigue pendiente; revisa en la app.",
      );
      return;
    }

    const { error: upErr } = await supabase
      .from("appointment_verifications")
      .update({
        status: "approved",
        approved_at: now,
        updated_at: now,
      })
      .eq("id", row.id);
    if (upErr) {
      console.error("[pay-verify-btn] approve UPDATE:", upErr.message);
      await sendMessage(replyTo, "Error al aprobar. Revisa en la app.");
      return;
    }

    if (kind === "deposit") {
      if (row.appointment_id) {
        await supabase
          .from("appointments")
          .update({
            status: "scheduled",
            notes: "Cita confirmada. Pago validado por nuestro equipo.",
          })
          .eq("id", row.appointment_id);
      }
      void sendDepositApproveMessages(supabase, row).catch((err) =>
        console.error("[pay-verify-btn] WA deposit approve:", err),
      );
    } else if (row.client_phone) {
      void sendMessage(row.client_phone, POST_SERVICE_APPROVE_MSG).catch(
        (err) => console.error("[pay-verify-btn] WA post approve:", err),
      );
    }

    await sendMessage(replyTo, "✅ Marcado como aprobado");
    return;
  }

  // reject
  const note = "Comprobante no válido";
  const { error: rejErr } = await supabase
    .from("appointment_verifications")
    .update({
      status: "rejected",
      vanessa_note: note,
      rejected_at: now,
      updated_at: now,
    })
    .eq("id", row.id);
  if (rejErr) {
    console.error("[pay-verify-btn] reject UPDATE:", rejErr.message);
    await sendMessage(replyTo, "Error al rechazar. Revisa en la app.");
    return;
  }

  if (row.client_phone) {
    void sendMessage(row.client_phone, REJECT_CLIENT_MESSAGE(note)).catch(
      (err) => console.error("[pay-verify-btn] WA reject:", err),
    );
  }
  await sendMessage(replyTo, "❌ Marcado como rechazado");
}
