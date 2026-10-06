// send-whatsapp-notification — Envía mensaje de texto, imagen, audio o documento de WhatsApp al cliente (ej. tras validar pago).
// Body: { phone, message?, imageUrl?, imageCaption?, audioUrl?, documentUrl?, documentName?, resumeBot?, pauseBot? }.
// pauseBot: true desde el panel de mensajes — setea bot_paused_at (STAFF_BOT_COLLISION).
// resumeBot: true — limpia bot_paused_at (botón Reactivar bot).
import { createClient } from "@supabase/supabase-js";
import {
  metaRecipientFields,
  waConversationKey,
} from "../_shared/wa-recipient.mjs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN")!;
const PHONE_NUMBER_ID = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const basePayload = (to: string) => ({
  messaging_product: "whatsapp",
  ...metaRecipientFields(to),
});

/** Evita caché de Meta al reutilizar la misma URL pública tras subir un archivo nuevo. */
function withWhatsAppImageLinkCacheBust(link: string): string {
  const u = link.trim();
  if (!u) return u;
  if (u.startsWith("data:")) return u;
  const sep = u.includes("?") ? "&" : "?";
  return `${u}${sep}wa_cb=${Date.now()}`;
}

async function sendText(to: string, message: string) {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...basePayload(to),
        type: "text",
        text: { body: message },
      }),
    },
  );
  return res.json();
}

async function sendImage(to: string, imageUrl: string, caption?: string) {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...basePayload(to),
        type: "image",
        image: {
          link: withWhatsAppImageLinkCacheBust(imageUrl),
          ...(caption ? { caption: caption.slice(0, 1024) } : {}),
        },
      }),
    },
  );
  const data = await res.json();
  if (data.error) {
    console.error(
      "[send-whatsapp-notification] WhatsApp image error:",
      JSON.stringify(data.error),
    );
  }
  return data;
}

async function sendAudio(to: string, audioUrl: string) {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...basePayload(to),
        type: "audio",
        audio: { link: withWhatsAppImageLinkCacheBust(audioUrl) },
      }),
    },
  );
  const data = await res.json();
  if (data.error) {
    console.error(
      "[send-whatsapp-notification] WhatsApp audio error:",
      JSON.stringify(data.error),
    );
  }
  return data;
}

