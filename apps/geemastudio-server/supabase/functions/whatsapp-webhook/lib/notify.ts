// notify.ts — Notificación a administradores (FCM) y upload de media WhatsApp

import type { SupabaseClient } from "./supabase.ts";
import { isQaWaPhone } from "./qa-phone.mjs";
import { formatWaErrorPushCopy } from "../../_shared/push-copy.mjs";
import { getRequestTenantId } from "./tenant.ts";
import { WABA_PANEL_BASE } from "./panel-url.ts";

/** Re-notificar la misma clienta solo si pasó este tiempo sin escribir. */
const CHAT_PUSH_COOLDOWN_MS = 45 * 60 * 1000;

export { isQaWaPhone };

export async function notifyAdmins(
  supabase: SupabaseClient,
  title: string,
  body: string,
  data?: Record<string, string>,
) {
  // Si el payload trae phone de QA, no notificar
  const dataPhone = data?.phone;
  if (dataPhone && isQaWaPhone(dataPhone)) {
    console.log("[WABA] skip push (QA phone):", dataPhone.slice(-4));
    return;
  }
  const tenantId = getRequestTenantId();
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .in("role", ["owner", "dev"])
    .eq("tenant_id", tenantId);
  if (!admins?.length) {
    console.warn(
      `[WABA] notifyAdmins: sin perfiles owner/dev tenant=${tenantId}`,
    );
    return;
  }
  const { data: result, error } = await supabase.functions.invoke(
    "send-notification",
    {
      body: {
        user_ids: admins.map((a: { id: string }) => a.id),
        title,
        body,
        data,
      },
    },
  );
  if (error) {
    console.error("[WABA] notifyAdmins invoke error:", error.message ?? error);
    return;
  }
  // send-notification responde HTTP 200 aunque FCM falle por token;
  // loguear sent/errors para diagnosticar "no llegó el push".
  const sent = (result as { sent?: number } | null)?.sent;
  const total = (result as { total_tokens?: number } | null)?.total_tokens;
  const errors = (result as { errors?: string[] } | null)?.errors;
  console.log(
    `[WABA] notifyAdmins ok title="${title.slice(0, 40)}" sent=${sent ?? "?"}/${
      total ?? "?"
    } admins=${admins.length}`,
  );
  if (errors?.length) {
    console.error("[WABA] notifyAdmins FCM errors:", errors.slice(0, 3));
  }
}

async function shouldNotifyChatEntry(
  supabase: SupabaseClient,
  phone: string,
  isNew: boolean,
  fromAd: boolean,
): Promise<boolean> {
  if (isNew || fromAd) return true;
  const { data: recent } = await supabase
    .from("wa_messages")
    .select("created_at")
    .eq("phone", phone)
    .eq("direction", "in")
    .order("created_at", { ascending: false })
    .limit(2);
  if (!recent?.length || recent.length < 2) return true;
  const prevMs = new Date(String(recent[1].created_at)).getTime();
  if (Number.isNaN(prevMs)) return true;
  return Date.now() - prevMs >= CHAT_PUSH_COOLDOWN_MS;
}

/** Push a admins cuando una clienta entra o retoma el chat WA (Meta Ads u orgánica). */
export async function notifyAdminsClientChat(
  supabase: SupabaseClient,
  opts: {
    phone: string;
    clientName: string;
    messagePreview: string;
    isNew: boolean;
    fromAd: boolean;
    referralHeadline?: string | null;
  },
): Promise<void> {
  const preview = (opts.messagePreview || "").trim().slice(0, 120);
  if (!preview) return;

  if (isQaWaPhone(opts.phone)) {
    console.log("[WABA] skip chat push (QA phone):", opts.phone.slice(-4));
    return;
  }

  const ok = await shouldNotifyChatEntry(
    supabase,
    opts.phone,
    opts.isNew,
    opts.fromAd,
  );
  if (!ok) return;

  let title: string;
  if (opts.fromAd) {
    title = "📣 Meta Ads · chat WA";
  } else if (opts.isNew) {
    title = "💬 Nueva clienta · WhatsApp";
  } else {
    title = "💬 Clienta en chat · WhatsApp";
  }

  const firstName = opts.clientName.split(" ")[0] || "Clienta";
  const source = opts.fromAd
    ? opts.referralHeadline
      ? `Anuncio: ${opts.referralHeadline.slice(0, 40)}`
      : "Desde anuncio Meta"
    : opts.isNew
    ? "Primera vez"
    : "Retomó conversación";

  const body = `${firstName}: ${preview}`;

  await notifyAdmins(supabase, title, body, {
    type: "waba_chat",
    reason: "client_chat",
    phone: opts.phone,
    client_name: opts.clientName.slice(0, 80),
    from_ad: opts.fromAd ? "1" : "0",
    is_new: opts.isNew ? "1" : "0",
    source: source.slice(0, 80),
    preview,
    url: `${WABA_PANEL_BASE}?phone=${encodeURIComponent(opts.phone)}`,
  });
}

