// inbound-image.ts — Persistir foto inbound (Meta → Storage público) + takeover staff

import { sendMessage } from "../wa-api.ts";
import { notifyAdmins, uploadWhatsAppMediaToStorage } from "./notify.ts";
import type { SupabaseClient } from "./supabase.ts";
import { upsertSession } from "./supabase.ts";
import {
  DESIGN_ACK_IN_HOURS,
  DESIGN_ACK_OFF_HOURS,
  getDesignAckMessage,
  isWithinDesignStaffHours,
  shouldSkipDesignPauseForQa,
} from "./design-staff-hours.mjs";
import { getDesignImagePushCopy } from "./design-image-push.mjs";
import { waStorageFolder } from "./wa-recipient.mjs";
import { WABA_PANEL_BASE } from "./panel-url.ts";

/** Bucket público (mismas URLs que assets WABA del panel). */
export const INBOUND_CHAT_BUCKET = "waba-images";

export {
  DESIGN_ACK_IN_HOURS,
  DESIGN_ACK_OFF_HOURS,
  getDesignAckMessage,
  isWithinDesignStaffHours,
};


/**
 * Descarga media de Meta, sube a Storage público y actualiza `wa_messages.image_url`
 * por `media_id` (fila inbound ya insertada en el claim).
 */
export async function persistInboundWaImage(
  supabase: SupabaseClient,
  opts: { phone: string; mediaId: string; caption?: string | null },
): Promise<string | null> {
  const folder = waStorageFolder(opts.phone);
  const shortId =
    opts.mediaId.replace(/\D/g, "").slice(-14) || opts.mediaId.slice(-12);
  const fileName = `inbound-chat/${folder}/${Date.now()}_${shortId}.jpg`;

  const uploaded = await uploadWhatsAppMediaToStorage(
    supabase,
    opts.mediaId,
    INBOUND_CHAT_BUCKET,
    fileName,
  );
  if (!uploaded?.path) {
    console.error(
      "[inbound-image] upload falló media_id=",
      opts.mediaId.slice(0, 16),
    );
    return null;
  }

  const { data: pub } = supabase.storage
    .from(INBOUND_CHAT_BUCKET)
    .getPublicUrl(uploaded.path);
  const imageUrl =
    (typeof pub?.publicUrl === "string" && pub.publicUrl.trim()) ||
    uploaded.signedUrl ||
    null;
  if (!imageUrl) return null;

  const caption = (opts.caption || "").trim();
  const content = caption ? `[imagen] ${caption.slice(0, 500)}` : "[imagen]";

  const { error } = await supabase
    .from("wa_messages")
    .update({ image_url: imageUrl, content })
    .eq("media_id", opts.mediaId)
    .eq("direction", "in");

  if (error) {
    console.error("[inbound-image] update wa_messages:", error.message);
  }
  return imageUrl;
}

export function sessionBlocksDesignTakeover(
  session: Record<string, unknown> | null,
): boolean {
  return (
    session?.step === "awaiting_payment_screenshot" ||
    !!session?.awaiting_screenshot
  );
}

/**
 * Foto de diseño/efectos (no comprobante): persiste en panel, push a staff y pausa el bot.
 * QA: solo persiste URL (no pausa ni push) y deja seguir el flujo automatizado.
 * Retorna true si el dispatcher debe cortar (clienta real).
 */
export async function tryHandleDesignImageTakeover(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  contactName: string;
  message: Record<string, unknown>;
  session: Record<string, unknown> | null;
}): Promise<boolean> {
  const { supabase, phoneNumber, contactName, message, session } = opts;

  if (message.type !== "image") return false;
  if (sessionBlocksDesignTakeover(session)) return false;

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

  // Suites QA genéricas no pausan (Treysy imagen mid-agenda).
  // Excepción: 51999000985 = suite design-pause (push sigue bloqueado por isQaWaPhone).
  if (shouldSkipDesignPauseForQa(phoneNumber)) {
    console.log(
      "[inbound-image] QA: persistí URL, sin pausa",
      phoneNumber.slice(-4),
      imageUrl ? "ok" : "fail",
    );
    return false;
  }

  const alreadyPaused = Boolean(session?.bot_paused_at);
  await upsertSession(supabase, phoneNumber, {
    bot_paused_at: new Date().toISOString(),
  });

  const firstName = (contactName || "Clienta").split(/\s+/)[0].slice(0, 40);
  const push = getDesignImagePushCopy({
    alreadyPaused,
    firstName,
    hasImageUrl: Boolean(imageUrl),
    caption,
  });

  void notifyAdmins(supabase, push.title, push.body, {
    type: "waba_chat",
    phone: phoneNumber,
    client_name: firstName,
    reason: "design_image",
    url: `${WABA_PANEL_BASE}?phone=${encodeURIComponent(phoneNumber)}`,
  }).catch((err) => console.error("[inbound-image] push:", err));

  if (!alreadyPaused) {
    await sendMessage(phoneNumber, getDesignAckMessage());
  }

  console.log(
    `[inbound-image] takeover ${phoneNumber.slice(-4)} paused=${!alreadyPaused ? "new" : "again"} url=${imageUrl ? "yes" : "no"}`,
  );
  return true;
}