async function sendDocument(
  to: string,
  documentUrl: string,
  filename?: string,
) {
  const res = await fetch(
    `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...basePayload(to),
        type: "document",
        document: {
          link: withWhatsAppImageLinkCacheBust(documentUrl),
          ...(filename ? { filename: filename.slice(0, 240) } : {}),
        },
      }),
    },
  );
  const data = await res.json();
  if (data.error) {
    console.error(
      "[send-whatsapp-notification] WhatsApp document error:",
      JSON.stringify(data.error),
    );
  }
  return data;
}

function metaApiReturnedError(data: unknown): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    (data as { error?: unknown }).error != null
  );
}

function extractMetaWamid(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const messages = (data as { messages?: unknown }).messages;
  if (!Array.isArray(messages) || messages.length === 0) return null;
  const first = messages[0];
  if (!first || typeof first !== "object") return null;
  const id = (first as { id?: unknown }).id;
  return typeof id === "string" && id.length > 0 ? id : null;
}

async function logOutboundMessage(
  phone: string,
  content: string,
  msgType: string = "text",
  wamid?: string | null,
  media?: {
    imageUrl?: string;
    audioUrl?: string;
    documentUrl?: string;
    documentName?: string;
  },
): Promise<void> {
  try {
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const key = waConversationKey(phone);
    if (!key) return;
    const { error } = await supabaseAdmin.from("wa_messages").insert({
      phone: key,
      direction: "out",
      msg_type: msgType,
      content,
      source: "panel",
      ...(media?.imageUrl ? { image_url: media.imageUrl } : {}),
      ...(media?.audioUrl ? { audio_url: media.audioUrl } : {}),
      ...(media?.documentUrl ? { document_url: media.documentUrl } : {}),
      ...(media?.documentName ? { document_name: media.documentName } : {}),
      ...(wamid ? { wamid } : {}),
    });
    if (error) {
      console.error(
        "[send-whatsapp-notification] Error logging message:",
        error,
      );
    }
  } catch (err) {
    // fire-and-forget — no bloquear la respuesta si falla el log
    console.error("[send-whatsapp-notification] Error logging message:", err);
  }
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  // Auth: aceptar JWT de usuario autenticado o service_role key
  const authHeader = req.headers.get("Authorization") ?? "";
  const bearerToken = authHeader.replace(/^Bearer\s+/i, "").trim();
  // El service_role key es un JWT sin sub claim — lo detectamos por el payload role=service_role
  let isServiceRole = false;
  try {
    const payload = JSON.parse(atob(bearerToken.split(".")[1]));
    isServiceRole = payload?.role === "service_role";
  } catch {
    /* no es JWT válido */
  }

  if (!isServiceRole) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return new Response("Unauthorized", {
        status: 401,
        headers: CORS_HEADERS,
      });
  }

  let phone: string,
    message: string | undefined,
    imageUrl: string | undefined,
    imageCaption: string | undefined,
    audioUrl: string | undefined,
    documentUrl: string | undefined,
    documentName: string | undefined,
    resumeBot: boolean | undefined,
    pauseBot: boolean | undefined;
  try {
    const body = await req.json();
    phone = body.phone;
    message = body.message;
    imageUrl = body.imageUrl;
    imageCaption = body.imageCaption;
    audioUrl = body.audioUrl;
    documentUrl = body.documentUrl;
    documentName = body.documentName;
    resumeBot = body.resumeBot === true;
    // Solo el panel de staff (clip del hilo de chat) manda esto — evita pausar el bot
    // en envíos automatizados de imagen (ej. imagen Tardanzas tras aprobar pago).
    pauseBot = body.pauseBot === true;
  } catch {
    return new Response("Bad request", { status: 400, headers: CORS_HEADERS });
  }

  if (!phone) {
    return new Response("Missing phone", {
      status: 400,
      headers: CORS_HEADERS,
    });
  }
  // Permitir solo resumeBot sin mensaje (botón "Reactivar bot" del panel)
  if (!message && !imageUrl && !audioUrl && !documentUrl && resumeBot !== true) {
    return new Response("Missing message, imageUrl, audioUrl or documentUrl", {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  const results: unknown[] = [];
  if (message) {
    const data = await sendText(phone, message);
    results.push(data);
    if (!metaApiReturnedError(data)) {
      await logOutboundMessage(phone, message, "text", extractMetaWamid(data));
    }
  }
  if (imageUrl) {
    const data = await sendImage(phone, imageUrl, imageCaption);
    results.push(data);
    if (!metaApiReturnedError(data)) {
      await logOutboundMessage(
        phone,
        imageCaption ? `[imagen] ${imageCaption}` : "[imagen]",
        "image",
        extractMetaWamid(data),
        { imageUrl },
      );
    }
  }
  if (audioUrl) {
    const data = await sendAudio(phone, audioUrl);
    results.push(data);
    if (!metaApiReturnedError(data)) {
      await logOutboundMessage(
        phone,
        "[audio]",
        "audio",
        extractMetaWamid(data),
        { audioUrl },
      );
    }
  }
  if (documentUrl) {
    const data = await sendDocument(phone, documentUrl, documentName);
    results.push(data);
    if (!metaApiReturnedError(data)) {
      await logOutboundMessage(
        phone,
        documentName ? `[documento] ${documentName}` : "[documento]",
        "document",
        extractMetaWamid(data),
        { documentUrl, documentName },
      );
    }
  }

  const sessionKey = waConversationKey(phone);
  const sentOk =
    results.length > 0 && results.some((r) => !metaApiReturnedError(r));

  // Reactivar bot solo si el panel lo pide explícitamente (resumeBot: true).
  if (resumeBot === true && sessionKey && (results.length === 0 || sentOk)) {
    try {
      const supabaseAdmin = createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
      );
      const { error: unpauseErr } = await supabaseAdmin
        .from("whatsapp_sessions")
        .update({
          bot_paused_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("phone", sessionKey)
        .not("bot_paused_at", "is", null);
      if (unpauseErr) {
        console.error(
          "[send-whatsapp-notification] unpause:",
          unpauseErr.message,
        );
      }
    } catch (err) {
      console.error("[send-whatsapp-notification] unpause:", err);
    }
  }

  // Staff desde /panel/waba/mensajes manda pauseBot: true — evita que el bot
  // hable encima del staff (STAFF_BOT_COLLISION). No aplica a ValidacionPagos /
  // Tardanzas / agenda (no envían pauseBot).
  if (pauseBot === true && resumeBot !== true && sessionKey && sentOk) {
    try {
      const supabaseAdmin = createClient(
        SUPABASE_URL,
        SUPABASE_SERVICE_ROLE_KEY,
      );
      const { error: pauseErr } = await supabaseAdmin
        .from("whatsapp_sessions")
        .update({
          bot_paused_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("phone", sessionKey);
      if (pauseErr) {
        console.error("[send-whatsapp-notification] pause:", pauseErr.message);
      }
    } catch (err) {
      console.error("[send-whatsapp-notification] pause:", err);
    }
  }

  return new Response(
    JSON.stringify(results.length === 1 ? results[0] : results),
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
});