/** Debounce push cuando clienta escribe con bot en pausa (3 min). */
const PAUSED_REPLY_DEBOUNCE_SECONDS = 180;

/** Debounce push de errores WABA (10 min por teléfono + kind). */
const ERROR_ALERT_DEBOUNCE_SECONDS = 600;

/**
 * Push a owner/dev cuando la clienta escribe y el bot está en pausa (staff takeover).
 * Debounce 3 min por teléfono para no spamear en ráfagas.
 */
export async function notifyAdminsPausedClientReply(
  supabase: SupabaseClient,
  opts: {
    phone: string;
    clientName: string;
    messagePreview: string;
  },
): Promise<void> {
  try {
    if (isQaWaPhone(opts.phone)) {
      console.log(
        "[WABA] skip paused-reply push (QA phone):",
        opts.phone.slice(-4),
      );
      return;
    }

    const { data: claimed, error: claimErr } = await supabase.rpc(
      "waba_claim_action_debounce",
      {
        p_phone: opts.phone,
        p_kind: "paused_reply_alert",
        p_window_seconds: PAUSED_REPLY_DEBOUNCE_SECONDS,
        p_tenant_id: getRequestTenantId(),
      },
    );
    if (claimErr) {
      console.error("[WABA] paused_reply claim:", claimErr.message);
    } else if (claimed !== true) {
      console.log(
        "[WABA] skip paused-reply push (debounce):",
        opts.phone.slice(-4),
      );
      return;
    }

    const firstName =
      (opts.clientName || "Clienta").trim().split(/\s+/)[0].slice(0, 40) ||
      "Clienta";
    const preview = (opts.messagePreview || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 120);

    await notifyAdmins(
      supabase,
      `💬 Respondió · ${firstName}`,
      preview
        ? `${firstName} (bot en pausa): ${preview}`
        : `${firstName} escribió con el bot en pausa. Abre el chat.`,
      {
        type: "waba_chat",
        phone: opts.phone,
        client_name: firstName,
        reason: "paused_reply",
        url: `${WABA_PANEL_BASE}?phone=${encodeURIComponent(opts.phone)}`,
      },
    );
  } catch (err) {
    console.error("[WABA] notifyAdminsPausedClientReply:", err);
  }
}

/** Normaliza error_message a kind corto para debounce. */
function errorAlertKind(errorMessage: string): string {
  const m = errorMessage.trim();
  if (m === "missing_from_phone") return "missing_from_phone";
  if (m === "skip_dispatch_lock_exhausted") {
    return "skip_dispatch_lock_exhausted";
  }
  if (/replace/i.test(m)) return "replace_crash";
  return (
    m
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || "unknown"
  );
}

/**
 * Push a owner/dev cuando se persiste un wa_error_log.
 * Debounce 10 min por (phone|nouser:…, error_kind) vía waba_claim_action_debounce.
 */
