// handlers/payment-screenshot-detected.ts — Comprobante fuera de awaiting_payment

import { sendMessage } from "../wa-api.ts";
import {
  formatSessionDatetimeIso,
  parseLimaLocalToDate,
  toLimaLocalTimestamp,
} from "../format.ts";
import { persistInboundWaImage } from "../lib/inbound-image.ts";
import {
  classifyInboundImage,
  parseOcrMonto,
  paymentMethodFromExtraction,
  EMPTY_PAYMENT_EXTRACTION,
  type PaymentExtraction,
} from "../lib/image-classify.ts";
import { sendPaymentVerificationTemplate } from "../lib/payment-template.ts";
import type { SupabaseClient } from "../lib/supabase.ts";
import {
  findClientByWaRecipient,
  appointmentPhoneForRecipient,
  getPhoneCountryAndNormalizedFromWa,
} from "../lib/supabase.ts";
import { isWaBsuid } from "../lib/wa-recipient.mjs";

const CLIENT_ACK = "Recibí tu comprobante 💜 Nuestro equipo lo va a revisar.";

type RecentAppt = {
  id: string;
  date: string;
  price: string | number | null;
  client_name: string | null;
  service_id: string | null;
  status: string;
};

/**
 * Cita más reciente de la clienta (scheduled o completed), sin filtrar “solo futuras”.
 */
export async function findMostRecentAppointmentForPhone(
  supabase: SupabaseClient,
  phone: string,
): Promise<RecentAppt | null> {
  if (isWaBsuid(phone)) {
    const { data: bsuidClient } = await supabase
      .from("clients")
      .select("id")
      .eq("wa_user_id", phone)
      .maybeSingle();
    if (!bsuidClient?.id) return null;
    const { data } = await supabase
      .from("appointments")
      .select("id, date, price, client_name, service_id, status")
      .eq("client_id", bsuidClient.id)
      .in("status", ["scheduled", "completed"])
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();
    return (data as RecentAppt | null) ?? null;
  }

  const { country, normalized } = getPhoneCountryAndNormalizedFromWa(phone);
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("phone_country", country)
    .eq("phone_normalized", normalized)
    .maybeSingle();

  const digits = phone.replace(/\D/g, "");
  const last9 = digits.length >= 9 ? digits.slice(-9) : digits;

  let query = supabase
    .from("appointments")
    .select("id, date, price, client_name, service_id, status")
    .in("status", ["scheduled", "completed"])
    .order("date", { ascending: false })
    .limit(1);

  if (client?.id) {
    query = query.or(
      `client_id.eq.${client.id},client_phone.ilike.%${digits}%,client_phone.ilike.%${last9}%`,
    );
  } else {
    query = query.or(
      `client_phone.ilike.%${digits}%,client_phone.ilike.%${last9}%`,
    );
  }

  const { data: rows } = await query;
  const first = Array.isArray(rows) ? rows[0] : rows;
  return (first as RecentAppt | null) ?? null;
}

async function resolveServiceName(
  supabase: SupabaseClient,
  serviceId: string | null,
): Promise<string> {
  if (!serviceId) return "Pago recibido";
  const { data } = await supabase
    .from("services")
    .select("name")
    .eq("id", serviceId)
    .maybeSingle();
  return (data as { name?: string } | null)?.name?.trim() || "Pago recibido";
}

function appointmentDateLabel(dateRaw: string): string {
  const lima = parseLimaLocalToDate(dateRaw);
  if (lima) return formatSessionDatetimeIso(lima.toISOString());
  try {
    return formatSessionDatetimeIso(dateRaw);
  } catch {
    return dateRaw.slice(0, 16);
  }
}

/**
 * Si la imagen es comprobante fuera del flujo de depósito: INSERT + plantilla Vanessa.
 * Retorna true si el dispatcher debe cortar (no pasar a diseño/referencia).
 */
