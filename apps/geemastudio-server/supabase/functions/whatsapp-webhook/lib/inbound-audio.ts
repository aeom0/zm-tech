// inbound-audio.ts — Persistir audio/nota de voz inbound (Meta → Storage público) + takeover staff

import { sendMessage } from "../wa-api.ts";
import { notifyAdmins, uploadWhatsAppMediaToStorage } from "./notify.ts";
import type { SupabaseClient } from "./supabase.ts";
import { upsertSession } from "./supabase.ts";
import { shouldSkipDesignPauseForQa } from "./design-staff-hours.mjs";
import { waStorageFolder } from "./wa-recipient.mjs";
import { sessionBlocksDesignTakeover } from "./inbound-image.ts";
import { WABA_PANEL_BASE } from "./panel-url.ts";

/** Bucket público separado de waba-images: ese solo permite mime image/*. */
export const INBOUND_AUDIO_BUCKET = "waba-audio";


/** Sin franjas horarias (a diferencia del ack de foto diseño) — la clienta solo
 * necesita saber que alguien va a escuchar el audio y responderle. */
export const AUDIO_ACK_MESSAGE =
  "Recibimos tu nota de voz 🎤 Nuestro equipo la va a escuchar y te responde en breve 💜";

/**
 * Descarga audio de Meta, sube a Storage público y actualiza `wa_messages.audio_url`
 * por `media_id` (fila inbound ya insertada en el claim). Análogo a
 * `persistInboundWaImage` en `inbound-image.ts`.
 */
export async function persistInboundWaAudio(
  supabase: SupabaseClient,
  opts: { phone: string; mediaId: string },
): Promise<string | null> {
  const folder = waStorageFolder(opts.phone);
  const shortId =
    opts.mediaId.replace(/\D/g, "").slice(-14) || opts.mediaId.slice(-12);
  const fileName = `inbound-chat/${folder}/${Date.now()}_${shortId}.ogg`;

  const uploaded = await uploadWhatsAppMediaToStorage(
    supabase,
    opts.mediaId,
    INBOUND_AUDIO_BUCKET,
    fileName,
    "audio/ogg",
  );
  if (!uploaded?.path) {
    console.error(
      "[inbound-audio] upload falló media_id=",
      opts.mediaId.slice(0, 16),
    );
    return null;
  }

  const { data: pub } = supabase.storage
    .from(INBOUND_AUDIO_BUCKET)
    .getPublicUrl(uploaded.path);
  const audioUrl =
    (typeof pub?.publicUrl === "string" && pub.publicUrl.trim()) ||
    uploaded.signedUrl ||
    null;
  if (!audioUrl) return null;

  const { error } = await supabase
    .from("wa_messages")
    .update({ audio_url: audioUrl, content: "[audio]" })
    .eq("media_id", opts.mediaId)
    .eq("direction", "in");

  if (error) {
    console.error("[inbound-audio] update wa_messages:", error.message);
  }
  return audioUrl;
}

/**
 * Nota de voz inbound: persiste en panel, push a staff y pausa el bot (mismo
 * patrón que `tryHandleDesignImageTakeover` en `inbound-image.ts`) — el equipo
 * revisa el audio y responde manualmente, el bot no intenta interpretarlo.
 * QA: solo persiste URL (no pausa ni push) y deja seguir el flujo automatizado.
 * Retorna true si el dispatcher debe cortar (clienta real).
 */
export async function tryHandleAudioTakeover(opts: {
  supabase: SupabaseClient;
  phoneNumber: string;
  contactName: string;
  message: Record<string, unknown>;
  session: Record<string, unknown> | null;
}): Promise<boolean> {
  const { supabase, phoneNumber, contactName, message, session } = opts;

  if (message.type !== "audio") return false;
  if (sessionBlocksDesignTakeover(session)) return false;

  const audioData = message.audio as Record<string, string> | undefined;
  const mediaId = audioData?.id;
  if (!mediaId) return false;

  const audioUrl = await persistInboundWaAudio(supabase, {
    phone: phoneNumber,
    mediaId,
  });

  if (shouldSkipDesignPauseForQa(phoneNumber)) {
    console.log(
      "[inbound-audio] QA: persistí URL, sin pausa",
      phoneNumber.slice(-4),
      audioUrl ? "ok" : "fail",
    );
    return false;
  }

  const alreadyPaused = Boolean(session?.bot_paused_at);
  await upsertSession(supabase, phoneNumber, {
    bot_paused_at: new Date().toISOString(),
  });

  const firstName = (contactName || "Clienta").split(/\s+/)[0].slice(0, 40);
  const title = alreadyPaused
    ? "🎤 Otro audio · WhatsApp"
    : "🎤 Audio · Revisar YA";
  const body = alreadyPaused
    ? `${firstName} mandó otro audio.${audioUrl ? " Abre el chat para escucharlo." : ""}`
    : `${firstName} envió una nota de voz. Bot en pausa.${audioUrl ? " Abre el chat para escucharlo." : ""}`;

  void notifyAdmins(supabase, title, body, {
    type: "waba_chat",
    phone: phoneNumber,
    client_name: firstName,
    reason: "audio_message",
    url: `${WABA_PANEL_BASE}?phone=${encodeURIComponent(phoneNumber)}`,
  }).catch((err) => console.error("[inbound-audio] push:", err));

  if (!alreadyPaused) {
    await sendMessage(phoneNumber, AUDIO_ACK_MESSAGE);
  }

  console.log(
    `[inbound-audio] takeover ${phoneNumber.slice(-4)} paused=${!alreadyPaused ? "new" : "again"} url=${audioUrl ? "yes" : "no"}`,
  );
  return true;
}