export async function notifyAdminsWaError(
  supabase: SupabaseClient,
  opts: {
    phone?: string | null;
    errorMessage: string;
    fallbackSent: boolean;
    context?: Record<string, unknown> | null;
  },
): Promise<void> {
  try {
    // El catch del webhook a veces deja phone=null en CTWA/BSUID y solo
    // mete from_user_id en context (caso validate:bsuid → push "María" a staff).
    const fromUserIdCtx = typeof opts.context?.from_user_id === "string"
      ? opts.context.from_user_id
      : null;
    const qaDest = opts.phone || fromUserIdCtx;
    if (qaDest && isQaWaPhone(qaDest)) {
      console.log(
        "[WABA] skip error push (QA):",
        String(qaDest).startsWith("PE.")
          ? String(qaDest).slice(0, 12)
          : String(qaDest).slice(-4),
      );
      return;
    }

    const kind = errorAlertKind(opts.errorMessage);
    const fromUserId = fromUserIdCtx;
    const phoneKey = opts.phone
      ? opts.phone
      : fromUserId
      ? `nouser:${fromUserId}`
      : "nouser:unknown";

    const { data: claimed, error: claimErr } = await supabase.rpc(
      "waba_claim_action_debounce",
      {
        p_phone: phoneKey,
        // Un solo aviso por conversación evita duplicar “sin respuesta” y
        // “revisión técnica” por el mismo mensaje.
        p_kind: "error_alert:conversation",
        p_window_seconds: ERROR_ALERT_DEBOUNCE_SECONDS,
        p_tenant_id: getRequestTenantId(),
      },
    );
    if (claimErr) {
      console.error("[WABA] error_alert claim:", claimErr.message);
      // Si el debounce falla, igual intentar avisar (mejor un push de más que silencio).
    } else if (claimed !== true) {
      console.log(
        `[WABA] skip error push (debounce ${kind}):`,
        phoneKey.slice(-12),
      );
      return;
    }

    const contactName = typeof opts.context?.contact_name === "string"
      ? opts.context.contact_name
      : null;
    // Solo preview del mensaje de la clienta — nunca context.note (forense/técnico).
    const preview = typeof opts.context?.preview === "string"
      ? opts.context.preview
      : null;

    const { title, body } = formatWaErrorPushCopy({
      kind,
      phone: opts.phone,
      contactName,
      preview,
      fallbackSent: opts.fallbackSent,
      rawError: opts.errorMessage,
    });

    const url = opts.phone
      ? `${WABA_PANEL_BASE}?phone=${encodeURIComponent(opts.phone)}`
      : WABA_PANEL_BASE;

    await notifyAdmins(supabase, title, body, {
      type: "waba_chat",
      phone: opts.phone ?? "",
      error_kind: kind,
      fallback_sent: opts.fallbackSent ? "1" : "0",
      url,
    });
  } catch (err) {
    console.error("[WABA] notifyAdminsWaError:", err);
  }
}

const WHATSAPP_ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;

export type UploadedWaMedia = { path: string; signedUrl: string };

/** Descarga media de Meta y sube a Storage. Retorna path + signed URL (7d). */
export async function uploadWhatsAppMediaToStorage(
  supabase: SupabaseClient,
  mediaId: string,
  bucket: string,
  fileName: string,
  fallbackMimeType = "image/jpeg",
): Promise<UploadedWaMedia | null> {
  try {
    const mediaRes = await fetch(
      `https://graph.facebook.com/v22.0/${mediaId}`,
      {
        headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
      },
    );
    const mediaData = await mediaRes.json();
    if (!mediaData.url) return null;

    const fileRes = await fetch(mediaData.url, {
      headers: { Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}` },
    });
    if (!fileRes.ok) return null;
    const fileBuffer = await fileRes.arrayBuffer();

    // Meta a veces envía mime_type con parámetros (ej. "audio/ogg; codecs=opus")
    // que no matchean allowed_mime_types del bucket (Supabase exige match exacto).
    const rawMimeType = typeof mediaData.mime_type === "string"
      ? mediaData.mime_type
      : "";
    const contentType = rawMimeType.split(";")[0].trim() || fallbackMimeType;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileBuffer, {
        contentType,
        upsert: true,
      });
    if (error) {
      console.error("Storage upload error:", error);
      return null;
    }

    const { data: signed } = await supabase.storage
      .from(bucket)
      .createSignedUrl(data.path, 7 * 24 * 60 * 60);
    if (!signed?.signedUrl) return { path: data.path, signedUrl: "" };
    return { path: data.path, signedUrl: signed.signedUrl };
  } catch (err) {
    console.error("uploadWhatsAppMediaToStorage error:", err);
    return null;
  }
}

/** @deprecated Prefer uploadWhatsAppMediaToStorage when necesites el path. */
export async function uploadWhatsAppMedia(
  supabase: SupabaseClient,
  mediaId: string,
  bucket: string,
  fileName: string,
): Promise<string | null> {
  const uploaded = await uploadWhatsAppMediaToStorage(
    supabase,
    mediaId,
    bucket,
    fileName,
  );
  return uploaded?.signedUrl || null;
}
