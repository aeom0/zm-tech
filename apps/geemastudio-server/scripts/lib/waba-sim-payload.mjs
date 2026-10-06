/**
 * Payloads webhook formato Meta WhatsApp Business API.
 */
import crypto from "node:crypto";

const SALON_DISPLAY = "51932535512";

function baseEnvelope(phone, contactName, message, opts = {}) {
  const contact = {
    profile: { name: contactName },
  };
  if (opts.bsuid) {
    contact.user_id = opts.bsuid;
    if (opts.username) {
      contact.profile.username = opts.username;
    }
  } else {
    contact.wa_id = phone;
  }
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: SALON_DISPLAY },
              contacts: [contact],
              messages: [message],
            },
          },
        ],
      },
    ],
  };
}

function newWamid(prefix = "wamid.qa") {
  return `${prefix}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}`;
}

/** Mensaje de texto libre. */
export function buildTextPayload(phone, text, opts = {}) {
  const { wamid, contactName = "QA Validación", referral } = opts;
  const msg = {
    from: phone,
    id: wamid ?? newWamid(),
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: "text",
    text: { body: text },
  };
  if (referral) msg.referral = referral;
  return baseEnvelope(phone, contactName, msg);
}

/**
 * CTWA / username: sin message.from, solo BSUID en contacts[].user_id
 * (y opcionalmente message.from_user_id).
 */
export function buildBsuidTextPayload(bsuid, text, opts = {}) {
  const {
    wamid,
    contactName = "QA BSUID",
    username = "qa_bsuid",
    referral,
    includeFromUserId = true,
  } = opts;
  const msg = {
    id: wamid ?? newWamid("wamid.qa.bsuid"),
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: "text",
    text: { body: text },
  };
  if (includeFromUserId) msg.from_user_id = bsuid;
  if (referral) msg.referral = referral;
  return baseEnvelope(bsuid, contactName, msg, { bsuid, username });
}

/** Respuesta interactiva BSUID (sin message.from). */
export function buildBsuidInteractivePayload(bsuid, listId, title, opts = {}) {
  const {
    wamid,
    contactName = "QA BSUID",
    username = "qa_bsuid",
    kind = "list",
    includeFromUserId = true,
  } = opts;
  const replyKey = kind === "button" ? "button_reply" : "list_reply";
  const msg = {
    id: wamid ?? newWamid("wamid.qa.bsuid"),
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: "interactive",
    interactive: {
      type: replyKey,
      [replyKey]: { id: listId, title },
    },
  };
  if (includeFromUserId) msg.from_user_id = bsuid;
  return baseEnvelope(bsuid, contactName, msg, { bsuid, username });
}

/** Respuesta a lista o botón interactivo. */
export function buildInteractivePayload(phone, listId, title, opts = {}) {
  const { wamid, contactName = "QA Validación", kind = "list" } = opts;
  const replyKey = kind === "button" ? "button_reply" : "list_reply";
  const msg = {
    from: phone,
    id: wamid ?? newWamid(),
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: "interactive",
    interactive: {
      type: replyKey,
      [replyKey]: { id: listId, title },
    },
  };
  return baseEnvelope(phone, contactName, msg);
}

/** Mensaje de imagen (captura de pago / diseño). Media id falso: uploadWhatsAppMedia()
 * falla en silencio (screenshotUrl=null) si el Graph API no devuelve url. */
export function buildImagePayload(phone, opts = {}) {
  const { wamid, contactName = "QA Validación", caption } = opts;
  const image = { id: `qa-fake-media-${Date.now()}` };
  if (typeof caption === "string" && caption.trim()) {
    image.caption = caption.trim();
  }
  const msg = {
    from: phone,
    id: wamid ?? newWamid(),
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: "image",
    image,
  };
  return baseEnvelope(phone, contactName, msg);
}

/** Respuesta a botón quick-reply de PLANTILLA (msgType "button", no "interactive"). */
export function buildButtonPayload(phone, text, opts = {}) {
  const { wamid, contactName = "QA Validación", payload } = opts;
  const msg = {
    from: phone,
    id: wamid ?? newWamid(),
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: "button",
    button: { text, payload: payload ?? text },
  };
  return baseEnvelope(phone, contactName, msg);
}

/** Documento inbound (PDF Constancia NPS, etc.). */
export function buildDocumentPayload(phone, opts = {}) {
  const {
    wamid,
    contactName = "QA Validación",
    mediaId = "media.qa.pdf",
    filename = "constancia-nps.pdf",
    mimeType = "application/pdf",
    caption,
  } = opts;
  const msg = {
    from: phone,
    id: wamid ?? newWamid(),
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: "document",
    document: {
      id: mediaId,
      filename,
      mime_type: mimeType,
    },
  };
  if (caption) msg.document.caption = caption;
  return baseEnvelope(phone, contactName, msg);
}

/** POST al webhook whatsapp-webhook (prod). */
export async function postWebhook(webhookUrl, payload) {
  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.status;
}

export { newWamid };