export async function tryHandlePaymentScreenshotDetected(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  contactName: string;
  message: Record<string, unknown>;
  session: Record<string, unknown> | null;
}): Promise<boolean> {
  const { supabase, phoneNumber, contactName, message, session } = opts;

  if (message.type !== "image") return false;
  if (
    session?.step === "awaiting_payment_screenshot" ||
    session?.awaiting_screenshot
  ) {
    return false;
  }

  const imageData = message.image as Record<string, string> | undefined;
  const mediaId = imageData?.id;
  if (!mediaId) return false;

  const caption =
    typeof imageData?.caption === "string" ? imageData.caption : null;
  const imageUrl = await persistInboundWaImage(supabase, {
    phone: phoneNumber,
    mediaId,
    caption,
  });
  if (!imageUrl) {
    console.warn(
      "[payment-screenshot-detected] sin URL tras persist",
      phoneNumber.slice(-4),
    );
    return false;
  }

  const classified = await classifyInboundImage(imageUrl, {
    supabase,
    phoneNumber,
  });
  if (classified.kind !== "comprobante_pago") {
    return false;
  }

  const extraction: PaymentExtraction =
    classified.extraction ?? EMPTY_PAYMENT_EXTRACTION;
  const clientData = await findClientByWaRecipient(supabase, phoneNumber);
  const apptPhone = appointmentPhoneForRecipient(phoneNumber);
  const recent = await findMostRecentAppointmentForPhone(supabase, phoneNumber);

  let serviceName = "Pago recibido";
  // appointment_date es timestamp WITHOUT time zone (hora Lima literal, igual que appointments.date).
  let appointmentDateIso = toLimaLocalTimestamp(new Date());
  let appointmentId: string | null = null;
  let amountTotal = "0";
  let dateLabel = "Sin cita vinculada";

  if (recent) {
    appointmentId = recent.id;
    serviceName = await resolveServiceName(supabase, recent.service_id);
    const dateRaw =
      typeof recent.date === "string" ? recent.date : String(recent.date);
    // recent.date (appointments.date) ya es literal Lima — guardar tal cual, sin fingir "Z"
    // (la columna es timestamp WITHOUT time zone: un "Z" falso no la vuelve UTC real).
    appointmentDateIso = dateRaw;
    // Preferir literal Lima → label amigable
    dateLabel = appointmentDateLabel(dateRaw);
    const ocrMonto = parseOcrMonto(extraction.monto);
    if (ocrMonto) amountTotal = ocrMonto;
    else if (recent.price != null) {
      const p = Number.parseFloat(String(recent.price));
      if (Number.isFinite(p) && p > 0) amountTotal = p.toFixed(2);
    }
  } else {
    const ocrMonto = parseOcrMonto(extraction.monto);
    if (ocrMonto) amountTotal = ocrMonto;
  }

  const clientName =
    clientData?.name?.trim() ||
    recent?.client_name?.trim() ||
    contactName?.trim() ||
    "Cliente WhatsApp";

  const { data: verification, error: insertErr } = await supabase
    .from("appointment_verifications")
    .insert({
      appointment_id: appointmentId,
      client_phone: apptPhone ?? phoneNumber,
      client_name: clientName.slice(0, 120),
      service_name: serviceName.slice(0, 200),
      appointment_date: appointmentDateIso,
      amount_deposit: "0",
      amount_total: amountTotal,
      payment_method: paymentMethodFromExtraction(extraction.app_origen),
      payment_screenshot_url: imageUrl,
      status: "payment_submitted",
      kind: "post_service_payment",
    })
    .select("id")
    .single();

  if (insertErr || !verification?.id) {
    console.error(
      "[payment-screenshot-detected] INSERT falló:",
      insertErr?.message ?? insertErr,
    );
    await sendMessage(phoneNumber, CLIENT_ACK);
    return true;
  }

  void sendPaymentVerificationTemplate({
    verificationId: verification.id,
    imageUrl,
    clientName: clientName.slice(0, 60),
    serviceName: serviceName.slice(0, 60),
    appointmentDateLabel: dateLabel.slice(0, 60),
    extraction,
  }).catch((err) =>
    console.error("[payment-screenshot-detected] template:", err),
  );

  await sendMessage(phoneNumber, CLIENT_ACK);
  console.log(
    `[payment-screenshot-detected] post_service ver=${verification.id.slice(0, 8)} phone=…${phoneNumber.slice(-4)}`,
  );
  return true;
}
