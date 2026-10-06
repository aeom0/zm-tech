// reference-image.ts — Foto(s) / link de referencia con cita scheduled → Storage + ack + push

import { sendMessage } from "../wa-api.ts";
import { uploadWhatsAppMediaToStorage, notifyAdmins } from "../lib/notify.ts";
import { persistInboundWaImage } from "../lib/inbound-image.ts";
import type { SupabaseClient } from "../lib/supabase.ts";
import { getPendingAppointmentsForPhone } from "./pending-appointment.ts";
import { formatDateSpanish, parseLimaLocalToDate } from "../format.ts";

export const SERVICE_REFERENCES_BUCKET = "service-references";
export const MAX_REFERENCE_IMAGES = 5;

const ACK_FIRST_IMAGE =
  "Recibí tu referencia 💜 La chica lo verá antes de tu cita. Si quieres cambiar fecha u hora, escribe *mi cita*.";

const ACK_MORE_IMAGES = (n: number) =>
  `Sumé otra foto a tu cita 💜 Ya van *${n}* referencias. La chica las ve en la agenda.`;

const ACK_URL =
  "Guardé el link 💜 La chica lo abre desde la agenda. Si puedes, una *captura* también ayuda a ver el diseño más claro.";

const ACK_URL_WITH_PHOTOS =
  "Guardé el link junto a tus fotos 💜 La chica lo ve en la agenda antes de tu cita.";

/** Extrae el primer http(s) URL del texto (Pinterest, IG, etc.). */
export function extractReferenceUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"'\]]+/i);
  if (!m?.[0]) return null;
  const url = m[0].replace(/[.,;:!?)]+$/, "");
  if (url.length < 12 || url.length > 2048) return null;
  try {
    const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    const ok =
      host === "pin.it" ||
      host.endsWith("pinterest.com") ||
      host === "instagram.com" ||
      host === "instagr.am" ||
      host === "tiktok.com" ||
      host.endsWith(".tiktok.com") ||
      host === "facebook.com" ||
      host === "fb.watch" ||
      host === "youtube.com" ||
      host === "youtu.be" ||
      host.endsWith(".youtube.com");
    if (!ok) return null;
  } catch {
    return null;
  }
  return url;
}

function sessionBlocksReference(
  session: Record<string, unknown> | null,
): boolean {
  return (
    session?.step === "awaiting_datetime" ||
    session?.step === "awaiting_payment_screenshot" ||
    !!session?.awaiting_screenshot
  );
}

type PendingApt = {
  id: string;
  date: string;
  serviceLabels?: string[];
  reference_image_path?: string | null;
  reference_image_paths?: string[] | null;
  reference_url?: string | null;
};

async function loadPendingWithRefs(
  supabase: SupabaseClient,
  phoneNumber: string,
): Promise<PendingApt | null> {
  const pending = await getPendingAppointmentsForPhone(supabase, phoneNumber);
  if (pending.length === 0) return null;
  const target = pending[0];

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, date, reference_image_path, reference_image_paths, reference_url",
    )
    .eq("id", target.id)
    .maybeSingle();

  if (error || !data) {
    console.error("[reference] load apt:", error?.message);
    return {
      id: target.id,
      date: target.date,
      serviceLabels: target.serviceLabels,
      reference_image_paths: [],
    };
  }

  return {
    id: data.id as string,
    date: (data.date as string) || target.date,
    serviceLabels: target.serviceLabels,
    reference_image_path: data.reference_image_path as string | null,
    reference_image_paths:
      (data.reference_image_paths as string[] | null) ?? [],
    reference_url: data.reference_url as string | null,
  };
}

function normalizePaths(apt: PendingApt): string[] {
  const fromArr = Array.isArray(apt.reference_image_paths)
    ? apt.reference_image_paths.filter((p) => !!p)
    : [];
  if (fromArr.length > 0) return fromArr;
  if (apt.reference_image_path) return [apt.reference_image_path];
  return [];
}

function notifyReference(
  supabase: SupabaseClient,
  phoneNumber: string,
  contactName: string,
  apt: PendingApt,
  kind: "foto" | "fotos" | "link",
  extra?: string,
): void {
  const firstName = (contactName || "Clienta").split(/\s+/)[0].slice(0, 40);
  const whenDate = parseLimaLocalToDate(apt.date);
  const whenLabel = whenDate ? formatDateSpanish(whenDate) : "próxima cita";
  const svcBit = apt.serviceLabels?.[0]
    ? ` · ${apt.serviceLabels[0].slice(0, 40)}`
    : "";
  const bit = extra ? ` ${extra}` : "";

  void notifyAdmins(
    supabase,
    kind === "link" ? "🔗 Referencia de cita" : "📷 Referencia de cita",
    `${firstName}: ${kind} para ${whenLabel}${svcBit}${bit}`,
    {
      type: "appointment_reference",
      appointment_id: apt.id,
      phone: phoneNumber,
      client_name: firstName,
    },
  );
}

/**
 * Imagen + cita scheduled → guarda en Storage (hasta 5), asocia a la cita y avisa staff.
 * No intercepta awaiting_datetime (Treysy) ni comprobante de pago.
 */
export async function tryHandleServiceReferenceImage(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  contactName: string;
  message: Record<string, unknown>;
  session: Record<string, unknown> | null;
}): Promise<boolean> {
  const { supabase, phoneNumber, contactName, message, session } = opts;

  if (message.type !== "image") return false;
  if (sessionBlocksReference(session)) return false;

  const imageData = message.image as Record<string, string> | undefined;
  const mediaId = imageData?.id;
  if (!mediaId) return false;

  const apt = await loadPendingWithRefs(supabase, phoneNumber);
  if (!apt) return false;

  // Panel mensajes: URL pública además del path privado de la cita
  const caption =
    typeof imageData?.caption === "string" ? imageData.caption : null;
  void persistInboundWaImage(supabase, {
    phone: phoneNumber,
    mediaId,
    caption,
  }).catch((err) => console.error("[reference] persist panel:", err));

  const fileName = `${phoneNumber.replace(/\D/g, "")}/${apt.id}_${Date.now()}.jpg`;
  const uploaded = await uploadWhatsAppMediaToStorage(
    supabase,
    mediaId,
    SERVICE_REFERENCES_BUCKET,
    fileName,
  );

  if (!uploaded?.path) {
    await sendMessage(
      phoneNumber,
      "No pude guardar tu foto ahora 🙏 Reenvíala o escríbenos al *932 535 512*.",
    );
    return true;
  }

  const prev = normalizePaths(apt);
  const paths = [...prev, uploaded.path].slice(-MAX_REFERENCE_IMAGES);
  const nowIso = new Date().toISOString();

  const { error } = await supabase
    .from("appointments")
    .update({
      reference_image_path: paths[0],
      reference_image_paths: paths,
      reference_received_at: nowIso,
      reference_reviewed_at: null,
    })
    .eq("id", apt.id);

  if (error) {
    console.error("[reference-image] update appointment:", error.message);
    await sendMessage(
      phoneNumber,
      "No pude vincular tu foto a la cita 🙏 Reenvíala o escríbenos al *932 535 512*.",
    );
    return true;
  }

  const isFirst = prev.length === 0;
  await sendMessage(
    phoneNumber,
    isFirst ? ACK_FIRST_IMAGE : ACK_MORE_IMAGES(paths.length),
  );

  await notifyReference(
    supabase,
    phoneNumber,
    contactName,
    apt,
    paths.length > 1 ? "fotos" : "foto",
    paths.length > 1 ? `(${paths.length})` : undefined,
  );

  return true;
}

/**
 * Texto con URL + cita scheduled → guarda reference_url (no scrapea; staff abre el link).
 * Evita el fallback Haiku de “no puedo abrir links”.
 */
export async function tryHandleServiceReferenceUrl(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  contactName: string;
  messageText: string;
  session: Record<string, unknown> | null;
}): Promise<boolean> {
  const { supabase, phoneNumber, contactName, messageText, session } = opts;

  if (sessionBlocksReference(session)) return false;

  const url = extractReferenceUrl(messageText);
  if (!url) return false;

  const apt = await loadPendingWithRefs(supabase, phoneNumber);
  if (!apt) return false;

  const nowIso = new Date().toISOString();
  const { error } = await supabase
    .from("appointments")
    .update({
      reference_url: url,
      reference_received_at: nowIso,
      reference_reviewed_at: null,
    })
    .eq("id", apt.id);

  if (error) {
    console.error("[reference-url] update appointment:", error.message);
    return false; // deja caer a Haiku / flujo normal
  }

  const hasPhotos = normalizePaths(apt).length > 0;
  await sendMessage(phoneNumber, hasPhotos ? ACK_URL_WITH_PHOTOS : ACK_URL);

  await notifyReference(supabase, phoneNumber, contactName, apt, "link");

  return true;
}
